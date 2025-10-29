<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../utils/email_sender.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $email = trim($input['email'] ?? '');
    $otpType = trim($input['otp_type'] ?? 'order');
    $firstName = trim($input['first_name'] ?? '');

    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }

    $cooldownSeconds = 60;

    $db = getDB();

    $stmt = $db->prepare("SELECT created_at FROM otp_verifications WHERE email = ? AND otp_type = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$email, $otpType]);
    $last = $stmt->fetch();

    if ($last) {
        $lastTime = strtotime($last['created_at']);
        $elapsed = time() - $lastTime;
        if ($elapsed < $cooldownSeconds) {
            echo json_encode([
                'success' => false,
                'message' => 'Please wait before requesting a new code.',
                'data' => [
                    'seconds_remaining' => $cooldownSeconds - $elapsed,
                    'cooldown_seconds' => $cooldownSeconds
                ]
            ]);
            exit;
        }
    }

    $otp = str_pad((string)rand(0, 999999), 6, '0', STR_PAD_LEFT);

    // Delete old OTPs for this email and type to avoid duplicate key constraint
    $deleteOldOtps = $db->prepare("DELETE FROM otp_verifications WHERE email = ? AND otp_type = ?");
    $deleteOldOtps->execute([$email, $otpType]);

    $otpMinutes = (int)(defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10);
    $insert = $db->prepare("INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL $otpMinutes MINUTE))");
    $insert->execute([$email, $otp, $otpType]);

    // Send OTP email using new EmailSender
    try {
        error_log("Attempting to resend OTP email to: $email");
        $emailResult = EmailSender::sendOTP($email, $otp, $firstName);
        
        if ($emailResult['success']) {
            error_log("✓ OTP resent successfully to $email");
        } else {
            error_log("✗ Failed to resend OTP to $email: " . ($emailResult['error'] ?? 'Unknown error'));
            error_log("Check detailed log at: " . EmailSender::getLogFilePath());
        }
    } catch (Exception $e) {
        error_log("✗ Exception resending OTP: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => 'OTP sent',
        'data' => [
            'email' => $email,
            'otp_type' => $otpType,
            'cooldown_seconds' => $cooldownSeconds,
            'expires_in_minutes' => defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10,
            'otp_code' => $otp
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
