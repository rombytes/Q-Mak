<?php
/**
 * Handle Closing Time Script
 * Moves pending orders to next business day
 * Run this script at closing time (e.g., 5:05 PM)
 * 
 * Cron: 5 17 * * 1-5 php /path/to/handle_closing_time.php
 */

require_once __DIR__ . '/../php/config/database.php';
require_once __DIR__ . '/../php/utils/email.php';
require_once __DIR__ . '/../php/utils/queue_functions.php';

// Set timezone
date_default_timezone_set('Asia/Manila');

echo "=== CLOSING TIME HANDLER ===\n";
echo "Started at: " . date('Y-m-d H:i:s') . "\n\n";

try {
    $db = getDB();
    
    // Check if auto-move is enabled
    $settingStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'auto_move_pending_to_next_day'");
    $settingStmt->execute();
    $autoMove = $settingStmt->fetch();
    
    if (!$autoMove || $autoMove['setting_value'] != '1') {
        echo "Auto-move disabled. Exiting.\n";
        exit(0);
    }
    
    // Get next business day
    $nextBusinessDay = getNextBusinessDay($db);
    
    if (!$nextBusinessDay) {
        echo "ERROR: No business day found in next 14 days!\n";
        error_log("CLOSING TIME: No business day found for order migration");
        exit(1);
    }
    
    echo "Next business day: {$nextBusinessDay}\n\n";
    
    // Get all pending orders for today
    $today = date('Y-m-d');
    $stmt = $db->prepare("
        SELECT 
            o.order_id,
            o.queue_number,
            o.reference_number,
            o.student_id,
            o.item_ordered,
            s.email,
            s.first_name,
            s.last_name
        FROM orders o
        LEFT JOIN students s ON o.student_id = s.student_id
        WHERE o.queue_date = ? 
        AND o.status IN ('pending', 'processing')
        AND o.is_archived = 0
    ");
    $stmt->execute([$today]);
    $pendingOrders = $stmt->fetchAll();
    
    if (empty($pendingOrders)) {
        echo "No pending orders to move. All done!\n";
        exit(0);
    }
    
    echo "Found " . count($pendingOrders) . " pending orders to move\n\n";
    
    $movedCount = 0;
    $errorCount = 0;
    
    foreach ($pendingOrders as $order) {
        echo "Processing Order #{$order['order_id']} - {$order['queue_number']}...\n";
        
        try {
            // Generate new queue number for next day
            $newQueueNumber = generateQueueNumberForDate($db, $nextBusinessDay);
            
            // Update order
            $updateStmt = $db->prepare("
                UPDATE orders 
                SET queue_date = ?,
                    queue_number = ?,
                    order_type = 'pre-order',
                    scheduled_date = ?,
                    status = 'pending',
                    updated_at = NOW()
                WHERE order_id = ?
            ");
            $updateStmt->execute([
                $nextBusinessDay,
                $newQueueNumber,
                $nextBusinessDay,
                $order['order_id']
            ]);
            
            echo "  ✓ Moved to {$nextBusinessDay} as {$newQueueNumber}\n";
            
            // Send notification email
            if ($order['email']) {
                try {
                    $emailData = [
                        'student_name' => $order['first_name'] . ' ' . $order['last_name'],
                        'old_queue_number' => $order['queue_number'],
                        'new_queue_number' => $newQueueNumber,
                        'reference_number' => $order['reference_number'],
                        'original_date' => date('l, F j, Y', strtotime($today)),
                        'new_date' => date('l, F j, Y', strtotime($nextBusinessDay)),
                        'item_ordered' => $order['item_ordered'],
                        'reason' => 'COOP closing time reached'
                    ];
                    
                    EmailService::sendOrderMovedNotification($order['email'], $emailData);
                    echo "  ✓ Email sent to {$order['email']}\n";
                } catch (Exception $e) {
                    echo "  ⚠ Email failed: " . $e->getMessage() . "\n";
                }
            }
            
            $movedCount++;
            
        } catch (Exception $e) {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
            error_log("CLOSING TIME ERROR - Order #{$order['order_id']}: " . $e->getMessage());
            $errorCount++;
        }
        
        echo "\n";
    }
    
    echo "=== SUMMARY ===\n";
    echo "Total orders: " . count($pendingOrders) . "\n";
    echo "Successfully moved: {$movedCount}\n";
    echo "Errors: {$errorCount}\n";
    echo "Completed at: " . date('Y-m-d H:i:s') . "\n";
    
} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    error_log("CLOSING TIME FATAL ERROR: " . $e->getMessage());
    exit(1);
}

/**
 * Generate queue number for specific date
 */
function generateQueueNumberForDate($db, $date) {
    $stmt = $db->prepare("
        SELECT queue_number 
        FROM orders 
        WHERE queue_date = ? 
        ORDER BY CAST(SUBSTRING(queue_number, LOCATE('-', queue_number) + 1) AS UNSIGNED) DESC 
        LIMIT 1
    ");
    $stmt->execute([$date]);
    $lastQueue = $stmt->fetch();
    
    if ($lastQueue) {
        preg_match('/Q-(\d+)/', $lastQueue['queue_number'], $matches);
        $lastNum = isset($matches[1]) ? (int)$matches[1] : 0;
        $nextNum = $lastNum + 1;
    } else {
        $nextNum = 1;
    }
    
    return 'Q-' . $nextNum;
}
?>
