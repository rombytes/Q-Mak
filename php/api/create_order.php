<?php
/**
 * Create Order API - Step 1: Submit order and send OTP
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display, but log them

require_once __DIR__ . '/../config/database.php';

// Check if PHPMailer is available
$emailAvailable = file_exists(__DIR__ . '/../../vendor/autoload.php');
if ($emailAvailable) {
    require_once __DIR__ . '/../utils/email.php';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['studentId', 'fname', 'lname', 'email', 'college', 'program', 'year', 'purchasing'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            echo json_encode(['success' => false, 'message' => "Field '$field' is required"]);
            exit;
        }
    }
    
    $studentId = trim($input['studentId']);
    $fname = trim($input['fname']);
    $lname = trim($input['lname']);
    $minitial = trim($input['minitial'] ?? '');
    $email = trim($input['email']);
    $college = trim($input['college']);
    $program = trim($input['program']);
    $year = intval($input['year']);
    $section = trim($input['section'] ?? '');
    $purchasing = trim($input['purchasing']);
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@umak\.edu\.ph$/', $email)) {
        echo json_encode(['success' => false, 'message' => 'Invalid UMak email address']);
        exit;
    }
    
    $db = getDB();
    $db->beginTransaction();
    
    // Check if student exists, if not create (READ QUERY)
    $stmt = $db->prepare("SELECT student_id FROM students WHERE student_id = ?");
    $stmt->execute([$studentId]);
    
    if (!$stmt->fetch()) {
        // Insert new student (CREATE QUERY)
        $insertStudent = $db->prepare("
            INSERT INTO students (student_id, first_name, last_name, middle_initial, email, college, program, year_level, section)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStudent->execute([$studentId, $fname, $lname, $minitial, $email, $college, $program, $year, $section]);
    } else {
        // Update existing student info (UPDATE)
        $updateStudent = $db->prepare("
            UPDATE students 
            SET first_name = ?, last_name = ?, middle_initial = ?, email = ?, 
                college = ?, program = ?, year_level = ?, section = ?
            WHERE student_id = ?
        ");
        $updateStudent->execute([$fname, $lname, $minitial, $email, $college, $program, $year, $section, $studentId]);
    }
    
    // Generate OTP
    $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . OTP_EXPIRY_MINUTES . ' minutes'));
    
    // Store OTP
    $insertOtp = $db->prepare("
        INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
        VALUES (?, ?, 'order', ?)
    ");
    $insertOtp->execute([$email, $otp, $expiresAt]);
    $otpId = $db->lastInsertId();
    
    $db->commit();
    
    // Send OTP email (if PHPMailer is available)
    if ($emailAvailable) {
        try {
            $emailResult = EmailService::sendOTP($email, $otp, $fname);
            if (!$emailResult['success']) {
                error_log("Failed to send OTP email: " . ($emailResult['error'] ?? 'Unknown error'));
            }
        } catch (Exception $emailError) {
            error_log("Email service error: " . $emailError->getMessage());
            // Continue anyway - OTP is still in response for development
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent to your email',
        'data' => [
            'otp_id' => $otpId,
            'email' => $email,
            'expires_in_minutes' => OTP_EXPIRY_MINUTES,
            // For development/testing only - remove in production
            'otp_code' => $otp
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Create Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
?>
