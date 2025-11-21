<?php
/**
 * Upload Profile Picture API
 * Allows authenticated students to upload their profile picture
 */

// Start output buffering to prevent any accidental output
ob_start();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Debug logging
error_log("Upload API called - Session ID: " . session_id());
error_log("Student ID in session: " . (isset($_SESSION['student_id']) ? $_SESSION['student_id'] : 'NOT SET'));
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("FILES count: " . (isset($_FILES) ? count($_FILES) : 0));

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    error_log("Upload failed: No student_id in session");
    ob_end_clean();
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("Upload failed: Method not POST");
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['profile_picture'])) {
        error_log("Upload failed: No profile_picture in FILES");
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'No file uploaded'
        ]);
        exit;
    }
    
    if ($_FILES['profile_picture']['error'] !== UPLOAD_ERR_OK) {
        error_log("Upload failed: Upload error " . $_FILES['profile_picture']['error']);
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Upload error occurred: ' . $_FILES['profile_picture']['error']
        ]);
        exit;
    }
    
    $file = $_FILES['profile_picture'];
    $studentId = $_SESSION['student_id'];
    
    error_log("Processing file: " . $file['name'] . " Size: " . $file['size'] . " Type: " . $file['type']);
    
    // Validate file size (max 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        error_log("Upload failed: File size " . $file['size'] . " exceeds limit");
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'File size exceeds 5MB limit'
        ]);
        exit;
    }
    
    error_log("File size OK, checking mime type...");
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    // Try to detect mime type with error handling
    $mimeType = $file['type']; // Fallback to uploaded type
    try {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detectedMime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
                if ($detectedMime !== false) {
                    $mimeType = $detectedMime;
                    error_log("Detected mime type via finfo: " . $mimeType);
                } else {
                    error_log("finfo_file failed, using upload type: " . $mimeType);
                }
            } else {
                error_log("finfo_open failed, using upload type: " . $mimeType);
            }
        } else {
            error_log("finfo_open not available, using upload type: " . $mimeType);
        }
    } catch (Exception $e) {
        error_log("Exception in mime detection: " . $e->getMessage() . ", using upload type: " . $mimeType);
    }
    
    error_log("Final mime type: " . $mimeType);
    
    if (!in_array($mimeType, $allowedTypes)) {
        error_log("Upload failed: Invalid mime type " . $mimeType);
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid file type. Only JPG, PNG, and GIF images are allowed'
        ]);
        exit;
    }
    
    error_log("Mime type valid, proceeding with upload...");
    
    // Get file extension
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
        $extension = 'jpg'; // Default extension
    }
    
    // Create uploads directory if it doesn't exist
    $uploadDir = __DIR__ . '/../../../uploads/profile_pictures/';
    if (!file_exists($uploadDir)) {
        error_log("Creating upload directory: " . $uploadDir);
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $filename = $studentId . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    error_log("Target filepath: " . $filepath);
    error_log("Connecting to database...");
    
    // Delete old profile picture if exists
    $db = getDB();
    error_log("Database connected, querying old profile picture...");
    $stmt = $db->prepare("SELECT profile_picture FROM students WHERE student_id = ?");
    $stmt->execute([$studentId]);
    $oldData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($oldData && !empty($oldData['profile_picture'])) {
        $oldFilePath = __DIR__ . '/../../../' . $oldData['profile_picture'];
        if (file_exists($oldFilePath)) {
            @unlink($oldFilePath);
        }
    }
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        error_log("Upload failed: Cannot move file from " . $file['tmp_name'] . " to " . $filepath);
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Failed to save uploaded file'
        ]);
        exit;
    }
    
    error_log("File uploaded successfully to: " . $filepath);
    
    // Update database with relative path
    $relativePath = 'uploads/profile_pictures/' . $filename;
    $updateStmt = $db->prepare("
        UPDATE students 
        SET profile_picture = ?,
            updated_at = NOW()
        WHERE student_id = ?
    ");
    $updateStmt->execute([$relativePath, $studentId]);
    
    error_log("Database updated for student " . $studentId . " with path: " . $relativePath);
    
    // Return the URL (relative to Q-Mak root)
    $profilePictureUrl = '/Q-Mak/' . $relativePath;
    
    // Clean any buffered output and send response
    $bufferedOutput = ob_get_clean();
    if (!empty(trim($bufferedOutput))) {
        error_log("Warning: Unexpected output in buffer: " . $bufferedOutput);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile picture uploaded successfully',
        'data' => [
            'profile_picture_url' => $profilePictureUrl,
            'filename' => $filename
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Upload Profile Picture Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
