<?php
/**
 * Unified Login API
 * Handles both student and admin authentication
 * Automatically redirects to appropriate dashboard based on user role
 */

// Start output buffering to catch any unexpected output
ob_start();

// Disable error display, log errors instead
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Clean any previous output
if (ob_get_level()) {
    ob_clean();
}

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

// Include required files
try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../config/session_config.php'; // Use shared session config
    require_once __DIR__ . '/../utils/brute_force_protection.php';
} catch (Exception $e) {
    ob_end_clean();
    error_log('Login require error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration error']);
    exit;
}

// Session is already started by session_config.php

// Initialize security
$security = new BruteForceProtection();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get and validate JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }
    
    // Extract credentials
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $recaptchaResponse = $input['g-recaptcha-response'] ?? $input['recaptcha_response'] ?? '';
    
    // Validate required fields
    if (empty($email) || empty($password)) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    // Check if account is locked due to failed attempts
    if ($security->isLocked($email, 'login')) {
        $status = $security->getAccountStatus($email, 'login');
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Account temporarily locked due to multiple failed login attempts. Please try again later.',
            'locked_until' => $status['locked_until'] ?? null
        ]);
        exit;
    }
    
    // Check if CAPTCHA is required
    $requiresCaptcha = $security->requiresCaptcha($email, 'login');
    if ($requiresCaptcha) {
        $captcha = $security->generateCaptcha($email);
        
        if (empty($recaptchaResponse)) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'requires_captcha' => true,
                'captcha' => $captcha,
                'message' => 'CAPTCHA verification required'
            ]);
            exit;
        }
        
        if (!$security->verifyCaptcha($recaptchaResponse, $email)) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'requires_captcha' => true,
                'captcha' => $security->generateCaptcha($email),
                'message' => 'CAPTCHA verification failed'
            ]);
            exit;
        }
    }
    
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    // =============================================
    // STEP 1: Check students table
    // =============================================
    $stmt = $db->prepare("
        SELECT student_id, email, password, first_name, last_name, is_verified 
        FROM students 
        WHERE email = :email
    ");
    $stmt->execute(['email' => $email]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($student) {
        // Student account found - verify password
        if (!password_verify($password, $student['password'])) {
            $security->recordFailedAttempt($email, 'login');
            
            // Check if CAPTCHA is now required after this failed attempt
            $nowRequiresCaptcha = $security->requiresCaptcha($email, 'login');
            $response = [
                'success' => false, 
                'message' => 'Invalid email or password'
            ];
            
            if ($nowRequiresCaptcha) {
                $response['requires_captcha'] = true;
                $response['captcha'] = $security->generateCaptcha($email);
            }
            
            ob_end_clean();
            echo json_encode($response);
            exit;
        }
        
        // Check if email is verified
        if (!$student['is_verified']) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Please verify your email before logging in.']);
            exit;
        }
        
        // Successful login - record successful attempt
        $security->recordSuccessfulAttempt($email, 'login');
        
        // Update last login
        $updateStmt = $db->prepare("UPDATE students SET last_login = NOW() WHERE student_id = :id");
        $updateStmt->execute(['id' => $student['student_id']]);
        
        // Create student session
        session_regenerate_id(true);
        $_SESSION['user_id'] = $student['student_id'];
        $_SESSION['student_id'] = $student['student_id'];
        $_SESSION['email'] = $student['email'];
        $_SESSION['student_email'] = $student['email'];
        $_SESSION['first_name'] = $student['first_name'];
        $_SESSION['last_name'] = $student['last_name'];
        $_SESSION['student_name'] = $student['first_name'] . ' ' . $student['last_name'];
        $_SESSION['user_type'] = 'student';
        $_SESSION['student_logged_in'] = true;
        $_SESSION['last_activity'] = time();
        
        // Return success response with redirect path
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user_type' => 'student',
            'redirect' => 'student/student_dashboard.html',
            'user' => [
                'id' => $student['student_id'],
                'email' => $student['email'],
                'first_name' => $student['first_name'],
                'last_name' => $student['last_name']
            ]
        ]);
        exit;
    }
    
    // =============================================
    // STEP 2: Check admin_accounts table
    // =============================================
    $stmt = $db->prepare("
        SELECT admin_id, email, password, full_name, is_super_admin, last_login
        FROM admin_accounts 
        WHERE email = :email AND is_archived = 0
    ");
    $stmt->execute(['email' => $email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        // Admin account found - verify password
        if (!password_verify($password, $admin['password'])) {
            $security->recordFailedAttempt($email, 'login');
            
            // Check if CAPTCHA is now required after this failed attempt
            $nowRequiresCaptcha = $security->requiresCaptcha($email, 'login');
            $response = [
                'success' => false, 
                'message' => 'Invalid email or password'
            ];
            
            if ($nowRequiresCaptcha) {
                $response['requires_captcha'] = true;
                $response['captcha'] = $security->generateCaptcha($email);
            }
            
            ob_end_clean();
            echo json_encode($response);
            exit;
        }
        
        // Successful login - record successful attempt
        $security->recordSuccessfulAttempt($email, 'login');
        
        // Update last login timestamp
        $updateStmt = $db->prepare("UPDATE admin_accounts SET last_login = NOW() WHERE admin_id = :id");
        $updateStmt->execute(['id' => $admin['admin_id']]);
        
        // Create admin session
        session_regenerate_id(true);
        $_SESSION['admin_id'] = $admin['admin_id'];
        $_SESSION['admin_email'] = $admin['email'];
        $_SESSION['admin_name'] = $admin['full_name'];
        $_SESSION['is_super_admin'] = $admin['is_super_admin'];
        $_SESSION['user_type'] = 'admin';
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['last_activity'] = time();
        
        // Return success response with redirect path
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user_type' => 'admin',
            'redirect' => 'admin/admin_dashboard.html',
            'user' => [
                'id' => $admin['admin_id'],
                'email' => $admin['email'],
                'name' => $admin['full_name'],
                'is_super_admin' => $admin['is_super_admin']
            ]
        ]);
        exit;
    }
    
    // =============================================
    // STEP 3: No account found
    // =============================================
    $security->recordFailedAttempt($email, 'login');
    
    // Check if CAPTCHA is now required after this failed attempt
    $nowRequiresCaptcha = $security->requiresCaptcha($email, 'login');
    $response = [
        'success' => false, 
        'message' => 'Invalid email or password'
    ];
    
    if ($nowRequiresCaptcha) {
        $response['requires_captcha'] = true;
        $response['captcha'] = $security->generateCaptcha($email);
    }
    
    ob_end_clean();
    echo json_encode($response);
    exit;
    
} catch (Exception $e) {
    // Log the error with full trace
    ob_end_clean();
    error_log('Login error: ' . $e->getMessage());
    error_log('Login error trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred during login'
    ]);
    exit;
}
