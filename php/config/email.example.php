<?php
/**
 * Email Configuration Example
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
 */

// SMTP Configuration
$smtp_host = 'smtp.gmail.com';           // SMTP server (Gmail: smtp.gmail.com)
$smtp_port = 587;                        // SMTP port (587 for TLS, 465 for SSL)
$smtp_username = 'your-email@gmail.com'; // Your email address
$smtp_password = 'your-app-password';    // Your email password or app password
$smtp_encryption = 'tls';                // Encryption type: 'tls' or 'ssl'

// Email Settings
$from_email = 'your-email@gmail.com';    // Sender email address
$from_name = 'UMak COOP System';         // Sender name
$reply_to = 'coop@umak.edu.ph';         // Reply-to email address

// Email Templates
$email_templates = [
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
];

// OTP Settings
$otp_expiry_minutes = 10;                // OTP expiry time in minutes
$otp_max_attempts = 3;                   // Maximum OTP verification attempts

?>
