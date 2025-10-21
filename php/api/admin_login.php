<?php
/**
 * Admin Login API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    $db = getDB();
    
    // Get admin user
    $stmt = $db->prepare("
        SELECT admin_id, email, password_hash, full_name, is_active
        FROM admins
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $admin = $stmt->fetch();
    
    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    if (!$admin['is_active']) {
        echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $admin['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    // Update last login
    $updateStmt = $db->prepare("UPDATE admins SET last_login = NOW() WHERE admin_id = ?");
    $updateStmt->execute([$admin['admin_id']]);
    
    // Start session
    session_start();
    $_SESSION['admin_id'] = $admin['admin_id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_name'] = $admin['full_name'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'admin_id' => $admin['admin_id'],
            'email' => $admin['email'],
            'full_name' => $admin['full_name']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Login Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
?>
