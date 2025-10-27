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

session_start();

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all students with optional search
    try {
        $db = getDB();
        
        $search = $_GET['search'] ?? '';
        
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
                last_login
            FROM students
            WHERE password IS NOT NULL
        ";
        
        $params = [];
        
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
        // Check if user is super admin
        if ($_SESSION['role'] !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only super admin can edit student records']);
            exit;
        }
        
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        
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
        
        echo json_encode([
            'success' => true,
            'message' => 'Student information updated successfully'
        ]);
        
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
