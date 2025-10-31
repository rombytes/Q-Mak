<?php
/**
 * Admin Orders Management API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/email.php';

session_start();

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all orders with filters
    try {
        $db = getDB();
        
        $status = $_GET['status'] ?? 'all';
        $date = $_GET['date'] ?? '';
        $search = $_GET['search'] ?? '';
        
        $filter = $_GET['filter'] ?? 'today';

        $query = "
            SELECT
                o.order_id,
                o.queue_number,
                o.reference_number,
                o.item_name as item_ordered,
                o.status as order_status,
                o.created_at,
                o.updated_at,
                s.student_id,
                s.first_name,
                s.last_name,
                s.email,
                COALESCE(s.college, 'N/A') as college,
                COALESCE(s.program, 'N/A') as program,
                COALESCE(s.year_level, 'N/A') as year_level,
                COALESCE(s.section, 'N/A') as section
            FROM orders o
            JOIN students s ON o.student_id = s.student_id
            WHERE 1=1
        ";

        if ($filter === 'today') {
            $query .= " AND DATE(o.created_at) = CURDATE()";
        } elseif ($filter === 'history') {
            // Show all orders for history (no date filter)
            $query .= "";
        }
        
        $params = [];
        
        if ($status !== 'all') {
            $query .= " AND o.status = ?";
            $params[] = $status;
        }
        
        if (!empty($date)) {
            $query .= " AND DATE(o.created_at) = ?";
            $params[] = $date;
        }
        
        if (!empty($search)) {
            $query .= " AND (o.queue_number LIKE ? OR s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " ORDER BY o.created_at ASC";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        // Get statistics
        $statsWhereClause = "";
        if ($filter === 'today') {
            $statsWhereClause = "WHERE DATE(created_at) = CURDATE()";
        } elseif ($filter === 'history') {
            $statsWhereClause = ""; // All orders for history
        }

        $statsStmt = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM orders
            $statsWhereClause
        ");
        $stats = $statsStmt->fetch();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'orders' => $orders,
                'stats' => $stats,
                'total_orders' => count($orders)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Orders Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Update order status
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $orderId = intval($input['order_id'] ?? 0);
        $newStatus = trim($input['status'] ?? '');
        
        if ($orderId <= 0 || empty($newStatus)) {
            echo json_encode(['success' => false, 'message' => 'Order ID and status are required']);
            exit;
        }
        
        $validStatuses = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            echo json_encode(['success' => false, 'message' => 'Invalid status']);
            exit;
        }
        
        $db = getDB();
        
        // Get order details
        $orderStmt = $db->prepare("
            SELECT o.*, s.email, s.first_name, s.last_name
            FROM orders o
            JOIN students s ON o.student_id = s.student_id
            WHERE o.order_id = ?
        ");
        $orderStmt->execute([$orderId]);
        $order = $orderStmt->fetch();
        
        if (!$order) {
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit;
        }
        
        // Update status
        $updateStmt = $db->prepare("
            UPDATE orders
            SET status = ?,
                updated_at = NOW(),
                ready_time = CASE WHEN ? = 'ready' THEN NOW() ELSE ready_time END,
                completed_time = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_time END
            WHERE order_id = ?
        ");
        $updateStmt->execute([$newStatus, $newStatus, $newStatus, $orderId]);
        
        // Send status update email
        $statusMessages = [
            'pending' => 'Your order is pending and will be processed soon.',
            'processing' => 'Your order is now being processed.',
            'ready' => 'Your order is ready for pickup! Please proceed to the COOP counter.',
            'completed' => 'Your order has been completed. Thank you!',
            'cancelled' => 'Your order has been cancelled. Please contact us for more information.'
        ];
        
        $emailData = [
            'queue_number' => $order['queue_number'],
            'student_name' => $order['first_name'] . ' ' . $order['last_name'],
            'item_ordered' => $order['item_name'],
            'status' => strtoupper($newStatus),
            'message' => $statusMessages[$newStatus]
        ];
        
        EmailService::sendStatusUpdate($order['email'], $emailData);
        
        echo json_encode([
            'success' => true,
            'message' => 'Order status updated successfully',
            'data' => [
                'order_id' => $orderId,
                'new_status' => $newStatus
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Update Order Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
