<?php
/**
 * Get Current Order API
 * Returns the student's current active order (if any)
 */

// Enable error logging for debugging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../../logs/php_errors.log');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../config/session_config.php';
} catch (Exception $e) {
    error_log("Failed to load config files: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Configuration error',
        'error' => $e->getMessage()
    ]);
    exit;
}

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    // Return success but no data instead of 401 error
    echo json_encode([
        'success' => false,
        'message' => 'No active session',
        'data' => null
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = getDB();
    $studentId = $_SESSION['student_id'];
    
    // Get current active order (pending, processing, or ready status)
    $stmt = $db->prepare("
        SELECT 
            o.order_id,
            o.reference_number,
            o.queue_number,
            o.queue_date,
            o.student_id,
            o.item_ordered,
            o.quantity,
            o.notes,
            o.order_status,
            o.order_type,
            o.scheduled_date,
            o.estimated_wait_time,
            o.qr_code,
            o.qr_expiry,
            o.created_at,
            o.updated_at,
            o.completed_at,
            s.first_name,
            s.last_name,
            s.email
        FROM orders o
        JOIN students s ON o.student_id = s.student_id
        WHERE o.student_id = ?
          AND o.order_status IN ('pending', 'processing', 'ready')
        ORDER BY o.created_at DESC
        LIMIT 1
    ");
    
    $stmt->execute([$studentId]);
    $orderData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($orderData) {
        // Get queue position if status is pending
        if ($orderData['order_status'] === 'pending') {
            $queueStmt = $db->prepare("
                SELECT COUNT(*) + 1 as queue_position
                FROM orders
                WHERE order_status = 'pending'
                  AND created_at < ?
                  AND DATE(created_at) = CURDATE()
            ");
            $queueStmt->execute([$orderData['created_at']]);
            $queueData = $queueStmt->fetch(PDO::FETCH_ASSOC);
            $orderData['queue_position'] = $queueData['queue_position'];
        } else {
            $orderData['queue_position'] = 0;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $orderData
        ]);
    } else {
        // No active order
        echo json_encode([
            'success' => false,
            'message' => 'No active order found',
            'data' => null
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Get Current Order PDO Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    error_log("Get Current Order Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
