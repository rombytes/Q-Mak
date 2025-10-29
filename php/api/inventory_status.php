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
        
        // Get items with availability status
        $stmt = $db->query("
            SELECT 
                item_id,
                item_name,
                stock_quantity,
                low_stock_threshold,
                is_available,
                CASE 
                    WHEN stock_quantity = 0 THEN 'out_of_stock'
                    WHEN stock_quantity <= low_stock_threshold THEN 'low_stock'
                    ELSE 'in_stock'
                END as stock_level
            FROM inventory_items
            WHERE is_active = 1
            ORDER BY item_name ASC
        ");
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create detailed item info
        $itemsData = [];
        foreach ($items as $item) {
            $itemsData[] = [
                'item_id' => $item['item_id'],
                'item_name' => $item['item_name'],
                'stock_quantity' => (int)$item['stock_quantity'],
                'is_available' => (bool)$item['is_available'],
                'stock_level' => $item['stock_level']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'items' => $itemsData,
                'total' => count($itemsData)
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
