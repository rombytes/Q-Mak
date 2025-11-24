<?php
/**
 * Email Utility Functions using PHPMailer
 * Install PHPMailer: composer require phpmailer/phpmailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;

$__autoload = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($__autoload)) { require_once $__autoload; }
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class EmailService {
    
    /**
     * Send OTP email
     */
    public static function sendOTP($email, $otp, $firstName = '') {
        error_log("EmailService::sendOTP called for: $email");
        $subject = "Your UMak COOP Verification Code";
        $body = self::getOTPEmailTemplate($otp, $firstName);
        
        error_log("EmailService::sendOTP - About to call sendEmail()");
        $result = self::sendEmail($email, $subject, $body);
        error_log("EmailService::sendOTP - sendEmail() returned: " . json_encode($result));
        
        error_log("EmailService::sendOTP - About to log email");
        self::logEmail($email, 'otp', $subject, $result['success'], $result['error'] ?? null);
        error_log("EmailService::sendOTP - Email logged successfully");
        
        return $result;
    }
    
    /**
     * Send order receipt email
     */
    public static function sendReceipt($email, $orderData) {
        $subject = "Order Confirmation - Queue #{$orderData['queue_number']} - Ref: {$orderData['reference_number']}";
        $body = self::getReceiptEmailTemplate($email, $orderData);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'receipt', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Send order status update email
     */
    public static function sendStatusUpdate($email, $orderData) {
        $subject = "Order Status Update - Queue #{$orderData['queue_number']} - Ref: {$orderData['reference_number']}";
        $body = self::getStatusUpdateTemplate($orderData);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'status_update', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Send order moved notification email
     */
    public static function sendOrderMovedNotification($email, $orderData) {
        // Phase 5: Check if order requires check-in (scheduled status)
        $isScheduled = isset($orderData['is_scheduled']) && $orderData['is_scheduled'];
        
        if ($isScheduled) {
            $subject = "Order Scheduled - Check-In Required";
        } else {
            $subject = "Order Rescheduled - Queue #{$orderData['new_queue_number']}";
        }
        
        $body = self::getOrderMovedTemplate($orderData);
        
        $result = self::sendEmail($email, $subject, $body);
        self::logEmail($email, 'order_moved', $subject, $result['success'], $result['error'] ?? null);
        
        return $result;
    }
    
    /**
     * Core email sending function
     */
    public static function sendEmail($to, $subject, $htmlBody) {
        error_log("EmailService::sendEmail - Starting for: $to");
        error_log("EmailService::sendEmail - Subject: $subject");
        
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            error_log("EmailService::sendEmail - PHPMailer class NOT found!");
            return ['success' => false, 'error' => 'Mailer unavailable'];
        }
        error_log("EmailService::sendEmail - PHPMailer class found");
        
        $mail = new PHPMailer(true);
        
        try {
            // Server settings
            error_log("EmailService::sendEmail - Configuring SMTP");
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USERNAME;
            $mail->Password = SMTP_PASSWORD;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = SMTP_PORT;
            
            error_log("EmailService::sendEmail - SMTP Config: Host=" . SMTP_HOST . ", Port=" . SMTP_PORT . ", User=" . SMTP_USERNAME);
            
            // Recipients
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($to);
            error_log("EmailService::sendEmail - From: " . SMTP_FROM_EMAIL . ", To: $to");
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = strip_tags($htmlBody);
            
            error_log("EmailService::sendEmail - About to send email...");
            $mail->send();
            error_log("EmailService::sendEmail - ✓ Email sent successfully!");
            return ['success' => true];
        } catch (\Throwable $e) {
            $errorInfo = $mail->ErrorInfo;
            error_log("EmailService::sendEmail - ✗ Email Error: " . $errorInfo);
            error_log("EmailService::sendEmail - Exception: " . $e->getMessage());
            return ['success' => false, 'error' => $errorInfo];
        }
    }
    
    /**
     * Generate QR Code Data URI using Endroid QR Code library v6
     * Simple, reliable, and works offline
     */
    public static function generateQRCodeDataUri($dataString) {
        try {
            // Ensure data string is not empty
            if (empty($dataString)) {
                error_log("QR Code: Empty data string provided");
                return '';
            }

            // Check if QrCode class is available
            if (!class_exists('Endroid\\QrCode\\QrCode')) {
                error_log("QR Code: Endroid library not found. Run: composer require endroid/qr-code");
                return '';
            }

            // Try named parameters (PHP 8.0+, Endroid v6)
            try {
                $qrCode = new QrCode(
                    data: $dataString,
                    size: 200,
                    margin: 10
                );
                
                $writer = new PngWriter();
                $result = $writer->write($qrCode);
                $imageData = $result->getString();
                
                if (!empty($imageData)) {
                    error_log("QR Code: ✓ Generated successfully (" . strlen($imageData) . " bytes)");
                    return 'data:image/png;base64,' . base64_encode($imageData);
                } else {
                    error_log("QR Code: Generated image is empty");
                    return '';
                }
            } catch (\Throwable $e) {
                error_log("QR Code: Named params failed, trying fallback: " . $e->getMessage());
                
                // Fallback: Try QrCode::create() method (Endroid v5)
                try {
                    if (method_exists('Endroid\\QrCode\\QrCode', 'create')) {
                        $qrCode = QrCode::create($dataString)
                            ->setSize(200)
                            ->setMargin(10);
                        
                        $writer = new PngWriter();
                        $result = $writer->write($qrCode);
                        $imageData = $result->getString();
                        
                        if (!empty($imageData)) {
                            error_log("QR Code: ✓ Generated successfully using fallback (" . strlen($imageData) . " bytes)");
                            return 'data:image/png;base64,' . base64_encode($imageData);
                        }
                    }
                } catch (\Throwable $e2) {
                    error_log("QR Code: Fallback method also failed: " . $e2->getMessage());
                }
            }

            error_log("QR Code: All generation methods failed");
            return '';
            
        } catch (\Throwable $e) {
            error_log("QR Code: ✗ Generation failed - " . $e->getMessage());
            return '';
        }
    }

    /**
     * OTP Email Template - Enhanced UI/UX
     */
    private static function getOTPEmailTemplate($otp, $firstName) {
        $greeting = $firstName ? "Hello $firstName," : "Hello,";
        $expiryMinutes = defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10; // Use constant or default

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>UMak COOP Verification Code</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f7; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .header { background-color: #1e3a8a; color: #ffffff; padding: 25px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .content p { margin: 0 0 15px; }
                .otp-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; margin: 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background-color: #f1f5f9; }
                .footer p { margin: 0; }
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
                        <p class='otp-code'>$otp</p>
                    </div>
                    <p><strong>This code will expire in $expiryMinutes minutes.</strong> Please do not share this code with anyone.</p>
                    <p>If you did not request this code, you can safely ignore this email.</p>
                    <p>Thank you,<br>The UMak COOP Team</p>
                </div>
                <div class='footer'>
                    <p>University of Makati &copy; " . date('Y') . " | Q-Mak System</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Receipt Email Template - Enhanced UI/UX
     */
    private static function getReceiptEmailTemplate($email, $data) {
        $qrExpiryMinutes = defined('QR_EXPIRY_MINUTES') ? QR_EXPIRY_MINUTES : 30; // Use constant or default

        // Generate QR Code (Uses the existing function which now includes error handling)
        $qrData = json_encode([
            'queue_number' => $data['queue_number'],
            'email' => $email,
            'timestamp' => date('c'),
            'type' => 'umak_coop_order'
        ]);
        $qrCodeUri = self::generateQRCodeDataUri($qrData);

        // Build QR code HTML conditionally
        $qrCodeHtml = '';
        if (!empty($qrCodeUri)) {
            $qrCodeHtml = "
                <div style='text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #e2e8f0;'>
                    <img src='{$qrCodeUri}' alt='Order QR Code' style='width:180px; height:180px; margin: 0 auto; display: block; border: 1px solid #e2e8f0; padding: 5px;'>
                    <p style='font-size: 13px; color: #475569; margin-top: 10px;'>Scan this code at the counter.</p>
                    <p style='font-size: 12px; color: #64748b;'>Valid for $qrExpiryMinutes minutes.</p>
                </div>";
        } else {
            // Provide alternative text if QR generation failed
             $qrCodeHtml = "
                <div style='text-align: center; margin: 30px 0; padding: 20px; border-top: 1px solid #e2e8f0; background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #b45309;'>
                    <p style='margin: 0; font-weight: 600;'>QR Code could not be generated</p>
                    <p style='margin: 8px 0 0; font-size: 14px;'>Please use your Queue Number for verification at the counter.</p>
                </div>";
        }

        // Show different banner for pre-orders
        $orderTypeLabel = $data['order_type'] ?? 'immediate';
        $statusBanner = '';
        if ($orderTypeLabel === 'pre-order') {
            $scheduledDate = date('l, F j, Y', strtotime($data['queue_date']));
            $statusBanner = "
                    <div style='background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 18px; margin-bottom: 25px; text-align: center;'>
                        <p style='color: #b45309; font-weight: 600; font-size: 16px; margin: 0;'>⏰ Pre-Order Scheduled</p>
                        <p style='color: #78350f; font-size: 14px; margin: 8px 0 0;'>Your order has been scheduled for <strong>{$scheduledDate}</strong></p>
                    </div>";
        } else {
            $statusBanner = "
                    <div class='success-banner'>
                        <p>Your order has been successfully placed and confirmed</p>
                    </div>";
        }
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>UMak COOP Order Confirmation</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f7; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background-color: #1e3a8a; color: #ffffff; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
                .content { padding: 35px; }
                .content p { margin: 0 0 18px; font-size: 15px; }
                .success-banner { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-bottom: 25px; text-align: center; }
                .success-banner p { color: #065f46; font-weight: 600; font-size: 16px; margin: 0; }
                .order-details { margin: 25px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .order-details th, .order-details td { padding: 14px 18px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .order-details th { background-color: #f8fafc; color: #475569; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .order-details td { font-size: 15px; color: #1e293b; }
                .order-details tr:last-child td { border-bottom: none; }
                .queue-number-display { text-align: center; margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                .queue-number-display span { font-size: 14px; color: #64748b; display: block; margin-bottom: 8px; font-weight: 500; }
                .queue-number-display strong { font-size: 52px; font-weight: 800; color: #1e3a8a; display: block; letter-spacing: 2px; }
                .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background-color: #f1f5f9; }
                .footer p { margin: 0; }
                .instructions { background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 20px 25px; margin: 25px 0; border-radius: 0 8px 8px 0; }
                .instructions h4 { margin: 0 0 10px; color: #1e3a8a; font-size: 16px; font-weight: 600; }
                .instructions ul { margin: 0; padding-left: 20px; }
                .instructions li { margin-bottom: 6px; font-size: 14px; color: #475569; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Order Confirmed</h1>
                </div>
                <div class='content'>
                    {$statusBanner}

                    <p>Hello {$data['student_name']},</p>
                    <p>Your order with the UMak Cooperative has been successfully processed. Please find your order details below:</p>

                    <div class='queue-number-display'>
                        <span>Your Queue Number</span>
                        <strong>{$data['queue_number']}</strong>
                    </div>
                    <table class='order-details' width='100%' cellpadding='0' cellspacing='0'>
                        <tr>
                            <th>Reference Number</th>
                            <td><strong style='color: #1e3a8a; font-size: 16px;'>{$data['reference_number']}</strong></td>
                        </tr>
                        <tr>
                            <th>Student Name</th>
                            <td>{$data['student_name']}</td>
                        </tr>
                        <tr>
                            <th>Student ID</th>
                            <td>{$data['student_id']}</td>
                        </tr>
                        <tr>
                            <th>Item Ordered</th>
                            <td>{$data['item_ordered']}</td>
                        </tr>
                        <tr>
                            <th>Order Date</th>
                            <td>{$data['order_date']}</td>
                        </tr>
                        <tr>
                            <th>Estimated Wait Time</th>
                            <td>Approximately {$data['wait_time']} minutes</td>
                        </tr>
                    </table>

                    {$qrCodeHtml}

                    <div class='instructions'>
                        <h4>Next Steps:</h4>
                        <ul>
                            <li>Proceed to the UMak COOP counter</li>
                            <li>Present your Queue Number" . (!empty($qrCodeUri) ? " or scan the QR Code above" : "") . " for verification</li>
                            <li>Wait for your number to be called to collect your item</li>
                            <li>Keep this email as proof of your order</li>
                        </ul>
                    </div>

                    <p>If you have any questions about your order, please contact the COOP staff at the counter.</p>
                    <p>Thank you for using the UMak COOP Order System!</p>
                </div>
                <div class='footer'>
                    <p>University of Makati &copy; " . date('Y') . " | Q-Mak System</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Status Update Email Template - Enhanced UI/UX
     */
    private static function getStatusUpdateTemplate($data) {
        // Define status colors (using TailwindCSS class names conceptually)
        $statusStyles = [
            'pending' => ['label' => 'Pending', 'color' => '#f59e0b', 'bg' => '#fffbeb'], // Amber
            'processing' => ['label' => 'Processing', 'color' => '#3b82f6', 'bg' => '#eff6ff'], // Blue
            'ready' => ['label' => 'Ready for Pick-up', 'color' => '#8b5cf6', 'bg' => '#f5f3ff'], // Violet
            'completed' => ['label' => 'Completed', 'color' => '#10b981', 'bg' => '#ecfdf5'], // Emerald
            'cancelled' => ['label' => 'Cancelled', 'color' => '#ef4444', 'bg' => '#fef2f2']  // Red
        ];

        $statusInfo = $statusStyles[strtolower($data['status'])] ?? ['label' => strtoupper($data['status']), 'color' => '#64748b', 'bg' => '#f1f5f9', 'text' => '#374151'];

        // Generate QR code for active orders
        $qrHtml = '';
        $activeStatuses = ['pending', 'processing', 'ready'];
        if (in_array(strtolower($data['status']), $activeStatuses) && !empty($data['queue_number'])) {
            $qrData = json_encode([
                'queue_number' => $data['queue_number'],
                'email' => $data['email'] ?? '',
                'timestamp' => date('c'),
                'type' => 'umak_coop_order'
            ]);
            $qrCodeUri = self::generateQRCodeDataUri($qrData);
            
            if (!empty($qrCodeUri)) {
                $qrHtml = "
                    <div style='text-align: center; margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px;'>
                        <h4 style='margin: 0 0 15px; color: #1e3a8a; font-size: 16px;'>Your Order QR Code</h4>
                        <img src='{$qrCodeUri}' alt='Order QR Code' style='width:180px; height:180px; margin: 0 auto; display: block; border: 2px solid #e2e8f0; padding: 8px; border-radius: 8px;'>
                        <p style='font-size: 13px; color: #475569; margin-top: 12px;'>Present this QR code at the COOP counter</p>
                        <p style='font-size: 12px; color: #64748b; margin-top: 4px;'>Queue Number: {$data['queue_number']}</p>
                    </div>";
            }
        }

        // Build conditional content based on status
        $actionContent = '';
        switch (strtolower($data['status'])) {
            case 'ready':
                $actionContent = "
                    <div style='background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;'>
                        <p style='margin: 0; color: #065f46; font-weight: 600; font-size: 16px;'>Your order is ready for pick-up!</p>
                        <p style='margin: 8px 0 0; color: #047857; font-size: 14px;'>Please proceed to the UMak COOP counter immediately to collect your item.</p>
                    </div>";
                break;
            case 'cancelled':
                $actionContent = "
                    <div style='background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;'>
                        <p style='margin: 0; color: #991b1b; font-weight: 600; font-size: 16px;'>Order Cancelled</p>
                        <p style='margin: 8px 0 0; color: #dc2626; font-size: 14px;'>If you have any questions about this cancellation, please contact the COOP staff.</p>
                    </div>";
                break;
            case 'processing':
                $actionContent = "
                    <div style='background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;'>
                        <p style='margin: 0; color: #1e40af; font-weight: 500; font-size: 15px;'>Your order is being prepared. Please wait for further updates.</p>
                    </div>";
                break;
            case 'completed':
                $actionContent = "
                    <div style='background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;'>
                        <p style='margin: 0; color: #065f46; font-weight: 600; font-size: 16px;'>Order Completed</p>
                        <p style='margin: 8px 0 0; color: #047857; font-size: 14px;'>Thank you for using the UMak COOP Order System!</p>
                    </div>";
                break;
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>UMak COOP Order Status Update</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f7; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background-color: #1e3a8a; color: #ffffff; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
                .content { padding: 35px; }
                .content p { margin: 0 0 18px; font-size: 15px; }
                .status-container { text-align: center; margin: 25px 0; }
                .status-badge { display: inline-block; padding: 12px 28px; border-radius: 25px; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; border: 2px solid; }
                .order-summary { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 25px 0; }
                .order-summary h4 { margin: 0 0 15px; color: #1e3a8a; font-size: 17px; font-weight: 600; }
                .order-summary p { margin: 8px 0; font-size: 14px; color: #475569; }
                .order-summary strong { color: #1e293b; font-weight: 600; }
                .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background-color: #f1f5f9; }
                .footer p { margin: 0; }
                .status-details { background-color: {$statusInfo['bg']}; border-left: 4px solid {$statusInfo['color']}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
                .status-details h3 { margin: 0 0 10px; color: {$statusInfo['text']}; font-size: 18px; font-weight: 600; }
                .status-details p { margin: 8px 0; color: {$statusInfo['text']}; font-size: 15px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Order Status Update</h1>
                </div>
                <div class='content'>
                    <p>Hello {$data['student_name']},</p>
                    <p>There has been an update regarding your UMak COOP order:</p>

                    <div class='status-container'>
                        <div class='status-badge' style='background-color: {$statusInfo['bg']}; color: {$statusInfo['color']}; border-color: {$statusInfo['color']};'>
                            {$statusInfo['label']}
                        </div>
                    </div>

                    <div class='status-details'>
                        <h3>Status Update</h3>
                        <p>{$data['message']}</p>
                    </div>

                    <div class='order-summary'>
                        <h4>Order Information</h4>
                        <p><strong>Reference Number:</strong> <span style='color: #1e3a8a; font-weight: 600;'>{$data['reference_number']}</span></p>
                        <p><strong>Queue Number:</strong> {$data['queue_number']}</p>
                        <p><strong>Item Ordered:</strong> {$data['item_ordered']}</p>
                        <p><strong>Current Status:</strong> {$statusInfo['label']}</p>
                    </div>

                    {$qrHtml}

                    {$actionContent}

                    <p>You can check the latest status anytime through the Order Hub portal.</p>
                    <p>If you have any questions about this update, please contact the COOP staff at the counter.</p>
                    <p>Thank you for your patience.</p>
                    <p>Best regards,<br>The UMak COOP Team</p>
                </div>
                <div class='footer'>
                    <p>University of Makati &copy; " . date('Y') . " | Q-Mak System</p>
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
            error_log("EmailService::logEmail - Starting for: $email, type: $type, success: " . ($success ? 'true' : 'false'));
            
            $db = getDB();
            
            // Get order_id and student_id if available (for receipt and status_update emails)
            $orderId = 0;
            $studentId = 0;
            
            // Try to find student by email
            $studentStmt = $db->prepare("SELECT student_id FROM students WHERE email = ? LIMIT 1");
            $studentStmt->execute([$email]);
            $student = $studentStmt->fetch();
            if ($student) {
                $studentId = $student['student_id'];
                error_log("EmailService::logEmail - Found student_id: $studentId");
                
                // Get most recent order for this student
                $orderStmt = $db->prepare("SELECT order_id FROM orders WHERE student_id = ? ORDER BY created_at DESC LIMIT 1");
                $orderStmt->execute([$studentId]);
                $order = $orderStmt->fetch();
                if ($order) {
                    $orderId = $order['order_id'];
                    error_log("EmailService::logEmail - Found order_id: $orderId");
                }
            } else {
                error_log("EmailService::logEmail - Student not found for email: $email");
            }
            
            $stmt = $db->prepare("
                INSERT INTO email_logs (order_id, student_id, email_to, email_type, subject, message, status, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            ");
            $status = $success ? 'sent' : 'failed';
            $message = substr($subject, 0, 255); // Use subject as message preview
            $stmt->execute([$orderId, $studentId, $email, $type, $subject, $message, $status, $error]);
            error_log("EmailService::logEmail - Email log inserted successfully");
        } catch (Exception $e) {
            error_log("EmailService::logEmail - Failed to log email: " . $e->getMessage());
            error_log("EmailService::logEmail - Trace: " . $e->getTraceAsString());
            // Don't throw - logging failure shouldn't break email sending
        }
    }
    
    /**
     * Get order moved notification template
     */
    private static function getOrderMovedTemplate($data) {
        // Phase 5: Check if this is a scheduled order requiring check-in
        $isScheduled = isset($data['is_scheduled']) && $data['is_scheduled'];
        
        if ($isScheduled) {
            // Scheduled order template - emphasizes check-in requirement
            return "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Order Scheduled - Check-In Required</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
                    .content { padding: 35px; }
                    .content p { margin: 0 0 18px; font-size: 15px; }
                    .info-box { background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-box h3 { margin: 0 0 15px; color: #1e3a8a; font-size: 17px; }
                    .info-box p { margin: 8px 0; color: #475569; }
                    .info-box strong { color: #1e293b; }
                    .highlight-box { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-left: 4px solid #8b5cf6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
                    .highlight-box h3 { margin: 0 0 10px; color: #6b21a8; font-size: 18px; }
                    .highlight-box .status-badge { font-size: 24px; font-weight: 700; color: #7c3aed; margin: 10px 0; background: #f3e8ff; padding: 15px; border-radius: 8px; text-align: center; }
                    .alert-box { background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 18px; margin: 20px 0; }
                    .alert-box p { margin: 0; color: #92400e; font-size: 14px; }
                    .checkin-box { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
                    .checkin-box h3 { margin: 0 0 15px; color: #1e40af; font-size: 20px; }
                    .checkin-box p { margin: 10px 0; color: #1e3a8a; font-size: 16px; font-weight: 600; }
                    .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background-color: #f1f5f9; }
                    .footer p { margin: 0; }
                    ul { padding-left: 20px; margin: 15px 0; }
                    ul li { margin: 8px 0; color: #475569; }
                    .step-number { background: #8b5cf6; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 10px; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>&#128276; Order Scheduled - Action Required</h1>
                    </div>
                    <div class='content'>
                        <p>Hi <strong>{$data['student_name']}</strong>,</p>
                        
                        <p>Your order couldn't be completed today due to <strong>{$data['reason']}</strong>. Don't worry - your order is safe and has been moved to our <strong>Scheduled Orders list</strong>!</p>
                        
                        <div class='alert-box'>
                            <p><strong>&#9888;&#65039; Important Notice:</strong> Your order was still pending when COOP reached closing time. It has been rescheduled for the next business day.</p>
                        </div>
                        
                        <div class='info-box'>
                            <h3>&#128203; Original Order Details</h3>
                            <p><strong>Reference Number:</strong> <span style='color: #1e3a8a; font-weight: 600;'>{$data['reference_number']}</span></p>
                            <p><strong>Items:</strong> {$data['item_ordered']}</p>
                            <p><strong>Original Date:</strong> {$data['original_date']}</p>
                            <p><strong>Original Queue:</strong> {$data['old_queue_number']}</p>
                        </div>
                        
                        <div class='highlight-box'>
                            <h3>&#128197; Rescheduled For</h3>
                            <p><strong>New Date:</strong> <span style='font-size: 18px; color: #6b21a8;'>{$data['new_date']}</span></p>
                            <div class='status-badge'>SCHEDULED</div>
                            <p style='margin-top: 15px; color: #6b21a8;'><strong>&#8987; No Queue Number Yet</strong></p>
                            <p style='color: #64748b; font-size: 14px; margin-top: 5px;'>You'll receive your queue number when you check in</p>
                        </div>
                        
                        <div class='checkin-box'>
                            <h3>&#128073; CHECK-IN REQUIRED</h3>
                            <p>Click the &quot;I'M HERE&quot; button when you arrive at school</p>
                            <p style='font-size: 14px; color: #475569; margin-top: 15px;'>This will activate your order and assign you a queue number</p>
                        </div>
                        
                        <div class='info-box'>
                            <h3>&#128221; What You Need To Do</h3>
                            <ol style='padding-left: 25px;'>
                                <li style='margin: 15px 0;'>
                                    <strong>On {$data['new_date']}:</strong> Go to your <strong>Student Dashboard</strong> or <strong>Check Order Status</strong> page
                                </li>
                                <li style='margin: 15px 0;'>
                                    <strong>Click &quot;I'M HERE&quot;:</strong> This will check you in and give you a queue number
                                </li>
                                <li style='margin: 15px 0;'>
                                    <strong>Wait for your turn:</strong> Monitor your queue number and proceed to COOP when called
                                </li>
                            </ol>
                        </div>
                        
                        <div style='background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 18px; margin: 25px 0; border-radius: 0 8px 8px 0;'>
                            <p style='margin: 0; color: #15803d; font-weight: 600;'>&#10003; Your order is secured and your items are reserved</p>
                            <p style='margin: 10px 0 0; color: #166534; font-size: 14px;'>Reference Number: <strong>{$data['reference_number']}</strong></p>
                        </div>
                        
                        <p style='margin-top: 25px;'>If you wish to cancel this order, please log in to your student dashboard and use the &quot;Cancel Order&quot; button before the scheduled date.</p>
                        
                        <p style='margin-top: 15px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;'>
                            <strong>Need help?</strong> Contact the COOP staff during operating hours or visit your student dashboard.
                        </p>
                    </div>
                    <div class='footer'>
                        <p><strong>UMak COOP Queue Management System</strong></p>
                        <p style='margin-top: 5px;'>Operating Hours: Monday-Friday, 10:00 AM - 5:00 PM</p>
                        <p style='margin-top: 5px;'>Lunch Break: 12:00 PM - 1:00 PM</p>
                    </div>
                </div>
            </body>
            </html>
            ";
        } else {
            // Original template for orders with queue numbers (legacy support)
            return "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Order Rescheduled</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
                    .content { padding: 35px; }
                    .content p { margin: 0 0 18px; font-size: 15px; }
                    .info-box { background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-box h3 { margin: 0 0 15px; color: #1e3a8a; font-size: 17px; }
                    .info-box p { margin: 8px 0; color: #475569; }
                    .info-box strong { color: #1e293b; }
                    .highlight-box { background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
                    .highlight-box h3 { margin: 0 0 10px; color: #1e40af; font-size: 18px; }
                    .highlight-box .new-queue { font-size: 32px; font-weight: 700; color: #1e40af; margin: 10px 0; }
                    .alert-box { background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 18px; margin: 20px 0; }
                    .alert-box p { margin: 0; color: #92400e; font-size: 14px; }
                    .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background-color: #f1f5f9; }
                    .footer p { margin: 0; }
                    ul { padding-left: 20px; margin: 15px 0; }
                    ul li { margin: 8px 0; color: #475569; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Order Rescheduled - UMak COOP</h1>
                    </div>
                    <div class='content'>
                        <p>Hi <strong>{$data['student_name']}</strong>,</p>
                        
                        <p>Your order couldn't be completed today due to <strong>{$data['reason']}</strong>. We've automatically moved your order to the next business day to ensure you receive your items.</p>
                        
                        <div class='alert-box'>
                            <p><strong>Important Notice:</strong> Your order was still pending when COOP reached closing time. Don't worry - your order is safe and has been rescheduled!</p>
                        </div>
                        
                        <div class='info-box'>
                            <h3>Original Order Details</h3>
                            <p><strong>Reference Number:</strong> <span style='color: #1e3a8a; font-weight: 600;'>{$data['reference_number']}</span></p>
                            <p><strong>Items:</strong> {$data['item_ordered']}</p>
                            <p><strong>Original Date:</strong> {$data['original_date']}</p>
                            <p><strong>Original Queue:</strong> {$data['old_queue_number']}</p>
                        </div>
                        
                        <div class='highlight-box'>
                            <h3>Updated Schedule</h3>
                            <p><strong>New Date:</strong> <span style='font-size: 18px; color: #1e40af;'>{$data['new_date']}</span></p>
                            <p><strong>New Queue Number:</strong></p>
                            <div class='new-queue'>{$data['new_queue_number']}</div>
                            <p style='margin-top: 10px;'><strong>Status:</strong> Pre-order (Ready for pickup on scheduled date)</p>
                        </div>
                        
                        <div class='info-box'>
                            <h3>Action Required</h3>
                            <ul>
                                <li><strong>Visit COOP on {$data['new_date']}</strong></li>
                                <li><strong>Bring your new queue number: {$data['new_queue_number']}</strong></li>
                                <li>Check your dashboard for real-time status updates</li>
                                <li>Your reference number <strong>{$data['reference_number']}</strong> remains the same</li>
                            </ul>
                        </div>
                        
                        <p style='margin-top: 25px;'>If you wish to cancel this order, please log in to your student dashboard and cancel the order before the scheduled date.</p>
                        
                        <p style='margin-top: 15px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;'>
                            <strong>Need help?</strong> Contact the COOP staff during operating hours or visit your student dashboard.
                        </p>
                    </div>
                    <div class='footer'>
                        <p><strong>UMak COOP Queue Management System</strong></p>
                        <p style='margin-top: 5px;'>Operating Hours: Monday-Friday, 10:00 AM - 5:00 PM</p>
                        <p style='margin-top: 5px;'>Lunch Break: 12:00 PM - 1:00 PM</p>
                    </div>
                </div>
            </body>
            </html>
            ";
        }
    }
}
?>
