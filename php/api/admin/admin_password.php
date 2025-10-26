<?php
/**
 * Admin Password Update API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

session_start();

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';
        
        // Validate inputs
        if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }
        
        // Check if new passwords match
        if ($newPassword !== $confirmPassword) {
            echo json_encode(['success' => false, 'message' => 'New passwords do not match']);
            exit;
        }
        
        // Password strength validation
        if (strlen($newPassword) < 8) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
            exit;
        }
        
        $db = getDB();
        
        // Get current admin
        $stmt = $db->prepare("SELECT password_hash FROM admins WHERE admin_id = ?");
        $stmt->execute([$_SESSION['admin_id']]);
        $admin = $stmt->fetch();
        
        if (!$admin) {
            echo json_encode(['success' => false, 'message' => 'Admin not found']);
            exit;
        }
        
        // Verify current password
        if (!password_verify($currentPassword, $admin['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
            exit;
        }
        
        // Hash new password
        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password
        $updateStmt = $db->prepare("
            UPDATE admins 
            SET password_hash = ? 
            WHERE admin_id = ?
        ");
        $updateStmt->execute([$newPasswordHash, $_SESSION['admin_id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Update Password Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
