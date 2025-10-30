<?php
/**
 * Export Admin Logs to Excel (CSV format)
 * Accessible by Super Admins only
 */

session_start();
require_once __DIR__ . '/../../config/database.php';

// Check admin authentication and super admin privileges
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized');
}

try {
    $db = getDB();
    
    // Check if user is super admin
    $stmt = $db->prepare("SELECT is_super_admin FROM admin_accounts WHERE admin_id = ?");
    $stmt->execute([$_SESSION['admin_id']]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin || $admin['is_super_admin'] != 1) {
        http_response_code(403);
        die('Forbidden: Super Admin access required');
    }
    
    // Check if specific log IDs are requested (POST request)
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['log_ids'])) {
        $logIds = json_decode($_POST['log_ids'], true);
        
        if (!is_array($logIds) || empty($logIds)) {
            http_response_code(400);
            die('Invalid log IDs');
        }
        
        $placeholders = str_repeat('?,', count($logIds) - 1) . '?';
        
        $query = "
            SELECT 
                al.log_id,
                al.admin_id,
                a.full_name as admin_name,
                a.username,
                al.action_type,
                al.description,
                al.ip_address,
                al.created_at
            FROM admin_logs al
            LEFT JOIN admin_accounts a ON al.admin_id = a.admin_id
            WHERE al.log_id IN ($placeholders)
            ORDER BY al.created_at DESC
        ";
        
        $params = $logIds;
    } else {
        // Export all with filters (GET request)
        $adminFilter = $_GET['admin_id'] ?? 'all';
        $actionFilter = $_GET['action_type'] ?? 'all';
        $startDate = $_GET['start_date'] ?? '';
        $endDate = $_GET['end_date'] ?? '';
        $search = $_GET['search'] ?? '';
        
        $query = "
            SELECT 
                al.log_id,
                al.admin_id,
                a.full_name as admin_name,
                a.username,
                al.action_type,
                al.description,
                al.ip_address,
                al.created_at
            FROM admin_logs al
            LEFT JOIN admin_accounts a ON al.admin_id = a.admin_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($adminFilter !== 'all') {
            $query .= " AND al.admin_id = ?";
            $params[] = $adminFilter;
        }
        
        if ($actionFilter !== 'all') {
            $query .= " AND al.action_type = ?";
            $params[] = $actionFilter;
        }
        
        if (!empty($startDate)) {
            $query .= " AND DATE(al.created_at) >= ?";
            $params[] = $startDate;
        }
        
        if (!empty($endDate)) {
            $query .= " AND DATE(al.created_at) <= ?";
            $params[] = $endDate;
        }
        
        if (!empty($search)) {
            $query .= " AND (
                a.full_name LIKE ? OR 
                a.username LIKE ? OR 
                al.description LIKE ?
            )";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " ORDER BY al.created_at DESC";
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="admin_logs_' . date('Y-m-d_His') . '.csv"');
    
    // Create file pointer
    $output = fopen('php://output', 'w');
    
    // Add BOM for Excel UTF-8 support
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Add headers
    fputcsv($output, [
        'Log ID',
        'Admin ID',
        'Admin Name',
        'Username',
        'Action Type',
        'Description',
        'IP Address',
        'Timestamp'
    ]);
    
    // Add data
    foreach ($logs as $log) {
        fputcsv($output, [
            $log['log_id'],
            $log['admin_id'],
            $log['admin_name'] ?? 'Unknown',
            $log['username'] ?? 'N/A',
            $log['action_type'],
            $log['description'] ?? '',
            $log['ip_address'] ?? 'N/A',
            $log['created_at']
        ]);
    }
    
    fclose($output);
    
    // Log the export action
    $logStmt = $db->prepare("
        INSERT INTO admin_logs (admin_id, action_type, description, ip_address)
        VALUES (?, 'export_admin_logs', ?, ?)
    ");
    $logStmt->execute([
        $_SESSION['admin_id'],
        "Exported " . count($logs) . " admin log entries",
        $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ]);
    
} catch (Exception $e) {
    error_log("Export Admin Logs Error: " . $e->getMessage());
    http_response_code(500);
    die('Export failed');
}
?>
