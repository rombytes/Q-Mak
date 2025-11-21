<?php
/**
 * Export Students to Excel (CSV format)
 * Accessible by all admins
 */

require_once __DIR__ . '/../../config/session_config.php';
require_once __DIR__ . '/../../config/database.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized');
}

try {
    $db = getDB();
    
    // Check if specific student IDs are requested (POST request)
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['student_ids'])) {
        $studentIds = json_decode($_POST['student_ids'], true);
        $archived = $_POST['archived'] ?? 'false';
        
        if (!is_array($studentIds) || empty($studentIds)) {
            http_response_code(400);
            die('Invalid student IDs');
        }
        
        $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
        
        $query = "
            SELECT 
                s.student_id,
                s.first_name,
                s.last_name,
                s.email,
                s.college,
                s.program,
                s.year_level,
                s.section,
                s.is_verified,
                s.created_at,
                COUNT(o.order_id) as total_orders,
                s.is_archived
            FROM students s
            LEFT JOIN orders o ON s.student_id = o.student_id
            WHERE s.student_id IN ($placeholders)
            GROUP BY s.student_id
            ORDER BY s.created_at DESC
        ";
        
        $params = $studentIds;
    } else {
        // Export all with filters (GET request)
        $search = $_GET['search'] ?? '';
        $archived = $_GET['archived'] ?? 'false';
        
        $query = "
            SELECT 
                s.student_id,
                s.first_name,
                s.last_name,
                s.email,
                s.college,
                s.program,
                s.year_level,
                s.section,
                s.is_verified,
                s.created_at,
                COUNT(o.order_id) as total_orders,
                s.is_archived
            FROM students s
            LEFT JOIN orders o ON s.student_id = o.student_id
            WHERE s.is_archived = ?
        ";
        
        $params = [$archived === 'true' ? 1 : 0];
        
        if (!empty($search)) {
            $query .= " AND (
                s.student_id LIKE ? OR 
                s.email LIKE ? OR 
                s.first_name LIKE ? OR 
                s.last_name LIKE ?
            )";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " GROUP BY s.student_id ORDER BY s.created_at DESC";
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="students_' . date('Y-m-d_His') . '.csv"');
    
    // Create file pointer
    $output = fopen('php://output', 'w');
    
    // Add BOM for Excel UTF-8 support
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Add headers
    fputcsv($output, [
        'Student ID',
        'First Name',
        'Last Name',
        'Email',
        'College',
        'Program',
        'Year Level',
        'Section',
        'Account Status',
        'Total Orders',
        'Registered Date',
        'Archive Status'
    ]);
    
    // Add data
    foreach ($students as $student) {
        fputcsv($output, [
            $student['student_id'],
            $student['first_name'],
            $student['last_name'],
            $student['email'] ?? 'N/A',
            $student['college'] ?? 'N/A',
            $student['program'] ?? 'N/A',
            $student['year_level'] ?? 'N/A',
            $student['section'] ?? 'N/A',
            $student['is_verified'] == 1 ? 'Registered' : 'Guest Only',
            $student['total_orders'],
            $student['created_at'] ?? 'N/A',
            $student['is_archived'] == 1 ? 'Archived' : 'Active'
        ]);
    }
    
    fclose($output);
    
    // Log the export action
    $logStmt = $db->prepare("
        INSERT INTO admin_logs (admin_id, action_type, description, ip_address)
        VALUES (?, 'export_students', ?, ?)
    ");
    $logStmt->execute([
        $_SESSION['admin_id'],
        "Exported " . count($students) . " student records",
        $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ]);
    
} catch (Exception $e) {
    error_log("Export Students Error: " . $e->getMessage());
    http_response_code(500);
    die('Export failed');
}
?>
