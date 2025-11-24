<?php
/**
 * Admin Printing Jobs API
 * Fetch printing job details for admin view
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

// GET: Fetch printing job details for an order
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
        
        if ($orderId <= 0) {
            throw new Exception('Invalid order ID');
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                pj.*,
                o.queue_number,
                o.reference_number,
                o.status as order_status,
                s.first_name,
                s.last_name,
                s.student_id
            FROM printing_jobs pj
            JOIN orders o ON pj.order_id = o.order_id
            JOIN students s ON o.student_id = s.student_id
            WHERE pj.order_id = ?
        ");
        
        $stmt->execute([$orderId]);
        $job = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$job) {
            // Order exists but is not a printing job
            echo json_encode([
                'success' => true,
                'data' => [
                    'is_printing' => false
                ]
            ]);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'is_printing' => true,
                'job' => $job
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Fetch printing job error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching printing job details: ' . $e->getMessage(),
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
