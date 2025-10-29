<?php
/**
 * Admin Analytics API
 * Provides real-time data for analytics dashboard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

try {
    $db = getDB();
    
    // Get overall statistics
    $stats = [];
    
    // Total orders
    $stmt = $db->query("SELECT COUNT(*) as total FROM orders");
    $stats['total_orders'] = $stmt->fetch()['total'];
    
    // Orders by status
    $stmt = $db->query("
        SELECT status, COUNT(*) as count 
        FROM orders 
        GROUP BY status
    ");
    $statusCounts = [];
    while ($row = $stmt->fetch()) {
        $statusCounts[$row['status']] = (int)$row['count'];
    }
    $stats['status_distribution'] = [
        'pending' => $statusCounts['pending'] ?? 0,
        'processing' => $statusCounts['processing'] ?? 0,
        'ready' => $statusCounts['ready'] ?? 0,
        'completed' => $statusCounts['completed'] ?? 0,
        'cancelled' => $statusCounts['cancelled'] ?? 0
    ];
    
    // Average wait time
    $stmt = $db->query("
        SELECT AVG(estimated_wait_time) as avg_wait 
        FROM orders 
        WHERE estimated_wait_time IS NOT NULL
    ");
    $stats['avg_wait_time'] = (int)($stmt->fetch()['avg_wait'] ?? 0);
    
    // Orders over time (last 24 hours by hour)
    $stmt = $db->query("
        SELECT 
            HOUR(created_at) as hour,
            COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY HOUR(created_at)
        ORDER BY hour
    ");
    $ordersOverTime = array_fill(0, 24, 0);
    while ($row = $stmt->fetch()) {
        $ordersOverTime[(int)$row['hour']] = (int)$row['count'];
    }
    $stats['orders_over_time'] = $ordersOverTime;
    
    // Popular items
    $stmt = $db->query("
        SELECT 
            item_name,
            COUNT(*) as count
        FROM orders
        WHERE item_name IS NOT NULL
        GROUP BY item_name
        ORDER BY count DESC
        LIMIT 10
    ");
    $popularItems = [];
    while ($row = $stmt->fetch()) {
        $popularItems[] = [
            'item' => $row['item_name'],
            'count' => (int)$row['count']
        ];
    }
    $stats['popular_items'] = $popularItems;
    
    // Recent activity (last 20 orders)
    $stmt = $db->query("
        SELECT 
            o.queue_number,
            o.status,
            o.created_at,
            s.first_name,
            s.last_name
        FROM orders o
        LEFT JOIN students s ON o.student_id = s.student_id
        ORDER BY o.created_at ASC
        LIMIT 20
    ");
    $recentActivity = [];
    while ($row = $stmt->fetch()) {
        $recentActivity[] = [
            'queue_number' => $row['queue_number'],
            'status' => $row['status'],
            'student_name' => ($row['first_name'] ?? 'Unknown') . ' ' . ($row['last_name'] ?? ''),
            'time' => $row['created_at']
        ];
    }
    $stats['recent_activity'] = $recentActivity;
    
    // Orders by day (last 7 days)
    $stmt = $db->query("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
    ");
    $ordersByDay = [];
    while ($row = $stmt->fetch()) {
        $ordersByDay[] = [
            'date' => $row['date'],
            'count' => (int)$row['count']
        ];
    }
    $stats['orders_by_day'] = $ordersByDay;
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
