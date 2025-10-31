<?php
/**
 * Update Working Hours Configuration
 * Allows admin to modify weekly schedule and add special hours
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

// Admin authentication check would go here
// For now, we'll skip it for testing

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $db = getDB();
    $db->beginTransaction();
    
    switch ($action) {
        case 'update_weekly':
            // Update weekly schedule
            if (!isset($input['schedule'])) {
                throw new Exception("Schedule data is required");
            }
            
            foreach ($input['schedule'] as $day) {
                $stmt = $db->prepare("
                    UPDATE working_hours 
                    SET is_open = ?, 
                        opening_time = ?, 
                        closing_time = ?,
                        break_start = ?,
                        break_end = ?,
                        updated_at = NOW()
                    WHERE day_of_week = ?
                ");
                
                $stmt->execute([
                    $day['is_open'] ? 1 : 0,
                    $day['opening_time'] . ':00', // Add seconds
                    $day['closing_time'] . ':00',
                    !empty($day['break_start']) ? $day['break_start'] . ':00' : null,
                    !empty($day['break_end']) ? $day['break_end'] . ':00' : null,
                    $day['day_of_week']
                ]);
            }
            
            $message = "Weekly schedule updated successfully";
            break;
            
        case 'add_special':
            // Add special hours/holiday
            if (!isset($input['special']) || !isset($input['special']['date'])) {
                throw new Exception("Special hours data is required");
            }
            
            $special = $input['special'];
            
            // Check if date already exists
            $checkStmt = $db->prepare("SELECT special_id FROM special_hours WHERE date = ?");
            $checkStmt->execute([$special['date']]);
            $exists = $checkStmt->fetch();
            
            if ($exists) {
                // Update existing
                $stmt = $db->prepare("
                    UPDATE special_hours 
                    SET is_open = ?, 
                        opening_time = ?, 
                        closing_time = ?,
                        reason = ?,
                        updated_at = NOW()
                    WHERE date = ?
                ");
                
                $stmt->execute([
                    $special['is_open'] ? 1 : 0,
                    $special['is_open'] && !empty($special['opening_time']) ? $special['opening_time'] . ':00' : null,
                    $special['is_open'] && !empty($special['closing_time']) ? $special['closing_time'] . ':00' : null,
                    $special['reason'] ?? null,
                    $special['date']
                ]);
                
                $message = "Special hours updated for " . $special['date'];
            } else {
                // Insert new
                $stmt = $db->prepare("
                    INSERT INTO special_hours 
                    (date, is_open, opening_time, closing_time, reason, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                ");
                
                $stmt->execute([
                    $special['date'],
                    $special['is_open'] ? 1 : 0,
                    $special['is_open'] && !empty($special['opening_time']) ? $special['opening_time'] . ':00' : null,
                    $special['is_open'] && !empty($special['closing_time']) ? $special['closing_time'] . ':00' : null,
                    $special['reason'] ?? null
                ]);
                
                $message = "Special hours added for " . $special['date'];
            }
            break;
            
        case 'remove_special':
            // Remove special hours
            if (!isset($input['special_id'])) {
                throw new Exception("Special hours ID is required");
            }
            
            $stmt = $db->prepare("DELETE FROM special_hours WHERE special_id = ?");
            $stmt->execute([$input['special_id']]);
            
            $message = "Special hours removed successfully";
            break;
            
        case 'update_settings':
            // Update related settings
            if (!isset($input['settings'])) {
                throw new Exception("Settings data is required");
            }
            
            foreach ($input['settings'] as $key => $value) {
                $stmt = $db->prepare("
                    UPDATE settings 
                    SET setting_value = ?, updated_at = NOW()
                    WHERE setting_key = ?
                ");
                $stmt->execute([$value, $key]);
            }
            
            $message = "Settings updated successfully";
            break;
            
        default:
            throw new Exception("Invalid action specified");
    }
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("Update Working Hours Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update working hours',
        'error' => $e->getMessage()
    ]);
}
?>
