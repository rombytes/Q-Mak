<?php
/**
 * Check if current time is within cutoff window
 * Returns warning if close to closing time
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/queue_functions.php';

try {
    $db = getDB();
    
    // Get COOP status
    $status = isCoopOpen($db);
    
    $response = [
        'success' => true,
        'is_open' => $status['open'],
        'can_order' => true,
        'warning' => null
    ];
    
    if (!$status['open']) {
        $response['can_order'] = false;
        $response['warning'] = [
            'level' => 'error',
            'message' => 'COOP is currently closed. Your order will be scheduled as a pre-order for the next business day.',
            'reason' => $status['reason'] ?? 'Closed'
        ];
    } else {
        // Check cutoff time
        $cutoffMinutes = (int)getSetting($db, 'order_cutoff_minutes', 30);
        $minutesUntilClosing = $status['minutes_until_closing'] ?? 0;
        
        if ($minutesUntilClosing <= $cutoffMinutes) {
            $response['warning'] = [
                'level' => 'warning',
                'message' => "COOP is closing soon! Orders placed within $cutoffMinutes minutes of closing may be moved to tomorrow if not completed.",
                'minutes_left' => $minutesUntilClosing
            ];
        }
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to check cutoff status'
    ]);
}
?>
