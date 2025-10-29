<?php
/**
 * Admin Logs API
 * Track and retrieve admin activities
 * Super Admin Only
 */

session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Check if super admin (only super admin can view logs)
if (!isset($_SESSION['is_super_admin']) || $_SESSION['is_super_admin'] != 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Super admin access required']);
    exit;
}

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get admin logs with filtering
            $adminId = $_GET['admin_id'] ?? 'all';
            $actionType = $_GET['action_type'] ?? 'all';
            $targetType = $_GET['target_type'] ?? 'all';
            $startDate = $_GET['start_date'] ?? '';
            $endDate = $_GET['end_date'] ?? '';
            $search = $_GET['search'] ?? '';
            $limit = intval($_GET['limit'] ?? 100);
            $offset = intval($_GET['offset'] ?? 0);
            
            $query = "
                SELECT 
                    al.log_id,
                    al.admin_id,
                    aa.full_name as admin_name,
                    aa.email as admin_email,
                    al.action_type,
                    al.target_type,
                    al.target_id,
                    al.description,
                    al.details,
                    al.ip_address,
                    al.created_at
                FROM admin_logs al
                LEFT JOIN admin_accounts aa ON al.admin_id = aa.admin_id
                WHERE 1=1
            ";
            $params = [];
            
            // Filter by admin
            if ($adminId !== 'all') {
                $query .= " AND al.admin_id = ?";
                $params[] = $adminId;
            }
            
            // Filter by action type
            if ($actionType !== 'all') {
                $query .= " AND al.action_type = ?";
                $params[] = $actionType;
            }
            
            // Filter by target type
            if ($targetType !== 'all') {
                $query .= " AND al.target_type = ?";
                $params[] = $targetType;
            }
            
            // Filter by date range
            if (!empty($startDate)) {
                $query .= " AND DATE(al.created_at) >= ?";
                $params[] = $startDate;
            }
            if (!empty($endDate)) {
                $query .= " AND DATE(al.created_at) <= ?";
                $params[] = $endDate;
            }
            
            // Search in description
            if (!empty($search)) {
                $query .= " AND (al.description LIKE ? OR al.target_id LIKE ? OR aa.full_name LIKE ?)";
                $searchTerm = "%$search%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            // Order by most recent first
            $query .= " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM admin_logs al WHERE 1=1";
            $countStmt = $db->query($countQuery);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get statistics
            $statsQuery = "
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(DISTINCT admin_id) as unique_admins,
                    COUNT(DISTINCT action_type) as unique_actions,
                    MAX(created_at) as latest_activity
                FROM admin_logs
            ";
            $statsStmt = $db->query($statsQuery);
            $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
            
            // Get action type distribution
            $actionsQuery = "
                SELECT 
                    action_type,
                    COUNT(*) as count
                FROM admin_logs
                GROUP BY action_type
                ORDER BY count DESC
                LIMIT 10
            ";
            $actionsStmt = $db->query($actionsQuery);
            $actionDistribution = $actionsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get admin list for filtering
            $adminsQuery = "
                SELECT DISTINCT 
                    aa.admin_id,
                    aa.full_name,
                    aa.email,
                    COUNT(al.log_id) as action_count
                FROM admin_accounts aa
                LEFT JOIN admin_logs al ON aa.admin_id = al.admin_id
                WHERE aa.is_archived = 0
                GROUP BY aa.admin_id
                ORDER BY aa.full_name
            ";
            $adminsStmt = $db->query($adminsQuery);
            $adminList = $adminsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'logs' => $logs,
                    'total' => $totalCount,
                    'stats' => $stats,
                    'action_distribution' => $actionDistribution,
                    'admin_list' => $adminList,
                    'filters' => [
                        'admin_id' => $adminId,
                        'action_type' => $actionType,
                        'target_type' => $targetType,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'search' => $search
                    ]
                ]
            ]);
            break;
            
        case 'POST':
            // Log an admin action
            $input = json_decode(file_get_contents('php://input'), true);
            
            $adminId = $input['admin_id'] ?? $_SESSION['admin_id'];
            $actionType = $input['action_type'] ?? '';
            $targetType = $input['target_type'] ?? null;
            $targetId = $input['target_id'] ?? null;
            $description = $input['description'] ?? '';
            $details = $input['details'] ?? null;
            
            if (empty($actionType) || empty($description)) {
                echo json_encode(['success' => false, 'message' => 'Action type and description required']);
                exit;
            }
            
            // Get IP address
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
            }
            
            // Get user agent
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
            $stmt = $db->prepare("
                INSERT INTO admin_logs 
                (admin_id, action_type, target_type, target_id, description, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $adminId,
                $actionType,
                $targetType,
                $targetId,
                $description,
                $details ? json_encode($details) : null,
                $ipAddress,
                $userAgent
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Log entry created',
                'log_id' => $db->lastInsertId()
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Admin Logs Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
