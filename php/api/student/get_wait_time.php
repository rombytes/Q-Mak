<?php
/**
 * Get Real-time Wait Time API
 * Returns updated wait time for a specific queue number
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/queue_functions.php';

try {
    // Get queue number or reference number from query params
    $queueNumber = $_GET['queue'] ?? null;
    $referenceNumber = $_GET['ref'] ?? null;
    
    if (empty($queueNumber) && empty($referenceNumber)) {
        echo json_encode([
            'success' => false,
            'message' => 'Queue number or reference number is required'
        ]);
        exit;
    }
    
    $db = getDB();
    
    // CHANGED LOGIC START: Prioritize Reference Number (Unique) over Queue Number
    if (!empty($referenceNumber)) {
        // Search by Reference Number (Unique across all dates)
        $stmt = $db->prepare("
            SELECT o.*, s.email, s.first_name, s.last_name
            FROM orders o
            LEFT JOIN students s ON o.student_id = s.student_id
            WHERE o.reference_number = ?
        ");
        $stmt->execute([$referenceNumber]);
    } else {
        // Fallback: Search by Queue Number (Only looks for TODAY'S active queues)
        $stmt = $db->prepare("
            SELECT o.*, s.email, s.first_name, s.last_name
            FROM orders o
            LEFT JOIN students s ON o.student_id = s.student_id
            WHERE o.queue_number = ? 
              AND o.queue_date = CURDATE()
        ");
        $stmt->execute([$queueNumber]);
    }
    // CHANGED LOGIC END
    
    $order = $stmt->fetch();
    
    if (!$order) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }
    
    // If order is already completed, return completion info
    if ($order['status'] === 'completed') {
        echo json_encode([
            'success' => true,
            'status' => 'completed',
            'message' => 'Your order is ready for pickup!',
            'queue_number' => $order['queue_number'],
            'reference_number' => $order['reference_number'],
            'completed_at' => $order['completed_at'],
            'actual_wait_time' => $order['actual_completion_time']
        ]);
        exit;
    }
    
    // If order is cancelled
    if ($order['status'] === 'cancelled' || $order['is_archived']) {
        echo json_encode([
            'success' => true,
            'status' => 'cancelled',
            'message' => 'This order has been cancelled',
            'queue_number' => $order['queue_number'],
            'reference_number' => $order['reference_number']
        ]);
        exit;
    }
    
    // Get accurate queue position based on queue_number
    $positionData = getOrderQueuePosition($db, $order['queue_number'], $order['queue_date']);
    $currentPosition = $positionData['queue_position'];
    
    // Use the wait time from position data
    $waitTimeData = [
        'estimated_minutes' => $positionData['estimated_minutes'],
        'queue_position' => $positionData['queue_position']
    ];
    
    // Check if being processed
    $isProcessing = ($order['status'] === 'processing');
    
    // Calculate time elapsed since order creation
    $createdTime = new DateTime($order['created_at']);
    $now = new DateTime();
    $timeElapsed = $createdTime->diff($now);
    $minutesElapsed = ($timeElapsed->h * 60) + $timeElapsed->i;
    
    // Adjust estimated wait time based on elapsed time
    $adjustedWaitTime = max(1, $waitTimeData['estimated_minutes'] - $minutesElapsed);
    
    // Get number of orders being processed
    $processingStmt = $db->prepare("
        SELECT COUNT(*) as processing_count
        FROM orders
        WHERE queue_date = ?
          AND status = 'processing'
    ");
    $processingStmt->execute([$order['queue_date']]);
    $processingData = $processingStmt->fetch();
    
    echo json_encode([
        'success' => true,
        'status' => $order['status'],
        'queue_number' => $order['queue_number'],
        'reference_number' => $order['reference_number'],
        'queue_position' => $currentPosition,
        'estimated_minutes' => $adjustedWaitTime,
        'original_estimate' => $order['estimated_wait_time'],
        'minutes_elapsed' => $minutesElapsed,
        'is_processing' => $isProcessing,
        'orders_processing' => (int)$processingData['processing_count'],
        'orders_ahead' => $positionData['orders_ahead'],
        'item_ordered' => $order['item_ordered'],
        'created_at' => $order['created_at'],
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    error_log("Get Wait Time Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve wait time',
        'error' => $e->getMessage()
    ]);
}
?>
