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
        
        // Distinguish between "Not yet open" (early morning) vs "Closed for day/holiday"
        $isEarlyMorning = ($status['reason'] === 'Not yet open');
        
        if ($isEarlyMorning) {
            // Early morning - order for TODAY
            $targetDate = date('Y-m-d');
            $dateString = 'Today, ' . date('F j');
            $opensAt = $status['opens_at'] ?? '7:00 AM';
            $message = "COOP opens at " . date('g:i A', strtotime($opensAt)) . ". You can place an order for today.";
        } else {
            // Closed for the day/Holiday - order for NEXT business day
            $targetDate = getNextBusinessDay($db);
            $dateString = $targetDate ? date('l, F j', strtotime($targetDate)) : 'Unknown';
            $message = "COOP is currently closed.";
        }
        
        $response['warning'] = [
            'level' => 'error',
            'message' => $message,
            'reason' => $status['reason'] ?? 'Closed',
            'next_business_day' => $dateString
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
