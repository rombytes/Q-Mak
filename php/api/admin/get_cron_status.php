<?php
/**
 * Get CRON Job Status API
 * Returns information about the auto-reschedule CRON job
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cron_manager.php';

// Admin authentication check would go here
// For now, we'll skip it for testing

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = getDB();
    $cronManager = new CronManager($db);
    
    // Get current CRON job information
    $cronInfo = $cronManager->getCurrentCronInfo();
    $cronVerification = $cronManager->verifyCronJob();
    
    // Get auto-move setting status
    $settingStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'auto_move_pending_to_next_day'");
    $settingStmt->execute();
    $autoMoveResult = $settingStmt->fetch();
    $autoMoveEnabled = $autoMoveResult && $autoMoveResult['setting_value'] == '1';
    
    // Get default closing time
    $closingStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'default_closing_time'");
    $closingStmt->execute();
    $closingTimeResult = $closingStmt->fetch();
    $closingTime = $closingTimeResult ? $closingTimeResult['setting_value'] : '17:00';
    
    echo json_encode([
        'success' => true,
        'auto_move_enabled' => $autoMoveEnabled,
        'closing_time' => $closingTime,
        'cron_schedule_time' => $cronInfo['auto_reschedule_time'] ?? null,
        'cron_expression' => $cronInfo['auto_reschedule_cron'] ?? null,
        'system_cron_exists' => $cronVerification['system_cron_exists'] ?? false,
        'cron_file_path' => $cronVerification['cron_file_path'] ?? null,
        'cron_file_exists' => $cronVerification['file_exists'] ?? false,
        'verification' => $cronVerification
    ]);
    
} catch (Exception $e) {
    error_log("Get CRON Status Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to get CRON status: ' . $e->getMessage()
    ]);
}
?>
