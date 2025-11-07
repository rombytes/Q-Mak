<?php
/**
 * Settings Management API
 * Handles fetching and updating system settings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$conn = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all settings
            $stmt = $conn->query("SELECT * FROM settings ORDER BY setting_key");
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convert to key-value pairs
            $settingsMap = [];
            foreach ($settings as $setting) {
                $settingsMap[$setting['setting_key']] = [
                    'value' => $setting['setting_value'],
                    'description' => $setting['description']
                ];
            }
            
            echo json_encode([
                'success' => true,
                'settings' => $settingsMap
            ]);
            break;
            
        case 'POST':
        case 'PUT':
            // Update settings
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['settings']) || !is_array($input['settings'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid input format']);
                exit;
            }
            
            $conn->beginTransaction();
            
            try {
                $stmt = $conn->prepare("
                    UPDATE settings 
                    SET setting_value = ?, updated_at = NOW() 
                    WHERE setting_key = ?
                ");
                
                $updatedCount = 0;
                foreach ($input['settings'] as $key => $value) {
                    $stmt->execute([$value, $key]);
                    if ($stmt->rowCount() > 0) {
                        $updatedCount++;
                    }
                }
                
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Settings updated successfully',
                    'updated_count' => $updatedCount
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
    }
} catch (PDOException $e) {
    error_log("Settings API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Settings API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred'
    ]);
}
?>
