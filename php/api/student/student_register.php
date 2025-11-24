<?php
/**
 * Student Registration API
 * Handles student account creation with email verification
 */

// Disable error display for production - log errors instead
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../utils/email_sender.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Determine which step: 'register' or 'verify'
    $action = $input['action'] ?? 'register';
    
    if ($action === 'register') {
        // Step 1: Validate input and send OTP
        $required = ['student_id', 'first_name', 'last_name', 'email', 'password', 'college', 'program', 'year_level'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                echo json_encode(['success' => false, 'message' => "Field '$field' is required"]);
                exit;
            }
        }
        
        $studentId = trim($input['student_id']);
        $firstName = trim($input['first_name']);
        $lastName = trim($input['last_name']);
        $middleInitial = trim($input['middle_initial'] ?? '');
        $email = trim($input['email']);
        $password = $input['password'];
        $college = trim($input['college']);
        $program = trim($input['program']);
        $yearLevel = intval($input['year_level']);
        $section = trim($input['section'] ?? '');
        
        // Validate email format and domain
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@umak\.edu\.ph$/', $email)) {
            echo json_encode(['success' => false, 'message' => 'Please use a valid UMak email address (@umak.edu.ph)']);
            exit;
        }
        
        // ============================================================
        // ENHANCED PASSWORD VALIDATION - Strong Password Policy
        // ============================================================
        $passwordErrors = [];
        
        // Check minimum length
        if (strlen($password) < 8) {
            $passwordErrors[] = 'at least 8 characters';
        }
        
        // Check for uppercase letter
        if (!preg_match('/[A-Z]/', $password)) {
            $passwordErrors[] = 'one uppercase letter (A-Z)';
        }
        
        // Check for lowercase letter
        if (!preg_match('/[a-z]/', $password)) {
            $passwordErrors[] = 'one lowercase letter (a-z)';
        }
        
        // Check for number
        if (!preg_match('/[0-9]/', $password)) {
            $passwordErrors[] = 'one number (0-9)';
        }
        
        // Check for special character
        if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};:\'"\\|,.<>\/?]/', $password)) {
            $passwordErrors[] = 'one special character (!@#$%^&*)';
        }
        
        if (!empty($passwordErrors)) {
            $message = 'Password must contain: ' . implode(', ', $passwordErrors);
            echo json_encode(['success' => false, 'message' => $message]);
            exit;
        }
        
        // ============================================================
        // RATE LIMITING - Prevent registration spam
        // ============================================================
        $db = getDB();
        
        // Check OTP attempts table for spam protection
        $checkOTPSpam = $db->prepare("
            SELECT COUNT(*) as otp_count
            FROM otp_verifications
            WHERE created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
            AND otp_type = 'registration'
        ");
        $checkOTPSpam->execute([300]); // 5 minutes
        $otpSpamResult = $checkOTPSpam->fetch();
        
        if ($otpSpamResult && $otpSpamResult['otp_count'] >= 10) {
            error_log("OTP spam detected - too many registration attempts");
            echo json_encode([
                'success' => false,
                'message' => 'System is busy. Please try again in a few minutes.'
            ]);
            exit;
        }
        
        // Start session for claim flags
        require_once __DIR__ . '/../../config/session_config.php';
        
        // Check if student ID already exists
        $checkId = $db->prepare("SELECT student_id, password, email FROM students WHERE student_id = ?");
        $checkId->execute([$studentId]);
        $existingById = $checkId->fetch();
        
        if ($existingById) {
            // If student ID exists but has no password (guest order), allow claiming
            if (empty($existingById['password'])) {
                // Guest account - allow claiming if email matches
                if ($existingById['email'] === $email) {
                    $_SESSION['claim_existing_account'] = true;
                    $_SESSION['existing_student_id'] = $existingById['student_id'];
                } else {
                    echo json_encode(['success' => false, 'message' => 'This Student ID is associated with a different email address. Please use the correct email or contact admin.']);
                    exit;
                }
            } else {
                // Student ID has a password - fully registered account
                echo json_encode(['success' => false, 'message' => 'Student ID already registered. Please login instead.']);
                exit;
            }
        }
        
        // Check if email already exists (for cases where student ID is new but email isn't)
        $checkEmail = $db->prepare("SELECT email, password, student_id FROM students WHERE email = ?");
        $checkEmail->execute([$email]);
        $existingByEmail = $checkEmail->fetch();
        
        if ($existingByEmail && !isset($_SESSION['claim_existing_account'])) {
            // If email exists but has no password (guest order), allow claiming the account
            if (empty($existingByEmail['password'])) {
                // Guest account with different student ID - allow update
                $_SESSION['claim_existing_account'] = true;
                $_SESSION['existing_student_id'] = $existingByEmail['student_id'];
            } else {
                // Email exists with a password - fully registered account
                echo json_encode(['success' => false, 'message' => 'Email address already registered. Please login instead.']);
                exit;
            }
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        
        // Debug logging
        error_log("=== PASSWORD REGISTRATION DEBUG ===");
        error_log("Plain password length: " . strlen($password));
        error_log("Hashed password: " . $passwordHash);
        error_log("Hash length: " . strlen($passwordHash));
        
        // Store registration data in session temporarily
        $_SESSION['student_registration'] = [
            'student_id' => $studentId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'middle_initial' => $middleInitial,
            'email' => $email,
            'password_hash' => $passwordHash,
            'college' => $college,
            'program' => $program,
            'year_level' => $yearLevel,
            'section' => $section,
            'timestamp' => time()
        ];
        
        // Generate OTP
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Delete old OTPs for this email
        $deleteOldOtps = $db->prepare("DELETE FROM otp_verifications WHERE email = ? AND otp_type = 'registration'");
        $deleteOldOtps->execute([$email]);
        
        // Store OTP
        $otpMinutes = (int)(defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10);
        $insertOtp = $db->prepare("
            INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
            VALUES (?, ?, 'registration', DATE_ADD(NOW(), INTERVAL $otpMinutes MINUTE))
        ");
        $insertOtp->execute([$email, $otp]);
        
        // Send OTP email using new EmailSender
        try {
            error_log("Attempting to send registration OTP to: $email");
            $emailResult = EmailSender::sendOTP($email, $otp, $firstName);
            
            if ($emailResult['success']) {
                error_log("✓ Registration OTP sent successfully to $email");
            } else {
                error_log("✗ Failed to send registration OTP: " . ($emailResult['error'] ?? 'Unknown error'));
                error_log("Check detailed log at: " . EmailSender::getLogFilePath());
            }
        } catch (Exception $e) {
            error_log("✗ Exception sending registration OTP: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Verification code sent to your email',
            'data' => [
                'email' => $email,
                'expires_in_minutes' => $otpMinutes,
                'otp_code' => $otp // For development only - remove in production
            ]
        ]);
        
    } elseif ($action === 'verify') {
        // Step 2: Verify OTP and create account
        $email = trim($input['email'] ?? '');
        $otp = trim($input['otp_code'] ?? '');
        
        if (empty($email) || empty($otp)) {
            echo json_encode(['success' => false, 'message' => 'Email and OTP code are required']);
            exit;
        }
        
        require_once __DIR__ . '/../../config/session_config.php';
        
        if (!isset($_SESSION['student_registration'])) {
            echo json_encode(['success' => false, 'message' => 'Registration session expired. Please start again.']);
            exit;
        }
        
        $regData = $_SESSION['student_registration'];
        
        // Check session timeout (30 minutes)
        if (time() - $regData['timestamp'] > 1800) {
            unset($_SESSION['student_registration']);
            echo json_encode(['success' => false, 'message' => 'Registration session expired. Please start again.']);
            exit;
        }
        
        if ($regData['email'] !== $email) {
            echo json_encode(['success' => false, 'message' => 'Email mismatch']);
            exit;
        }
        
        $db = getDB();
        
        // Get the latest OTP record for this email
        $getOtp = $db->prepare("
            SELECT 
                otp_id, 
                otp_code, 
                attempts, 
                max_attempts, 
                is_verified, 
                expires_at
            FROM otp_verifications 
            WHERE email = ? AND otp_type = 'registration' AND is_verified = FALSE
            ORDER BY otp_id DESC 
            LIMIT 1
        ");
        $getOtp->execute([$email]);
        $otpRecord = $getOtp->fetch();
        
        if (!$otpRecord) {
            echo json_encode(['success' => false, 'message' => 'No verification code found. Please request a new one.']);
            exit;
        }
        
        // Check if already exceeded max attempts FIRST (before checking code)
        if ($otpRecord['attempts'] >= $otpRecord['max_attempts']) {
            echo json_encode(['success' => false, 'message' => 'Maximum attempts exceeded. Please request a new verification code.']);
            exit;
        }
        
        // Now check if OTP code matches
        if ($otpRecord['otp_code'] !== $otp) {
            // Wrong code - increment attempts
            $newAttempts = $otpRecord['attempts'] + 1;
            $updateAttempts = $db->prepare("UPDATE otp_verifications SET attempts = ? WHERE otp_id = ?");
            $updateAttempts->execute([$newAttempts, $otpRecord['otp_id']]);
            
            // Check if max attempts exceeded after increment
            if ($newAttempts >= $otpRecord['max_attempts']) {
                echo json_encode(['success' => false, 'message' => 'Verification failed. You have run out of tries.']);
            } else {
                $remaining = $otpRecord['max_attempts'] - $newAttempts;
                echo json_encode(['success' => false, 'message' => "Invalid verification code. $remaining attempt(s) remaining."]);
            }
            exit;
        }
        
        // OTP code is correct - accept it (no expiration check during retries)
        // Mark OTP as verified
        $markVerified = $db->prepare("
            UPDATE otp_verifications 
            SET is_verified = 1, verified_at = NOW() 
            WHERE otp_id = ?
        ");
        $markVerified->execute([$otpRecord['otp_id']]);
        
        // Create or update student account
        $db->beginTransaction();
        
        try {
            // Check if this is claiming an existing guest account
            $claimingAccount = isset($_SESSION['claim_existing_account']) && $_SESSION['claim_existing_account'];
            
            if ($claimingAccount && isset($_SESSION['existing_student_id'])) {
                // Update existing guest order account with password and full info
                // Use existing_student_id in WHERE to avoid PRIMARY KEY conflict
                $oldStudentId = $_SESSION['existing_student_id'];
                
                // If the new student_id is different from old, update it
                if ($oldStudentId !== $regData['student_id']) {
                    // First, update all orders to use the new student_id
                    $updateOrders = $db->prepare("UPDATE orders SET student_id = ? WHERE student_id = ?");
                    $updateOrders->execute([$regData['student_id'], $oldStudentId]);
                }
                
                $updateStudent = $db->prepare("
                    UPDATE students 
                    SET student_id = ?, first_name = ?, last_name = ?, middle_initial = ?, 
                        password = ?, college = ?, program = ?, year_level = ?, 
                        section = ?, is_verified = 1, verified_at = NOW(), updated_at = NOW()
                    WHERE student_id = ? AND email = ?
                ");
                
                $updateStudent->execute([
                    $regData['student_id'],
                    $regData['first_name'],
                    $regData['last_name'],
                    $regData['middle_initial'],
                    $regData['password_hash'],
                    $regData['college'],
                    $regData['program'],
                    $regData['year_level'],
                    $regData['section'],
                    $oldStudentId,
                    $regData['email']
                ]);
                
                // Clear claim flags
                unset($_SESSION['claim_existing_account']);
                unset($_SESSION['existing_student_id']);
            } else {
                // Debug logging
                error_log("=== INSERTING NEW STUDENT ===");
                error_log("Password hash from session: " . $regData['password_hash']);
                error_log("Hash length: " . strlen($regData['password_hash']));
                
                // Insert new student account
                $insertStudent = $db->prepare("
                    INSERT INTO students 
                    (student_id, first_name, last_name, middle_initial, email, password, 
                     college, program, year_level, section, is_verified, verified_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
                ");
                
                $insertStudent->execute([
                    $regData['student_id'],
                    $regData['first_name'],
                    $regData['last_name'],
                    $regData['middle_initial'],
                    $regData['email'],
                    $regData['password_hash'],
                    $regData['college'],
                    $regData['program'],
                    $regData['year_level'],
                    $regData['section']
                ]);
                
                error_log("✓ Student inserted successfully");
            }
            
            $db->commit();
            
            // Clear registration session
            unset($_SESSION['student_registration']);
            
            // Create login session
            $_SESSION['student_logged_in'] = true;
            $_SESSION['student_id'] = $regData['student_id'];
            $_SESSION['student_email'] = $regData['email'];
            $_SESSION['student_name'] = $regData['first_name'] . ' ' . $regData['last_name'];
            
            echo json_encode([
                'success' => true,
                'message' => 'Account created successfully!',
                'data' => [
                    'student_id' => $regData['student_id'],
                    'email' => $regData['email'],
                    'name' => $_SESSION['student_name']
                ]
            ]);
            
        } catch (Exception $e) {
            $db->rollBack();
            error_log("Student registration error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            // Show more detailed error in development
            $errorMessage = 'Failed to create account. Please try again.';
            if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                $errorMessage = 'This Student ID or Email is already registered.';
            } elseif (strpos($e->getMessage(), 'foreign key constraint') !== false) {
                $errorMessage = 'Database relationship error. Please contact admin.';
            }
            
            echo json_encode([
                'success' => false, 
                'message' => $errorMessage,
                'debug' => $e->getMessage(), // Show error for debugging
                'trace' => $e->getFile() . ':' . $e->getLine()
            ]);
        }
        
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    error_log("Student Registration API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred during registration'
    ]);
}
?>
