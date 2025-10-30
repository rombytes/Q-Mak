<?php
/**
 * Session Check Endpoint
 * Debug tool to verify session data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');

session_start();

echo json_encode([
    'session_active' => session_status() === PHP_SESSION_ACTIVE,
    'session_id' => session_id(),
    'session_data' => [
        'admin_id' => $_SESSION['admin_id'] ?? 'not set',
        'admin_email' => $_SESSION['admin_email'] ?? 'not set',
        'admin_name' => $_SESSION['admin_name'] ?? 'not set',
        'is_super_admin' => $_SESSION['is_super_admin'] ?? 'not set',
        'is_super_admin_type' => isset($_SESSION['is_super_admin']) ? gettype($_SESSION['is_super_admin']) : 'not set',
        'is_super_admin_value' => isset($_SESSION['is_super_admin']) ? var_export($_SESSION['is_super_admin'], true) : 'not set'
    ],
    'all_session_keys' => array_keys($_SESSION)
], JSON_PRETTY_PRINT);
?>
