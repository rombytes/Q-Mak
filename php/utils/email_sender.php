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
            self::log("✓ Sender: {$smtpConfig['from_email']} ({$smtpConfig['from_name']})");
            self::log("✓ Recipient: $toEmail");
            
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
     * Log email to database
     */
    private static function logToDatabase($email, $type, $success, $error) {
        try {
            if (!function_exists('getDB')) {
                require_once __DIR__ . '/../config/database.php';
            }
            
            $db = getDB();
            
            // Get student_id if exists
            $studentId = 0;
            $stmt = $db->prepare("SELECT student_id FROM students WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $student = $stmt->fetch();
            if ($student) {
                $studentId = $student['student_id'];
            }
            
            // Insert log
            $stmt = $db->prepare("
                INSERT INTO email_logs (order_id, student_id, email_to, email_type, subject, message, status, sent_at, error_message)
                VALUES (0, ?, ?, ?, 'Your UMak COOP Verification Code', 'OTP Email', ?, NOW(), ?)
            ");
            $status = $success ? 'sent' : 'failed';
            $stmt->execute([$studentId, $email, $type, $status, $error]);
            
            self::log("✓ Email logged to database");
        } catch (Exception $e) {
            self::log("Warning: Could not log to database", $e->getMessage());
            // Don't fail if logging fails
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
