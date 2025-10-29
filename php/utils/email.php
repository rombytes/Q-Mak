<?php
/**
 * Email Utility Functions using PHPMailer
 * Install PHPMailer: composer require phpmailer/phpmailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

use Endroid\QrCode\QrCode;
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
        $subject = "Order Confirmation - Queue #{$orderData['queue_number']}";
        $body = self::getReceiptEmailTemplate($email, $orderData);
        
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
    
    // php/utils/email.php (inside the EmailService class)

    public static function generateQRCodeDataUri($dataString) {
        try {
            // Endroid: QrCode + PngWriter (v3 and v4 compatible)
            if (class_exists('Endroid\\QrCode\\QrCode') && class_exists('Endroid\\QrCode\\Writer\\PngWriter')) {
                $qr = null;
                if (method_exists('Endroid\\QrCode\\QrCode', 'setSize')) {
                    $qr = new \Endroid\QrCode\QrCode($dataString);
                    $qr->setSize(200);
                } elseif (method_exists('Endroid\\QrCode\\QrCode', 'create')) {
                    // v4 without Builder: no setSize available; use default size
                    $qr = \Endroid\QrCode\QrCode::create($dataString);
                }
                if ($qr) {
                    $writer = new \Endroid\QrCode\Writer\PngWriter();
                    $result = $writer->write($qr);
                    $data = $result->getString();
                    if ($data !== '') {
                        return 'data:image/png;base64,' . base64_encode($data);
                    }
                }
            }

            // Remote fallback via Google Charts
            $qrUrl = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' . urlencode($dataString) . '&choe=UTF-8';

            if (function_exists('curl_init')) {
                $ch = curl_init($qrUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                $imageData = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);
                
                if ($imageData !== false && $httpCode === 200 && strlen($imageData) > 100) {
                    error_log("QR Code generated successfully via cURL");
                    return 'data:image/png;base64,' . base64_encode($imageData);
                } else {
                    error_log("QR Code cURL failed: HTTP $httpCode, Error: $curlError");
                }
            }

            // Try file_get_contents with stream context
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);
            
            $imageData = @file_get_contents($qrUrl, false, $context);
            if ($imageData !== false && strlen($imageData) > 100) {
                error_log("QR Code generated successfully via file_get_contents");
                return 'data:image/png;base64,' . base64_encode($imageData);
            } else {
                error_log("QR Code file_get_contents failed");
            }

            // If all fails, log and return empty
            error_log("QR Code generation failed: All methods exhausted for data: " . substr($dataString, 0, 100));
            return '';
        } catch (\Throwable $e) {
            error_log("QR Code Generation Error: " . $e->getMessage());
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
                    <div class='success-banner'>
                        <p>Your order has been successfully placed and confirmed</p>
                    </div>

                    <p>Hello {$data['student_name']},</p>
                    <p>Your order with the UMak Cooperative has been successfully processed. Please find your order details below:</p>

                    <div class='queue-number-display'>
                        <span>Your Queue Number</span>
                        <strong>{$data['queue_number']}</strong>
                    </div>
                    <table class='order-details' width='100%' cellpadding='0' cellspacing='0'>
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
}
?>
