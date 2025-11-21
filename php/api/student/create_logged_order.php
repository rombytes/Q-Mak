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
require_once __DIR__ . '/../../utils/queue_functions.php';
require_once __DIR__ . '/../../utils/email_sender.php';

// Start output buffering to catch any stray output
ob_start();

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
    
    // Generate queue number (format: Q-1, Q-2, etc.)
    $today = date('Y-m-d');
    $queueDateForNumber = ($orderType === 'pre-order' && $scheduledDate) ? $scheduledDate : $today;
    
    $queueNumber = generateQueueNumber($db, $queueDateForNumber);
    
    // Generate unique reference number in QMAK format
    $referenceNumber = 'QMAK-' . strtoupper(substr(md5(uniqid() . time()), 0, 6));
    
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
            item_name,
            item_ordered,
            quantity,
            notes,
            order_status,
            order_type,
            scheduled_date,
            ordered_outside_hours,
            estimated_wait_time,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $status = ($orderType === 'pre-order') ? 'pending' : 'pending';
    $quantity = substr_count(strtolower($items), ',') + 1; // Count commas + 1 for number of items
    $estimatedWaitTime = $quantity * 5; // 5 minutes per item
    
    $stmt->execute([
        $referenceNumber,
        $studentId,
        $queueNumber,
        $queueDateForNumber,
        $items,  // item_name (same as item_ordered for compatibility)
        $items,  // item_ordered
        $quantity,
        $notes,
        $status,
        $orderType,
        $scheduledDate,
        $orderedOutsideHours,
        $estimatedWaitTime
    ]);
    
    $orderId = $db->lastInsertId();
    
    // Get student email and name for confirmation
    $studentStmt = $db->prepare("SELECT email, first_name, last_name FROM students WHERE student_id = ?");
    $studentStmt->execute([$studentId]);
    $studentInfo = $studentStmt->fetch(PDO::FETCH_ASSOC);
    
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
    
    // Send order confirmation email with QR code
    if ($studentInfo && !empty($studentInfo['email'])) {
        try {
            $orderData = [
                'order_id' => $orderId,
                'queue_number' => $queueNumber,
                'reference_number' => $referenceNumber,
                'items' => $items,
                'estimated_wait_time' => $estimatedWaitTime,
                'order_type' => $orderType,
                'scheduled_date' => $scheduledDate
            ];
            
            $studentName = $studentInfo['first_name'] . ' ' . $studentInfo['last_name'];
            
            $emailResult = EmailSender::sendOrderConfirmation(
                $studentInfo['email'],
                $orderData,
                $studentName
            );
            
            if ($emailResult['success']) {
                error_log("✓ Order confirmation email sent to {$studentInfo['email']}");
            } else {
                error_log("✗ Failed to send order confirmation email: " . ($emailResult['error'] ?? 'Unknown error'));
            }
        } catch (Exception $emailError) {
            error_log("✗ Exception sending order confirmation: " . $emailError->getMessage());
            // Don't fail the order if email fails
        }
    }
    
    // Clear any buffered output and send only JSON
    ob_clean();
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
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create order',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Create Order Error: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
