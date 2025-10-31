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
        // Wrong code - increment attempts
        $newAttempts = $latestOtp['attempts'] + 1;
        $updateAttempts = $db->prepare("UPDATE otp_verifications SET attempts = ? WHERE otp_id = ?");
        $updateAttempts->execute([$newAttempts, $latestOtp['otp_id']]);
        
        $remainingAttempts = $latestOtp['max_attempts'] - $newAttempts;
        
        if (ob_get_level()) { ob_clean(); }
        
        // Check if this was the last attempt
        if ($newAttempts >= $latestOtp['max_attempts']) {
            echo json_encode([
                'success' => false,
                'message' => 'Maximum attempts exceeded. Please request a new OTP.',
                'remaining_attempts' => 0
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Incorrect OTP code',
                'remaining_attempts' => $remainingAttempts
            ]);
        }
        exit;
    }
    
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
        
        if (!$orderData || empty($orderData['purchasing'])) {
            throw new Exception("Order data not provided");
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
                
                // Create as pre-order
                $orderType = 'pre-order';
                $queueDate = $nextBusinessDay;
                $orderedOutsideHours = 1;
                
                // Generate queue number for next business day
                $queueNum = generateQueueNumber($db, $nextBusinessDay);
                $response['message'] = "COOP is currently closed. Your order has been scheduled for " . date('l, F j', strtotime($nextBusinessDay)) . ".";
            } else {
                throw new Exception("COOP is currently closed. Reason: " . $coopStatus['reason'] . ". Please place your order during operating hours.");
            }
        } else {
            // Generate sequential queue number for today
            $queueNum = generateQueueNumber($db);
        }
        
        // Generate unique reference number
        $referenceNum = generateReferenceNumber($db);
        
        // Calculate dynamic wait time based on queue and items
        $waitTimeData = calculateWaitTime($db, $orderData['purchasing']);
        $waitTime = $waitTimeData['estimated_minutes'];
        
        // QR expiry
        $qrExpiry = date('Y-m-d H:i:s', strtotime('+' . QR_EXPIRY_MINUTES . ' minutes'));
        
        // Check which columns exist and prepare insert
        $ordersCols = $db->query("DESCRIBE orders")->fetchAll(PDO::FETCH_ASSOC);
        $ordersColsMap = [];
        foreach ($ordersCols as $c) { $ordersColsMap[$c['Field']] = true; }
        
        // Base columns
        $cols = ['queue_number','student_id','item_name'];
        $values = [$queueNum, $student['student_id'], $orderData['purchasing']];
        $placeholders = ['?','?','?'];
        
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
            $values[] = $orderData['purchasing']; 
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
            $values[] = 'pending'; 
            $placeholders[] = '?'; 
        }
        
        $sql = "INSERT INTO orders (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $insertOrder = $db->prepare($sql);
        $insertOrder->execute($values);
        
        $orderId = $db->lastInsertId();
        
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
            'item_ordered' => $orderData['purchasing'],
            'order_date' => date('F j, Y g:i A'),
            'wait_time' => $waitTime,
            'queue_position' => $waitTimeData['queue_position'],
            'order_type' => $orderType,
            'queue_date' => $queueDate
        ];
        
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
