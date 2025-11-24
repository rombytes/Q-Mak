<?php
/**
 * Printing Service API
 * Handles printing order creation, file uploads, and price calculation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../utils/queue_functions.php';
require_once '../../utils/email_sender.php';

// Student ID will be set only for authenticated requests
$studentId = $_SESSION['student_id'] ?? null;

function getDB() {
    try {
        $db = new PDO('mysql:host=localhost;dbname=qmak_db', 'root', '');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $db;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        throw new Exception("Database connection failed");
    }
}

// GET: Calculate price estimate
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'calculate_price') {
    try {
        // Allow price calculation without authentication for preview
        $db = getDB();
        
        $colorMode = $_GET['color_mode'] ?? 'B&W';
        $paperSize = $_GET['paper_size'] ?? 'A4';
        $pageCount = intval($_GET['page_count'] ?? 1);
        $copies = intval($_GET['copies'] ?? 1);
        
        // Get price from settings
        $priceKey = 'printing_price_' . ($colorMode === 'Colored' ? 'colored' : 'bw') . '_' . strtolower($paperSize);
        
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $stmt->execute([$priceKey]);
        $pricePerPage = floatval($stmt->fetchColumn() ?? 1.00);
        
        $totalPrice = $pricePerPage * $pageCount * $copies;
        
        echo json_encode([
            'success' => true,
            'data' => [
                'price_per_page' => $pricePerPage,
                'page_count' => $pageCount,
                'copies' => $copies,
                'total_price' => number_format($totalPrice, 2),
                'breakdown' => [
                    'base' => number_format($pricePerPage * $pageCount, 2),
                    'copies_multiplier' => $copies
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Price calculation error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error calculating price']);
    }
    exit;
}

// POST: Create printing order
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ensure user is logged in for order creation
    if (!$studentId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit;
    }
    
    try {
        $db = getDB();
        $db->beginTransaction();
        
        // Validate file upload
        if (!isset($_FILES['print_file']) || $_FILES['print_file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload failed');
        }
        
        $file = $_FILES['print_file'];
        
        // Get allowed extensions from settings
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'printing_allowed_extensions'");
        $stmt->execute();
        $allowedExtensions = explode(',', $stmt->fetchColumn() ?? 'pdf,doc,docx');
        
        // Get max file size from settings
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'printing_max_file_size'");
        $stmt->execute();
        $maxFileSize = intval($stmt->fetchColumn() ?? 10485760); // 10MB default
        
        // Validate file extension
        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($fileExtension, $allowedExtensions)) {
            throw new Exception('Invalid file type. Allowed: ' . implode(', ', $allowedExtensions));
        }
        
        // Validate file size
        if ($file['size'] > $maxFileSize) {
            throw new Exception('File too large. Maximum size: ' . ($maxFileSize / 1048576) . 'MB');
        }
        
        // Get form data
        $colorMode = $_POST['color_mode'] ?? 'B&W';
        $paperSize = $_POST['paper_size'] ?? 'A4';
        $copies = intval($_POST['copies'] ?? 1);
        $pageCount = intval($_POST['page_count'] ?? 1);
        $doubleSided = isset($_POST['double_sided']) ? 1 : 0;
        $collate = isset($_POST['collate']) ? 1 : 0;
        $instructions = $_POST['instructions'] ?? '';
        
        // Calculate price
        $priceKey = 'printing_price_' . ($colorMode === 'Colored' ? 'colored' : 'bw') . '_' . strtolower($paperSize);
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $stmt->execute([$priceKey]);
        $pricePerPage = floatval($stmt->fetchColumn() ?? 1.00);
        $estimatedPrice = $pricePerPage * $pageCount * $copies;
        
        // Generate unique filename
        $uploadDir = '../../uploads/printing/';
        $uniqueFilename = date('Ymd_His') . '_' . $studentId . '_' . uniqid() . '.' . $fileExtension;
        $filePath = $uploadDir . $uniqueFilename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception('Failed to save file');
        }
        
        // Get queue information
        $queueDateForNumber = date('Y-m-d');
        $queueNumber = generateQueueNumber($db, $queueDateForNumber);
        $referenceNumber = generateReferenceNumber($db);
        
        // Create order
        $itemDescription = "Printing Service: {$pageCount} pages, {$colorMode}, {$paperSize} paper";
        if ($copies > 1) {
            $itemDescription .= ", {$copies} copies";
        }
        
        $stmt = $db->prepare("
            INSERT INTO orders (
                student_id, queue_number, queue_date, reference_number,
                item_ordered, item_name, quantity, status,
                order_type, estimated_wait_time, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'online', 15, NOW())
        ");
        
        $stmt->execute([
            $studentId,
            $queueNumber,
            $queueDateForNumber,
            $referenceNumber,
            $itemDescription,
            'Printing Service',
            1
        ]);
        
        $orderId = $db->lastInsertId();
        
        // Create printing job record
        $stmt = $db->prepare("
            INSERT INTO printing_jobs (
                order_id, file_path, file_name, file_size, page_count,
                color_mode, paper_size, copies, collate, double_sided,
                instructions, estimated_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $orderId,
            'uploads/printing/' . $uniqueFilename, // Relative path for access
            $file['name'],
            $file['size'],
            $pageCount,
            $colorMode,
            $paperSize,
            $copies,
            $collate,
            $doubleSided,
            $instructions,
            $estimatedPrice
        ]);
        
        $db->commit();
        
        // Get student info for email
        $stmt = $db->prepare("SELECT first_name, last_name, email FROM students WHERE student_id = ?");
        $stmt->execute([$studentId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Send confirmation email
        try {
            $orderData = [
                'order_id' => $orderId,
                'queue_number' => $queueNumber,
                'reference_number' => $referenceNumber,
                'item_ordered' => $itemDescription,
                'estimated_price' => $estimatedPrice,
                'student_name' => $student['first_name'] . ' ' . $student['last_name']
            ];
            
            sendOrderConfirmation($student['email'], $orderData, $student['first_name']);
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Printing order created successfully',
            'data' => [
                'order_id' => $orderId,
                'queue_number' => $queueNumber,
                'reference_number' => $referenceNumber,
                'estimated_price' => number_format($estimatedPrice, 2)
            ]
        ]);
        
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        
        // Clean up uploaded file if exists
        if (isset($filePath) && file_exists($filePath)) {
            unlink($filePath);
        }
        
        error_log("Printing order creation error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
