<?php
/**
 * Email Logs API
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

require_once __DIR__ . '/../config/database.php';

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
        
        // Optional filters
        $emailType = $_GET['type'] ?? 'all';
        $status = $_GET['status'] ?? 'all';
        $search = $_GET['search'] ?? '';
        $limit = intval($_GET['limit'] ?? 100);
        
        $query = "SELECT * FROM email_logs WHERE 1=1";
        $params = [];
        
        // Filter by email type
        if ($emailType !== 'all') {
            $query .= " AND email_type = ?";
            $params[] = $emailType;
        }
        
        // Filter by status
        if ($status !== 'all') {
            $query .= " AND status = ?";
            $params[] = $status;
        }
        
        // Search by recipient email
        if (!empty($search)) {
            $query .= " AND recipient_email LIKE ?";
            $params[] = "%$search%";
        }
        
        // Order by most recent first
        $query .= " ORDER BY sent_at DESC LIMIT ?";
        $params[] = $limit;
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();
        
        // Get statistics
        $statsStmt = $db->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN email_type = 'otp' THEN 1 ELSE 0 END) as otp_emails,
                SUM(CASE WHEN email_type = 'receipt' THEN 1 ELSE 0 END) as receipt_emails,
                SUM(CASE WHEN email_type = 'status_update' THEN 1 ELSE 0 END) as status_emails
            FROM email_logs
        ");
        $stats = $statsStmt->fetch();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'logs' => $logs,
                'stats' => $stats,
                'total_logs' => count($logs)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Email Logs Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
