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
    // Check if this is a file upload (multipart/form-data) or JSON
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'multipart/form-data') !== false) {
        // File upload - use $_POST and $_FILES
        $input = $_POST;
        $isFileUpload = true;
    } else {
        // JSON data
        $input = json_decode(file_get_contents('php://input'), true);
        $isFileUpload = false;
    }
    
    // Determine service type
    $serviceType = $input['order_type_service'] ?? 'items';
    
    // Validate required fields based on service type
    $required = ['studentId', 'fname', 'lname', 'email', 'college', 'program', 'year'];
    
    if ($serviceType === 'items') {
        $required[] = 'purchasing';
    } else if ($serviceType === 'printing') {
        $required = array_merge($required, ['page_count', 'color_mode', 'paper_size', 'copies']);
    }
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            if (ob_get_level()) { ob_clean(); }
            echo json_encode(['success' => false, 'message' => "Field '$field' is required", 'field' => $field, 'received' => $input]);
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
    $purchasing = $serviceType === 'items' ? trim($input['purchasing']) : '';
    
    // Handle file upload for printing services
    $uploadedFileName = null;
    $storedFileName = null;
    if ($serviceType === 'printing' && $isFileUpload && isset($_FILES['file'])) {
        $file = $_FILES['file'];
        
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error: ' . $file['error']);
        }
        
        // Check file size (10MB max)
        $maxSize = 10 * 1024 * 1024; // 10MB
        if ($file['size'] > $maxSize) {
            throw new Exception('File size exceeds maximum limit of 10MB');
        }
        
        // Check file extension
        $allowedExtensions = ['pdf', 'doc', 'docx'];
        $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($fileExt, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
        }
        
        // Create upload directory if it doesn't exist
        $uploadDir = __DIR__ . '/../../../uploads/printing/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $storedFileName = uniqid('print_') . '_' . time() . '.' . $fileExt;
        $uploadPath = $uploadDir . $storedFileName;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            throw new Exception('Failed to save uploaded file');
        }
        
        $uploadedFileName = $file['name'];
    }
    
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
    
    // Check if email is already registered (has an account)
    try {
        $checkEmail = $db->prepare("SELECT student_id, first_name, last_name, has_account FROM students WHERE email = ?");
        $checkEmail->execute([$email]);
        $existingStudent = $checkEmail->fetch();
        
        if ($existingStudent) {
            // If the student has an account (has_account = 1), they must login
            if ($existingStudent['has_account'] == 1) {
                if (ob_get_level()) { ob_clean(); }
                echo json_encode([
                    'success' => false,
                    'registered' => true,
                    'message' => 'This email has a registered account. Please login to place your order.',
                    'redirect' => '../login.html'
                ]);
                exit;
            }
            // If they don't have an account but email exists (guest order), allow if same student ID
            // or update to the new student ID (in case they used different ID before)
        }
    } catch (PDOException $e) {
        error_log("Email check error: " . $e->getMessage());
        // Continue if check fails - will be handled by unique constraint
    }
    
    $db->beginTransaction();
    
    // Phase 7: Check if student already has an active order for this service type
    // Only check pending/processing orders (NOT scheduled orders)
    $checkActiveOrder = $db->prepare("
        SELECT COUNT(*) as order_count 
        FROM orders 
        WHERE student_id = ? 
        AND order_type_service = ? 
        AND status IN ('pending', 'processing')
        AND is_archived = 0
    ");
    $checkActiveOrder->execute([$studentId, $serviceType]);
    $activeOrderCheck = $checkActiveOrder->fetch();
    
    if ($activeOrderCheck['order_count'] > 0) {
        $db->rollBack();
        $serviceTypeName = ($serviceType === 'items') ? 'Items/Merchandise' : 'Printing Services';
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => "You already have a pending {$serviceTypeName} order. Please complete or cancel it before placing a new one.",
            'error_code' => 'ACTIVE_ORDER_EXISTS'
        ]);
        exit;
    }
    
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
    
    // Prepare order data to store with OTP
    $orderData = [
        'studentId' => $studentId,
        'fname' => $fname,
        'lname' => $lname,
        'minitial' => $minitial,
        'email' => $email,
        'college' => $college,
        'program' => $program,
        'year' => $year,
        'section' => $section,
        'order_type_service' => $serviceType
    ];
    
    if ($serviceType === 'items') {
        $orderData['purchasing'] = $purchasing;
    } else if ($serviceType === 'printing') {
        $orderData['page_count'] = $input['page_count'];
        $orderData['color_mode'] = $input['color_mode'];
        $orderData['paper_size'] = $input['paper_size'];
        $orderData['copies'] = $input['copies'];
        $orderData['double_sided'] = $input['double_sided'] ?? '0';
        $orderData['instructions'] = $input['instructions'] ?? '';
        $orderData['estimated_price'] = $input['estimated_price'] ?? '0';
        $orderData['file_name'] = $uploadedFileName;
        $orderData['stored_file_name'] = $storedFileName;
    }
    
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
    
    $responseData = [
        'otp_id' => $otpId,
        'email' => $email,
        'expires_in_minutes' => OTP_EXPIRY_MINUTES,
        // For development/testing only - remove in production
        'otp_code' => $otp
    ];
    
    // Include file info for printing orders
    if ($serviceType === 'printing' && $storedFileName) {
        $responseData['file_uploaded'] = true;
        $responseData['stored_file_name'] = $storedFileName;
        $responseData['original_file_name'] = $uploadedFileName;
    }
    
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent to your email',
        'data' => $responseData
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
