<?php
/**
 * Cancel Order API - Phase 4
 * Handles order cancellation with inventory reversal
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start();

set_exception_handler(function($e){
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

register_shutdown_function(function(){
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
});

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $orderId = isset($input['order_id']) ? (int)$input['order_id'] : null;
    $referenceNumber = trim($input['reference_number'] ?? '');
    
    if (empty($orderId) && empty($referenceNumber)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Order ID or reference number is required']);
        exit;
    }
    
    $db = getDB();
    
    // ============================================================
    // FETCH ORDER
    // ============================================================
    $query = "SELECT * FROM orders WHERE ";
    $params = [];
    
    if (!empty($orderId)) {
        $query .= "order_id = ?";
        $params[] = $orderId;
    } else {
        $query .= "reference_number = ?";
        $params[] = $referenceNumber;
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        exit;
    }
    
    // ============================================================
    // VALIDATION: Check Status
    // ============================================================
    if ($order['status'] === 'completed') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Cannot cancel order. It has already been completed.',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    if ($order['status'] === 'processing') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Cannot cancel order. It is already being processed by COOP staff.',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    if ($order['status'] === 'cancelled') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Order is already cancelled.',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    // Only 'pending' and 'scheduled' orders can be cancelled
    if (!in_array($order['status'], ['pending', 'scheduled'])) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Order cannot be cancelled in its current status.',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    // ============================================================
    // BEGIN TRANSACTION
    // ============================================================
    $db->beginTransaction();
    
    try {
        // ============================================================
        // INVENTORY REVERSAL
        // ============================================================
        $orderTypeService = $order['order_type_service'] ?? 'items';
        $inventoryRestocked = false;
        $restoredItems = [];
        
        if ($orderTypeService === 'items') {
            // Get item name from order
            $itemOrdered = $order['item_ordered'] ?? $order['item_name'] ?? '';
            
            if (!empty($itemOrdered)) {
                // Handle multiple items (comma-separated)
                $items = array_map('trim', explode(',', $itemOrdered));
                
                foreach ($items as $itemName) {
                    if (empty($itemName)) continue;
                    
                    // Check if item exists in inventory
                    $checkStmt = $db->prepare("SELECT item_id, item_name, quantity FROM inventory_items WHERE LOWER(item_name) = LOWER(?)");
                    $checkStmt->execute([$itemName]);
                    $inventoryItem = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($inventoryItem) {
                        // Restock the item
                        $restockStmt = $db->prepare("UPDATE inventory_items SET quantity = quantity + 1, updated_at = NOW() WHERE item_id = ?");
                        $restockStmt->execute([$inventoryItem['item_id']]);
                        
                        $inventoryRestocked = true;
                        $restoredItems[] = [
                            'item_name' => $inventoryItem['item_name'],
                            'new_quantity' => $inventoryItem['quantity'] + 1
                        ];
                        
                        error_log("Inventory restocked: {$inventoryItem['item_name']} - New quantity: " . ($inventoryItem['quantity'] + 1));
                    } else {
                        // Item not found in inventory - log warning but don't fail
                        error_log("Warning: Item '{$itemName}' not found in inventory during cancellation");
                    }
                }
            }
        }
        // Note: Printing service orders don't require inventory reversal
        
        // ============================================================
        // UPDATE ORDER STATUS TO CANCELLED
        // ============================================================
        $updateStmt = $db->prepare("
            UPDATE orders 
            SET 
                status = 'cancelled',
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE order_id = ?
        ");
        
        $updateStmt->execute([$order['order_id']]);
        
        // ============================================================
        // COMMIT TRANSACTION
        // ============================================================
        $db->commit();
        
        // ============================================================
        // SUCCESS RESPONSE
        // ============================================================
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => true,
            'message' => 'Order cancelled successfully. Your reserved item has been released.',
            'data' => [
                'order_id' => $order['order_id'],
                'reference_number' => $order['reference_number'],
                'previous_status' => $order['status'],
                'new_status' => 'cancelled',
                'cancelled_at' => date('Y-m-d H:i:s'),
                'inventory_restocked' => $inventoryRestocked,
                'restored_items' => $restoredItems,
                'order_type_service' => $orderTypeService
            ]
        ]);
        exit;
        
    } catch (Exception $e) {
        // Rollback on any error
        $db->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Cancel Order PDO Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred while cancelling order',
        'error' => $e->getMessage()
    ]);
    exit;
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Cancel Order Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}
?>
