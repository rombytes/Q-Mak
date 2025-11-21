<?php
/**
 * Export Email Logs to Excel (CSV format)
 */

require_once __DIR__ . '/../../config/session_config.php';
require_once __DIR__ . '/../../config/database.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized');
}

try {
    $db = getDB();
    
    // Support both GET and POST methods
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    
    if ($requestMethod === 'POST') {
        // Get POST data
        $input = json_decode(file_get_contents('php://input'), true);
        $type = $input['type'] ?? 'all';
        $status = $input['status'] ?? 'all';
        $search = $input['search'] ?? '';
        $isArchived = $input['is_archived'] ?? 0;
    } else {
        // Get GET parameters
        $type = $_GET['type'] ?? 'all';
        $status = $_GET['status'] ?? 'all';
        $search = $_GET['search'] ?? '';
        $isArchived = $_GET['is_archived'] ?? 0;
    }
    
    $query = "
        SELECT 
            el.log_id,
            el.email_to,
            el.email_type,
            el.subject,
            el.status,
            el.sent_at,
            el.error_message,
            el.is_archived,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            o.queue_number,
            o.item_ordered
        FROM email_logs el
        LEFT JOIN students s ON el.student_id = s.student_id
        LEFT JOIN orders o ON el.order_id = o.order_id
        WHERE el.is_archived = ?
    ";
    
    $params = [$isArchived];
    
    if ($type !== 'all') {
        $query .= " AND el.email_type = ?";
        $params[] = $type;
    }
    
    if ($status !== 'all') {
        $query .= " AND el.status = ?";
        $params[] = $status;
    }
    
    if (!empty($search)) {
        $query .= " AND (el.email_to LIKE ? OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $query .= " ORDER BY el.sent_at DESC";
    
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
        'Item Ordered',
        'Email Type',
        'Subject',
        'Status',
        'Sent At',
        'Error Message',
        'Archived'
    ]);
    
    // Add data
    foreach ($logs as $log) {
        fputcsv($output, [
            $log['log_id'],
            $log['email_to'],
            $log['student_name'] ?? 'N/A',
            $log['queue_number'] ?? 'N/A',
            $log['item_ordered'] ?? 'N/A',
            ucfirst($log['email_type']),
            $log['subject'],
            ucfirst($log['status']),
            $log['sent_at'] ?? 'Not sent',
            $log['error_message'] ?? '',
            $log['is_archived'] ? 'Yes' : 'No'
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    error_log("Export Email Logs Error: " . $e->getMessage());
    http_response_code(500);
    die('Export failed');
}
?>
