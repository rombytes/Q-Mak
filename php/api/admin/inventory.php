<?php
/**
 * Inventory Management API
 * Requires admin authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

require_once __DIR__ . '/../../config/session_config.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all inventory items
    try {
        $db = getDB();
        
        $stmt = $db->query("
            SELECT 
                item_id,
                item_name,
                is_in_stock,
                updated_at
            FROM inventory_items
            ORDER BY item_name ASC
        ");
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'items' => $items
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Inventory Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred'
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Add new inventory item
    try {
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $itemName = trim($input['item_name'] ?? '');
        
        if (empty($itemName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Item name is required']);
            exit;
        }
        
        $stmt = $db->prepare("
            INSERT INTO inventory_items (item_name, is_in_stock, updated_by)
            VALUES (?, 1, ?)
        ");
        
        $stmt->execute([$itemName, $_SESSION['admin_id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Item added successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Add Inventory Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to add item. Item may already exist.'
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Update inventory item stock status
    try {
        $db = getDB();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $itemId = intval($input['item_id'] ?? 0);
        $isInStock = isset($input['is_in_stock']) ? intval($input['is_in_stock']) : 1;
        
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid item ID']);
            exit;
        }
        
        $stmt = $db->prepare("
            UPDATE inventory_items 
            SET is_in_stock = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE item_id = ?
        ");
        
        $stmt->execute([$isInStock, $_SESSION['admin_id'], $itemId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Stock status updated successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Update Inventory Error: " . $e->getMessage());
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
