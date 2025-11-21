<?php
/**
 * Admin Students Management API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/admin_logger.php';
require_once __DIR__ . '/../../config/session_config.php';

// Debug: Log session data on every request
error_log("=== admin_students.php Session Debug ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . json_encode($_SESSION));
error_log("is_super_admin value: " . ($_SESSION['is_super_admin'] ?? 'NOT SET'));
error_log("is_super_admin type: " . gettype($_SESSION['is_super_admin'] ?? null));
error_log("=======================================");

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all students with optional search and archive filter
    try {
        $db = getDB();
        
        $search = $_GET['search'] ?? '';
        $showArchived = $_GET['archived'] ?? 'false';
        
        $query = "
            SELECT 
                student_id,
                first_name,
                last_name,
                middle_initial,
                email,
                COALESCE(college, 'N/A') as college,
                COALESCE(program, 'N/A') as program,
                COALESCE(year_level, 'N/A') as year_level,
                COALESCE(section, 'N/A') as section,
                is_verified,
                created_at,
                last_login,
                is_archived,
                archived_at,
                archived_by,
                (SELECT full_name FROM admin_accounts WHERE admin_id = students.archived_by) as archived_by_name,
                CASE 
                    WHEN password IS NOT NULL AND password != '' THEN 1
                    ELSE 0
                END as has_account,
                (SELECT COUNT(*) FROM orders WHERE orders.student_id = students.student_id) as total_orders
            FROM students
            WHERE 1=1
        ";
        
        $params = [];
        
        // Filter by archive status
        if ($showArchived === 'true') {
            $query .= " AND is_archived = 1";
        } else {
            $query .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        
        if (!empty($search)) {
            $query .= " AND (student_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $students = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'students' => $students,
                'total_students' => count($students)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Students Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Update student information (super admin only)
    try {
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'update';
        
        if ($action === 'archive' || $action === 'restore') {
            // Archive or restore student (both admins can do this)
            $studentId = $input['student_id'] ?? '';
            
            if (empty($studentId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Student ID required']);
                exit;
            }
            
            // Get student name for logging
            $nameStmt = $db->prepare("SELECT CONCAT(first_name, ' ', last_name) as name FROM students WHERE student_id = ?");
            $nameStmt->execute([$studentId]);
            $studentName = $nameStmt->fetchColumn();
            
            if ($action === 'archive') {
                $stmt = $db->prepare("
                    UPDATE students 
                    SET is_archived = 1, archived_at = NOW(), archived_by = ?
                    WHERE student_id = ?
                ");
                $stmt->execute([$_SESSION['admin_id'], $studentId]);
                
                // Log the action
                logStudentAction($_SESSION['admin_id'], 'archive', $studentId, $studentName);
                
                echo json_encode(['success' => true, 'message' => 'Student archived successfully']);
                
            } else { // restore
                // Check if super admin - log everything for debugging
                $sessionData = [
                    'admin_id' => $_SESSION['admin_id'] ?? 'not set',
                    'is_super_admin' => $_SESSION['is_super_admin'] ?? 'not set',
                    'admin_email' => $_SESSION['admin_email'] ?? 'not set',
                    'session_id' => session_id()
                ];
                error_log("Restore attempt - Session data: " . json_encode($sessionData));
                
                // Check super admin permission
                if (!isset($_SESSION['is_super_admin'])) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Session data missing. Please re-login.',
                        'debug' => $sessionData
                    ]);
                    exit;
                }
                
                // Convert to int for comparison
                $isSuperAdmin = (int)$_SESSION['is_super_admin'];
                
                if ($isSuperAdmin !== 1) {
                    http_response_code(403);
                    error_log("Restore denied - is_super_admin value: " . var_export($_SESSION['is_super_admin'], true) . " (converted: $isSuperAdmin)");
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Only super admin can restore archived students. Your permission level: ' . $isSuperAdmin,
                        'debug' => $sessionData
                    ]);
                    exit;
                }
                
                // Perform restore
                $stmt = $db->prepare("
                    UPDATE students 
                    SET is_archived = 0, archived_at = NULL, archived_by = NULL
                    WHERE student_id = ?
                ");
                $result = $stmt->execute([$studentId]);
                
                if ($result && $stmt->rowCount() > 0) {
                    // Log the action
                    logStudentAction($_SESSION['admin_id'], 'restore', $studentId, $studentName);
                    
                    echo json_encode(['success' => true, 'message' => 'Student restored successfully']);
                } else if ($result) {
                    echo json_encode(['success' => false, 'message' => 'Student not found or already restored']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to restore student in database']);
                }
            }
            
        } else {
            // Update student information (super admin only)
            if (!isset($_SESSION['is_super_admin']) || $_SESSION['is_super_admin'] != 1) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Only super admin can edit student records']);
                exit;
            }
            
            $studentId = $input['student_id'] ?? '';
            $firstName = $input['first_name'] ?? '';
            $lastName = $input['last_name'] ?? '';
            $email = $input['email'] ?? '';
            $college = $input['college'] ?? null;
            $program = $input['program'] ?? null;
            $yearLevel = $input['year_level'] ?? null;
            $section = $input['section'] ?? null;
            
            if (empty($studentId) || empty($firstName) || empty($lastName) || empty($email)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                exit;
            }
            
            // Check if student exists
            $checkStmt = $db->prepare("SELECT student_id FROM students WHERE student_id = ?");
            $checkStmt->execute([$studentId]);
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                exit;
            }
            
            // Update student information
            $stmt = $db->prepare("
                UPDATE students 
                SET first_name = ?,
                    last_name = ?,
                    email = ?,
                    college = ?,
                    program = ?,
                    year_level = ?,
                    section = ?
                WHERE student_id = ?
            ");
            
            $stmt->execute([
                $firstName,
                $lastName,
                $email,
                $college,
                $program,
                $yearLevel,
                $section,
                $studentId
            ]);
            
            // Log the action
            logStudentAction(
                $_SESSION['admin_id'], 
                'update', 
                $studentId, 
                "$firstName $lastName",
                ['email' => $email, 'college' => $college, 'program' => $program]
            );
            
            echo json_encode([
                'success' => true,
                'message' => 'Student information updated successfully'
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Update Student Error: " . $e->getMessage());
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
