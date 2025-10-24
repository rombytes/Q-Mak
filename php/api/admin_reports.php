<?php
/**
 * Admin Analytics & Reports API
 * Requires admin authentication
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

require_once __DIR__ . '/../config/database.php';

session_start();

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        
        // Get and validate date range. Add 1 day to end date to include the whole day.
        $startDate = $_GET['start'] ?? date('Y-m-d');
        $endDate = $_GET['end'] ?? date('Y-m-d');
        $endDateTime = new DateTime($endDate);
        $endDateTime->modify('+1 day');
        $endDate = $endDateTime->format('Y-m-d');

        // 1. Get Summary Statistics
        $stmtSummary = $db->prepare("
            SELECT
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
            FROM orders
            WHERE created_at >= ? AND created_at < ?
        ");
        $stmtSummary->execute([$startDate, $endDate]);
        $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);

        // 2. Get Top Ordered Items
        $stmtTopItems = $db->prepare("
            SELECT
                item_name as item_ordered,
                COUNT(*) as total
            FROM orders
            WHERE created_at >= ? AND created_at < ?
            GROUP BY item_name
            ORDER BY total DESC
            LIMIT 10
        ");
        $stmtTopItems->execute([$startDate, $endDate]);
        $topItems = $stmtTopItems->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'top_items' => $topItems
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Reports Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>