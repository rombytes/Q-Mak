<?php
/**
 * Verify OTP and Complete Order
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

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../utils/email.php';
require_once __DIR__ . '/../../utils/queue_functions.php';
require_once __DIR__ . '/../../utils/brute_force_protection.php';

// Initialize brute force protection
$security = new BruteForceProtection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $otpCode = trim($input['otp_code'] ?? '');
    $otpType = trim($input['otp_type'] ?? 'order');
    
    if (empty($email) || empty($otpCode)) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Email and OTP code are required']);
        exit;
    }
    
    // Check if identifier is locked (using email for OTP verification)
    if ($security->isLocked($email, 'otp_verify')) {
        $status = $security->getAccountStatus($email, 'otp_verify');
        if (ob_get_level()) { ob_clean(); }
        echo json_encode([
            'success' => false,
            'message' => 'Too many failed OTP attempts. Please request a new OTP.',
            'locked_until' => $status['locked_until'] ?? null
        ]);
        exit;
    }
    
    // Apply progressive delay to prevent rapid-fire attacks
    $security->applyProgressiveDelay($email, 'otp_verify');
    
    $db = getDB();
    
    // Get the latest unverified OTP for this email and type
    // Note: We fetch ALL unverified OTPs to check both expiration and attempts separately
    $stmtLatest = $db->prepare("
        SELECT 
            otp_id, 
            email, 
            otp_code, 
            otp_type, 
            attempts, 
            max_attempts, 
            is_verified, 
            expires_at
        FROM otp_verifications
        WHERE email = ? 
            AND otp_type = ? 
            AND is_verified = FALSE
        ORDER BY otp_id DESC
        LIMIT 1
    ");
    $stmtLatest->execute([$email, $otpType]);
    $latestOtp = $stmtLatest->fetch();
    
    if (!$latestOtp) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'No valid OTP found. Please request a new one.']);
        exit;
    }
    
    // Check if already exceeded max attempts FIRST (before checking code)
    if ($latestOtp['attempts'] >= $latestOtp['max_attempts']) {
        if (ob_get_level()) { ob_clean(); }
        echo json_encode(['success' => false, 'message' => 'Maximum attempts exceeded. Please request a new OTP.']);
        exit;
    }
    
    // Check if OTP code matches
    if ($latestOtp['otp_code'] !== $otpCode) {
        // Wrong code - increment attempts in OTP table
        $newAttempts = $latestOtp['attempts'] + 1;
        $updateAttempts = $db->prepare("UPDATE otp_verifications SET attempts = ? WHERE otp_id = ?");
        $updateAttempts->execute([$newAttempts, $latestOtp['otp_id']]);
        
        // Record failed attempt in security system
        $attemptResult = $security->recordFailedAttempt($email, 'otp_verify', [
            'reason' => 'Invalid OTP code',
            'otp_type' => $otpType
        ]);
        
        $remainingAttempts = $latestOtp['max_attempts'] - $newAttempts;
        
        if (ob_get_level()) { ob_clean(); }
        
        // Check if account is now locked or max OTP attempts reached
        if ($attemptResult['locked'] || $newAttempts >= $latestOtp['max_attempts']) {
            echo json_encode([
                'success' => false,
                'message' => $attemptResult['locked'] ? 
                    'Too many failed attempts. Please request a new OTP.' : 
                    'Maximum OTP attempts exceeded. Please request a new OTP.',
                'remaining_attempts' => 0,
                'locked_until' => $attemptResult['locked_until'] ?? null
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Incorrect OTP code',
                'remaining_attempts' => $remainingAttempts,
                'security_remaining' => $attemptResult['remaining']
            ]);
        }
        exit;
    }
    
    // OTP is correct - reset security attempts
    $security->recordSuccessfulAttempt($email, 'otp_verify');
    
    // OTP code is correct - accept it (no expiration check during retries)
    $otpRecord = $latestOtp;
    
    // OTP is correct - mark as verified
    $db->beginTransaction();
    
    $updateOtp = $db->prepare("
        UPDATE otp_verifications 
        SET is_verified = TRUE, verified_at = NOW() 
        WHERE otp_id = ?
    ");
    $updateOtp->execute([$otpRecord['otp_id']]);
    
    $response = ['success' => true, 'message' => 'OTP verified successfully'];
    
    // If order type, create the order
    if ($otpType === 'order') {
        // Get student info
        $studentStmt = $db->prepare("SELECT * FROM students WHERE email = ?");
        $studentStmt->execute([$email]);
        $student = $studentStmt->fetch();
        
        if (!$student) {
            throw new Exception("Student not found");
        }
        
        // Get order data from session or input
        $orderData = $input['order_data'] ?? null;
        
        if (!$orderData) {
            throw new Exception("Order data not provided");
        }
        
        // Determine service type
        $serviceType = $orderData['order_type_service'] ?? 'items';
        
        // Validate based on service type
        if ($serviceType === 'items' && empty($orderData['purchasing'])) {
            throw new Exception("Item information is required for items orders");
        } else if ($serviceType === 'printing' && (empty($orderData['page_count']) || empty($orderData['color_mode']))) {
            throw new Exception("Printing details are required for printing orders");
        }
        
        // Check if COOP is open
        $coopStatus = isCoopOpen($db);
        $orderType = 'immediate';
        $queueDate = date('Y-m-d');
        $orderedOutsideHours = 0;
        
        if (!$coopStatus['open']) {
            // Check if pre-orders are allowed
            $allowPreorders = getSetting($db, 'allow_preorders', 1);
            
            if ($allowPreorders) {
                // Calculate next business day
                $nextBusinessDay = getNextBusinessDay($db);
                
                if (!$nextBusinessDay) {
                    throw new Exception("Unable to process order. No available business days found.");
                }
                
                // Create as scheduled order (Option C: No queue number, 'scheduled' status)
                $orderType = 'pre-order';
                $queueDate = $nextBusinessDay;
                $orderedOutsideHours = 1;
                
                // Do NOT generate queue number - set to null for scheduled orders
                $queueNum = null;
                $finalStatus = 'scheduled'; // Will be used in INSERT statement
                
                $response['message'] = "Order Scheduled. Please check in when you arrive on " . date('l, F j', strtotime($nextBusinessDay));
            } else {
                throw new Exception("COOP is currently closed. Reason: " . $coopStatus['reason'] . ". Please place your order during operating hours.");
            }
        } else {
            // Generate sequential queue number for today
            $queueNum = generateQueueNumber($db);
            $finalStatus = 'pending'; // Normal status for immediate orders
        }
        
        // Generate unique reference number
        $referenceNum = generateReferenceNumber($db);
        
        // Determine service type
        $serviceType = $orderData['order_type_service'] ?? 'items';
        
        // Calculate dynamic wait time based on queue and items/service
        if ($serviceType === 'items') {
            $waitTimeData = calculateWaitTime($db, $orderData['purchasing']);
        } else {
            // For printing, use a default or calculate based on page count
            $waitTimeData = ['estimated_minutes' => 15, 'queue_position' => 1];
        }
        $waitTime = $waitTimeData['estimated_minutes'];
        
        // QR expiry
        $qrExpiry = date('Y-m-d H:i:s', strtotime('+' . QR_EXPIRY_MINUTES . ' minutes'));
        
        // Check which columns exist and prepare insert
        $ordersCols = $db->query("DESCRIBE orders")->fetchAll(PDO::FETCH_ASSOC);
        $ordersColsMap = [];
        foreach ($ordersCols as $c) { $ordersColsMap[$c['Field']] = true; }
        
        // Base columns - different for items vs printing
        if ($serviceType === 'items') {
            $cols = ['queue_number','student_id','item_name'];
            $values = [$queueNum, $student['student_id'], $orderData['purchasing']];
            $placeholders = ['?','?','?'];
            $itemDescription = $orderData['purchasing']; // For item_ordered column
        } else {
            // For printing, set consistent item_name for analytics
            $cols = ['queue_number','student_id','item_name'];
            $values = [$queueNum, $student['student_id'], 'Printing Services'];
            $placeholders = ['?','?','?'];
            // File details stored separately in item_ordered and printing_jobs table
            $itemDescription = $orderData['file_name'] . ' - ' . $orderData['page_count'] . ' pages';
        }
        
        // Add new queue system columns
        if (isset($ordersColsMap['reference_number'])) { 
            $cols[] = 'reference_number'; 
            $values[] = $referenceNum; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['queue_date'])) { 
            $cols[] = 'queue_date'; 
            $values[] = $queueDate; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['order_type'])) { 
            $cols[] = 'order_type'; 
            $values[] = $orderType; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['order_type_service'])) { 
            $cols[] = 'order_type_service'; 
            $values[] = $serviceType; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['scheduled_date'])) { 
            $cols[] = 'scheduled_date'; 
            $values[] = $orderType === 'pre-order' ? $queueDate : null; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['ordered_outside_hours'])) { 
            $cols[] = 'ordered_outside_hours'; 
            $values[] = $orderedOutsideHours; 
            $placeholders[] = '?'; 
        }
        
        // Existing columns
        if (isset($ordersColsMap['item_ordered'])) { 
            $cols[] = 'item_ordered'; 
            $values[] = $itemDescription; // Always use itemDescription (set above based on service type)
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['estimated_wait_time'])) { 
            $cols[] = 'estimated_wait_time'; 
            $values[] = $waitTime; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['qr_expiry'])) { 
            $cols[] = 'qr_expiry'; 
            $values[] = $qrExpiry; 
            $placeholders[] = '?'; 
        }
        if (isset($ordersColsMap['status'])) { 
            $cols[] = 'status'; 
            $values[] = $finalStatus ?? 'pending'; // Use finalStatus (scheduled or pending)
            $placeholders[] = '?'; 
        }
        
        $sql = "INSERT INTO orders (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $insertOrder = $db->prepare($sql);
        $insertOrder->execute($values);
        
        $orderId = $db->lastInsertId();
        
        // If printing service, insert into printing_jobs table
        if ($serviceType === 'printing') {
            $printStmt = $db->prepare("
                INSERT INTO printing_jobs (
                    order_id, file_path, file_name, page_count,
                    color_mode, paper_size, copies, double_sided,
                    instructions, estimated_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            // File path - using the stored file_name from orderData
            $filePath = 'uploads/printing/' . ($orderData['stored_file_name'] ?? $orderData['file_name']);
            
            $printStmt->execute([
                $orderId,
                $filePath,
                $orderData['file_name'],
                $orderData['page_count'],
                $orderData['color_mode'],
                $orderData['paper_size'],
                $orderData['copies'],
                $orderData['double_sided'],
                $orderData['instructions'] ?? '',
                $orderData['estimated_price']
            ]);
        }
        
        // Generate QR code for frontend display
        $qrData = json_encode([
            'queue_number' => $queueNum,
            'email' => $email,
            'timestamp' => date('c'),
            'type' => 'umak_coop_order'
        ]);
        $qrCodeUri = EmailService::generateQRCodeDataUri($qrData);
        if (isset($ordersColsMap['qr_code'])) {
            $upd = $db->prepare("UPDATE orders SET qr_code = ? WHERE order_id = ?");
            $upd->execute([$qrCodeUri, $orderId]);
        }
        
        // Prepare receipt data with enhanced information
        $receiptData = [
            'queue_number' => $queueNum,
            'reference_number' => $referenceNum,
            'student_name' => $student['first_name'] . ' ' . $student['last_name'],
            'student_id' => $student['student_id'],
            'item_ordered' => $serviceType === 'items' ? $orderData['purchasing'] : $itemDescription,
            'order_date' => date('F j, Y g:i A'),
            'wait_time' => $waitTime,
            'queue_position' => $waitTimeData['queue_position'] ?? 1,
            'order_type' => $orderType,
            'queue_date' => $queueDate,
            'service_type' => $serviceType
        ];
        
        // Add printing-specific details to receipt if applicable
        if ($serviceType === 'printing') {
            $receiptData['printing_details'] = [
                'page_count' => $orderData['page_count'],
                'color_mode' => $orderData['color_mode'],
                'paper_size' => $orderData['paper_size'],
                'copies' => $orderData['copies'],
                'estimated_price' => $orderData['estimated_price']
            ];
        }
        
        $db->commit();
        
        // Send receipt email
        EmailService::sendReceipt($email, $receiptData);
        
        $response['data'] = [
            'order_id' => $orderId,
            'queue_number' => $queueNum,
            'reference_number' => $referenceNum,
            'wait_time' => $waitTime,
            'wait_time_details' => $waitTimeData,
            'queue_position' => $waitTimeData['queue_position'],
            'queue_date' => $queueDate,
            'order_type' => $orderType,
            'status' => $finalStatus ?? 'pending', // Include status in response
            'qr_expiry' => $qrExpiry,
            'qr_code' => $qrCodeUri,
            'qr_code_data' => $qrData,
            'coop_status' => $coopStatus
        ];
    } else {
        $db->commit();
        $response['data'] = ['verified' => true];
    }
    
    if (ob_get_level()) { ob_clean(); }
    echo json_encode($response);
    exit;
    
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Verify OTP PDO Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false, 
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Verify OTP Error: " . $e->getMessage());
    http_response_code(500);
    if (ob_get_level()) { ob_clean(); }
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
}
?>
