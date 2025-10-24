<?php
/**
 * Admin Students Management API
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
    // Get all students with optional search
    try {
        $db = getDB();
        
        $search = $_GET['search'] ?? '';
        
        $query = "
            SELECT 
                student_id,
                student_number,
                first_name,
                last_name,
                email,
                COALESCE(college, 'N/A') as college,
                COALESCE(program, 'N/A') as program,
                COALESCE(year_level, 'N/A') as year_level,
                COALESCE(section, 'N/A') as section,
                COALESCE(phone, 'N/A') as phone,
                created_at
            FROM students
            WHERE 1=1
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
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
