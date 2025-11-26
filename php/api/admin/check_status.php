<?php
/**
 * Check Order Status API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/email.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Step 1: Request OTP for status check
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = trim($input['email'] ?? '');
        
        if (empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Email is required']);
            exit;
        }
        
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@umak\.edu\.ph$/', $email)) {
            echo json_encode(['success' => false, 'message' => 'Invalid UMak email address']);
            exit;
        }
        
        $db = getDB();
        
        // Check if student has any orders
        $stmt = $db->prepare("
            SELECT COUNT(*) as order_count 
            FROM orders o
            JOIN students s ON o.student_id = s.student_id
            WHERE s.email = ?
        ");
        $stmt->execute([$email]);
        $result = $stmt->fetch();
        
        if ($result['order_count'] == 0) {
            echo json_encode(['success' => false, 'message' => 'No orders found for this email']);
            exit;
        }
        
        // Generate OTP
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Delete old OTPs for this email and type to avoid duplicate key constraint
        $deleteOldOtps = $db->prepare("DELETE FROM otp_verifications WHERE email = ? AND otp_type = 'status'");
        $deleteOldOtps->execute([$email]);
        
        // Store OTP using DB time (embed integer for INTERVAL)
        $otpMinutes = (int)(defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10);
        $insertOtp = $db->prepare("
            INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
            VALUES (?, ?, 'status', DATE_ADD(NOW(), INTERVAL $otpMinutes MINUTE))
        ");
        $insertOtp->execute([$email, $otp]);
        
        // Send OTP email
        EmailService::sendOTP($email, $otp);
        
        echo json_encode([
            'success' => true,
            'message' => 'OTP sent to your email',
            'data' => [
                'email' => $email,
                'expires_in_minutes' => OTP_EXPIRY_MINUTES,
                // For development/testing only
                'otp_code' => $otp
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Check Status Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Step 2: Get order status after OTP verification
    try {
        $email = $_GET['email'] ?? '';
        
        if (empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Email is required']);
            exit;
        }
        
        $db = getDB();
        
        // Get all orders for this email
        $stmt = $db->prepare("
            SELECT 
                o.order_id,
                o.queue_number,
                o.reference_number,
                o.item_name as item_ordered,
                o.status as order_status,
                o.estimated_wait_time,
                o.qr_code,
                o.qr_expiry,
                o.created_at,
                o.updated_at,
                s.student_id,
                s.student_number,
                s.first_name,
                s.last_name,
                s.email
            FROM orders o
            JOIN students s ON o.student_id = s.student_id
            WHERE s.email = ?
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$email]);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$row) {
            if (empty($row['qr_code'])) {
                $qrData = json_encode([
                    'queue_number' => $row['queue_number'],
                    'email' => $row['email'],
                    'timestamp' => date('c'),
                    'type' => 'umak_coop_order'
                ]);
                $row['qr_code'] = EmailService::generateQRCodeDataUri($qrData);
            }
        }
        unset($row);
        
        if (empty($orders)) {
            echo json_encode(['success' => false, 'message' => 'No orders found']);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'orders' => $orders,
                'total_orders' => count($orders)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Status Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
