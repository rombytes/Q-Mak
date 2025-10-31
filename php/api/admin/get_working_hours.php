<?php
/**
 * Get Working Hours Configuration
 * Returns weekly schedule and special hours for admin management
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../../config/database.php';

// Admin authentication check would go here
// For now, we'll skip it for testing

try {
    $db = getDB();
    
    // Get weekly schedule
    $weeklyStmt = $db->prepare("
        SELECT 
            schedule_id,
            day_of_week,
            is_open,
            opening_time,
            closing_time,
            break_start,
            break_end,
            is_active
        FROM working_hours
        WHERE is_active = 1
        ORDER BY day_of_week
    ");
    $weeklyStmt->execute();
    $weeklySchedule = $weeklyStmt->fetchAll();
    
    // Format times to HH:MM for frontend
    foreach ($weeklySchedule as &$day) {
        $day['opening_time'] = substr($day['opening_time'], 0, 5); // Remove seconds
        $day['closing_time'] = substr($day['closing_time'], 0, 5);
        if ($day['break_start']) $day['break_start'] = substr($day['break_start'], 0, 5);
        if ($day['break_end']) $day['break_end'] = substr($day['break_end'], 0, 5);
        $day['is_open'] = (bool)$day['is_open'];
        $day['day_of_week'] = (int)$day['day_of_week'];
    }
    
    // Get special hours (upcoming and recent)
    $specialStmt = $db->prepare("
        SELECT 
            special_id,
            date,
            is_open,
            opening_time,
            closing_time,
            reason,
            created_at
        FROM special_hours
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY date DESC
    ");
    $specialStmt->execute();
    $specialHours = $specialStmt->fetchAll();
    
    // Format special hours
    foreach ($specialHours as &$special) {
        if ($special['opening_time']) $special['opening_time'] = substr($special['opening_time'], 0, 5);
        if ($special['closing_time']) $special['closing_time'] = substr($special['closing_time'], 0, 5);
        $special['is_open'] = (bool)$special['is_open'];
        $special['is_past'] = strtotime($special['date']) < strtotime('today');
    }
    
    // Get relevant settings
    $settingsStmt = $db->prepare("
        SELECT setting_key, setting_value
        FROM settings
        WHERE setting_key IN (
            'default_opening_time', 
            'default_closing_time',
            'closing_warning_minutes',
            'auto_move_pending_to_next_day',
            'allow_preorders',
            'max_preorder_days',
            'enable_lunch_break',
            'lunch_break_start',
            'lunch_break_end'
        )
    ");
    $settingsStmt->execute();
    $settingsRaw = $settingsStmt->fetchAll();
    
    $settings = [];
    foreach ($settingsRaw as $setting) {
        $settings[$setting['setting_key']] = $setting['setting_value'];
    }
    
    echo json_encode([
        'success' => true,
        'weekly_schedule' => $weeklySchedule,
        'special_hours' => $specialHours,
        'settings' => $settings
    ]);
    
} catch (Exception $e) {
    error_log("Get Working Hours Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve working hours',
        'error' => $e->getMessage()
    ]);
}
?>
