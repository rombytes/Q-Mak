<?php
/**
 * Get COOP Operating Schedule API
 * Returns current status and upcoming schedule
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/queue_functions.php';

try {
    $db = getDB();
    
    // Get current status
    $currentStatus = isCoopOpen($db);
    
    // Get schedule for next 7 days
    $scheduleDays = getSetting($db, 'schedule_display_days', 7);
    $schedule = getSchedule($db, $scheduleDays);
    
    // Get today's queue information
    $todayStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN status IN ('pending', 'processing') THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
        FROM orders
        WHERE queue_date = CURDATE()
    ");
    $todayStmt->execute();
    $todayStats = $todayStmt->fetch();
    
    // Get average wait time for today
    $avgWaitStmt = $db->prepare("
        SELECT 
            AVG(estimated_wait_time) as avg_estimated,
            AVG(actual_completion_time) as avg_actual
        FROM orders
        WHERE queue_date = CURDATE()
          AND status = 'completed'
          AND actual_completion_time IS NOT NULL
    ");
    $avgWaitStmt->execute();
    $avgWaitData = $avgWaitStmt->fetch();
    
    echo json_encode([
        'success' => true,
        'current_status' => $currentStatus,
        'schedule' => $schedule,
        'today_stats' => [
            'total_orders' => (int)$todayStats['total_orders'],
            'pending_orders' => (int)$todayStats['pending_orders'],
            'completed_orders' => (int)$todayStats['completed_orders'],
            'avg_estimated_wait' => round($avgWaitData['avg_estimated'] ?? 0, 1),
            'avg_actual_wait' => round($avgWaitData['avg_actual'] ?? 0, 1)
        ],
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    error_log("Get Schedule Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve schedule',
        'error' => $e->getMessage()
    ]);
}
?>
