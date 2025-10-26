<?php
/**
 * Student Login API
 * Handles student authentication and session management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    $db = getDB();
    
    // Get student record
    $stmt = $db->prepare("
        SELECT student_id, first_name, last_name, middle_initial, email, password, 
               college, program, year_level, section, is_verified
        FROM students 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$student) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    // Check if account has password (registered account vs guest order)
    if (empty($student['password'])) {
        echo json_encode([
            'success' => false, 
            'message' => 'This email was used for guest orders. Please register to create a student account.'
        ]);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $student['password'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    // Check if account is verified
    if (!$student['is_verified']) {
        echo json_encode([
            'success' => false, 
            'message' => 'Your account is not verified. Please check your email for the verification link.'
        ]);
        exit;
    }
    
    // Update last login
    $updateLogin = $db->prepare("UPDATE students SET last_login = NOW() WHERE student_id = ?");
    $updateLogin->execute([$student['student_id']]);
    
    // Create session
    session_start();
    $_SESSION['student_logged_in'] = true;
    $_SESSION['student_id'] = $student['student_id'];
    $_SESSION['student_email'] = $student['email'];
    $_SESSION['student_name'] = trim($student['first_name'] . ' ' . ($student['middle_initial'] ? $student['middle_initial'] . '. ' : '') . $student['last_name']);
    $_SESSION['student_data'] = [
        'student_id' => $student['student_id'],
        'first_name' => $student['first_name'],
        'last_name' => $student['last_name'],
        'middle_initial' => $student['middle_initial'],
        'email' => $student['email'],
        'college' => $student['college'],
        'program' => $student['program'],
        'year_level' => $student['year_level'],
        'section' => $student['section']
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'student_id' => $student['student_id'],
            'name' => $_SESSION['student_name'],
            'email' => $student['email'],
            'college' => $student['college'],
            'program' => $student['program']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Student Login API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred during login'
    ]);
}
?>
