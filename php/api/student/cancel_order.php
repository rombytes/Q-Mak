<?php
/**
 * Cancel Order API - Phase 4
 * Handles order cancellation with inventory reversal
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $orderId = isset($input['order_id']) ? (int)$input['order_id'] : null;
    $referenceNumber = isset($input['reference_number']) ? trim($input['reference_number']) : '';
    
    if (empty($orderId) && empty($referenceNumber)) {
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
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        exit;
    }
    
    // ============================================================
    // VALIDATION: Check Status
    // ============================================================
    $currentStatus = $order['status'] ?? '';
    
    if ($currentStatus === 'completed') {
        echo json_encode([
            'success' => false,
            'message' => 'Cannot cancel order. It has already been completed.',
            'current_status' => $currentStatus
        ]);
        exit;
    }
    
    if ($currentStatus === 'processing') {
        echo json_encode([
            'success' => false,
            'message' => 'Cannot cancel order. It is already being processed by COOP staff.',
            'current_status' => $currentStatus
        ]);
        exit;
    }
    
    if ($currentStatus === 'cancelled') {
        echo json_encode([
            'success' => false,
            'message' => 'Order is already cancelled.',
            'current_status' => $currentStatus
        ]);
        exit;
    }
    
    // Only 'pending' and 'scheduled' orders can be cancelled
    if (!in_array($currentStatus, ['pending', 'scheduled'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Order cannot be cancelled in its current status.',
            'current_status' => $currentStatus
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
        // Check if order_type_service column exists, default to 'items' if not
        $orderTypeService = 'items';
        if (isset($order['order_type_service'])) {
            $orderTypeService = $order['order_type_service'];
        } elseif (isset($order['item_name']) && strtolower($order['item_name']) === 'printing services') {
            $orderTypeService = 'printing';
        }
        
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
                    
                    try {
                        // Check if item exists in inventory - use * to be safe
                        $checkStmt = $db->prepare("SELECT * FROM inventory_items WHERE LOWER(item_name) = LOWER(?) LIMIT 1");
                        $checkStmt->execute([$itemName]);
                        $inventoryItem = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($inventoryItem) {
                            // Determine quantity column name (could be 'stock_quantity', 'quantity', or 'stock')
                            $qtyColumn = isset($inventoryItem['stock_quantity']) ? 'stock_quantity' :
                                        (isset($inventoryItem['quantity']) ? 'quantity' : 
                                        (isset($inventoryItem['stock']) ? 'stock' : null));
                            
                            if ($qtyColumn) {
                                // Restock the item
                                $restockStmt = $db->prepare("UPDATE inventory_items SET {$qtyColumn} = {$qtyColumn} + 1, updated_at = NOW() WHERE item_id = ?");
                                $restockStmt->execute([$inventoryItem['item_id']]);
                                
                                $inventoryRestocked = true;
                                $restoredItems[] = [
                                    'item_name' => $inventoryItem['item_name'],
                                    'new_quantity' => ($inventoryItem[$qtyColumn] ?? 0) + 1
                                ];
                                
                                error_log("Inventory restocked: {$inventoryItem['item_name']}");
                            }
                        } else {
                            // Item not found in inventory - log warning but don't fail
                            error_log("Warning: Item '{$itemName}' not found in inventory during cancellation");
                        }
                    } catch (Exception $e) {
                        // Inventory update failed - log but don't fail the cancellation
                        error_log("Inventory restock failed for '{$itemName}': " . $e->getMessage());
                    }
                }
            }
        }
        // Note: Printing service orders don't require inventory reversal
        
        // ============================================================
        // UPDATE ORDER STATUS TO CANCELLED
        // ============================================================
        // Check if cancelled_at column exists
        $updateSql = "UPDATE orders SET status = 'cancelled', updated_at = NOW()";
        
        // Try to also update cancelled_at if column exists
        try {
            $checkCol = $db->query("SHOW COLUMNS FROM orders LIKE 'cancelled_at'");
            if ($checkCol->rowCount() > 0) {
                $updateSql = "UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()";
            }
        } catch (Exception $e) {
            // Column check failed, use simple update
        }
        
        $updateSql .= " WHERE order_id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute([$order['order_id']]);
        
        // ============================================================
        // COMMIT TRANSACTION
        // ============================================================
        $db->commit();
        
        // ============================================================
        // SUCCESS RESPONSE
        // ============================================================
        echo json_encode([
            'success' => true,
            'message' => 'Order cancelled successfully. Your reserved item has been released.',
            'data' => [
                'order_id' => $order['order_id'],
                'reference_number' => $order['reference_number'] ?? '',
                'previous_status' => $currentStatus,
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
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    exit;
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Cancel Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}
?>
