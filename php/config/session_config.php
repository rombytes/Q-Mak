<?php
/**
 * Shared Session Configuration
 * Use this to ensure all session settings are consistent across the application
 */

// Set custom session save path (the "desk drawer" for session files)
$sessionPath = __DIR__ . '/../../sessions';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0777, true);
}
session_save_path($sessionPath);

// Set session name (so all pages use the same session cookie)
session_name('QMAK_SESSION');

// Configure session security settings
ini_set('session.cookie_httponly', 1);  // Prevent JavaScript access to cookies
ini_set('session.use_only_cookies', 1); // Only use cookies, not URL parameters
ini_set('session.cookie_samesite', 'Lax'); // Prevent CSRF attacks
ini_set('session.cookie_lifetime', 86400); // 24 hours
ini_set('session.cookie_path', '/'); // Cookie available for entire site

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
