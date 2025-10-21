<?php
/**
 * Verify OTP and Complete Order
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $otpCode = trim($input['otp_code'] ?? '');
    $otpType = trim($input['otp_type'] ?? 'order');
    
    if (empty($email) || empty($otpCode)) {
        echo json_encode(['success' => false, 'message' => 'Email and OTP code are required']);
        exit;
    }
    
    $db = getDB();
    
    // Get OTP record
    $stmt = $db->prepare("
        SELECT otp_id, email, otp_code, otp_type, attempts, max_attempts, is_verified, expires_at
        FROM otp_verifications
        WHERE email = ? AND otp_type = ? AND is_verified = FALSE
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$email, $otpType]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        echo json_encode(['success' => false, 'message' => 'No valid OTP found. Please request a new one.']);
        exit;
    }
    
    // Check if expired
    if (strtotime($otpRecord['expires_at']) < time()) {
        echo json_encode(['success' => false, 'message' => 'OTP has expired. Please request a new one.']);
        exit;
    }
    
    // Check attempts
    if ($otpRecord['attempts'] >= $otpRecord['max_attempts']) {
        echo json_encode(['success' => false, 'message' => 'Maximum attempts exceeded. Please request a new OTP.']);
        exit;
    }
    
    // Verify OTP
    if ($otpCode !== $otpRecord['otp_code']) {
        // Increment attempts
        $updateAttempts = $db->prepare("UPDATE otp_verifications SET attempts = attempts + 1 WHERE otp_id = ?");
        $updateAttempts->execute([$otpRecord['otp_id']]);
        
        $remainingAttempts = $otpRecord['max_attempts'] - $otpRecord['attempts'] - 1;
        echo json_encode([
            'success' => false,
            'message' => 'Incorrect OTP code',
            'remaining_attempts' => $remainingAttempts
        ]);
        exit;
    }
    
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
        
        // Generate queue number
        $queueNum = 'Q-' . str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);
        
        // Check if queue number exists
        $checkQueue = $db->prepare("SELECT queue_number FROM orders WHERE queue_number = ?");
        $checkQueue->execute([$queueNum]);
        while ($checkQueue->fetch()) {
            $queueNum = 'Q-' . str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);
            $checkQueue->execute([$queueNum]);
        }
        
        // Calculate wait time (5-15 minutes)
        $waitTime = rand(5, 15);
        
        // QR expiry
        $qrExpiry = date('Y-m-d H:i:s', strtotime('+' . QR_EXPIRY_MINUTES . ' minutes'));
        
        // Insert order
        $insertOrder = $db->prepare("
            INSERT INTO orders (queue_number, student_id, item_ordered, estimated_wait_time, qr_expiry)
            VALUES (?, ?, ?, ?, ?)
        ");
        $insertOrder->execute([
            $queueNum,
            $student['student_id'],
            $orderData['purchasing'],
            $waitTime,
            $qrExpiry
        ]);
        
        $orderId = $db->lastInsertId();
        
        $db->commit();
        
        // Prepare receipt data
        $receiptData = [
            'queue_number' => $queueNum,
            'student_name' => $student['first_name'] . ' ' . $student['last_name'],
            'student_id' => $student['student_id'],
            'item_ordered' => $orderData['purchasing'],
            'order_date' => date('F j, Y g:i A'),
            'wait_time' => $waitTime
        ];
        
        // Send receipt email
        EmailService::sendReceipt($email, $receiptData);
        
        $response['data'] = [
            'order_id' => $orderId,
            'queue_number' => $queueNum,
            'wait_time' => $waitTime,
            'qr_expiry' => $qrExpiry
        ];
    } else {
        $db->commit();
        $response['data'] = ['verified' => true];
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Verify OTP Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred: ' . $e->getMessage()]);
}
?>
