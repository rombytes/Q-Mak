<?php
/**
 * Public Inventory Status API
 * Returns list of items with their stock status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        
        // Get only in-stock items for public access
        $stmt = $db->query("
            SELECT 
                item_name,
                is_in_stock
            FROM inventory_items
            ORDER BY item_name ASC
        ");
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create lookup map
        $stockStatus = [];
        foreach ($items as $item) {
            $stockStatus[$item['item_name']] = (bool)$item['is_in_stock'];
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'stock_status' => $stockStatus
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Inventory Status Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred'
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
