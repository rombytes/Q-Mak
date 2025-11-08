<?php
/**
 * Get Notifications API
 * Returns student's notifications
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized. Please login first.',
        'data' => []
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
    
    // Get limit from query parameter (default 50)
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $limit = min($limit, 100); // Max 100 notifications
    
    // Get notifications for this student
    $stmt = $db->prepare("
        SELECT 
            notification_id,
            title,
            message,
            type,
            related_order_id,
            is_read,
            created_at
        FROM notifications
        WHERE student_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    ");
    
    $stmt->bindValue(1, $studentId, PDO::PARAM_STR);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get unread count
    $unreadStmt = $db->prepare("
        SELECT COUNT(*) as unread_count 
        FROM notifications 
        WHERE student_id = ? AND is_read = 0
    ");
    $unreadStmt->execute([$studentId]);
    $unreadData = $unreadStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'unread_count' => $unreadData['unread_count']
    ]);
    
} catch (PDOException $e) {
    error_log("Get Notifications Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load notifications',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Get Notifications Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
