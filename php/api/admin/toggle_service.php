<?php
/**
 * Toggle Service API
 * Phase 8: Enable/Disable services globally
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once '../../config/database.php';
require_once '../../utils/session_helper.php';

// Check admin session
if (!isAdminLoggedIn()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized access. Admin login required.'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['service_id']) || !isset($input['is_active'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields: service_id and is_active'
        ]);
        exit;
    }
    
    $serviceId = intval($input['service_id']);
    $isActive = intval($input['is_active']); // 1 = active, 0 = inactive
    
    $db = getDB();
    
    // Update service status
    $updateStmt = $db->prepare("
        UPDATE services 
        SET is_active = ?, 
            updated_at = NOW() 
        WHERE service_id = ?
    ");
    $updateStmt->execute([$isActive, $serviceId]);
    
    if ($updateStmt->rowCount() > 0) {
        // Get updated service details
        $getService = $db->prepare("SELECT * FROM services WHERE service_id = ?");
        $getService->execute([$serviceId]);
        $service = $getService->fetch();
        
        echo json_encode([
            'success' => true,
            'message' => "Service " . ($isActive ? 'enabled' : 'disabled') . " successfully",
            'data' => [
                'service_id' => $service['service_id'],
                'service_name' => $service['service_name'],
                'is_active' => $service['is_active'],
                'updated_at' => $service['updated_at']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Service not found or no changes made'
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Toggle Service Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Toggle Service Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>
