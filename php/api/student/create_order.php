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
ob_start();

set_exception_handler(function($e){
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Unhandled error: ' . $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    exit;
});

register_shutdown_function(function(){
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Fatal error: ' . $e['message'], 'file' => $e['file'], 'line' => $e['line']]);
    }
});

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';

// Load new email sender
require_once __DIR__ . '/../../utils/email_sender.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['studentId', 'fname', 'lname', 'email', 'college', 'program', 'year', 'purchasing'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            if (ob_get_level()) { ob_clean(); }
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
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Invalid email format. Please enter a valid email address.']);
        exit;
    }
    
    // Validate UMak email domain
    if (!preg_match('/@umak\.edu\.ph$/i', $email)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Only UMak email addresses (@umak.edu.ph) are allowed.']);
        exit;
    }
    
    $db = getDB();
    
    // Check if email is already registered to a different student ID
    try {
        $checkEmail = $db->prepare("SELECT student_id, first_name, last_name FROM students WHERE email = ? AND student_id != ?");
        $checkEmail->execute([$email, $studentId]);
        $existingStudent = $checkEmail->fetch();
        
        if ($existingStudent) {
            if (ob_get_level()) { ob_clean(); }
            echo json_encode([
                'success' => false, 
                'message' => 'This email is already registered to another student account. Please use your registered email or contact admin.'
            ]);
            exit;
        }
    } catch (PDOException $e) {
        error_log("Email check error: " . $e->getMessage());
        // Continue if check fails - will be handled by unique constraint
    }
    
    $db->beginTransaction();
    
    // Upsert student: insert or update if student_id or email already exists
    $upsertStudent = $db->prepare("
        INSERT INTO students (student_id, first_name, last_name, middle_initial, email, college, program, year_level, section)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            middle_initial = VALUES(middle_initial),
            email = VALUES(email),
            college = VALUES(college),
            program = VALUES(program),
            year_level = VALUES(year_level),
            section = VALUES(section)
    ");
    $upsertStudent->execute([$studentId, $fname, $lname, $minitial, $email, $college, $program, $year, $section]);
    
    // Generate OTP
    $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Delete old OTPs for this email and type to avoid duplicate key constraint
    $deleteOldOtps = $db->prepare("DELETE FROM otp_verifications WHERE email = ? AND otp_type = 'order'");
    $deleteOldOtps->execute([$email]);
    
    // Store OTP using DB time (embed integer for INTERVAL)
    $otpMinutes = (int)(defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10);
    $insertOtp = $db->prepare("
        INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
        VALUES (?, ?, 'order', DATE_ADD(NOW(), INTERVAL $otpMinutes MINUTE))
    ");
    $insertOtp->execute([$email, $otp]);
    $otpId = $db->lastInsertId();
    
    $db->commit();
    
    // Send OTP email using new EmailSender
    try {
        error_log("Attempting to send OTP email to: $email");
        $emailResult = EmailSender::sendOTP($email, $otp, $fname);
        
        if ($emailResult['success']) {
            error_log("✓ OTP email sent successfully to $email");
        } else {
            error_log("✗ Failed to send OTP email to $email: " . ($emailResult['error'] ?? 'Unknown error'));
            error_log("Check detailed log at: " . EmailSender::getLogFilePath());
        }
        // Continue anyway - OTP is in response for development
    } catch (Exception $emailError) {
        error_log("✗ Exception sending OTP email: " . $emailError->getMessage());
        error_log("Stack trace: " . $emailError->getTraceAsString());
        // Continue anyway
    }
    
    if (ob_get_level()) { ob_clean(); }
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
    exit;
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Create Order Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
}
?>
