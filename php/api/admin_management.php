<?php
session_start();
require_once '../config/database.php';
require_once '../config/constants.php';

header('Content-Type: application/json');

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Check if user is super admin
if (!isset($_SESSION['is_super_admin']) || $_SESSION['is_super_admin'] != 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Super admin only.']);
    exit;
}

$database = new Database();
$conn = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get all admin accounts
            $query = "SELECT admin_id, full_name, username, email, is_super_admin, created_at 
                     FROM admin_accounts 
                     ORDER BY created_at DESC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => ['admins' => $admins]
            ]);
            break;
            
        case 'POST':
            // Create new admin account
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['username']) || !isset($data['password']) || 
                !isset($data['full_name']) || !isset($data['email'])) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                exit;
            }
            
            // Validate password strength
            if (strlen($data['password']) < 8) {
                echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
                exit;
            }
            
            // Check if username or email already exists
            $checkQuery = "SELECT admin_id FROM admin_accounts WHERE username = ? OR email = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->execute([$data['username'], $data['email']]);
            
            if ($checkStmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
                exit;
            }
            
            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            
            // Insert new admin
            $insertQuery = "INSERT INTO admin_accounts (username, password, full_name, email, is_super_admin) 
                           VALUES (?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertQuery);
            $isSuperAdmin = isset($data['is_super_admin']) ? (int)$data['is_super_admin'] : 0;
            
            $insertStmt->execute([
                $data['username'],
                $hashedPassword,
                $data['full_name'],
                $data['email'],
                $isSuperAdmin
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Admin account created successfully',
                'admin_id' => $conn->lastInsertId()
            ]);
            break;
            
        case 'PUT':
            // Update admin account
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['admin_id'])) {
                echo json_encode(['success' => false, 'message' => 'Admin ID required']);
                exit;
            }
            
            // Prevent modifying own super admin status
            if ($data['admin_id'] == $_SESSION['admin_id'] && isset($data['is_super_admin'])) {
                echo json_encode(['success' => false, 'message' => 'Cannot modify your own super admin status']);
                exit;
            }
            
            $updateFields = [];
            $params = [];
            
            if (isset($data['full_name'])) {
                $updateFields[] = "full_name = ?";
                $params[] = $data['full_name'];
            }
            
            if (isset($data['email'])) {
                $updateFields[] = "email = ?";
                $params[] = $data['email'];
            }
            
            if (isset($data['username'])) {
                $updateFields[] = "username = ?";
                $params[] = $data['username'];
            }
            
            if (isset($data['password']) && !empty($data['password'])) {
                if (strlen($data['password']) < 8) {
                    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
                    exit;
                }
                $updateFields[] = "password = ?";
                $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
            }
            
            if (isset($data['is_super_admin'])) {
                $updateFields[] = "is_super_admin = ?";
                $params[] = (int)$data['is_super_admin'];
            }
            
            if (empty($updateFields)) {
                echo json_encode(['success' => false, 'message' => 'No fields to update']);
                exit;
            }
            
            $params[] = $data['admin_id'];
            
            $updateQuery = "UPDATE admin_accounts SET " . implode(', ', $updateFields) . " WHERE admin_id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->execute($params);
            
            echo json_encode(['success' => true, 'message' => 'Admin account updated successfully']);
            break;
            
        case 'DELETE':
            // Delete admin account
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['admin_id'])) {
                echo json_encode(['success' => false, 'message' => 'Admin ID required']);
                exit;
            }
            
            // Prevent deleting own account
            if ($data['admin_id'] == $_SESSION['admin_id']) {
                echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
                exit;
            }
            
            $deleteQuery = "DELETE FROM admin_accounts WHERE admin_id = ?";
            $deleteStmt = $conn->prepare($deleteQuery);
            $deleteStmt->execute([$data['admin_id']]);
            
            echo json_encode(['success' => true, 'message' => 'Admin account deleted successfully']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>