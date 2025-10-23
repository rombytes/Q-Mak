<?php
/**
 * Email Utility Functions using PHPMailer
 * Install PHPMailer: composer require phpmailer/phpmailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

class EmailService {
    
    /**
     * Send OTP email
     */
    public static function sendOTP($email, $otp, $firstName = '') {
        $subject = "Your UMak COOP Verification Code";
        $body = self::getOTPEmailTemplate($otp, $firstName);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'otp', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Send order receipt email
     */
    public static function sendReceipt($email, $orderData) {
        $subject = "Order Confirmation - Queue #{$orderData['queue_number']}";
        $body = self::getReceiptEmailTemplate($orderData);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'receipt', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Send order status update email
     */
    public static function sendStatusUpdate($email, $orderData) {
        $subject = "Order Status Update - Queue #{$orderData['queue_number']}";
        $body = self::getStatusUpdateTemplate($orderData);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'status_update', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Core email sending function
     */
    private static function sendEmail($to, $subject, $htmlBody) {
        $mail = new PHPMailer(true);
        
        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USERNAME;
            $mail->Password = SMTP_PASSWORD;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = SMTP_PORT;
            
            // Recipients
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($to);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = strip_tags($htmlBody);
            
            $mail->send();
            return ['success' => true];
        } catch (Exception $e) {
            error_log("Email Error: " . $mail->ErrorInfo);
            return ['success' => false, 'error' => $mail->ErrorInfo];
        }
    }
    
    /**
     * OTP Email Template
     */
    private static function getOTPEmailTemplate($otp, $firstName) {
        $greeting = $firstName ? "Hello $firstName," : "Hello,";
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 3px dashed #f97316; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
                .otp-code { font-size: 36px; font-weight: bold; color: #1e3a8a; letter-spacing: 8px; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>UMak COOP Order Hub</h1>
                </div>
                <div class='content'>
                    <p>$greeting</p>
                    <p>Your verification code for the UMak COOP Order Hub is:</p>
                    <div class='otp-box'>
                        <div class='otp-code'>$otp</div>
                    </div>
                    <p><strong>This code will expire in " . OTP_EXPIRY_MINUTES . " minutes.</strong></p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <p>Best regards,<br>UMak COOP Team</p>
                </div>
                <div class='footer'>
                    <p>University of Makati © 2025 | Q-Mak System</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
    
    /**
     * Receipt Email Template
     */
    private static function getReceiptEmailTemplate($data) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .receipt-box { background: white; border: 2px solid #1e3a8a; padding: 20px; margin: 20px 0; border-radius: 10px; }
                .queue-number { font-size: 48px; font-weight: bold; color: #1e3a8a; text-align: center; margin: 20px 0; }
                .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #1e3a8a; }
                .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; text-align: center; font-weight: bold; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🎉 Order Confirmed!</h1>
                </div>
                <div class='content'>
                    <div class='success-badge'>✓ Your order has been successfully placed</div>
                    <div class='receipt-box'>
                        <h2 style='color: #1e3a8a; text-align: center;'>Order Receipt</h2>
                        <div class='queue-number'>{$data['queue_number']}</div>
                        <div class='info-row'>
                            <span class='label'>Student Name:</span>
                            <span class='value'>{$data['student_name']}</span>
                        </div>
                        <div class='info-row'>
                            <span class='label'>Student ID:</span>
                            <span class='value'>{$data['student_id']}</span>
                        </div>
                        <div class='info-row'>
                            <span class='label'>Item Ordered:</span>
                            <span class='value'>{$data['item_ordered']}</span>
                        </div>
                        <div class='info-row'>
                            <span class='label'>Order Date:</span>
                            <span class='value'>{$data['order_date']}</span>
                        </div>
                        <div class='info-row'>
                            <span class='label'>Estimated Wait:</span>
                            <span class='value'>{$data['wait_time']} minutes</span>
                        </div>
                    </div>
                    <p><strong>⚠️ Important:</strong></p>
                    <ul>
                        <li>Please present your QR code at the COOP counter</li>
                        <li>QR code is valid for " . QR_EXPIRY_MINUTES . " minutes</li>
                        <li>Keep this email for your records</li>
                    </ul>
                    <p>Thank you for using UMak COOP Order Hub!</p>
                </div>
                <div style='text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;'>
                    <p>University of Makati © 2025 | Q-Mak System</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
    
    /**
     * Status Update Email Template
     */
    private static function getStatusUpdateTemplate($data) {
        $statusColors = [
            'pending' => '#f59e0b',
            'processing' => '#3b82f6',
            'ready' => '#10b981',
            'completed' => '#6b7280',
            'cancelled' => '#ef4444'
        ];
        
        $color = $statusColors[$data['status']] ?? '#6b7280';
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .status-badge { background: $color; color: white; padding: 15px 30px; border-radius: 25px; text-align: center; font-weight: bold; font-size: 18px; margin: 20px 0; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📦 Order Status Update</h1>
                </div>
                <div class='content'>
                    <p>Hello {$data['student_name']},</p>
                    <p>Your order status has been updated:</p>
                    <div class='status-badge'>{$data['status']}</div>
                    <p><strong>Queue Number:</strong> {$data['queue_number']}</p>
                    <p><strong>Item:</strong> {$data['item_ordered']}</p>
                    <p>{$data['message']}</p>
                    <p>Thank you for your patience!</p>
                    <p>Best regards,<br>UMak COOP Team</p>
                </div>
                <div style='text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;'>
                    <p>University of Makati © 2025 | Q-Mak System</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
    
    /**
     * Log email to database
     */
    private static function logEmail($email, $type, $subject, $success, $error = null) {
        try {
            $db = getDB();
            $stmt = $db->prepare("
                INSERT INTO email_logs (recipient_email, email_type, subject, status, error_message)
                VALUES (?, ?, ?, ?, ?)
            ");
            $status = $success ? 'sent' : 'failed';
            $stmt->execute([$email, $type, $subject, $status, $error]);
        } catch (Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
        }
    }
}
?>
