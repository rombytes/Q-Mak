<?php
/**
 * Manual Reschedule API
 * Allows admin to manually trigger the reschedule of pending orders
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/email.php';
require_once __DIR__ . '/../../utils/queue_functions.php';

// Admin authentication check would go here
// For now, we'll skip it for testing

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Set timezone
date_default_timezone_set('Asia/Manila');

try {
    $db = getDB();
    
    // Check if auto-move is enabled
    $settingStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'auto_move_pending_to_next_day'");
    $settingStmt->execute();
    $autoMove = $settingStmt->fetch();
    
    if (!$autoMove || $autoMove['setting_value'] != '1') {
        echo json_encode([
            'success' => false, 
            'message' => 'Auto-move feature is disabled. Enable it in settings first.'
        ]);
        exit;
    }
    
    // Get next business day
    $nextBusinessDay = getNextBusinessDay($db);
    
    if (!$nextBusinessDay) {
        echo json_encode([
            'success' => false, 
            'message' => 'No business day found in next 14 days!'
        ]);
        exit;
    }
    
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
        echo json_encode([
            'success' => true, 
            'message' => 'No pending orders to reschedule.',
            'moved_count' => 0,
            'next_business_day' => $nextBusinessDay
        ]);
        exit;
    }
    
    $movedCount = 0;
    $errorCount = 0;
    $errors = [];
    
    $db->beginTransaction();
    
    foreach ($pendingOrders as $order) {
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
                        'reason' => 'Manual reschedule by admin'
                    ];
                    
                    EmailService::sendOrderMovedNotification($order['email'], $emailData);
                } catch (Exception $e) {
                    // Email error shouldn't stop the reschedule
                    error_log("Email failed for order #{$order['order_id']}: " . $e->getMessage());
                }
            }
            
            $movedCount++;
            
        } catch (Exception $e) {
            $errors[] = "Order #{$order['order_id']}: " . $e->getMessage();
            $errorCount++;
        }
    }
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully rescheduled {$movedCount} orders to {$nextBusinessDay}",
        'moved_count' => $movedCount,
        'error_count' => $errorCount,
        'errors' => $errors,
        'next_business_day' => $nextBusinessDay,
        'original_date' => $today
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("Manual Reschedule Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reschedule orders: ' . $e->getMessage()
    ]);
}
?>
