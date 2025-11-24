<?php
/**
 * Get Student Profile API
 * Returns authenticated student's profile information
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = getDB();
    $studentId = $_SESSION['student_id'];
    
    // Get student profile data
    $stmt = $db->prepare("
        SELECT 
            s.student_id,
            s.first_name,
            s.last_name,
            s.middle_initial,
            s.email,
            s.college,
            s.program,
            s.year_level,
            s.section,
            s.is_verified,
            s.profile_picture,
            s.created_at,
            s.last_login,
            COUNT(DISTINCT o.order_id) as total_orders,
            COUNT(DISTINCT CASE WHEN o.order_status = 'completed' THEN o.order_id END) as completed_orders
        FROM students s
        LEFT JOIN orders o ON s.student_id = o.student_id
        WHERE s.student_id = ?
        GROUP BY s.student_id
    ");
    
    $stmt->execute([$studentId]);
    $studentData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$studentData) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Student not found']);
        exit;
    }
    
    // Format profile picture path - keep as relative path for flexibility
    // Front-end will handle the base URL based on environment
    if (!empty($studentData['profile_picture'])) {
        // Ensure path starts with uploads/
        if (strpos($studentData['profile_picture'], 'uploads/') !== 0) {
            $studentData['profile_picture'] = 'uploads/' . ltrim($studentData['profile_picture'], '/');
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $studentData
    ]);
    
} catch (PDOException $e) {
    error_log("Get Profile PDO Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch (Exception $e) {
    error_log("Get Profile Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
