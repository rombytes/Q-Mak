<?php
/**
 * Admin Change Password API
 * Allows admin to change their password
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

// Start session to get current admin
require_once __DIR__ . '/../../config/session_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid JSON input");
    }
    
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    
    // Validation
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    if ($newPassword !== $confirmPassword) {
        echo json_encode(['success' => false, 'message' => 'New passwords do not match']);
        exit;
    }
    
    if (strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters long']);
        exit;
    }
    
    $db = getDB();
    $adminId = $_SESSION['admin_id'];
    
    // Get current admin data
    $stmt = $db->prepare("SELECT admin_id, password FROM admin_accounts WHERE admin_id = ? AND is_archived = 0");
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();
    
    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Admin account not found']);
        exit;
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $admin['password'])) {
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
        exit;
    }
    
    // Check if new password is different from current
    if (password_verify($newPassword, $admin['password'])) {
        echo json_encode(['success' => false, 'message' => 'New password must be different from current password']);
        exit;
    }
    
    // Hash new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password in database
    $updateStmt = $db->prepare("
        UPDATE admin_accounts 
        SET password = ?, 
            updated_at = NOW()
        WHERE admin_id = ?
    ");
    
    $updateResult = $updateStmt->execute([$newPasswordHash, $adminId]);
    
    if ($updateResult) {
        // Log the password change
        $logStmt = $db->prepare("
            INSERT INTO admin_logs (admin_id, action_type, description, ip_address, created_at)
            VALUES (?, 'password_change', 'Password changed successfully', ?, NOW())
        ");
        $logStmt->execute([
            $adminId, 
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully'
        ]);
    } else {
        throw new Exception("Failed to update password in database");
    }
    
} catch (Exception $e) {
    error_log("Change Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update password: ' . $e->getMessage()
    ]);
}
?>
