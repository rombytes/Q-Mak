<?php
/**
 * Check Active Order API
 * Verifies if a student has any active orders (one order at a time rule)
 * 
 * @return JSON {success: bool, hasActiveOrder: bool, activeOrder: object|null}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../../config/database.php';

session_start();

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get student ID from session or query parameter
    $student_id = $_SESSION['student_id'] ?? $_GET['student_id'] ?? null;
    
    if (!$student_id) {
        echo json_encode([
            'success' => false,
            'message' => 'Student ID not provided'
        ]);
        exit;
    }
    
    // Check for active orders (not completed, not cancelled, not claimed)
    $query = "SELECT 
                o.order_id,
                o.reference_number,
                o.queue_number,
                o.status,
                o.order_type_service,
                o.created_at
              FROM orders o
              WHERE o.student_id = :student_id
              AND o.status NOT IN ('completed', 'cancelled')
              AND o.claimed_at IS NULL
              AND o.is_archived = 0
              ORDER BY o.created_at DESC
              LIMIT 1";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':student_id', $student_id);
    $stmt->execute();
    
    $activeOrder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($activeOrder) {
        echo json_encode([
            'success' => true,
            'hasActiveOrder' => true,
            'activeOrder' => [
                'order_id' => $activeOrder['order_id'],
                'reference_number' => $activeOrder['reference_number'],
                'queue_number' => $activeOrder['queue_number'],
                'status' => $activeOrder['status'],
                'service_type' => $activeOrder['order_type_service'],
                'created_at' => $activeOrder['created_at']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'hasActiveOrder' => false,
            'activeOrder' => null
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Check Active Order Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Check Active Order Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred'
    ]);
}
?>
