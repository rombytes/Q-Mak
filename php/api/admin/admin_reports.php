<?php
/**
 * Admin Analytics & Reports API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

session_start();

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        
        // Check if period parameter is provided
        $period = $_GET['period'] ?? null;
        
        if ($period) {
            // Period-based query (daily, weekly, monthly, yearly)
            $startDate = '';
            $endDate = date('Y-m-d');
            $groupFormat = '';
            $labelFormat = '';
            
            switch ($period) {
                case 'daily':
                    // Today's data by hour
                    $startDate = date('Y-m-d 00:00:00');
                    $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')";
                    $labelFormat = "DATE_FORMAT(created_at, '%h:00 %p')";
                    break;
                case 'weekly':
                    // Last 8 weeks with date ranges
                    $startDate = date('Y-m-d', strtotime('-8 weeks'));
                    $groupFormat = "CONCAT(YEAR(created_at), '-', WEEK(created_at, 1))";
                    $labelFormat = "CONCAT(DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%b %e'), ' - ', DATE_FORMAT(DATE_ADD(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), INTERVAL 6 DAY), '%b %e'))";
                    break;
                case 'monthly':
                    // Last 12 months
                    $startDate = date('Y-m-d', strtotime('-12 months'));
                    $groupFormat = "DATE_FORMAT(created_at, '%Y-%m')";
                    $labelFormat = "DATE_FORMAT(created_at, '%b %Y')";
                    break;
                case 'yearly':
                    // Last 5 years
                    $startDate = date('Y-m-d', strtotime('-5 years'));
                    $groupFormat = "YEAR(created_at)";
                    $labelFormat = "YEAR(created_at)";
                    break;
                default:
                    $startDate = date('Y-m-d', strtotime('-7 days'));
                    $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
                    $labelFormat = "DATE_FORMAT(created_at, '%b %d')";
            }
            
            $endDateTime = new DateTime($endDate);
            $endDateTime->modify('+1 day');
            $endDate = $endDateTime->format('Y-m-d');
            
        } else {
            // Date range query (backward compatibility)
            $startDate = $_GET['start'] ?? date('Y-m-d');
            $endDate = $_GET['end'] ?? date('Y-m-d');
            $endDateTime = new DateTime($endDate);
            $endDateTime->modify('+1 day');
            $endDate = $endDateTime->format('Y-m-d');
        }

        // 1. Get Summary Statistics
        $stmtSummary = $db->prepare("
            SELECT
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
            FROM orders
            WHERE created_at >= ? AND created_at < ?
        ");
        $stmtSummary->execute([$startDate, $endDate]);
        $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);

        // 2. Get Top Ordered Items (split comma-separated items and count individually)
        $stmtAllItems = $db->prepare("
            SELECT item_name, quantity
            FROM orders
            WHERE created_at >= ? AND created_at < ?
        ");
        $stmtAllItems->execute([$startDate, $endDate]);
        $allOrders = $stmtAllItems->fetchAll(PDO::FETCH_ASSOC);
        
        // Process items - split comma-separated items and count each
        $itemCounts = [];
        foreach ($allOrders as $order) {
            $items = array_map('trim', explode(',', $order['item_name']));
            $quantity = intval($order['quantity']);
            
            foreach ($items as $item) {
                if (!empty($item)) {
                    if (!isset($itemCounts[$item])) {
                        $itemCounts[$item] = 0;
                    }
                    $itemCounts[$item] += $quantity;
                }
            }
        }
        
        // Sort by count and get top 10
        arsort($itemCounts);
        $topItems = [];
        $count = 0;
        foreach ($itemCounts as $item => $total) {
            if ($count >= 10) break;
            $topItems[] = [
                'item_ordered' => $item,
                'total' => $total
            ];
            $count++;
        }
        
        // 3. Get Timeline Data (if period is specified)
        $timeline = [];
        if ($period && isset($groupFormat) && isset($labelFormat)) {
            $stmtTimeline = $db->prepare("
                SELECT
                    $labelFormat as label,
                    $groupFormat as period_key,
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
                FROM orders
                WHERE created_at >= ? AND created_at < ?
                GROUP BY period_key
                ORDER BY period_key ASC
            ");
            $stmtTimeline->execute([$startDate, $endDate]);
            $timeline = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // 4. Get Status Breakdown
        $stmtStatus = $db->prepare("
            SELECT
                status,
                COUNT(*) as count
            FROM orders
            WHERE created_at >= ? AND created_at < ?
            GROUP BY status
            ORDER BY count DESC
        ");
        $stmtStatus->execute([$startDate, $endDate]);
        $statusBreakdown = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);
        
        // 5. Get Product Quantities (total items sold counting individual quantities)
        $stmtProductQty = $db->prepare("
            SELECT
                item_name,
                SUM(quantity) as quantity_sold
            FROM orders
            WHERE created_at >= ? AND created_at < ?
            GROUP BY item_name
            ORDER BY quantity_sold DESC
            LIMIT 15
        ");
        $stmtProductQty->execute([$startDate, $endDate]);
        $productQuantities = $stmtProductQty->fetchAll(PDO::FETCH_ASSOC);
        
        // Format date range for display
        $dateRangeDisplay = [
            'start' => date('M d, Y', strtotime($startDate)),
            'end' => date('M d, Y', strtotime($endDate))
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'top_items' => $topItems,
                'timeline' => $timeline,
                'status_breakdown' => $statusBreakdown,
                'product_quantities' => $productQuantities,
                'date_range' => $dateRangeDisplay
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Reports Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>