<?php
require_once __DIR__ . '/../../config/session_config.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized access'
    ]);
    exit;
}

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Get current date
    $today = date('Y-m-d');
    
    // Check if there's already a reset record for today
    $checkQuery = "SELECT id FROM daily_queue_reset WHERE reset_date = :today LIMIT 1";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bindParam(':today', $today);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Queue has already been reset today (' . date('F j, Y') . ')'
        ]);
        exit;
    }
    
    // Begin transaction
    $conn->beginTransaction();
    
    try {
        // Reset the daily queue counter
        // This table stores the last queue number for each day
        $resetQuery = "INSERT INTO daily_queue_reset (reset_date, reset_by, reset_time) 
                       VALUES (:today, :admin_id, NOW())
                       ON DUPLICATE KEY UPDATE 
                       reset_by = :admin_id, 
                       reset_time = NOW()";
        
        $resetStmt = $conn->prepare($resetQuery);
        $resetStmt->bindParam(':today', $today);
        $resetStmt->bindParam(':admin_id', $_SESSION['admin_id']);
        $resetStmt->execute();
        
        // Optional: Archive or update the queue number counter
        // If you have a separate counter table, reset it here
        // For now, the queue_number in orders table auto-increments per day
        
        // Log the action
        $logQuery = "INSERT INTO admin_activity_logs (admin_id, action, description, created_at) 
                     VALUES (:admin_id, 'QUEUE_RESET', 'Daily queue number reset for date: {$today}', NOW())";
        
        $logStmt = $conn->prepare($logQuery);
        $logStmt->bindParam(':admin_id', $_SESSION['admin_id']);
        $logStmt->execute();
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Daily queue has been reset successfully!',
            'reset_date' => $today,
            'reset_time' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Reset queue error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reset queue: ' . $e->getMessage()
    ]);
}
?>
