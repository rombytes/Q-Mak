<?php
/**
 * Activate Scheduled Order - Check In System
 * Converts a scheduled order to active pending order with queue number
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
require_once __DIR__ . '/../../utils/queue_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $referenceNumber = trim($input['reference_number'] ?? '');
    $orderId = isset($input['order_id']) ? (int)$input['order_id'] : null;
    
    if (empty($referenceNumber) && empty($orderId)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Reference number or order ID is required']);
        exit;
    }
    
    $db = getDB();
    
    // ============================================================
    // VALIDATION 1: Check if COOP is open
    // ============================================================
    $coopStatus = isCoopOpen($db);
    
    if (!$coopStatus['open']) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'The shop is not open yet. You can only check in during operating hours.',
            'reason' => $coopStatus['reason'],
            'coop_status' => $coopStatus
        ]);
        exit;
    }
    
    // ============================================================
    // VALIDATION 2: Fetch and verify order status
    // ============================================================
    $query = "SELECT * FROM orders WHERE ";
    $params = [];
    
    if (!empty($referenceNumber)) {
        $query .= "reference_number = ?";
        $params[] = $referenceNumber;
    } else {
        $query .= "order_id = ?";
        $params[] = $orderId;
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        exit;
    }
    
    // Check if order is already activated (idempotency)
    if ($order['status'] === 'pending' || $order['status'] === 'processing') {
        // Already activated - return success with current queue number
        $waitTimeData = getOrderQueuePosition($db, $order['queue_number'], $order['queue_date']);
        
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => true,
            'message' => 'Order already activated',
            'data' => [
                'order_id' => $order['order_id'],
                'queue_number' => $order['queue_number'],
                'reference_number' => $order['reference_number'],
                'status' => $order['status'],
                'queue_date' => $order['queue_date'],
                'wait_time' => $waitTimeData['estimated_minutes'],
                'wait_time_details' => $waitTimeData,
                'queue_position' => $waitTimeData['queue_position'],
                'already_active' => true
            ]
        ]);
        exit;
    }
    
    if ($order['status'] === 'completed') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Order already completed']);
        exit;
    }
    
    if ($order['status'] === 'cancelled') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Order is cancelled']);
        exit;
    }
    
    if ($order['status'] !== 'scheduled') {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Order is not in scheduled status. Current status: ' . $order['status']
        ]);
        exit;
    }
    
    // ============================================================
    // ACTION: Activate the order
    // ============================================================
    $db->beginTransaction();
    
    // Generate new queue number for today
    $queueNumber = generateQueueNumber($db);
    $queueDate = date('Y-m-d');
    
    // Calculate wait time based on current queue
    $itemOrdered = $order['item_ordered'] ?? $order['item_name'] ?? 'Unknown';
    $waitTimeData = calculateWaitTime($db, $itemOrdered);
    
    // Update order: activate it
    $updateStmt = $db->prepare("
        UPDATE orders 
        SET 
            status = 'pending',
            queue_number = ?,
            queue_date = ?,
            estimated_wait_time = ?,
            created_at = NOW(),
            updated_at = NOW()
        WHERE order_id = ?
    ");
    
    $updateStmt->execute([
        $queueNumber,
        $queueDate,
        $waitTimeData['estimated_minutes'],
        $order['order_id']
    ]);
    
    $db->commit();
    
    // ============================================================
    // RESPONSE: Return success with new queue details
    // ============================================================
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => true,
        'message' => 'Successfully checked in! You are now in the queue.',
        'data' => [
            'order_id' => $order['order_id'],
            'queue_number' => $queueNumber,
            'reference_number' => $order['reference_number'],
            'status' => 'pending',
            'queue_date' => $queueDate,
            'wait_time' => $waitTimeData['estimated_minutes'],
            'wait_time_details' => $waitTimeData,
            'queue_position' => $waitTimeData['queue_position'],
            'coop_status' => $coopStatus
        ]
    ]);
    exit;
    
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Activate Scheduled Order PDO Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage()
    ]);
    exit;
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Activate Scheduled Order Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}
?>
