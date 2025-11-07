<?php
/**
 * Get CAPTCHA Configuration
 * Returns the reCAPTCHA site key for frontend use
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../config/security_config.php';

// Return only public configuration (site key, not secret key)
echo json_encode([
    'success' => true,
    'captcha' => [
        'enabled' => ENABLE_CAPTCHA,
        'type' => CAPTCHA_TYPE,
        'site_key' => RECAPTCHA_SITE_KEY,
        'threshold' => CAPTCHA_THRESHOLD
    ]
]);
?>
