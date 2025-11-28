<?php
/**
 * Get Public Queue Display API
 * Returns current queue status for public dashboard
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/queue_functions.php';

try {
    $db = getDB();
    
    // Get today's queue orders - exclude cancelled and scheduled orders without queue numbers
    // Only show actionable live queue data: pending, processing, ready, and last 5 completed
    $stmt = $db->prepare("
        SELECT 
            o.queue_number,
            o.reference_number,
            o.status,
            o.estimated_wait_time,
            o.created_at,
            o.started_processing_at,
            o.completed_at,
            TIMESTAMPDIFF(MINUTE, o.created_at, 
                CASE 
                    WHEN o.completed_at IS NOT NULL THEN o.completed_at
                    WHEN o.started_processing_at IS NOT NULL THEN NOW()
                    ELSE NOW()
                END
            ) as actual_wait_minutes,
            CAST(SUBSTRING(o.queue_number, LOCATE('-', o.queue_number) + 1) AS UNSIGNED) as queue_position
        FROM orders o
        WHERE o.queue_date = CURDATE()
        AND o.status IN ('pending', 'processing', 'ready')
        AND o.queue_number IS NOT NULL 
        AND o.queue_number != ''
        
        UNION ALL
        
        (SELECT 
            o.queue_number,
            o.reference_number,
            o.status,
            o.estimated_wait_time,
            o.created_at,
            o.started_processing_at,
            o.completed_at,
            TIMESTAMPDIFF(MINUTE, o.created_at, o.completed_at) as actual_wait_minutes,
            CAST(SUBSTRING(o.queue_number, LOCATE('-', o.queue_number) + 1) AS UNSIGNED) as queue_position
        FROM orders o
        WHERE o.queue_date = CURDATE()
        AND o.status = 'completed'
        AND o.queue_number IS NOT NULL
        AND o.queue_number != ''
        ORDER BY o.completed_at DESC
        LIMIT 5)
        
        ORDER BY
            CASE status
                WHEN 'processing' THEN 1
                WHEN 'ready' THEN 2
                WHEN 'pending' THEN 3
                ELSE 4
            END,
            created_at ASC
    ");
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    // Format queue data
    $queueData = [];
    $currentProcessing = null;
    
    foreach ($orders as $order) {
        $item = [
            'queue' => $order['queue_number'],
            'ref' => substr($order['reference_number'], -8), // Show last 8 chars
            'status' => $order['status'],
            'wait' => 0
        ];
        
        // Calculate wait time based on status
        if ($order['status'] === 'completed') {
            $item['wait'] = 0;
        } elseif ($order['status'] === 'processing') {
            $currentProcessing = $order['queue_number'];
            $item['wait'] = (int)$order['estimated_wait_time'];
        } else {
            // Pending - calculate based on queue position
            $item['wait'] = (int)$order['estimated_wait_time'];
        }
        
        $queueData[] = $item;
    }
    
    // Calculate analytics
    $completedOrders = array_filter($orders, fn($o) => $o['status'] === 'completed');
    $processingTime = array_filter(array_map(fn($o) => $o['actual_wait_minutes'], $completedOrders));
    
    $avgProcessTime = count($processingTime) > 0 ? round(array_sum($processingTime) / count($processingTime)) : 0;
    $avgWaitTime = $avgProcessTime; // Simplified
    
    // Calculate orders per hour
    $completedCount = count($completedOrders);
    $firstOrderTime = count($orders) > 0 ? strtotime($orders[0]['created_at']) : time();
    $hoursElapsed = max(1, (time() - $firstOrderTime) / 3600);
    $ordersPerHour = $completedCount > 0 ? round($completedCount / $hoursElapsed, 1) : 0;
    
    // Determine current serving - if no processing order, show the first pending
    if (!$currentProcessing && count($queueData) > 0) {
        $firstPending = array_filter($queueData, fn($item) => $item['status'] === 'pending');
        if (count($firstPending) > 0) {
            $currentProcessing = reset($firstPending)['queue'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'queue' => $queueData,
        'current_serving' => $currentProcessing,
        'analytics' => [
            'avg_wait_time' => $avgWaitTime,
            'avg_process_time' => $avgProcessTime,
            'orders_per_hour' => $ordersPerHour
        ],
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    error_log("Get Queue Display Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve queue data',
        'error' => $e->getMessage()
    ]);
}
?>
