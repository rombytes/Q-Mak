<?php
/**
 * Export Email Logs to Excel (CSV format)
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
    $type = $_GET['type'] ?? 'all';
    
    $query = "
        SELECT 
            el.log_id,
            el.email_to,
            el.email_type,
            el.subject,
            el.status,
            el.sent_at,
            el.error_message,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            o.queue_number
        FROM email_logs el
        LEFT JOIN students s ON el.student_id = s.student_id
        LEFT JOIN orders o ON el.order_id = o.order_id
        WHERE 1=1
    ";
    
    $params = [];
    
    if (!empty($startDate)) {
        $query .= " AND DATE(el.created_at) >= ?";
        $params[] = $startDate;
    }
    
    if (!empty($endDate)) {
        $query .= " AND DATE(el.created_at) <= ?";
        $params[] = $endDate;
    }
    
    if ($status !== 'all') {
        $query .= " AND el.status = ?";
        $params[] = $status;
    }
    
    if ($type !== 'all') {
        $query .= " AND el.email_type = ?";
        $params[] = $type;
    }
    
    $query .= " ORDER BY el.created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="email_logs_' . date('Y-m-d_His') . '.csv"');
    
    // Create file pointer
    $output = fopen('php://output', 'w');
    
    // Add BOM for Excel UTF-8 support
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Add headers
    fputcsv($output, [
        'Log ID',
        'Email To',
        'Student Name',
        'Queue Number',
        'Email Type',
        'Subject',
        'Status',
        'Sent At',
        'Error Message'
    ]);
    
    // Add data
    foreach ($logs as $log) {
        fputcsv($output, [
            $log['log_id'],
            $log['email_to'],
            $log['student_name'] ?? 'N/A',
            $log['queue_number'] ?? 'N/A',
            $log['email_type'],
            $log['subject'],
            $log['status'],
            $log['sent_at'] ?? 'Not sent',
            $log['error_message'] ?? ''
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    error_log("Export Email Logs Error: " . $e->getMessage());
    http_response_code(500);
    die('Export failed');
}
?>
