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

// Use shared session configuration
require_once __DIR__ . '/../../config/session_config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/brute_force_protection.php';

// Initialize brute force protection
$security = new BruteForceProtection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $captchaToken = $input['captcha_token'] ?? '';
    $captchaAnswer = $input['captcha_answer'] ?? '';
    $recaptchaResponse = $input['g-recaptcha-response'] ?? $input['recaptcha_response'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    // Check if account is locked
    if ($security->isLocked($email, 'student_login')) {
        $status = $security->getAccountStatus($email, 'student_login');
        echo json_encode([
            'success' => false,
            'message' => 'Account temporarily locked due to multiple failed login attempts. Please try again later.',
            'locked_until' => $status['locked_until'] ?? null
        ]);
        exit;
    }
    
    // Check if CAPTCHA is required
    $requiresCaptcha = $security->requiresCaptcha($email, 'student_login');
    if ($requiresCaptcha) {
        // Generate CAPTCHA info (for Google reCAPTCHA, this includes site key)
        $captcha = $security->generateCaptcha($email);
        
        // Check if user has provided CAPTCHA response
        if ($captcha['type'] === 'recaptcha' || $captcha['type'] === 'recaptcha_v3') {
            // Google reCAPTCHA
            if (empty($recaptchaResponse)) {
                echo json_encode([
                    'success' => false,
                    'requires_captcha' => true,
                    'captcha' => $captcha,
                    'message' => 'CAPTCHA verification required'
                ]);
                exit;
            }
            
            // Verify Google reCAPTCHA
            if (!$security->verifyCaptcha($recaptchaResponse, null, $email)) {
                echo json_encode([
                    'success' => false,
                    'requires_captcha' => true,
                    'captcha' => $captcha,
                    'message' => 'Invalid CAPTCHA. Please verify you are not a robot.'
                ]);
                exit;
            }
        } else {
            // Custom CAPTCHA (math, text)
            if (empty($captchaToken) || empty($captchaAnswer)) {
                echo json_encode([
                    'success' => false,
                    'requires_captcha' => true,
                    'captcha' => $captcha,
                    'message' => 'CAPTCHA verification required'
                ]);
                exit;
            }
            
            // Verify custom CAPTCHA
            if (!$security->verifyCaptcha($captchaToken, $captchaAnswer, $email)) {
                echo json_encode([
                    'success' => false,
                    'requires_captcha' => true,
                    'captcha' => $captcha,
                    'message' => 'Invalid CAPTCHA. Please try again.'
                ]);
                exit;
            }
        }
    }
    
    // Apply progressive delay
    $security->applyProgressiveDelay($email, 'student_login');
    
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
        // Record failed attempt
        $attemptResult = $security->recordFailedAttempt($email, 'student_login', [
            'reason' => 'Invalid email'
        ]);
        
        if ($attemptResult['locked']) {
            echo json_encode([
                'success' => false,
                'message' => 'Account locked due to multiple failed attempts. Please try again later.',
                'locked_until' => $attemptResult['locked_until']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid email or password',
                'remaining_attempts' => $attemptResult['remaining']
            ]);
        }
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
    
    // Debug logging
    error_log("=== LOGIN ATTEMPT DEBUG ===");
    error_log("Email: " . $email);
    error_log("Password length: " . strlen($password));
    error_log("Stored hash: " . $student['password']);
    error_log("Hash length: " . strlen($student['password']));
    
    // Verify password
    $passwordMatch = password_verify($password, $student['password']);
    error_log("Password verify result: " . ($passwordMatch ? "TRUE" : "FALSE"));
    
    if (!$passwordMatch) {
        // Record failed attempt
        $attemptResult = $security->recordFailedAttempt($email, 'student_login', [
            'reason' => 'Invalid password'
        ]);
        
        if ($attemptResult['locked']) {
            echo json_encode([
                'success' => false,
                'message' => 'Account locked due to multiple failed attempts. Please try again later.',
                'locked_until' => $attemptResult['locked_until']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid email or password',
                'remaining_attempts' => $attemptResult['remaining']
            ]);
        }
        exit;
    }
    
    // Login successful - reset security attempts
    $security->recordSuccessfulAttempt($email, 'student_login');
    
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
    
    // Create session (session already started at the top of the file)
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
