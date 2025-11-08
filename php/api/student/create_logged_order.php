<?php
/**
 * Create Order API (For Logged-in Students)
 * Allows authenticated students to create new orders without OTP
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

// Check if student is logged in
if (!isset($_SESSION['student_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized. Please login first.'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = getDB();
    $studentId = $_SESSION['student_id'];
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['items']) || empty(trim($input['items']))) {
        echo json_encode([
            'success' => false,
            'message' => 'Please specify items to order'
        ]);
        exit;
    }
    
    $orderType = isset($input['order_type']) ? $input['order_type'] : 'immediate';
    $items = trim($input['items']);
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    $scheduledDate = isset($input['scheduled_date']) ? $input['scheduled_date'] : null;
    
    // Validate pre-order date
    if ($orderType === 'pre-order') {
        if (empty($scheduledDate)) {
            echo json_encode([
                'success' => false,
                'message' => 'Pre-orders require a scheduled date'
            ]);
            exit;
        }
        
        $scheduledDateTime = new DateTime($scheduledDate);
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        
        if ($scheduledDateTime < $today) {
            echo json_encode([
                'success' => false,
                'message' => 'Scheduled date cannot be in the past'
            ]);
            exit;
        }
    }
    
    // Generate queue number (format: Q-YYYYMMDD-XXX)
    $today = date('Y-m-d');
    $queueDateForNumber = ($orderType === 'pre-order' && $scheduledDate) ? $scheduledDate : $today;
    
    // Get the last queue number for today
    $queueStmt = $db->prepare("
        SELECT queue_number 
        FROM orders 
        WHERE queue_date = ? 
        ORDER BY order_id DESC 
        LIMIT 1
    ");
    $queueStmt->execute([$queueDateForNumber]);
    $lastQueue = $queueStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($lastQueue) {
        // Extract number from format Q-YYYYMMDD-XXX
        $parts = explode('-', $lastQueue['queue_number']);
        $lastNumber = intval(end($parts));
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    
    $queueNumber = 'Q-' . str_replace('-', '', $queueDateForNumber) . '-' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    
    // Generate unique reference number
    $referenceNumber = 'ORD-' . strtoupper(uniqid());
    
    // Determine if order is placed outside hours
    $currentHour = (int)date('H');
    $orderedOutsideHours = ($currentHour < 8 || $currentHour >= 17) ? 1 : 0;
    
    // Insert order
    $stmt = $db->prepare("
        INSERT INTO orders (
            reference_number,
            student_id,
            queue_number,
            queue_date,
            item_ordered,
            quantity,
            notes,
            order_status,
            order_type,
            scheduled_date,
            ordered_outside_hours,
            estimated_wait_time,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $status = ($orderType === 'pre-order') ? 'pending' : 'pending';
    $quantity = substr_count(strtolower($items), 'x') + 1; // Rough estimate
    $estimatedWaitTime = $quantity * 5; // 5 minutes per item
    
    $stmt->execute([
        $referenceNumber,
        $studentId,
        $queueNumber,
        $queueDateForNumber,
        $items,
        $quantity,
        $notes,
        $status,
        $orderType,
        $scheduledDate,
        $orderedOutsideHours,
        $estimatedWaitTime
    ]);
    
    $orderId = $db->lastInsertId();
    
    // Create notification for the student
    try {
        $notifStmt = $db->prepare("
            INSERT INTO notifications (
                student_id,
                title,
                message,
                type,
                related_order_id,
                created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $notifTitle = 'Order Created Successfully';
        $notifMessage = "Your order #{$queueNumber} has been placed. " . 
                       ($orderType === 'pre-order' ? "Scheduled for {$scheduledDate}" : "Estimated wait time: {$estimatedWaitTime} minutes");
        
        $notifStmt->execute([
            $studentId,
            $notifTitle,
            $notifMessage,
            'order',
            $orderId
        ]);
    } catch (Exception $e) {
        // Notification creation failed, but order was successful - continue
        error_log("Failed to create notification: " . $e->getMessage());
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Order created successfully!',
        'data' => [
            'order_id' => $orderId,
            'queue_number' => $queueNumber,
            'reference_number' => $referenceNumber,
            'estimated_wait_time' => $estimatedWaitTime
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Create Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create order',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Create Order Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
