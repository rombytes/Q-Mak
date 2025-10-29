<?php
/**
 * Inventory Management API
 * Handles CRUD operations for inventory items with stock tracking
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

// GET - Retrieve inventory items (public access for available items)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        
        $availableOnly = isset($_GET['available_only']) && $_GET['available_only'] === 'true';
        $lowStockOnly = isset($_GET['low_stock_only']) && $_GET['low_stock_only'] === 'true';
        $category = $_GET['category'] ?? null;
        
        if ($lowStockOnly) {
            // Get low stock items
            $query = "SELECT * FROM v_low_stock_items";
            $stmt = $db->query($query);
        } elseif ($availableOnly) {
            // Get available items for students
            $query = "SELECT * FROM v_available_items";
            $stmt = $db->query($query);
        } else {
            // Get all items (admin view)
            $query = "SELECT * FROM inventory_items ORDER BY item_name ASC";
            $stmt = $db->query($query);
        }
        
        $items = $stmt->fetchAll();
        
        // Add stock status to each item
        foreach ($items as &$item) {
            if (!isset($item['stock_status'])) {
                if ($item['stock_quantity'] == 0) {
                    $item['stock_status'] = 'Out of Stock';
                } elseif ($item['stock_quantity'] <= $item['low_stock_threshold']) {
                    $item['stock_status'] = 'Low Stock';
                } else {
                    $item['stock_status'] = 'In Stock';
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'items' => $items,
                'total' => count($items)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Inventory Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// All other methods require admin authentication
session_start();

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
    exit;
}

// POST - Create new inventory item
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $itemName = trim($input['item_name'] ?? '');
        $description = trim($input['description'] ?? '');
        $stockQuantity = intval($input['stock_quantity'] ?? 0);
        $lowStockThreshold = intval($input['low_stock_threshold'] ?? 20);
        $estimatedTime = intval($input['estimated_time'] ?? 10);
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
        
        if (empty($itemName)) {
            echo json_encode(['success' => false, 'message' => 'Item name is required']);
            exit;
        }
        
        $db = getDB();
        
        // Check if item already exists
        $checkStmt = $db->prepare("SELECT item_id FROM inventory_items WHERE item_name = ?");
        $checkStmt->execute([$itemName]);
        if ($checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Item with this name already exists']);
            exit;
        }
        
        $stmt = $db->prepare("
            INSERT INTO inventory_items 
            (item_name, description, stock_quantity, low_stock_threshold, estimated_time, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $itemName, $description, 
            $stockQuantity, $lowStockThreshold, $estimatedTime, $isActive
        ]);
        
        $itemId = $db->lastInsertId();
        
        // Log initial stock
        if ($stockQuantity > 0) {
            $logStmt = $db->prepare("
                INSERT INTO stock_movement_log 
                (item_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, admin_id)
                VALUES (?, 'restock', ?, 0, ?, 'Initial stock', ?)
            ");
            $logStmt->execute([$itemId, $stockQuantity, $stockQuantity, $_SESSION['admin_id']]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item created successfully',
            'data' => ['item_id' => $itemId]
        ]);
        
    } catch (Exception $e) {
        error_log("Create Inventory Item Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
// PUT - Update existing inventory item
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $itemId = intval($input['item_id'] ?? 0);
        $itemName = trim($input['item_name'] ?? '');
        $description = trim($input['description'] ?? '');
        $stockQuantity = isset($input['stock_quantity']) ? intval($input['stock_quantity']) : null;
        $lowStockThreshold = intval($input['low_stock_threshold'] ?? 20);
        $estimatedTime = intval($input['estimated_time'] ?? 10);
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
        
        if ($itemId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Item ID is required']);
            exit;
        }
        
        if (empty($itemName)) {
            echo json_encode(['success' => false, 'message' => 'Item name is required']);
            exit;
        }
        
        $db = getDB();
        
        // Get current item data
        $currentStmt = $db->prepare("SELECT * FROM inventory_items WHERE item_id = ?");
        $currentStmt->execute([$itemId]);
        $currentItem = $currentStmt->fetch();
        
        if (!$currentItem) {
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit;
        }
        
        // Check if name is taken by another item
        $nameCheckStmt = $db->prepare("SELECT item_id FROM inventory_items WHERE item_name = ? AND item_id != ?");
        $nameCheckStmt->execute([$itemName, $itemId]);
        if ($nameCheckStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Item name already exists']);
            exit;
        }
        
        // Update item details
        $stmt = $db->prepare("
            UPDATE inventory_items 
            SET item_name = ?, description = ?, 
                low_stock_threshold = ?, estimated_time = ?, is_active = ?
            WHERE item_id = ?
        ");
        $stmt->execute([
            $itemName, $description,
            $lowStockThreshold, $estimatedTime, $isActive, $itemId
        ]);
        
        // If stock quantity is being updated, use stock adjustment
        if ($stockQuantity !== null && $stockQuantity != $currentItem['stock_quantity']) {
            $quantityChange = $stockQuantity - $currentItem['stock_quantity'];
            $movementType = $quantityChange > 0 ? 'restock' : 'adjustment';
            $reason = isset($input['stock_reason']) ? $input['stock_reason'] : 'Manual adjustment';
            
            // Call stored procedure for stock adjustment
            $adjustStmt = $db->prepare("CALL sp_adjust_stock(?, ?, ?, ?, ?)");
            $adjustStmt->execute([
                $itemId, 
                $quantityChange, 
                $movementType, 
                $reason, 
                $_SESSION['admin_id']
            ]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item updated successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Update Inventory Item Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred', 'error' => $e->getMessage()]);
    }
    
// DELETE - Delete inventory item
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $itemId = intval($input['item_id'] ?? 0);
        
        if ($itemId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Item ID is required']);
            exit;
        }
        
        $db = getDB();
        
        // Check if item exists
        $checkStmt = $db->prepare("SELECT item_id FROM inventory_items WHERE item_id = ?");
        $checkStmt->execute([$itemId]);
        if (!$checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit;
        }
        
        // Delete item (stock movement log will cascade delete)
        $stmt = $db->prepare("DELETE FROM inventory_items WHERE item_id = ?");
        $stmt->execute([$itemId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Inventory item deleted successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Delete Inventory Item Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
