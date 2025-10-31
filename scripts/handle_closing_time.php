<?php
/**
 * Handle Closing Time Script
 * Moves pending orders to next business day
 * Run this script at closing time (e.g., 5:05 PM)
 * 
 * Cron: 5 17 * * 1-5 php /path/to/handle_closing_time.php
 */

require_once __DIR__ . '/../php/config/database.php';
require_once __DIR__ . '/../php/utils/email_sender.php';

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
                        'old_date' => $today,
                        'new_date' => $nextBusinessDay,
                        'items' => $order['item_ordered']
                    ];
                    
                    sendOrderMigrationEmail($order['email'], $emailData);
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
 * Get next business day
 */
function getNextBusinessDay($db, $fromDate = null) {
    $date = $fromDate ? new DateTime($fromDate) : new DateTime();
    $maxAttempts = 14; // Check up to 2 weeks ahead
    $attempts = 0;
    
    while ($attempts < $maxAttempts) {
        $date->modify('+1 day');
        $dayOfWeek = (int)$date->format('N');
        $dateStr = $date->format('Y-m-d');
        
        // Check if special closure
        $specialStmt = $db->prepare("SELECT is_open FROM special_hours WHERE date = ?");
        $specialStmt->execute([$dateStr]);
        $special = $specialStmt->fetch();
        
        if ($special && !$special['is_open']) {
            $attempts++;
            continue; // Skip this day
        }
        
        // Check regular schedule
        $hoursStmt = $db->prepare("
            SELECT is_open FROM working_hours 
            WHERE day_of_week = ? AND is_active = 1
        ");
        $hoursStmt->execute([$dayOfWeek]);
        $hours = $hoursStmt->fetch();
        
        if ($hours && $hours['is_open']) {
            return $dateStr;
        }
        
        $attempts++;
    }
    
    return null;
}

/**
 * Generate queue number for specific date
 */
function generateQueueNumberForDate($db, $date) {
    $stmt = $db->prepare("
        SELECT queue_number 
        FROM orders 
        WHERE queue_date = ? 
        ORDER BY CAST(SUBSTRING(queue_number, 3) AS UNSIGNED) DESC 
        LIMIT 1
    ");
    $stmt->execute([$date]);
    $lastQueue = $stmt->fetch();
    
    if ($lastQueue) {
        $lastNum = (int)substr($lastQueue['queue_number'], 2);
        $nextNum = $lastNum + 1;
    } else {
        $nextNum = 1;
    }
    
    return 'Q-' . $nextNum;
}

/**
 * Send order migration notification email
 */
function sendOrderMigrationEmail($email, $data) {
    $subject = "Order Moved to Next Day - {$data['reference_number']}";
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🔔 Order Moved to Next Day</h1>
            </div>
            <div class='content'>
                <p>Hi {$data['student_name']},</p>
                
                <p>Your order couldn't be completed today due to closing time. We've automatically moved it to the next business day.</p>
                
                <div class='info-box'>
                    <h3>📦 Order Details</h3>
                    <p><strong>Reference Number:</strong> {$data['reference_number']}</p>
                    <p><strong>Items:</strong> {$data['items']}</p>
                    <p><strong>Original Date:</strong> {$data['old_date']}</p>
                    <p><strong>Original Queue:</strong> {$data['old_queue_number']}</p>
                </div>
                
                <div class='info-box' style='border-left-color: #10b981;'>
                    <h3>✅ New Schedule</h3>
                    <p><strong>New Date:</strong> {$data['new_date']}</p>
                    <p><strong>New Queue Number:</strong> {$data['new_queue_number']}</p>
                    <p><strong>Status:</strong> Pre-order (Ready for pickup on scheduled date)</p>
                </div>
                
                <p><strong>What you need to do:</strong></p>
                <ul>
                    <li>Come to COOP on <strong>{$data['new_date']}</strong></li>
                    <li>Bring your queue number: <strong>{$data['new_queue_number']}</strong></li>
                    <li>Check your dashboard for real-time status</li>
                </ul>
                
                <p>If you wish to cancel this order, please log in to your dashboard.</p>
                
                <div class='footer'>
                    <p>UMak COOP Queue Management System</p>
                    <p>Operating Hours: Monday-Friday, 10:00 AM - 5:00 PM</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Use your existing email sending function
    return EmailSender::sendCustomEmail($email, $subject, $message);
}
?>
