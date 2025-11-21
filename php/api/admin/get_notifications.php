<?php
/**
 * System Notifications API
 * Get notifications for admin dashboard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

require_once __DIR__ . '/../../config/session_config.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $db = getDB();
    
    // Handle POST requests (mark as read)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['action']) && $input['action'] === 'mark_all_read') {
            // Mark all as read
            $db->query("UPDATE system_notifications SET is_read = 1 WHERE is_read = 0");
            echo json_encode(['success' => true, 'message' => 'All notifications marked as read']);
            exit;
        } elseif (isset($input['notification_id']) && isset($input['action']) && $input['action'] === 'mark_read') {
            // Mark single notification as read
            $stmt = $db->prepare("UPDATE system_notifications SET is_read = 1 WHERE notification_id = ?");
            $stmt->execute([$input['notification_id']]);
            echo json_encode(['success' => true, 'message' => 'Notification marked as read']);
            exit;
        }
    }
    
    // Get unread notifications
    $stmt = $db->query("
        SELECT 
            notification_id,
            notification_type,
            title,
            message,
            is_read,
            created_at,
            expires_at
        FROM system_notifications
        WHERE (expires_at IS NULL OR expires_at > NOW())
        ORDER BY is_read ASC, created_at DESC
        LIMIT 50
    ");
    
    $notifications = $stmt->fetchAll();
    
    // Count unread
    $unreadStmt = $db->query("
        SELECT COUNT(*) as unread_count
        FROM system_notifications
        WHERE is_read = 0
          AND (expires_at IS NULL OR expires_at > NOW())
    ");
    $unreadCount = $unreadStmt->fetch()['unread_count'];
    
    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'unread_count' => (int)$unreadCount
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load notifications',
        'error' => $e->getMessage()
    ]);
}
?>
