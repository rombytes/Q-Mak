<?php
/**
 * Verify Forgot Password OTP and Reset Password API
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
require_once __DIR__ . '/../../config/session_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $otpCode = trim($input['otp_code'] ?? '');
    $newPassword = trim($input['new_password'] ?? '');
    $confirmPassword = trim($input['confirm_password'] ?? '');
    
    // Validate required fields
    if (empty($otpCode) || empty($newPassword) || empty($confirmPassword)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    // Check if OTP session exists
    if (!isset($_SESSION['forgot_password_otp']) || 
        !isset($_SESSION['forgot_password_email']) || 
        !isset($_SESSION['forgot_password_student_id']) ||
        !isset($_SESSION['forgot_password_expiry'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No password reset request found. Please request a new OTP.']);
        exit;
    }
    
    // Check if OTP has expired
    if (time() > $_SESSION['forgot_password_expiry']) {
        // Clear session data
        unset($_SESSION['forgot_password_otp']);
        unset($_SESSION['forgot_password_email']);
        unset($_SESSION['forgot_password_student_id']);
        unset($_SESSION['forgot_password_expiry']);
        
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'OTP has expired. Please request a new one.']);
        exit;
    }
    
    // Verify OTP
    if ($otpCode !== $_SESSION['forgot_password_otp']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid OTP code. Please try again.']);
        exit;
    }
    
    // Check if passwords match
    if ($newPassword !== $confirmPassword) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
        exit;
    }
    
    // ============================================================
    // STRONG PASSWORD VALIDATION - Match registration requirements
    // ============================================================
    $passwordErrors = [];
    
    // Check minimum length
    if (strlen($newPassword) < 8) {
        $passwordErrors[] = 'at least 8 characters';
    }
    
    // Check for uppercase letter
    if (!preg_match('/[A-Z]/', $newPassword)) {
        $passwordErrors[] = 'one uppercase letter (A-Z)';
    }
    
    // Check for lowercase letter
    if (!preg_match('/[a-z]/', $newPassword)) {
        $passwordErrors[] = 'one lowercase letter (a-z)';
    }
    
    // Check for number
    if (!preg_match('/[0-9]/', $newPassword)) {
        $passwordErrors[] = 'one number (0-9)';
    }
    
    // Check for special character
    if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};:\'"\\|,.<>\/?]/', $newPassword)) {
        $passwordErrors[] = 'one special character (!@#$%^&*)';
    }
    
    if (!empty($passwordErrors)) {
        $message = 'Password must contain: ' . implode(', ', $passwordErrors);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
    
    $db = getDB();
    $studentId = $_SESSION['forgot_password_student_id'];
    
    // Debug logging
    error_log("=== PASSWORD RESET DEBUG ===");
    error_log("Student ID: " . $studentId);
    error_log("New password length: " . strlen($newPassword));
    
    // Hash new password
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
    error_log("New hashed password: " . $hashedPassword);
    error_log("Hash length: " . strlen($hashedPassword));
    
    // Update password in database
    $stmt = $db->prepare("
        UPDATE students 
        SET password = ?,
            updated_at = NOW()
        WHERE student_id = ?
    ");
    
    $result = $stmt->execute([$hashedPassword, $studentId]);
    error_log("Update result: " . ($result ? "SUCCESS" : "FAILED"));
    error_log("Rows affected: " . $stmt->rowCount());
    
    // Clear forgot password session data
    unset($_SESSION['forgot_password_otp']);
    unset($_SESSION['forgot_password_email']);
    unset($_SESSION['forgot_password_student_id']);
    unset($_SESSION['forgot_password_expiry']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successfully. You can now login with your new password.'
    ]);
    
} catch (PDOException $e) {
    error_log("Reset Password PDO Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred'
    ]);
}
?>
