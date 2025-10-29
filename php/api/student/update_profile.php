<?php
/**
 * Student Profile Update API
 * Allows authenticated students to update their information
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

session_start();

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = getDB();
    $input = json_decode(file_get_contents('php://input'), true);
    
    $studentId = $_SESSION['student_id'];
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $middleInitial = trim($input['middle_initial'] ?? '');
    $college = trim($input['college'] ?? '');
    $program = trim($input['program'] ?? '');
    $yearLevel = trim($input['year_level'] ?? '');
    $section = trim($input['section'] ?? '');
    
    // Validate required fields (email is NOT updatable)
    if (empty($firstName) || empty($lastName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'First name and last name are required']);
        exit;
    }
    
    // Update student information (excluding email and student_id)
    $stmt = $db->prepare("
        UPDATE students 
        SET first_name = ?,
            last_name = ?,
            middle_initial = ?,
            college = ?,
            program = ?,
            year_level = ?,
            section = ?,
            updated_at = NOW()
        WHERE student_id = ?
    ");
    
    $stmt->execute([
        $firstName,
        $lastName,
        $middleInitial,
        $college,
        $program,
        $yearLevel,
        $section,
        $studentId
    ]);
    
    // Update session data (keeping email from current session)
    $_SESSION['first_name'] = $firstName;
    $_SESSION['last_name'] = $lastName;
    
    // Get updated student data
    $getStudent = $db->prepare("
        SELECT student_id, first_name, last_name, middle_initial, email, 
               college, program, year_level, section, is_verified, created_at, last_login
        FROM students 
        WHERE student_id = ?
    ");
    $getStudent->execute([$studentId]);
    $studentData = $getStudent->fetch();
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'data' => $studentData
    ]);
    
} catch (PDOException $e) {
    error_log("Update Profile PDO Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Update Profile Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred'
    ]);
}
?>
