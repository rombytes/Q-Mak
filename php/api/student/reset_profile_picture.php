<?php
/**
 * Reset Profile Picture API
 * Resets student profile picture to default by setting it to NULL
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $studentId = $_SESSION['student_id'];
    $db = getDB();
    
    // Get current profile picture to delete the file
    $stmt = $db->prepare("SELECT profile_picture FROM students WHERE student_id = ?");
    $stmt->execute([$studentId]);
    $oldData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Delete old profile picture file if it exists
    if ($oldData && !empty($oldData['profile_picture'])) {
        $oldFilePath = __DIR__ . '/../../../' . $oldData['profile_picture'];
        if (file_exists($oldFilePath) && strpos($oldData['profile_picture'], 'uploads/profile_pictures/') !== false) {
            @unlink($oldFilePath);
            error_log("Deleted old profile picture: " . $oldFilePath);
        }
    }
    
    // Set profile_picture to NULL in database (will use default Herons.png)
    $updateStmt = $db->prepare("
        UPDATE students 
        SET profile_picture = NULL,
            updated_at = NOW()
        WHERE student_id = ?
    ");
    $updateStmt->execute([$studentId]);
    
    error_log("Profile picture reset to default for student: " . $studentId);
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile picture reset to default successfully',
        'data' => [
            'profile_picture_url' => '/Q-Mak/images/Herons.png'
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Reset Profile Picture Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
