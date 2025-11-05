<?php
/**
 * Security Management API
 * Admin interface for managing security events and locked accounts
 * Created: November 6, 2025
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/brute_force_protection.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin login required.']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
    $security = new BruteForceProtection();
    
    switch ($action) {
        case 'get_locked_accounts':
            getLockedAccounts($db);
            break;
            
        case 'get_security_logs':
            getSecurityLogs($db);
            break;
            
        case 'get_ip_blacklist':
            getIPBlacklist($db);
            break;
            
        case 'unlock_account':
            unlockAccount($db, $security);
            break;
            
        case 'unblock_ip':
            unblockIP($db, $security);
            break;
            
        case 'get_statistics':
            getSecurityStatistics($db);
            break;
            
        case 'get_account_status':
            getAccountStatus($db);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
    
} catch (Exception $e) {
    error_log("Security Management API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred'
    ]);
}

/**
 * Get all currently locked accounts
 */
function getLockedAccounts($db) {
    $stmt = $db->prepare("
        SELECT 
            attempt_id,
            identifier,
            identifier_type,
            attempt_type,
            failed_attempts,
            first_attempt_at,
            last_attempt_at,
            locked_until,
            is_locked,
            lockout_count,
            ip_address
        FROM security_attempts
        WHERE is_locked = 1
        AND locked_until > NOW()
        ORDER BY last_attempt_at DESC
    ");
    $stmt->execute();
    $accounts = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $accounts,
        'count' => count($accounts)
    ]);
}

/**
 * Get security logs with filtering
 */
function getSecurityLogs($db) {
    $limit = $_GET['limit'] ?? 100;
    $offset = $_GET['offset'] ?? 0;
    $severity = $_GET['severity'] ?? null;
    $eventType = $_GET['event_type'] ?? null;
    $userIdentifier = $_GET['user_identifier'] ?? null;
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    
    $where = ['1=1'];
    $params = [];
    
    if ($severity) {
        $where[] = "severity = ?";
        $params[] = $severity;
    }
    
    if ($eventType) {
        $where[] = "event_type = ?";
        $params[] = $eventType;
    }
    
    if ($userIdentifier) {
        $where[] = "user_identifier LIKE ?";
        $params[] = "%{$userIdentifier}%";
    }
    
    if ($startDate) {
        $where[] = "created_at >= ?";
        $params[] = $startDate;
    }
    
    if ($endDate) {
        $where[] = "created_at <= ?";
        $params[] = $endDate . ' 23:59:59';
    }
    
    $whereClause = implode(' AND ', $where);
    
    // Get total count
    $countStmt = $db->prepare("
        SELECT COUNT(*) as total
        FROM security_logs
        WHERE {$whereClause}
    ");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    // Get logs
    $params[] = (int)$limit;
    $params[] = (int)$offset;
    
    $stmt = $db->prepare("
        SELECT 
            log_id,
            event_type,
            severity,
            user_type,
            user_identifier,
            ip_address,
            user_agent,
            description,
            metadata,
            created_at
        FROM security_logs
        WHERE {$whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
    $logs = $stmt->fetchAll();
    
    // Parse JSON metadata
    foreach ($logs as &$log) {
        if ($log['metadata']) {
            $log['metadata'] = json_decode($log['metadata'], true);
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $logs,
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

/**
 * Get IP blacklist
 */
function getIPBlacklist($db) {
    $includeInactive = $_GET['include_inactive'] ?? false;
    
    $where = $includeInactive ? '1=1' : 'is_active = 1';
    
    $stmt = $db->prepare("
        SELECT 
            blacklist_id,
            ip_address,
            reason,
            block_type,
            blocked_until,
            is_active,
            created_at
        FROM ip_blacklist
        WHERE {$where}
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $ips = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $ips,
        'count' => count($ips)
    ]);
}

/**
 * Unlock an account
 */
function unlockAccount($db, $security) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $identifier = $input['identifier'] ?? '';
    $attemptType = $input['attempt_type'] ?? '';
    
    if (empty($identifier) || empty($attemptType)) {
        echo json_encode(['success' => false, 'message' => 'Identifier and attempt type are required']);
        return;
    }
    
    $result = $security->unlockAccount($identifier, $attemptType);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Account unlocked successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Account not found or already unlocked'
        ]);
    }
}

/**
 * Unblock an IP address
 */
function unblockIP($db, $security) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $ip = $input['ip_address'] ?? '';
    
    if (empty($ip)) {
        echo json_encode(['success' => false, 'message' => 'IP address is required']);
        return;
    }
    
    $result = $security->unblockIP($ip);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'IP unblocked successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'IP not found or already unblocked'
        ]);
    }
}

/**
 * Get security statistics
 */
function getSecurityStatistics($db) {
    $stats = [];
    
    // Total locked accounts
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM security_attempts
        WHERE is_locked = 1 AND locked_until > NOW()
    ");
    $stats['locked_accounts'] = $stmt->fetch()['count'];
    
    // Total blacklisted IPs
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM ip_blacklist
        WHERE is_active = 1
    ");
    $stats['blacklisted_ips'] = $stmt->fetch()['count'];
    
    // Failed login attempts today
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM security_logs
        WHERE event_type = 'login_failed'
        AND DATE(created_at) = CURDATE()
    ");
    $stats['failed_logins_today'] = $stmt->fetch()['count'];
    
    // Successful logins today
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM security_logs
        WHERE event_type = 'login_success'
        AND DATE(created_at) = CURDATE()
    ");
    $stats['successful_logins_today'] = $stmt->fetch()['count'];
    
    // Critical events in last 24 hours
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM security_logs
        WHERE severity = 'critical'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $stats['critical_events_24h'] = $stmt->fetch()['count'];
    
    // Recent events by type (last 7 days)
    $stmt = $db->query("
        SELECT event_type, COUNT(*) as count
        FROM security_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY event_type
        ORDER BY count DESC
    ");
    $stats['event_breakdown'] = $stmt->fetchAll();
    
    // Top IPs with failed attempts
    $stmt = $db->query("
        SELECT ip_address, COUNT(*) as count
        FROM security_logs
        WHERE event_type = 'login_failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 10
    ");
    $stats['top_failed_ips'] = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $stats
    ]);
}

/**
 * Get specific account status
 */
function getAccountStatus($db) {
    $identifier = $_GET['identifier'] ?? '';
    $attemptType = $_GET['attempt_type'] ?? 'student_login';
    
    if (empty($identifier)) {
        echo json_encode(['success' => false, 'message' => 'Identifier is required']);
        return;
    }
    
    $security = new BruteForceProtection();
    $status = $security->getAccountStatus($identifier, $attemptType);
    
    echo json_encode([
        'success' => true,
        'data' => $status
    ]);
}

?>
