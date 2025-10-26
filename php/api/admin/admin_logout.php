<?php
/**
 * Admin Logout API
 * Destroys admin session
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

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if admin was logged in
    $wasLoggedIn = isset($_SESSION['admin_id']);
    
    // Destroy session
    session_unset();
    session_destroy();
    
    // Clear session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
