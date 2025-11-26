<?php
/**
 * Simplified Email Sender - OTP Focus
 * Complete rewrite for reliability
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Load dependencies
$vendorPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($vendorPath)) {
    require_once $vendorPath;
}

class EmailSender {
    private static $logFile = null;
    private static $debugMode = true; // Set to false in production
    
    /**
     * Initialize log file
     */
    private static function initLog() {
        if (self::$logFile === null) {
            self::$logFile = __DIR__ . '/../../logs/email_debug.log';
            $logDir = dirname(self::$logFile);
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0777, true);
            }
        }
    }
    
    /**
     * Write to debug log file
     */
    private static function log($message, $data = null) {
        self::initLog();
        
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message";
        
        if ($data !== null) {
            if (is_array($data) || is_object($data)) {
                $logMessage .= "\nData: " . print_r($data, true);
            } else {
                $logMessage .= "\nData: $data";
            }
        }
        
        $logMessage .= "\n" . str_repeat('-', 80) . "\n";
        
        // Write to custom log file
        @file_put_contents(self::$logFile, $logMessage, FILE_APPEND);
        
        // Also write to PHP error log
        error_log($message);
        if ($data !== null) {
            error_log("  Data: " . (is_string($data) ? $data : json_encode($data)));
        }
    }
    
    /**
     * Send OTP Email - Main function
     */
    public static function sendOTP($toEmail, $otpCode, $firstName = '') {
        self::log("=== STARTING OTP EMAIL SEND ===");
        self::log("Target Email", $toEmail);
        self::log("OTP Code", $otpCode);
        self::log("First Name", $firstName ?: '(not provided)');
        
        // Step 1: Check if PHPMailer is available
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            self::log("ERROR: PHPMailer class not found!");
            self::log("Please run: composer require phpmailer/phpmailer");
            return [
                'success' => false, 
                'error' => 'PHPMailer not installed. Run: composer require phpmailer/phpmailer'
            ];
        }
        self::log("✓ PHPMailer class found");
        
        // Step 2: Get SMTP configuration
        $smtpConfig = self::getSMTPConfig();
        if (!$smtpConfig['valid']) {
            self::log("ERROR: Invalid SMTP Configuration", $smtpConfig);
            return [
                'success' => false,
                'error' => 'SMTP configuration not set. Check database.php'
            ];
        }
        self::log("✓ SMTP Configuration loaded", $smtpConfig);
        
        // Step 3: Create PHPMailer instance
        $mail = new PHPMailer(true);
        
        try {
            // Enable verbose debug output in debug mode
            if (self::$debugMode) {
                $mail->SMTPDebug = 2;
                $mail->Debugoutput = function($str, $level) {
                    self::log("PHPMailer Debug [$level]", $str);
                };
            }
            
            // Server settings
            self::log("Configuring SMTP settings...");
            $mail->isSMTP();
            $mail->Host = $smtpConfig['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $smtpConfig['username'];
            $mail->Password = $smtpConfig['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $smtpConfig['port'];
            $mail->CharSet = 'UTF-8';
            
            // Timeout settings
            $mail->Timeout = 30;
            $mail->SMTPKeepAlive = false;
            
            self::log("✓ SMTP settings configured");
            
            // Recipients
            self::log("Setting sender and recipient...");
            $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
            $mail->addAddress($toEmail);
            $mail->addReplyTo($smtpConfig['from_email'], $smtpConfig['from_name']);
            $mail->addBCC($smtpConfig['from_email']); // Save a copy for admin records
            self::log("✓ Sender: {$smtpConfig['from_email']} ({$smtpConfig['from_name']})");
            self::log("✓ Recipient: $toEmail");
            self::log("✓ BCC: {$smtpConfig['from_email']}");
            
            // Content
            self::log("Preparing email content...");
            $mail->isHTML(true);
            $mail->Subject = "Your UMak COOP Verification Code";
            $mail->Body = self::getOTPEmailHTML($otpCode, $firstName);
            $mail->AltBody = self::getOTPEmailPlainText($otpCode, $firstName);
            self::log("✓ Email content prepared");
            
            // Send
            self::log("Attempting to send email...");
            $result = $mail->send();
            
            if ($result) {
                self::log("✓✓✓ EMAIL SENT SUCCESSFULLY! ✓✓✓");
                self::log("Email sent to: $toEmail");
                
                // Log to database
                self::logToDatabase($toEmail, 'otp', true, null);
                
                return [
                    'success' => true,
                    'message' => 'OTP email sent successfully'
                ];
            } else {
                self::log("✗ Mail send returned false (unexpected)");
                return [
                    'success' => false,
                    'error' => 'Mail send failed (no exception thrown)'
                ];
            }
            
        } catch (Exception $e) {
            self::log("✗✗✗ EXCEPTION CAUGHT ✗✗✗");
            self::log("Exception Message", $e->getMessage());
            self::log("PHPMailer ErrorInfo", $mail->ErrorInfo);
            self::log("Stack Trace", $e->getTraceAsString());
            
            // Log to database
            self::logToDatabase($toEmail, 'otp', false, $mail->ErrorInfo);
            
            return [
                'success' => false,
                'error' => $mail->ErrorInfo ?: $e->getMessage()
            ];
        }
    }
    
    /**
     * Get SMTP configuration from constants
     */
    private static function getSMTPConfig() {
        $config = [
            'valid' => false,
            'host' => defined('SMTP_HOST') ? SMTP_HOST : '',
            'port' => defined('SMTP_PORT') ? SMTP_PORT : 587,
            'username' => defined('SMTP_USERNAME') ? SMTP_USERNAME : '',
            'password' => defined('SMTP_PASSWORD') ? SMTP_PASSWORD : '',
            'from_email' => defined('SMTP_FROM_EMAIL') ? SMTP_FROM_EMAIL : '',
            'from_name' => defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : 'UMak COOP'
        ];
        
        // Validate required fields
        if (
            !empty($config['host']) && 
            !empty($config['username']) && 
            !empty($config['password']) && 
            !empty($config['from_email'])
        ) {
            $config['valid'] = true;
        }
        
        return $config;
    }
    
    /**
     * Get OTP Email HTML Template
     */
    private static function getOTPEmailHTML($otp, $firstName) {
        $greeting = $firstName ? "Hello $firstName," : "Hello,";
        $expiryMinutes = defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10;
        
        return "<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>UMak COOP Verification Code</title>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;'>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color: #f4f4f7; padding: 20px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;'>
                    <!-- Header -->
                    <tr>
                        <td style='background-color: #1e3a8a; color: #ffffff; padding: 30px; text-align: center;'>
                            <h1 style='margin: 0; font-size: 24px; font-weight: 700;'>UMak COOP Order Hub</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style='padding: 40px 30px;'>
                            <p style='margin: 0 0 20px; font-size: 16px; color: #333333;'>$greeting</p>
                            <p style='margin: 0 0 25px; font-size: 15px; color: #333333;'>Your verification code for the UMak COOP Order Hub is:</p>
                            
                            <!-- OTP Box -->
                            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                                <tr>
                                    <td align='center' style='padding: 25px 0;'>
                                        <div style='background-color: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 20px; display: inline-block;'>
                                            <p style='margin: 0; font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: monospace;'>$otp</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style='margin: 20px 0 10px; font-size: 15px; color: #333333;'><strong>This code will expire in $expiryMinutes minutes.</strong></p>
                            <p style='margin: 10px 0 20px; font-size: 14px; color: #64748b;'>Please do not share this code with anyone.</p>
                            <p style='margin: 20px 0 0; font-size: 14px; color: #64748b;'>If you did not request this code, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #f1f5f9; padding: 20px; text-align: center;'>
                            <p style='margin: 0; font-size: 12px; color: #64748b;'>University of Makati © " . date('Y') . " | Q-Mak System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
    
    /**
     * Get OTP Email Plain Text
     */
    private static function getOTPEmailPlainText($otp, $firstName) {
        $greeting = $firstName ? "Hello $firstName," : "Hello,";
        $expiryMinutes = defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 10;
        
        return "UMak COOP Order Hub - Verification Code

$greeting

Your verification code is: $otp

This code will expire in $expiryMinutes minutes.

Please do not share this code with anyone.

If you did not request this code, you can safely ignore this email.

Thank you,
The UMak COOP Team

---
University of Makati © " . date('Y') . " | Q-Mak System";
    }
    

    
    /**
     * Send Order Confirmation Email with QR Code
     */
    public static function sendOrderConfirmation($toEmail, $orderData, $studentName = '') {
        self::log("=== STARTING ORDER CONFIRMATION EMAIL ===");
        self::log("Target Email", $toEmail);
        self::log("Order Data", $orderData);
        
        // Check PHPMailer
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            self::log("ERROR: PHPMailer class not found!");
            return ['success' => false, 'error' => 'PHPMailer not installed'];
        }
        
        // Get SMTP config
        $smtpConfig = self::getSMTPConfig();
        if (!$smtpConfig['valid']) {
            self::log("ERROR: Invalid SMTP Configuration");
            return ['success' => false, 'error' => 'SMTP configuration not set'];
        }
        
        // Generate QR Code binary data
        $qrCodeBinary = self::generateQRCode($orderData);
        
        $mail = new PHPMailer(true);
        
        try {
            if (self::$debugMode) {
                $mail->SMTPDebug = 2;
                $mail->Debugoutput = function($str, $level) {
                    self::log("PHPMailer Debug [$level]", $str);
                };
            }
            
            // Server settings
            $mail->isSMTP();
            $mail->Host = $smtpConfig['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $smtpConfig['username'];
            $mail->Password = $smtpConfig['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $smtpConfig['port'];
            $mail->CharSet = 'UTF-8';
            $mail->Timeout = 30;
            
            // Recipients
            $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
            $mail->addAddress($toEmail);
            $mail->addReplyTo($smtpConfig['from_email'], $smtpConfig['from_name']);
            $mail->addBCC($smtpConfig['from_email']); // Save a copy for admin records
            self::log("✓ BCC: {$smtpConfig['from_email']}");
            
            // Attach QR code as embedded image if available
            if (!empty($qrCodeBinary)) {
                $mail->addStringEmbeddedImage($qrCodeBinary, 'order_qr', 'qr_code.png', 'base64', 'image/png');
                self::log("QR Code attached as embedded image with CID: order_qr");
            }
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = "Order Confirmed - Queue {$orderData['queue_number']}";
            $mail->Body = self::getOrderConfirmationHTML($orderData, $studentName, !empty($qrCodeBinary));
            $mail->AltBody = self::getOrderConfirmationPlainText($orderData, $studentName);
            
            // Send
            $result = $mail->send();
            
            if ($result) {
                self::log("✓✓✓ ORDER CONFIRMATION EMAIL SENT! ✓✓✓");
                self::logToDatabase($toEmail, 'order_confirmation', true, null, $orderData['order_id'] ?? 0);
                return ['success' => true, 'message' => 'Order confirmation sent'];
            }
            
        } catch (Exception $e) {
            self::log("✗✗✗ EXCEPTION: " . $e->getMessage());
            self::logToDatabase($toEmail, 'order_confirmation', false, $mail->ErrorInfo, $orderData['order_id'] ?? 0);
            return ['success' => false, 'error' => $mail->ErrorInfo ?: $e->getMessage()];
        }
    }
    
    /**
     * Send Security Alert Email
     */
    public static function sendSecurityAlert($toEmail, $alertData) {
        self::log("=== STARTING SECURITY ALERT EMAIL ===");
        self::log("Target Email", $toEmail);
        
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return ['success' => false, 'error' => 'PHPMailer not installed'];
        }
        
        $smtpConfig = self::getSMTPConfig();
        if (!$smtpConfig['valid']) {
            return ['success' => false, 'error' => 'SMTP configuration not set'];
        }
        
        $mail = new PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host = $smtpConfig['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $smtpConfig['username'];
            $mail->Password = $smtpConfig['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $smtpConfig['port'];
            $mail->CharSet = 'UTF-8';
            
            $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
            $mail->addAddress($toEmail);
            $mail->addBCC($smtpConfig['from_email']); // Save a copy for admin records
            self::log("✓ BCC: {$smtpConfig['from_email']}");
            
            $mail->isHTML(true);
            $mail->Subject = "Security Alert - " . ($alertData['alert_type'] ?? 'Account Activity');
            $mail->Body = self::getSecurityAlertHTML($alertData);
            $mail->AltBody = self::getSecurityAlertPlainText($alertData);
            
            $result = $mail->send();
            
            if ($result) {
                self::log("✓✓✓ SECURITY ALERT EMAIL SENT! ✓✓✓");
                return ['success' => true];
            }
            
        } catch (Exception $e) {
            self::log("✗ Security alert failed: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Generate QR Code Binary Data (returns raw PNG binary string)
     * For embedding in emails using Content-ID
     */
    private static function generateQRCode($orderData) {
        try {
            // Ensure data string is not empty
            if (empty($orderData['queue_number'])) {
                self::log("QR Code: Empty queue number provided");
                return '';
            }

            // Check if QrCode class is available
            if (!class_exists('Endroid\\QrCode\\QrCode')) {
                self::log("QR Code: Endroid library not found. Run: composer require endroid/qr-code");
                return '';
            }

            // Create JSON data for QR code
            $qrData = json_encode([
                'queue_number' => $orderData['queue_number'],
                'reference_number' => $orderData['reference_number'] ?? '',
                'timestamp' => date('c'),
                'type' => 'umak_coop_order'
            ]);

            // Try named parameters (PHP 8.0+, Endroid v6)
            try {
                $qrCode = new \Endroid\QrCode\QrCode(
                    data: $qrData,
                    size: 200,
                    margin: 10
                );
                
                $writer = new \Endroid\QrCode\Writer\PngWriter();
                $result = $writer->write($qrCode);
                $imageData = $result->getString();
                
                if (!empty($imageData)) {
                    self::log("QR Code: Generated binary successfully (" . strlen($imageData) . " bytes)");
                    return $imageData; // Return raw binary data
                } else {
                    self::log("QR Code: Generated image is empty");
                    return '';
                }
            } catch (\Throwable $e) {
                self::log("QR Code: Named params failed, trying fallback: " . $e->getMessage());
                
                // Fallback: Try QrCode::create() method (Endroid v5)
                try {
                    if (method_exists('Endroid\\QrCode\\QrCode', 'create')) {
                        $qrCode = \Endroid\QrCode\QrCode::create($qrData)
                            ->setSize(200)
                            ->setMargin(10);
                        
                        $writer = new \Endroid\QrCode\Writer\PngWriter();
                        $result = $writer->write($qrCode);
                        $imageData = $result->getString();
                        
                        if (!empty($imageData)) {
                            self::log("QR Code: Generated binary using fallback (" . strlen($imageData) . " bytes)");
                            return $imageData; // Return raw binary data
                        }
                    }
                } catch (\Throwable $e2) {
                    self::log("QR Code: Fallback method also failed: " . $e2->getMessage());
                }
            }

            self::log("QR Code: All generation methods failed");
            return '';
            
        } catch (\Throwable $e) {
            self::log("QR Code: Generation failed - " . $e->getMessage());
            return '';
        }
    }
    
    /**
     * Get Order Confirmation Email HTML
     */
    private static function getOrderConfirmationHTML($orderData, $studentName, $hasQrCode) {
        $greeting = $studentName ? "Hello $studentName," : "Hello,";
        $queueNumber = $orderData['queue_number'] ?? 'N/A';
        $referenceNumber = $orderData['reference_number'] ?? 'N/A';
        $items = $orderData['items'] ?? 'N/A';
        $waitTime = $orderData['estimated_wait_time'] ?? 'N/A';
        $orderType = $orderData['order_type'] ?? 'immediate';
        $scheduledDate = $orderData['scheduled_date'] ?? '';
        
        // Use Content-ID reference for embedded QR code
        $qrImageHtml = $hasQrCode ? "<img src='cid:order_qr' alt='QR Code' style='width: 200px; height: 200px; display: block; margin: 0 auto;' />" : "<p style='color: #64748b;'>QR Code will be available at pickup</p>";
        
        $orderTypeInfo = $orderType === 'pre-order' && $scheduledDate ? 
            "<p style='margin: 10px 0; font-size: 14px; color: #7c3aed;'><strong>Pre-Order for:</strong> " . date('F d, Y', strtotime($scheduledDate)) . "</p>" :
            "<p style='margin: 10px 0; font-size: 14px; color: #2563eb;'><strong>Estimated Wait Time:</strong> $waitTime minutes</p>";
        
        return "<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;'>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color: #f4f4f7; padding: 20px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden;'>
                    <tr>
                        <td style='background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 30px; text-align: center;'>
                            <h1 style='margin: 0 0 10px; font-size: 28px;'>Order Confirmed!</h1>
                            <p style='margin: 0; font-size: 16px; opacity: 0.9;'>Your queue number is ready</p>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding: 40px 30px;'>
                            <p style='margin: 0 0 20px; font-size: 16px; color: #333;'>$greeting</p>
                            <p style='margin: 0 0 25px; font-size: 15px; color: #333;'>Your order has been confirmed. Present this QR code at the COOP counter:</p>
                            
                            <div style='background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center;'>
                                $qrImageHtml
                                <div style='margin-top: 25px; padding-top: 20px; border-top: 1px solid #cbd5e1;'>
                                    <p style='margin: 0 0 15px; font-size: 14px; color: #64748b;'>Queue Number</p>
                                    <p style='margin: 0 0 20px; font-size: 32px; font-weight: bold; color: #1e3a8a; letter-spacing: 2px;'>$queueNumber</p>
                                    <p style='margin: 0 0 5px; font-size: 13px; color: #64748b;'>Reference Number</p>
                                    <p style='margin: 0; font-size: 16px; font-weight: 600; color: #7c3aed; font-family: monospace;'>$referenceNumber</p>
                                </div>
                            </div>
                            
                            <div style='background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                                <h3 style='margin: 0 0 10px; font-size: 16px; color: #1e40af;'>Order Details</h3>
                                <p style='margin: 5px 0; font-size: 14px; color: #334155;'><strong>Items:</strong> $items</p>
                                $orderTypeInfo
                            </div>
                            
                            <div style='background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 20px 25px; margin: 25px 0; border-radius: 0 8px 8px 0;'>
                                <h4 style='margin: 0 0 10px; color: #1e3a8a; font-size: 16px; font-weight: 600;'>Next Steps:</h4>
                                <ul style='margin: 0; padding-left: 20px;'>
                                    <li style='margin-bottom: 6px; font-size: 14px; color: #475569;'>Proceed to the UMak COOP counter</li>
                                    <li style='margin-bottom: 6px; font-size: 14px; color: #475569;'>Present your Queue Number or scan the QR Code above for verification</li>
                                    <li style='margin-bottom: 6px; font-size: 14px; color: #475569;'>Wait for your number to be called to collect your item</li>
                                    <li style='margin-bottom: 6px; font-size: 14px; color: #475569;'>Keep this email as proof of your order</li>
                                </ul>
                            </div>
                            
                            <p style='margin: 20px 0 0; font-size: 13px; color: #64748b; text-align: center;'>Thank you for using UMak COOP Order Hub!</p>
                        </td>
                    </tr>
                    <tr>
                        <td style='background-color: #f1f5f9; padding: 20px; text-align: center;'>
                            <p style='margin: 0; font-size: 12px; color: #64748b;'>University of Makati © " . date('Y') . " | Q-Mak System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
    
    /**
     * Get Order Confirmation Plain Text
     */
    private static function getOrderConfirmationPlainText($orderData, $studentName) {
        $greeting = $studentName ? "Hello $studentName," : "Hello,";
        $queueNumber = $orderData['queue_number'] ?? 'N/A';
        $referenceNumber = $orderData['reference_number'] ?? 'N/A';
        $items = $orderData['items'] ?? 'N/A';
        $waitTime = $orderData['estimated_wait_time'] ?? 'N/A';
        
        return "UMak COOP - Order Confirmation

$greeting

Your order has been confirmed!

Queue Number: $queueNumber
Reference Number: $referenceNumber
Items: $items
Estimated Wait Time: $waitTime minutes

What to do next:
1. Present your queue number at the COOP counter
2. Wait for your number to be called
3. Collect your order

Thank you for using UMak COOP Order Hub!

---
University of Makati © " . date('Y') . " | Q-Mak System";
    }
    
    /**
     * Get Security Alert HTML Email
     */
    private static function getSecurityAlertHTML($alertData) {
        $alertType = $alertData['alert_type'] ?? 'Account Activity';
        $action = $alertData['action'] ?? 'unknown action';
        $timestamp = $alertData['timestamp'] ?? date('F d, Y \\a\\t g:i A');
        $ipAddress = $alertData['ip_address'] ?? 'Unknown';
        $device = $alertData['device'] ?? 'Unknown device';
        $location = $alertData['location'] ?? 'Unknown location';
        
        return "<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;'>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color: #f4f4f7; padding: 20px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden;'>
                    <tr>
                        <td style='background-color: #dc2626; color: #ffffff; padding: 30px; text-align: center;'>
                            <h1 style='margin: 0; font-size: 24px;'>🔒 Security Alert</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding: 40px 30px;'>
                            <p style='margin: 0 0 20px; font-size: 16px; color: #333;'>We detected a new activity on your account:</p>
                            
                            <div style='background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;'>
                                <p style='margin: 5px 0; font-size: 14px; color: #333;'><strong>Action:</strong> $action</p>
                                <p style='margin: 5px 0; font-size: 14px; color: #333;'><strong>Time:</strong> $timestamp</p>
                                <p style='margin: 5px 0; font-size: 14px; color: #333;'><strong>IP Address:</strong> $ipAddress</p>
                                <p style='margin: 5px 0; font-size: 14px; color: #333;'><strong>Device:</strong> $device</p>
                                <p style='margin: 5px 0; font-size: 14px; color: #333;'><strong>Location:</strong> $location</p>
                            </div>
                            
                            <p style='margin: 20px 0; font-size: 14px; color: #333;'>If this was you, no action is needed.</p>
                            <p style='margin: 10px 0; font-size: 14px; color: #333;'>If you don't recognize this activity, please contact the admin immediately and change your password.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style='background-color: #f1f5f9; padding: 20px; text-align: center;'>
                            <p style='margin: 0; font-size: 12px; color: #64748b;'>University of Makati © " . date('Y') . " | Q-Mak System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
    
    /**
     * Get Security Alert Plain Text
     */
    private static function getSecurityAlertPlainText($alertData) {
        $action = $alertData['action'] ?? 'unknown action';
        $timestamp = $alertData['timestamp'] ?? date('F d, Y \\a\\t g:i A');
        $ipAddress = $alertData['ip_address'] ?? 'Unknown';
        
        return "Security Alert - UMak COOP

We detected a new activity on your account:

Action: $action
Time: $timestamp
IP Address: $ipAddress

If this was you, no action is needed.
If you don't recognize this activity, please contact admin immediately.

---
University of Makati © " . date('Y') . " | Q-Mak System";
    }
    
    /**
     * Log email to database (updated with order_id support)
     */
    private static function logToDatabase($email, $type, $success, $error, $orderId = 0) {
        try {
            if (!function_exists('getDB')) {
                require_once __DIR__ . '/../config/database.php';
            }
            
            $db = getDB();
            
            $studentId = 0;
            $stmt = $db->prepare("SELECT student_id FROM students WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $student = $stmt->fetch();
            if ($student) {
                $studentId = $student['student_id'];
            }
            
            $stmt = $db->prepare("
                INSERT INTO email_logs (order_id, student_id, email_to, email_type, subject, message, status, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            ");
            $subject = $type === 'order_confirmation' ? 'Order Confirmed' : 'Security Alert';
            $status = $success ? 'sent' : 'failed';
            $stmt->execute([$orderId, $studentId, $email, $type, $subject, 'Email sent', $status, $error]);
            
            self::log("✓ Email logged to database");
        } catch (Exception $e) {
            self::log("Warning: Could not log to database", $e->getMessage());
        }
    }
    
    /**
     * Get the log file path
     */
    public static function getLogFilePath() {
        self::initLog();
        return self::$logFile;
    }
}
