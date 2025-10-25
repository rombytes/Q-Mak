<?php
/**
 * Admin Login API
 */

// Start output buffering to catch any unexpected output
ob_start();

// Disable error display
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Clean any previous output
if (ob_get_level()) {
    ob_clean();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

// Start session at the beginning
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
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
    
    // Get database connection using the getDB function
    $conn = getDB();

    // Query admin_accounts table using PDO
    $stmt = $conn->prepare("
        SELECT admin_id, email, password, full_name, username, is_super_admin
        FROM admin_accounts
        WHERE email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }

    // Verify password
    if (!password_verify($password, $admin['password'])) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }

    // Update last login
    try {
        $updateStmt = $conn->prepare("UPDATE admin_accounts SET last_login = NOW() WHERE admin_id = ?");
        $updateStmt->execute([$admin['admin_id']]);
    } catch (Exception $e) {
        // Ignore if last_login column doesn't exist
    }
    
    // Set session variables
    $_SESSION['admin_id'] = $admin['admin_id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_name'] = $admin['full_name'];
    $_SESSION['admin_username'] = $admin['username'];
    $_SESSION['is_super_admin'] = (int)$admin['is_super_admin'];
    
    // Clean output buffer and send response
    ob_end_clean();
    
    // Return success
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'admin_id' => (int)$admin['admin_id'],
            'email' => $admin['email'],
            'full_name' => $admin['full_name'],
            'username' => $admin['username'],
            'is_super_admin' => (int)$admin['is_super_admin']
        ]
    ]);
    
} catch (PDOException $e) {
    ob_end_clean();
    error_log("Admin Login Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection error. Please contact administrator.'
    ]);
} catch (Exception $e) {
    ob_end_clean();
    error_log("Admin Login Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again.'
    ]);
}
?>
