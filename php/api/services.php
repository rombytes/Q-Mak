<?php
/**
 * Services Management API
 * Handles CRUD operations for services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

// GET - Retrieve all services (public access)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        
        $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] === 'true';
        
        $query = "SELECT * FROM services WHERE 1=1";
        if ($activeOnly) {
            $query .= " AND is_active = 1";
        }
        $query .= " ORDER BY service_name ASC";
        
        $stmt = $db->query($query);
        $services = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'services' => $services,
                'total' => count($services)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get Services Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Server error occurred',
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// All other methods require admin authentication
session_start();

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
    exit;
}

// POST - Create new service
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $serviceName = trim($input['service_name'] ?? '');
        $estimatedTime = intval($input['estimated_time'] ?? 10);
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
        
        if (empty($serviceName)) {
            echo json_encode(['success' => false, 'message' => 'Service name is required']);
            exit;
        }
        
        if ($estimatedTime < 1) {
            echo json_encode(['success' => false, 'message' => 'Estimated time must be at least 1 minute']);
            exit;
        }
        
        $db = getDB();
        
        // Check if service already exists
        $checkStmt = $db->prepare("SELECT service_id FROM services WHERE service_name = ?");
        $checkStmt->execute([$serviceName]);
        if ($checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Service with this name already exists']);
            exit;
        }
        
        $stmt = $db->prepare("
            INSERT INTO services (service_name, estimated_time, is_active)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$serviceName, $estimatedTime, $isActive]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Service created successfully',
            'data' => [
                'service_id' => $db->lastInsertId()
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Create Service Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
// PUT - Update existing service
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $serviceId = intval($input['service_id'] ?? 0);
        $serviceName = trim($input['service_name'] ?? '');
        $estimatedTime = intval($input['estimated_time'] ?? 10);
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
        
        if ($serviceId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Service ID is required']);
            exit;
        }
        
        if (empty($serviceName)) {
            echo json_encode(['success' => false, 'message' => 'Service name is required']);
            exit;
        }
        
        if ($estimatedTime < 1) {
            echo json_encode(['success' => false, 'message' => 'Estimated time must be at least 1 minute']);
            exit;
        }
        
        $db = getDB();
        
        // Check if service exists
        $checkStmt = $db->prepare("SELECT service_id FROM services WHERE service_id = ?");
        $checkStmt->execute([$serviceId]);
        if (!$checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Service not found']);
            exit;
        }
        
        // Check if name is taken by another service
        $nameCheckStmt = $db->prepare("SELECT service_id FROM services WHERE service_name = ? AND service_id != ?");
        $nameCheckStmt->execute([$serviceName, $serviceId]);
        if ($nameCheckStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Service name already exists']);
            exit;
        }
        
        $stmt = $db->prepare("
            UPDATE services 
            SET service_name = ?, estimated_time = ?, is_active = ?
            WHERE service_id = ?
        ");
        $stmt->execute([$serviceName, $estimatedTime, $isActive, $serviceId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Service updated successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Update Service Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
// DELETE - Delete service
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $serviceId = intval($input['service_id'] ?? 0);
        
        if ($serviceId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Service ID is required']);
            exit;
        }
        
        $db = getDB();
        
        // Check if service exists
        $checkStmt = $db->prepare("SELECT service_id FROM services WHERE service_id = ?");
        $checkStmt->execute([$serviceId]);
        if (!$checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Service not found']);
            exit;
        }
        
        $stmt = $db->prepare("DELETE FROM services WHERE service_id = ?");
        $stmt->execute([$serviceId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Service deleted successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Delete Service Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error occurred']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
