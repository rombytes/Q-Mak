<?php
/**
 * Email Configuration
 *
 * This file contains email settings and constants used throughout the application.
 * If you need to customize these settings, create a config/email.php file
 * with your specific values and include it before this file.
 */

// Define default constants if not already defined
if (!defined('SMTP_HOST')) {
    define('SMTP_HOST', 'smtp.gmail.com');
}
if (!defined('SMTP_PORT')) {
    define('SMTP_PORT', 587);
}
if (!defined('SMTP_USERNAME')) {
    define('SMTP_USERNAME', 'your-email@gmail.com');
}
if (!defined('SMTP_PASSWORD')) {
    define('SMTP_PASSWORD', 'your-app-password');
}
if (!defined('SMTP_FROM_EMAIL')) {
    define('SMTP_FROM_EMAIL', 'your-email@gmail.com');
}
if (!defined('SMTP_FROM_NAME')) {
    define('SMTP_FROM_NAME', 'UMak COOP System');
}

// OTP Configuration
if (!defined('OTP_EXPIRY_MINUTES')) {
    define('OTP_EXPIRY_MINUTES', 10); // OTP expires in 10 minutes
}
if (!defined('OTP_MAX_ATTEMPTS')) {
    define('OTP_MAX_ATTEMPTS', 3); // Maximum 3 attempts
}

// QR Code Configuration
if (!defined('QR_EXPIRY_MINUTES')) {
    define('QR_EXPIRY_MINUTES', 30); // QR code expires in 30 minutes
}
