<?php
/**
 * System Constants Configuration
 * Central location for all system-wide constants
 * Automatically detects localhost vs production environment
 */

// Prevent direct access
if (!defined('INCLUDED')) {
    define('INCLUDED', true);
}

// Set timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

// Detect environment (localhost vs production)
if (!function_exists('isLocalhost')) {
    function isLocalhost() {
        $localhost_names = ['localhost', '127.0.0.1', '::1'];
        return in_array($_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost', $localhost_names);
    }
}

// Environment-specific settings
if (isLocalhost()) {
    // LOCALHOST (XAMPP/WAMP) - Development Environment
    define('ENVIRONMENT', 'development');
    define('BASE_URL', 'http://localhost/Q-Mak');
    define('SITE_URL', 'http://localhost/Q-Mak');
    define('IS_PRODUCTION', false);
} else {
    // PRODUCTION (Hostinger/Live Server)
    define('ENVIRONMENT', 'production');
    define('BASE_URL', 'https://qmak.online');  // Update with your actual domain
    define('SITE_URL', 'https://qmak.online');
    define('IS_PRODUCTION', true);
}
