<?php
/**
 * Email Configuration Example for Q-Mak System
 *
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to: email.php
 * 2. Update the values below with your actual email credentials
 * 3. DO NOT commit email.php to GitHub (it's in .gitignore)
 *
 * For Gmail:
 * - Enable 2-Factor Authentication
 * - Generate an App Password: https://myaccount.google.com/apppasswords
 * - Use the App Password instead of your regular password
 *
 * Alternative: Use the combined configuration in database.example.php
 */

// Email configuration constants
define('SMTP_HOST', 'smtp.gmail.com');                           // SMTP server (Gmail: smtp.gmail.com)
define('SMTP_PORT', 587);                                        // SMTP port (587 for TLS, 465 for SSL)
define('SMTP_USERNAME', 'your-email@gmail.com');                // Your email address
define('SMTP_PASSWORD', 'your-app-password');                   // Your email password or app password
define('SMTP_ENCRYPTION', 'tls');                                // Encryption type: 'tls' or 'ssl'
define('SMTP_FROM_EMAIL', 'your-email@gmail.com');              // Sender email address
define('SMTP_FROM_NAME', 'UMak COOP Order Hub');                // Sender name
define('SMTP_REPLY_TO', 'coop@umak.edu.ph');                     // Reply-to email address

// Email settings
define('OTP_EXPIRY_MINUTES', 10);                               // OTP expiry time in minutes
define('OTP_MAX_ATTEMPTS', 3);                                  // Maximum OTP verification attempts

// Email templates configuration
define('EMAIL_TEMPLATES', [
    'otp' => [
        'subject' => 'Your UMak COOP Verification Code',
        'template' => 'email_templates/otp.html'
    ],
    'receipt' => [
        'subject' => 'Order Confirmation - UMak COOP',
        'template' => 'email_templates/receipt.html'
    ],
    'status_update' => [
        'subject' => 'Order Status Update - UMak COOP',
        'template' => 'email_templates/status_update.html'
    ]
]);

/**
 * Email utility class for Q-Mak System
 */
class EmailHelper {
    private $mailer;

    public function __construct() {
        // Create PHPMailer instance
        $this->mailer = new PHPMailer\PHPMailer\PHPMailer(true);

        try {
            // Server settings
            $this->mailer->isSMTP();
            $this->mailer->Host = SMTP_HOST;
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = SMTP_USERNAME;
            $this->mailer->Password = SMTP_PASSWORD;
            $this->mailer->SMTPSecure = SMTP_ENCRYPTION;
            $this->mailer->Port = SMTP_PORT;

            // Sender info
            $this->mailer->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            if (defined('SMTP_REPLY_TO')) {
                $this->mailer->addReplyTo(SMTP_REPLY_TO);
            }

            // Default settings
            $this->mailer->isHTML(true);
            $this->mailer->CharSet = 'UTF-8';

        } catch (Exception $e) {
            error_log("Email Configuration Error: " . $e->getMessage());
        }
    }

    /**
     * Send email using template
     */
    public function sendEmail($to, $subject, $body, $altBody = '') {
        try {
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $body;
            $this->mailer->AltBody = $altBody;

            return $this->mailer->send();

        } catch (Exception $e) {
            error_log("Email Send Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send OTP email
     */
    public function sendOTP($email, $otpCode) {
        $subject = EMAIL_TEMPLATES['otp']['subject'];
        $body = "
        <html>
        <body>
            <h2>UMak COOP Verification Code</h2>
            <p>Your verification code is: <strong>{$otpCode}</strong></p>
            <p>This code will expire in " . OTP_EXPIRY_MINUTES . " minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        </body>
        </html>";

        $altBody = "Your UMak COOP verification code is: {$otpCode}. This code will expire in " . OTP_EXPIRY_MINUTES . " minutes.";

        return $this->sendEmail($email, $subject, $body, $altBody);
    }
}

/**
 * Helper function to get email helper instance
 */
function getEmailHelper() {
    return new EmailHelper();
}
?>
