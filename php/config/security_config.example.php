<?php
/**
 * Security Configuration for Q-Mak System - EXAMPLE FILE
 * Brute Force Protection Settings
 * 
 * IMPORTANT: 
 * 1. Copy this file to security_config.php
 * 2. Replace the example reCAPTCHA keys with your own keys
 * 3. Get keys from: https://www.google.com/recaptcha/admin/create
 * 4. NEVER commit security_config.php to GitHub!
 */

// ============================================
// LOGIN ATTEMPT LIMITS
// ============================================

// Maximum failed login attempts before lockout
define('MAX_LOGIN_ATTEMPTS', 5);

// Time window for counting attempts (in minutes)
// Attempts within this window count toward lockout
define('ATTEMPT_WINDOW_MINUTES', 30);

// Account lockout duration (in minutes)
define('LOCKOUT_DURATION_MINUTES', 15);

// Extended lockout for repeated violations (in minutes)
define('EXTENDED_LOCKOUT_MINUTES', 30);

// Number of lockouts before extended lockout applies
define('LOCKOUT_THRESHOLD_FOR_EXTENDED', 3);

// ============================================
// PROGRESSIVE DELAY SETTINGS
// ============================================

// Enable progressive delays between failed attempts
define('ENABLE_PROGRESSIVE_DELAY', true);

// Base delay in seconds (increases exponentially)
// Formula: BASE_DELAY * (2 ^ failed_attempts)
define('PROGRESSIVE_DELAY_BASE', 2);

// Maximum delay in seconds
define('PROGRESSIVE_DELAY_MAX', 30);

// ============================================
// CAPTCHA SETTINGS
// ============================================

// Enable CAPTCHA verification
define('ENABLE_CAPTCHA', true);

// Number of failed attempts before CAPTCHA is required
define('CAPTCHA_THRESHOLD', 3);

// CAPTCHA expiration time (in minutes)
define('CAPTCHA_EXPIRY_MINUTES', 10);

// CAPTCHA type: 'math', 'text', 'recaptcha', or 'recaptcha_v3'
define('CAPTCHA_TYPE', 'recaptcha');

// Google reCAPTCHA v2 keys
// ⚠️ REPLACE THESE WITH YOUR OWN KEYS! ⚠️
// Get your keys from: https://www.google.com/recaptcha/admin/create
define('RECAPTCHA_SITE_KEY', 'YOUR_RECAPTCHA_SITE_KEY_HERE'); // Replace with your site key
define('RECAPTCHA_SECRET_KEY', 'YOUR_RECAPTCHA_SECRET_KEY_HERE'); // Replace with your secret key

// Testing: You can use Google's test keys that always succeed
// Test Site Key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
// Test Secret Key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
// ⚠️ WARNING: Test keys always succeed - DO NOT use in production!

// ============================================
// IP BLACKLIST SETTINGS
// ============================================

// Enable automatic IP blacklisting
define('ENABLE_IP_BLACKLIST', true);

// Number of account lockouts from same IP before IP ban
define('IP_BAN_THRESHOLD', 3);

// IP ban duration (in hours), NULL = permanent
define('IP_BAN_DURATION_HOURS', 24);

// Whitelist IPs (never block these - comma separated)
// Example: '127.0.0.1,192.168.1.1'
define('IP_WHITELIST', '127.0.0.1,::1');

// ============================================
// SECURITY LOGGING
// ============================================

// Log all security events
define('ENABLE_SECURITY_LOGGING', true);

// Log severity levels to record
// Options: 'info', 'warning', 'critical', 'all'
define('LOG_SEVERITY_LEVEL', 'all');

// Keep security logs for X days
define('SECURITY_LOG_RETENTION_DAYS', 90);

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

// Send email notifications for security events
define('ENABLE_SECURITY_NOTIFICATIONS', true);

// Admin emails to notify (comma separated)
// ⚠️ REPLACE WITH YOUR ACTUAL ADMIN EMAILS! ⚠️
define('SECURITY_NOTIFICATION_EMAILS', 'admin@yourdomain.com,security@yourdomain.com');

// Events that trigger notifications
define('NOTIFY_ON_ACCOUNT_LOCKED', true);
define('NOTIFY_ON_IP_BLOCKED', true);
define('NOTIFY_ON_SUSPICIOUS_ACTIVITY', true);

// Minimum severity for notifications
// Options: 'warning', 'critical'
define('NOTIFICATION_MIN_SEVERITY', 'warning');

// ============================================
// RATE LIMITING (Additional Layer)
// ============================================

// Maximum requests per IP per minute
define('MAX_REQUESTS_PER_MINUTE', 60);

// Enable rate limiting per endpoint
define('ENABLE_ENDPOINT_RATE_LIMIT', true);

// ============================================
// SESSION SECURITY
// ============================================

// Force session regeneration after login
define('REGENERATE_SESSION_ON_LOGIN', true);

// Session timeout in minutes
define('SESSION_TIMEOUT_MINUTES', 60);

// Detect session hijacking by IP changes
define('CHECK_SESSION_IP', true);

// Detect session hijacking by user agent changes
define('CHECK_SESSION_USER_AGENT', true);

// ============================================
// PASSWORD POLICIES
// ============================================

// Minimum password length
define('MIN_PASSWORD_LENGTH', 8);

// Require strong passwords
define('REQUIRE_STRONG_PASSWORD', true);

// Strong password requirements
define('REQUIRE_UPPERCASE', true);
define('REQUIRE_LOWERCASE', true);
define('REQUIRE_NUMBER', true);
define('REQUIRE_SPECIAL_CHAR', true);

// ============================================
// AUTO-CLEANUP SETTINGS
// ============================================

// Auto-unlock accounts after lockout expires
define('AUTO_UNLOCK_ACCOUNTS', true);

// Clean up old attempt records (in days)
define('CLEANUP_ATTEMPTS_AFTER_DAYS', 30);

// Clean up old security logs (in days)
define('CLEANUP_LOGS_AFTER_DAYS', 90);

// ============================================
// DEVELOPMENT/DEBUG SETTINGS
// ============================================

// Disable security in development mode
define('SECURITY_DEBUG_MODE', false);

// Show detailed error messages (disable in production)
define('SHOW_DETAILED_ERRORS', false);

// Log all attempts (even successful ones)
define('LOG_ALL_ATTEMPTS', true);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get client IP address
 */
function getClientIP() {
    $ip = '';
    
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    
    return trim($ip);
}

/**
 * Get client user agent
 */
function getClientUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
}

/**
 * Check if IP is whitelisted
 */
function isIPWhitelisted($ip) {
    $whitelist = array_map('trim', explode(',', IP_WHITELIST));
    return in_array($ip, $whitelist);
}

/**
 * Calculate progressive delay
 */
function calculateProgressiveDelay($failedAttempts) {
    if (!ENABLE_PROGRESSIVE_DELAY) {
        return 0;
    }
    
    $delay = PROGRESSIVE_DELAY_BASE * pow(2, $failedAttempts - 1);
    return min($delay, PROGRESSIVE_DELAY_MAX);
}

/**
 * Get security notification emails as array
 */
function getSecurityNotificationEmails() {
    return array_map('trim', explode(',', SECURITY_NOTIFICATION_EMAILS));
}

/**
 * Check if security is enabled
 */
function isSecurityEnabled() {
    return !SECURITY_DEBUG_MODE;
}

?>
