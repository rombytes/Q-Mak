<?php
/**
 * Get Students API
 * Returns all registered students for admin dashboard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/session_config.php';

// Check if admin is logged in
if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

try {
    $db = getDB();
    
    // Get all students with their information
    $stmt = $db->query("
        SELECT 
            student_id,
            first_name,
            last_name,
            middle_initial,
            email,
            college,
            program,
            year_level,
            section,
            is_verified,
            created_at,
            last_login,
            (SELECT COUNT(*) FROM orders WHERE orders.student_id = students.student_id) as total_orders
        FROM students
        WHERE password IS NOT NULL
        ORDER BY created_at DESC
    ");
    
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format data
    foreach ($students as &$student) {
        $student['full_name'] = trim(
            $student['first_name'] . ' ' . 
            ($student['middle_initial'] ? $student['middle_initial'] . '. ' : '') . 
            $student['last_name']
        );
        $student['year_display'] = $student['year_level'] ? $student['year_level'] . getOrdinalSuffix($student['year_level']) . ' Year' : 'N/A';
        $student['created_date'] = date('M d, Y', strtotime($student['created_at']));
        $student['last_login_display'] = $student['last_login'] ? date('M d, Y h:i A', strtotime($student['last_login'])) : 'Never';
    }
    
    echo json_encode([
        'success' => true,
        'data' => $students,
        'total' => count($students)
    ]);
    
} catch (Exception $e) {
    error_log("Get Students API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch students'
    ]);
}

function getOrdinalSuffix($num) {
    $j = $num % 10;
    $k = $num % 100;
    if ($j == 1 && $k != 11) return "st";
    if ($j == 2 && $k != 12) return "nd";
    if ($j == 3 && $k != 13) return "rd";
    return "th";
}
?>
