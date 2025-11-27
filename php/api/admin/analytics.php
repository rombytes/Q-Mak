<?php
/**
 * Admin Analytics API
 * Provides data for analytics dashboard with advanced filtering
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

try {
    $db = getDB();
    
    // Get filter parameters
    $period = $_GET['period'] ?? 'daily';
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $college = $_GET['college'] ?? null;
    $program = $_GET['program'] ?? null;
    $itemFilter = $_GET['item_filter'] ?? null;
    $studentId = $_GET['student_id'] ?? null;
    
    // Build date filter based on period
    $dateFilter = "";
    $dateParams = [];
    
    if ($period === 'custom' && $startDate && $endDate) {
        $dateFilter = " AND DATE(o.created_at) BETWEEN ? AND ?";
        $dateParams = [$startDate, $endDate];
    } else {
        switch ($period) {
            case 'daily':
                $dateFilter = " AND DATE(o.created_at) = CURDATE()";
                break;
            case 'weekly':
                $dateFilter = " AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'monthly':
                $dateFilter = " AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
            case 'yearly':
                $dateFilter = " AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
                break;
            default:
                $dateFilter = " AND DATE(o.created_at) = CURDATE()";
        }
    }
    
    // Build additional filters
    $additionalFilters = "";
    $additionalParams = [];
    
    if ($college) {
        $additionalFilters .= " AND s.college = ?";
        $additionalParams[] = $college;
    }
    if ($program) {
        $additionalFilters .= " AND s.program = ?";
        $additionalParams[] = $program;
    }
    if ($itemFilter) {
        $additionalFilters .= " AND o.item_name LIKE ?";
        $additionalParams[] = '%' . $itemFilter . '%';
    }
    if ($studentId) {
        $additionalFilters .= " AND o.student_id = ?";
        $additionalParams[] = $studentId;
    }
    
    // Merge all parameters
    $allParams = array_merge($dateParams, $additionalParams);
    
    // Get overall statistics
    $stats = [];
    
    // Total orders with filters
    $sql = "SELECT COUNT(*) as total FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE 1=1" . $dateFilter . $additionalFilters;
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
    $stats['total_orders'] = $stmt->fetch()['total'];
    
    // Orders by status with filters
    $sql = "SELECT status, COUNT(*) as count FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE 1=1" . $dateFilter . $additionalFilters . " GROUP BY status";
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
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
    
    // Average wait time with filters
    $sql = "SELECT AVG(estimated_wait_time) as avg_wait FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE estimated_wait_time IS NOT NULL" . $dateFilter . $additionalFilters;
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
    $stats['avg_wait_time'] = (int)($stmt->fetch()['avg_wait'] ?? 0);
    
    // Orders over time (by hour) with filters
    $sql = "SELECT HOUR(o.created_at) as hour, COUNT(*) as count FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE 1=1" . $dateFilter . $additionalFilters . " GROUP BY HOUR(o.created_at) ORDER BY hour";
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
    $ordersOverTime = array_fill(0, 24, 0);
    while ($row = $stmt->fetch()) {
        $ordersOverTime[(int)$row['hour']] = (int)$row['count'];
    }
    $stats['orders_over_time'] = $ordersOverTime;
    
    // Popular items with filters - FIXED: Handle comma-separated items properly
    $sql = "SELECT item_name FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE item_name IS NOT NULL" . $dateFilter . $additionalFilters;
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
    
    $itemCounts = [];
    while ($row = $stmt->fetch()) {
        // Split comma-separated items and count each individually
        $items = explode(',', $row['item_name']);
        foreach ($items as $item) {
            $item = trim($item);
            if (!empty($item)) {
                if (!isset($itemCounts[$item])) {
                    $itemCounts[$item] = 0;
                }
                $itemCounts[$item]++;
            }
        }
    }
    
    // Sort by count descending and take top 10
    arsort($itemCounts);
    $popularItems = [];
    $count = 0;
    foreach ($itemCounts as $item => $itemCount) {
        if ($count >= 10) break;
        $popularItems[] = [
            'item' => $item,
            'count' => $itemCount
        ];
        $count++;
    }
    $stats['popular_items'] = $popularItems;
    
    // Recent activity with filters
    $sql = "SELECT o.queue_number, o.status, o.created_at, s.first_name, s.last_name FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE 1=1" . $dateFilter . $additionalFilters . " ORDER BY o.created_at DESC LIMIT 20";
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
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
    
    // Orders by day with filters - adjust range based on period
    $dayRange = 7;
    if ($period === 'monthly') $dayRange = 30;
    if ($period === 'yearly') $dayRange = 365;
    if ($period === 'custom' && $startDate && $endDate) {
        $dayRange = (strtotime($endDate) - strtotime($startDate)) / 86400;
    }
    
    $sql = "SELECT DATE(o.created_at) as date, COUNT(*) as count FROM orders o LEFT JOIN students s ON o.student_id = s.student_id WHERE 1=1" . $dateFilter . $additionalFilters . " GROUP BY DATE(o.created_at) ORDER BY date";
    $stmt = $db->prepare($sql);
    $stmt->execute($allParams);
    $ordersByDay = [];
    while ($row = $stmt->fetch()) {
        $ordersByDay[] = [
            'date' => $row['date'],
            'count' => (int)$row['count']
        ];
    }
    $stats['orders_by_day'] = $ordersByDay;
    
    // Get available colleges and programs for filter dropdowns
    $stmt = $db->query("SELECT DISTINCT college FROM students WHERE college IS NOT NULL AND college != '' ORDER BY college");
    $colleges = [];
    while ($row = $stmt->fetch()) {
        $colleges[] = $row['college'];
    }
    
    $stmt = $db->query("SELECT DISTINCT program FROM students WHERE program IS NOT NULL AND program != '' ORDER BY program");
    $programs = [];
    while ($row = $stmt->fetch()) {
        $programs[] = $row['program'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'filters' => [
            'colleges' => $colleges,
            'programs' => $programs
        ],
        'applied_filters' => [
            'period' => $period,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'college' => $college,
            'program' => $program,
            'item_filter' => $itemFilter,
            'student_id' => $studentId
        ],
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
