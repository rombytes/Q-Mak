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

// Check if PHPMailer is available
$emailAvailable = file_exists(__DIR__ . '/../../vendor/autoload.php');
if ($emailAvailable) {
    require_once __DIR__ . '/../../utils/email.php';
}

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
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@umak\.edu\.ph$/', $email)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Invalid UMak email address']);
        exit;
    }
    
    $db = getDB();
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
