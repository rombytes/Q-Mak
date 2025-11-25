<?php
/**
 * Get Services API
 * Phase 8: Retrieve all services with their status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../../config/database.php';

try {
    $db = getDB();
    
    // Get all services
    $stmt = $db->query("SELECT * FROM services ORDER BY service_id ASC");
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $services
    ]);
    
} catch (PDOException $e) {
    error_log("Get Services Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Get Services Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>
