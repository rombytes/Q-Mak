<?php
/**
 * Student Session API
 * Handles session check and logout
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if student is logged in
        if (isset($_SESSION['student_logged_in']) && $_SESSION['student_logged_in'] === true) {
            echo json_encode([
                'success' => true,
                'logged_in' => true,
                'data' => $_SESSION['student_data'] ?? [
                    'student_id' => $_SESSION['student_id'] ?? null,
                    'email' => $_SESSION['student_email'] ?? null,
                    'name' => $_SESSION['student_name'] ?? null
                ]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'logged_in' => false
            ]);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        if ($action === 'logout') {
            // Clear student session
            unset($_SESSION['student_logged_in']);
            unset($_SESSION['student_id']);
            unset($_SESSION['student_email']);
            unset($_SESSION['student_name']);
            unset($_SESSION['student_data']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Student Session API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred'
    ]);
}
?>
