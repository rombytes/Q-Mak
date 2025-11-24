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
    
    // Phase 7: Check for active orders by service type (pending/processing only, NOT scheduled)
    $query = "SELECT 
                o.order_id,
                o.reference_number,
                o.queue_number,
                o.status,
                o.order_type_service,
                o.created_at
              FROM orders o
              WHERE o.student_id = :student_id
              AND o.status IN ('pending', 'processing')
              AND o.is_archived = 0
              ORDER BY o.created_at DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':student_id', $student_id);
    $stmt->execute();
    
    $activeOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Initialize granular status
    $activeOrdersByType = [
        'items' => false,
        'printing' => false
    ];
    
    $details = [];
    
    // Check each active order and categorize by service type
    foreach ($activeOrders as $order) {
        $serviceType = $order['order_type_service'];
        
        // Mark this service type as having an active order
        if (isset($activeOrdersByType[$serviceType])) {
            $activeOrdersByType[$serviceType] = true;
        }
        
        // Add to details array
        $details[] = [
            'order_id' => $order['order_id'],
            'reference_number' => $order['reference_number'],
            'queue_number' => $order['queue_number'],
            'status' => $order['status'],
            'service_type' => $order['order_type_service'],
            'created_at' => $order['created_at']
        ];
    }
    
    // Return granular response
    echo json_encode([
        'success' => true,
        'active_orders' => $activeOrdersByType,
        'details' => $details,
        // Legacy support for old API consumers
        'hasActiveOrder' => count($details) > 0,
        'activeOrder' => count($details) > 0 ? $details[0] : null
    ]);
    
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
