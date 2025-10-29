<?php
/**
 * Email Logs API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
        
        // Optional filters
        $emailType = $_GET['type'] ?? 'all';
        $status = $_GET['status'] ?? 'all';
        $search = $_GET['search'] ?? '';
        $showArchived = $_GET['archived'] ?? 'false';
        $limit = intval($_GET['limit'] ?? 100);
        
        $query = "
            SELECT 
                log_id,
                order_id,
                student_id,
                recipient_email,
                email_type,
                subject,
                status,
                sent_at,
                error_message,
                created_at,
                is_archived,
                archived_at,
                archived_by
            FROM email_logs 
            WHERE 1=1
        ";
        $params = [];
        
        // Filter by archived status
        if ($showArchived === 'true') {
            $query .= " AND is_archived = 1";
        } else {
            $query .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        
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
                SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived,
                SUM(CASE WHEN email_type = 'otp' THEN 1 ELSE 0 END) as otp_emails,
                SUM(CASE WHEN email_type = 'receipt' THEN 1 ELSE 0 END) as receipt_emails,
                SUM(CASE WHEN email_type = 'status_update' THEN 1 ELSE 0 END) as status_emails
            FROM email_logs
            WHERE (is_archived = 0 OR is_archived IS NULL)
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
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Archive or Restore email logs
    try {
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        $logIds = $input['log_ids'] ?? [];
        
        if (empty($logIds) || !is_array($logIds)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No log IDs provided']);
            exit;
        }
        
        if ($action === 'archive') {
            // Archive logs (both admin and super admin can do this)
            $placeholders = implode(',', array_fill(0, count($logIds), '?'));
            $stmt = $db->prepare("
                UPDATE email_logs 
                SET is_archived = 1, 
                    archived_at = NOW(), 
                    archived_by = ?
                WHERE log_id IN ($placeholders)
            ");
            $params = array_merge([$_SESSION['admin_id']], $logIds);
            $stmt->execute($params);
            
            echo json_encode([
                'success' => true,
                'message' => 'Email logs archived successfully'
            ]);
            
        } elseif ($action === 'restore') {
            // Restore logs (only super admin)
            // Check both is_super_admin field and role field for compatibility
            $isSuperAdmin = (isset($_SESSION['is_super_admin']) && $_SESSION['is_super_admin'] == 1) || 
                           (isset($_SESSION['role']) && $_SESSION['role'] === 'super_admin');
            
            if (!$isSuperAdmin) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Only super admin can restore archived logs']);
                exit;
            }
            
            $placeholders = implode(',', array_fill(0, count($logIds), '?'));
            $stmt = $db->prepare("
                UPDATE email_logs 
                SET is_archived = 0, 
                    archived_at = NULL, 
                    archived_by = NULL
                WHERE log_id IN ($placeholders)
            ");
            $stmt->execute($logIds);
            
            echo json_encode([
                'success' => true,
                'message' => 'Email logs restored successfully'
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        
    } catch (Exception $e) {
        error_log("Update Email Logs Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Permanently delete email logs (only super admin)
    try {
        // Check both is_super_admin field and role field for compatibility
        $isSuperAdmin = (isset($_SESSION['is_super_admin']) && $_SESSION['is_super_admin'] == 1) || 
                       (isset($_SESSION['role']) && $_SESSION['role'] === 'super_admin');
        
        if (!$isSuperAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only super admin can permanently delete logs']);
            exit;
        }
        
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        $logIds = $input['log_ids'] ?? [];
        
        if (empty($logIds) || !is_array($logIds)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No log IDs provided']);
            exit;
        }
        
        $placeholders = implode(',', array_fill(0, count($logIds), '?'));
        $stmt = $db->prepare("DELETE FROM email_logs WHERE log_id IN ($placeholders) AND is_archived = 1");
        $stmt->execute($logIds);
        
        echo json_encode([
            'success' => true,
            'message' => 'Email logs permanently deleted'
        ]);
        
    } catch (Exception $e) {
        error_log("Delete Email Logs Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
