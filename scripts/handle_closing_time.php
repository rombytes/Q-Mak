<?php
/**
 * Handle Closing Time Script - Production Ready
 * Moves pending orders to next business day
 * Run this script at closing time (e.g., 5:05 PM)
 * 
 * ============================================================================
 * HOSTINGER CRON SETUP INSTRUCTIONS
 * ============================================================================
 * 
 * 1. Find Your User Path:
 *    - Login to Hostinger hPanel
 *    - Go to: Advanced → Cron Jobs
 *    - Look for "Current Path" or the example shown (usually /home/u123456789)
 *    - Or use SSH/File Manager to check: echo $HOME
 * 
 * 2. Determine Full Script Path:
 *    Format: /home/uXXXXXXXXX/domains/yourdomain.com/public_html/scripts/handle_closing_time.php
 *    Example: /home/u123456789/domains/qmak.com/public_html/scripts/handle_closing_time.php
 * 
 * 3. Cron Job Command (paste this in Hostinger):
 *    /usr/bin/php /home/uXXXXXXXXX/domains/yourdomain.com/public_html/scripts/handle_closing_time.php
 * 
 * 4. Schedule (Common Options):
 *    Run at 5:05 PM weekdays:  5 17 * * 1-5
 *    Run at 6:00 PM daily:     0 18 * * *
 *    Run every hour:           0 * * * *
 * 
 * 5. Complete Cron Entry Example:
 *    Minute: 5
 *    Hour: 17
 *    Day: *
 *    Month: *
 *    Weekday: 1-5
 *    Command: /usr/bin/php /home/u123456789/domains/qmak.com/public_html/scripts/handle_closing_time.php
 * 
 * 6. Email Output (optional):
 *    Add: > /dev/null 2>&1  (to suppress emails)
 *    Full: /usr/bin/php /path/to/script.php > /dev/null 2>&1
 * 
 * ============================================================================
 */

// ============================================================================
// ENVIRONMENT DETECTION - CLI vs WEB
// ============================================================================
$isCLI = php_sapi_name() === 'cli' || php_sapi_name() === 'cli-server';
$isWeb = !$isCLI;

// Security: Prevent web access (only allow CLI/Cron execution)
if ($isWeb) {
    http_response_code(403);
    die('⛔ ACCESS DENIED: This script can only be executed via command line (Cron).<br>' . 
        'If you need to test, run: <code>php ' . basename(__FILE__) . '</code> in terminal.');
}

// ============================================================================
// ABSOLUTE PATH CONFIGURATION - Production Robust
// ============================================================================

// Define base directory using absolute path resolution
define('SCRIPT_DIR', __DIR__);
define('BASE_DIR', dirname(SCRIPT_DIR));

// Verify we're in the correct location
if (!file_exists(BASE_DIR . '/php/config/database.php')) {
    die("ERROR: Cannot locate required files. Check script location.\nExpected: {BASE_DIR}/php/config/database.php\n");
}

// Load required files using absolute paths
require_once BASE_DIR . '/php/config/database.php';
require_once BASE_DIR . '/php/utils/email.php';
require_once BASE_DIR . '/php/utils/queue_functions.php';

// Set timezone
date_default_timezone_set('Asia/Manila');

// ============================================================================
// EXECUTION LOG
// ============================================================================
$logFile = BASE_DIR . '/logs/closing_time.log';
$logDir = dirname($logFile);

// Ensure logs directory exists
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

/**
 * Log message to both console and file
 */
function logMessage($message, $isError = false) {
    global $logFile;
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$message}\n";
    
    // Output to console
    echo $logEntry;
    
    // Write to log file
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Also log errors to PHP error log
    if ($isError) {
        error_log("CLOSING_TIME_SCRIPT: {$message}");
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

logMessage("=== CLOSING TIME HANDLER - START ===");
logMessage("Execution Mode: CLI (Cron)");
logMessage("PHP Version: " . PHP_VERSION);
logMessage("Script Path: " . __FILE__);
logMessage("Working Directory: " . getcwd());
logMessage("");

try {
    // Get database connection
    $db = getDB();
    logMessage("✓ Database connection established");
    
    // Check if auto-move is enabled
    $settingStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'auto_move_pending_to_next_day'");
    $settingStmt->execute();
    $autoMove = $settingStmt->fetch();
    
    if (!$autoMove || $autoMove['setting_value'] != '1') {
        logMessage("ℹ Auto-move feature is DISABLED in settings");
        logMessage("Exiting without processing orders");
        exit(0);
    }
    
    logMessage("✓ Auto-move feature is ENABLED");
    
    // Get next business day
    $nextBusinessDay = getNextBusinessDay($db);
    
    if (!$nextBusinessDay) {
        logMessage("ERROR: No business day found in next 14 days!", true);
        logMessage("Check your schedule settings in admin dashboard", true);
        exit(1);
    }
    
    logMessage("✓ Next business day calculated: {$nextBusinessDay}");
    logMessage("");
    
    // Get all pending orders for today
    $today = date('Y-m-d');
    logMessage("📅 Today's date: {$today}");
    
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
        logMessage("✓ No pending orders to move. All done!");
        logMessage("=== CLOSING TIME HANDLER - COMPLETE ===");
        exit(0);
    }
    
    logMessage("📦 Found " . count($pendingOrders) . " pending order(s) to move");
    logMessage("");
    
    $movedCount = 0;
    $errorCount = 0;
    
    foreach ($pendingOrders as $order) {
        logMessage("→ Processing Order #{$order['order_id']} - {$order['queue_number']}");
        
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
            
            logMessage("  ✓ Moved to {$nextBusinessDay} as {$newQueueNumber}");
            
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
                    logMessage("  ✓ Email sent to {$order['email']}");
                } catch (Exception $e) {
                    logMessage("  ⚠ Email failed: " . $e->getMessage());
                }
            } else {
                logMessage("  ℹ No email address for this order");
            }
            
            $movedCount++;
            
        } catch (Exception $e) {
            logMessage("  ✗ Error: " . $e->getMessage(), true);
            $errorCount++;
        }
        
        logMessage("");
    }
    
    logMessage("=== EXECUTION SUMMARY ===");
    logMessage("Total orders found: " . count($pendingOrders));
    logMessage("Successfully moved: {$movedCount}");
    logMessage("Errors encountered: {$errorCount}");
    
    if ($errorCount > 0) {
        logMessage("⚠ Some orders failed to move. Check logs above.", true);
    } else {
        logMessage("✓ All orders processed successfully!");
    }
    
    logMessage("=== CLOSING TIME HANDLER - COMPLETE ===");
    
} catch (Exception $e) {
    logMessage("🚨 FATAL ERROR: " . $e->getMessage(), true);
    logMessage("Stack trace: " . $e->getTraceAsString(), true);
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
