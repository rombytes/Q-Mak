<?php
/**
 * Export Analytics Report to CSV
 * Generates a comprehensive CSV report based on selected filters
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized. Please login.');
}

try {
    $db = getDB();
    
    // Get filter parameters
    $period = $_GET['period'] ?? 'daily';
    $startDate = $_GET['start'] ?? date('Y-m-d');
    $endDate = $_GET['end'] ?? date('Y-m-d');
    $college = $_GET['college'] ?? '';
    $program = $_GET['program'] ?? '';
    
    // Prepare date range
    $startDateTime = new DateTime($startDate);
    $endDateTime = new DateTime($endDate);
    $endDateTime->modify('+1 day');
    $endDateQuery = $endDateTime->format('Y-m-d');
    
    // Build WHERE clause for filters
    $whereConditions = ["created_at >= :startDate", "created_at < :endDate"];
    $params = [
        'startDate' => $startDate,
        'endDate' => $endDateQuery
    ];
    
    if (!empty($college)) {
        $whereConditions[] = "college = :college";
        $params['college'] = $college;
    }
    
    if (!empty($program)) {
        $whereConditions[] = "program = :program";
        $params['program'] = $program;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    // ===================================
    // FETCH DATA
    // ===================================
    
    // 1. Summary Statistics
    $stmtSummary = $db->prepare("
        SELECT
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_orders
        FROM orders
        $whereClause
    ");
    $stmtSummary->execute($params);
    $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);
    
    // 2. Status Breakdown
    $stmtStatus = $db->prepare("
        SELECT
            status,
            COUNT(*) as count
        FROM orders
        $whereClause
        GROUP BY status
        ORDER BY count DESC
    ");
    $stmtStatus->execute($params);
    $statusBreakdown = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Top Items (split comma-separated items)
    $stmtAllItems = $db->prepare("
        SELECT item_name, quantity
        FROM orders
        $whereClause
    ");
    $stmtAllItems->execute($params);
    $allOrders = $stmtAllItems->fetchAll(PDO::FETCH_ASSOC);
    
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
    
    arsort($itemCounts);
    
    // 4. Timeline Data
    $groupFormat = '';
    $labelFormat = '';
    
    switch ($period) {
        case 'daily':
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')";
            $labelFormat = "DATE_FORMAT(created_at, '%h:00 %p')";
            break;
        case 'weekly':
            $groupFormat = "CONCAT(YEAR(created_at), '-', WEEK(created_at, 1))";
            $labelFormat = "CONCAT(DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%b %e'), ' - ', DATE_FORMAT(DATE_ADD(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), INTERVAL 6 DAY), '%b %e'))";
            break;
        case 'monthly':
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m')";
            $labelFormat = "DATE_FORMAT(created_at, '%b %Y')";
            break;
        case 'yearly':
            $groupFormat = "YEAR(created_at)";
            $labelFormat = "YEAR(created_at)";
            break;
        default:
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
            $labelFormat = "DATE_FORMAT(created_at, '%b %d')";
    }
    
    $stmtTimeline = $db->prepare("
        SELECT
            $labelFormat as label,
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
        FROM orders
        $whereClause
        GROUP BY $groupFormat
        ORDER BY $groupFormat ASC
    ");
    $stmtTimeline->execute($params);
    $timeline = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);
    
    // ===================================
    // GENERATE CSV FILE
    // ===================================
    
    // Prepare filename
    $dateRangeText = date('Y-m-d', strtotime($startDate)) . '_to_' . date('Y-m-d', strtotime($endDate));
    $filename = 'QMak_Analytics_' . $dateRangeText . '.csv';
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Open output stream
    $output = fopen('php://output', 'w');
    
    // Add UTF-8 BOM for proper Excel encoding
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // ===================================
    // SECTION 1: REPORT HEADER
    // ===================================
    fputcsv($output, ['Q-MAK ANALYTICS REPORT']);
    fputcsv($output, ['Generated on: ' . date('F d, Y g:i A')]);
    fputcsv($output, ['Date Range: ' . date('M d, Y', strtotime($startDate)) . ' - ' . date('M d, Y', strtotime($endDate))]);
    
    // Applied Filters
    if (!empty($college) || !empty($program)) {
        $filters = [];
        if (!empty($college)) $filters[] = "College: $college";
        if (!empty($program)) $filters[] = "Program: $program";
        fputcsv($output, ['Filters: ' . implode(', ', $filters)]);
    }
    
    fputcsv($output, []); // Blank line
    
    // ===================================
    // SECTION 2: SUMMARY STATISTICS
    // ===================================
    fputcsv($output, ['--- ANALYTICS SUMMARY ---']);
    fputcsv($output, ['Metric', 'Count']);
    fputcsv($output, ['Total Orders', $summary['total_orders']]);
    fputcsv($output, ['Completed Orders', $summary['completed_orders']]);
    fputcsv($output, ['Pending Orders', $summary['pending_orders']]);
    fputcsv($output, ['Ready for Pickup', $summary['ready_orders']]);
    fputcsv($output, ['Cancelled Orders', $summary['cancelled_orders']]);
    
    // Calculate completion rate
    $completionRate = $summary['total_orders'] > 0 
        ? round(($summary['completed_orders'] / $summary['total_orders']) * 100, 2) 
        : 0;
    fputcsv($output, ['Completion Rate', $completionRate . '%']);
    
    fputcsv($output, []); // Blank line
    
    // ===================================
    // SECTION 3: STATUS BREAKDOWN
    // ===================================
    fputcsv($output, ['--- ORDER STATUS BREAKDOWN ---']);
    fputcsv($output, ['Status', 'Count', 'Percentage']);
    
    foreach ($statusBreakdown as $status) {
        $percentage = $summary['total_orders'] > 0 
            ? round(($status['count'] / $summary['total_orders']) * 100, 2) 
            : 0;
        fputcsv($output, [
            ucfirst($status['status']),
            $status['count'],
            $percentage . '%'
        ]);
    }
    
    fputcsv($output, []); // Blank line
    
    // ===================================
    // SECTION 4: TOP SELLING ITEMS
    // ===================================
    fputcsv($output, ['--- TOP SELLING ITEMS ---']);
    fputcsv($output, ['Rank', 'Item Name', 'Quantity Sold']);
    
    $rank = 1;
    foreach ($itemCounts as $item => $count) {
        fputcsv($output, [$rank, $item, $count]);
        $rank++;
    }
    
    fputcsv($output, []); // Blank line
    
    // ===================================
    // SECTION 5: TIMELINE DATA
    // ===================================
    fputcsv($output, ['--- ORDER TIMELINE (' . strtoupper($period) . ') ---']);
    fputcsv($output, ['Period', 'Total Orders', 'Completed Orders', 'Completion Rate']);
    
    foreach ($timeline as $data) {
        $timelineCompletionRate = $data['total_orders'] > 0 
            ? round(($data['completed_orders'] / $data['total_orders']) * 100, 2) 
            : 0;
        fputcsv($output, [
            $data['label'],
            $data['total_orders'],
            $data['completed_orders'],
            $timelineCompletionRate . '%'
        ]);
    }
    
    // Close output stream
    fclose($output);
    
} catch (Exception $e) {
    error_log("Export Analytics Error: " . $e->getMessage());
    http_response_code(500);
    die('Error generating report: ' . $e->getMessage());
}
