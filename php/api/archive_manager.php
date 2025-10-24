<?php
/**
 * Archive Management API
 * Handle archiving orders and email logs
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'POST':
            // Archive items
            $input = json_decode(file_get_contents('php://input'), true);
            $type = $input['type'] ?? ''; // 'orders' or 'email_logs'
            $ids = $input['ids'] ?? [];
            
            if (empty($type) || empty($ids)) {
                echo json_encode(['success' => false, 'message' => 'Type and IDs required']);
                exit;
            }
            
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            
            if ($type === 'orders') {
                $stmt = $db->prepare("UPDATE orders SET is_archived = 1, archived_at = NOW(), archived_by = ? WHERE order_id IN ($placeholders)");
                $stmt->execute(array_merge([$_SESSION['admin_id']], $ids));
            } elseif ($type === 'email_logs') {
                $stmt = $db->prepare("UPDATE email_logs SET is_archived = 1, archived_at = NOW(), archived_by = ? WHERE log_id IN ($placeholders)");
                $stmt->execute(array_merge([$_SESSION['admin_id']], $ids));
            }
            
            echo json_encode(['success' => true, 'message' => 'Items archived successfully']);
            break;
            
        case 'GET':
            // Get archived items (Super Admin only)
            if (!isset($_SESSION['is_super_admin']) || $_SESSION['is_super_admin'] != 1) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Super admin access required']);
                exit;
            }
            
            $type = $_GET['type'] ?? 'orders';
            
            if ($type === 'orders') {
                $stmt = $db->query("
                    SELECT o.*, 
                           CONCAT(s.first_name, ' ', s.last_name) as student_name,
                           a.full_name as archived_by_name
                    FROM orders o
                    LEFT JOIN students s ON o.student_id = s.student_id
                    LEFT JOIN admin_accounts a ON o.archived_by = a.admin_id
                    WHERE o.is_archived = 1
                    ORDER BY o.archived_at DESC
                ");
            } else {
                $stmt = $db->query("
                    SELECT el.*, 
                           a.full_name as archived_by_name
                    FROM email_logs el
                    LEFT JOIN admin_accounts a ON el.archived_by = a.admin_id
                    WHERE el.is_archived = 1
                    ORDER BY el.archived_at DESC
                ");
            }
            
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $items]);
            break;
            
        case 'DELETE':
            // Permanently delete archived items (Super Admin only)
            if (!isset($_SESSION['is_super_admin']) || $_SESSION['is_super_admin'] != 1) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Super admin access required']);
                exit;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $type = $input['type'] ?? '';
            $ids = $input['ids'] ?? [];
            
            if (empty($type) || empty($ids)) {
                echo json_encode(['success' => false, 'message' => 'Type and IDs required']);
                exit;
            }
            
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            
            if ($type === 'orders') {
                $stmt = $db->prepare("DELETE FROM orders WHERE order_id IN ($placeholders) AND is_archived = 1");
                $stmt->execute($ids);
            } elseif ($type === 'email_logs') {
                $stmt = $db->prepare("DELETE FROM email_logs WHERE log_id IN ($placeholders) AND is_archived = 1");
                $stmt->execute($ids);
            }
            
            echo json_encode(['success' => true, 'message' => 'Items permanently deleted']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Archive Manager Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
?>
