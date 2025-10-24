<?php
/**
 * Admin Login API - DEBUG VERSION
 * Shows actual errors for troubleshooting
 */

// Enable error display for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

echo json_encode(['debug' => 'API file loaded']) . "\n";

try {
    echo json_encode(['debug' => 'Loading database config...']) . "\n";
    require_once __DIR__ . '/../config/database.php';
    
    echo json_encode(['debug' => 'Starting session...']) . "\n";
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    echo json_encode(['debug' => 'Checking request method...']) . "\n";
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'Method not allowed', 'method' => $_SERVER['REQUEST_METHOD']]);
        exit;
    }
    
    echo json_encode(['debug' => 'Reading input...']) . "\n";
    $input = file_get_contents('php://input');
    echo json_encode(['debug' => 'Raw input', 'input' => $input]) . "\n";
    
    $data = json_decode($input, true);
    echo json_encode(['debug' => 'Parsed data', 'data' => $data]) . "\n";
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON', 'error' => json_last_error_msg()]);
        exit;
    }
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    echo json_encode(['debug' => 'Email/Password received', 'email' => $email, 'password_length' => strlen($password)]) . "\n";
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    echo json_encode(['debug' => 'Connecting to database...']) . "\n";
    $database = Database::getInstance();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }
    
    echo json_encode(['debug' => 'Database connected', 'type' => get_class($conn)]) . "\n";
    
    echo json_encode(['debug' => 'Querying admin_accounts...']) . "\n";
    $stmt = $conn->prepare("SELECT admin_id, email, password, full_name, username, is_super_admin FROM admin_accounts WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $admin = $result->fetch_assoc();
    
    echo json_encode(['debug' => 'Query result', 'found' => ($admin ? 'yes' : 'no')]) . "\n";
    
    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password (email not found)']);
        exit;
    }
    
    echo json_encode(['debug' => 'Verifying password...']) . "\n";
    $passwordMatch = password_verify($password, $admin['password']);
    echo json_encode(['debug' => 'Password match', 'match' => ($passwordMatch ? 'yes' : 'no'), 'hash_length' => strlen($admin['password'])]) . "\n";
    
    if (!$passwordMatch) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password (password mismatch)']);
        exit;
    }
    
    echo json_encode(['debug' => 'Setting session...']) . "\n";
    $_SESSION['admin_id'] = $admin['admin_id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_name'] = $admin['full_name'];
    $_SESSION['admin_username'] = $admin['username'];
    $_SESSION['is_super_admin'] = (int)$admin['is_super_admin'];
    
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
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
