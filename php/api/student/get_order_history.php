<?php
/**
 * Get Order History API
 * Returns the student's order history (completed and cancelled orders)
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
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
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
    
    // Get pagination parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 10;
    $offset = ($page - 1) * $limit;
    
    // Get filter parameter
    $status = isset($_GET['status']) ? $_GET['status'] : 'all';
    
    // Build query based on filter (simpler approach)
    $statusCondition = '';
    if ($status === 'completed') {
        $statusCondition = " AND o.status = 'completed'";
    } elseif ($status === 'cancelled') {
        $statusCondition = " AND o.status = 'cancelled'";
    } elseif ($status === 'active') {
        $statusCondition = " AND o.status IN ('pending', 'processing', 'ready', 'scheduled')";
    }
    // 'all' returns everything
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM orders o WHERE o.student_id = ?" . $statusCondition;
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute([$studentId]);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Get order history
    $orderQuery = "
        SELECT 
            o.order_id,
            o.queue_number,
            o.student_id,
            o.item_ordered,
            o.status,
            o.estimated_wait_time,
            o.created_at,
            o.updated_at
        FROM orders o
        WHERE o.student_id = ?" . $statusCondition . "
        ORDER BY o.created_at DESC
        LIMIT $limit OFFSET $offset
    ";
    
    $stmt = $db->prepare($orderQuery);
    $stmt->execute([$studentId]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate pagination info
    $totalPages = $totalCount > 0 ? ceil($totalCount / $limit) : 1;
    
    echo json_encode([
        'success' => true,
        'data' => [
            'orders' => $orders,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => (int)$totalCount,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Get Order History PDO Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Get Order History Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred'
    ]);
}
?>
