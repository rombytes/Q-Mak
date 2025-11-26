<?php
/**
 * Forgot Password API - Step 1: Send OTP to email
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    
    // Validate email
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    $db = getDB();
    
    // Check if student exists with this email
    $stmt = $db->prepare("SELECT student_id, first_name, last_name, email FROM students WHERE email = ?");
    $stmt->execute([$email]);
    $student = $stmt->fetch();
    
    if (!$student) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No account found with this email address']);
        exit;
    }
    
    // Generate 6-digit OTP
    $otpCode = sprintf('%06d', mt_rand(0, 999999));
    
    // Store OTP in session with expiry (10 minutes)
    require_once __DIR__ . '/../../config/session_config.php';
    $_SESSION['forgot_password_otp'] = $otpCode;
    $_SESSION['forgot_password_email'] = $email;
    $_SESSION['forgot_password_student_id'] = $student['student_id'];
    $_SESSION['forgot_password_expiry'] = time() + (10 * 60); // 10 minutes
    
    // Send OTP via email using EmailService class
    $emailResult = EmailService::sendOTP($email, $otpCode, $student['first_name']);
    
    if (!$emailResult['success']) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send OTP email. Please try again.',
            'error' => $emailResult['error'] ?? 'Unknown error'
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent successfully to your email',
        'data' => [
            'email' => $email,
            'student_name' => $student['first_name'] . ' ' . $student['last_name']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Forgot Password PDO Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Forgot Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred'
    ]);
}
?>
