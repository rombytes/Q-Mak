<?php
/**
 * Check if Email Exists API
 * Checks if an email is already registered in the system
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

try {
    $db = getDB();
    
    // Get email from query parameter
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    
    if (empty($email)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email parameter is required'
        ]);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit;
    }
    
    // Check if email exists in students table WITH PASSWORD (registered account)
    $stmt = $db->prepare("
        SELECT 
            student_id,
            first_name,
            last_name,
            email,
            is_verified,
            password
        FROM students
        WHERE email = ?
        LIMIT 1
    ");
    
    $stmt->execute([$email]);
    $student = $stmt->fetch();
    
    if ($student && !empty($student['password'])) {
        // Email exists with password - user MUST login
        echo json_encode([
            'success' => true,
            'exists' => true,
            'has_account' => true,
            'message' => 'This email has a registered account.',
            'student_info' => [
                'name' => $student['first_name'] . ' ' . $student['last_name'],
                'is_verified' => (bool)$student['is_verified']
            ]
        ]);
    } else if ($student && empty($student['password'])) {
        // Email exists but no password - guest user, can continue
        echo json_encode([
            'success' => true,
            'exists' => false,
            'has_account' => false,
            'message' => 'Email can be used (guest user)',
            'note' => 'Previous guest orders found but no account created'
        ]);
    } else {
        // Email doesn't exist - new user, can proceed
        echo json_encode([
            'success' => true,
            'exists' => false,
            'has_account' => false,
            'message' => 'Email is available'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error checking email',
        'error' => $e->getMessage()
    ]);
}
?>
