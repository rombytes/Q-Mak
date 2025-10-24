<?php
/**
 * Export Orders to Excel (CSV format)
 */

session_start();
require_once __DIR__ . '/../config/database.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized');
}

try {
    $db = getDB();
    
    // Get filters
    $startDate = $_GET['start_date'] ?? '';
    $endDate = $_GET['end_date'] ?? '';
    $status = $_GET['status'] ?? 'all';
    
    $query = "
        SELECT 
            o.order_id,
            o.queue_number,
            o.item_name,
            o.quantity,
            o.total_amount,
            o.status,
            o.order_date,
            o.ready_time,
            o.completed_time,
            s.student_number,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.email,
            s.course
        FROM orders o
        JOIN students s ON o.student_id = s.student_id
        WHERE 1=1
    ";
    
    $params = [];
    
    if (!empty($startDate)) {
        $query .= " AND DATE(o.created_at) >= ?";
        $params[] = $startDate;
    }
    
    if (!empty($endDate)) {
        $query .= " AND DATE(o.created_at) <= ?";
        $params[] = $endDate;
    }
    
    if ($status !== 'all') {
        $query .= " AND o.status = ?";
        $params[] = $status;
    }
    
    $query .= " ORDER BY o.created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="orders_' . date('Y-m-d_His') . '.csv"');
    
    // Create file pointer
    $output = fopen('php://output', 'w');
    
    // Add BOM for Excel UTF-8 support
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Add headers
    fputcsv($output, [
        'Order ID',
        'Queue Number',
        'Student Number',
        'Student Name',
        'Email',
        'Course',
        'Item Name',
        'Quantity',
        'Total Amount',
        'Status',
        'Order Date',
        'Ready Time',
        'Completed Time'
    ]);
    
    // Add data
    foreach ($orders as $order) {
        fputcsv($output, [
            $order['order_id'],
            $order['queue_number'],
            $order['student_number'],
            $order['student_name'],
            $order['email'],
            $order['course'],
            $order['item_name'],
            $order['quantity'],
            $order['total_amount'],
            $order['status'],
            $order['order_date'],
            $order['ready_time'] ?? 'Not ready',
            $order['completed_time'] ?? 'Not completed'
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    error_log("Export Orders Error: " . $e->getMessage());
    http_response_code(500);
    die('Export failed');
}
?>
