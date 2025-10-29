<?php
/**
 * Direct OTP Test - Bypasses frontend JavaScript
 * Tests the backend OTP flow directly
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../php/config/database.php';
require_once __DIR__ . '/../php/config/constants.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Direct OTP Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold text-blue-900 mb-6">Direct OTP Backend Test</h1>
        
        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $action = $_POST['action'] ?? '';
            
            // TEST 1: Generate OTP for Order
            if ($action === 'generate_order_otp') {
                echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
                echo '<h2 class="text-xl font-bold mb-4">Generating Order OTP...</h2>';
                
                try {
                    $email = $_POST['email'];
                    $studentId = $_POST['student_id'];
                    $fname = $_POST['fname'];
                    $lname = $_POST['lname'];
                    
                    // Validate
                    if (empty($email) || empty($studentId) || empty($fname) || empty($lname)) {
                        throw new Exception("All fields required");
                    }
                    
                    $db = getDB();
                    $db->beginTransaction();
                    
                    // Upsert student
                    $upsert = $db->prepare("
                        INSERT INTO students (student_id, first_name, last_name, email, college, program, year_level)
                        VALUES (?, ?, ?, ?, 'Test College', 'Test Program', 1)
                        ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name)
                    ");
                    $upsert->execute([$studentId, $fname, $lname, $email]);
                    
                    // Generate OTP
                    $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
                    
                    // Delete old OTPs
                    $delete = $db->prepare("DELETE FROM otp_verifications WHERE email = ? AND otp_type = 'order'");
                    $delete->execute([$email]);
                    
                    // Insert new OTP
                    $insert = $db->prepare("
                        INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
                        VALUES (?, ?, 'order', DATE_ADD(NOW(), INTERVAL ? MINUTE))
                    ");
                    $insert->execute([$email, $otp, OTP_EXPIRY_MINUTES]);
                    
                    $otpId = $db->lastInsertId();
                    $db->commit();
                    
                    echo '<div class="bg-green-100 border border-green-400 text-green-800 p-4 rounded">';
                    echo '<p class="font-bold text-lg">✅ SUCCESS!</p>';
                    echo '<p class="mt-2">OTP Generated: <span class="text-2xl font-mono font-bold">' . $otp . '</span></p>';
                    echo '<p class="text-sm mt-2">OTP ID: ' . $otpId . '</p>';
                    echo '<p class="text-sm">Email: ' . htmlspecialchars($email) . '</p>';
                    echo '<p class="text-sm">Expires in: ' . OTP_EXPIRY_MINUTES . ' minutes</p>';
                    echo '</div>';
                    
                    // Verify it was stored
                    $check = $db->prepare("SELECT * FROM otp_verifications WHERE otp_id = ?");
                    $check->execute([$otpId]);
                    $record = $check->fetch();
                    
                    if ($record) {
                        echo '<div class="mt-4 bg-blue-50 p-4 rounded">';
                        echo '<p class="font-bold">Database Record:</p>';
                        echo '<pre class="text-xs mt-2 overflow-x-auto">' . json_encode($record, JSON_PRETTY_PRINT) . '</pre>';
                        echo '</div>';
                        
                        // Create verification form
                        echo '<form method="POST" class="mt-6 bg-yellow-50 p-4 rounded border-2 border-yellow-400">';
                        echo '<h3 class="font-bold text-yellow-800 mb-3">Now Verify This OTP:</h3>';
                        echo '<input type="hidden" name="action" value="verify_order_otp">';
                        echo '<input type="hidden" name="email" value="' . htmlspecialchars($email) . '">';
                        echo '<input type="hidden" name="otp_id" value="' . $otpId . '">';
                        echo '<div class="flex gap-2">';
                        echo '<input type="text" name="otp_code" placeholder="Enter OTP" class="border-2 border-yellow-500 rounded px-4 py-2 flex-1" value="' . $otp . '" required>';
                        echo '<button type="submit" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">Verify OTP</button>';
                        echo '</div>';
                        echo '</form>';
                    }
                    
                } catch (Exception $e) {
                    if (isset($db) && $db->inTransaction()) {
                        $db->rollBack();
                    }
                    echo '<div class="bg-red-100 border border-red-400 text-red-800 p-4 rounded">';
                    echo '<p class="font-bold">❌ ERROR</p>';
                    echo '<p class="mt-2">' . htmlspecialchars($e->getMessage()) . '</p>';
                    echo '<p class="text-xs mt-2">' . htmlspecialchars($e->getFile()) . ':' . $e->getLine() . '</p>';
                    echo '</div>';
                }
                
                echo '</div>';
            }
            
            // TEST 2: Verify OTP
            elseif ($action === 'verify_order_otp') {
                echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
                echo '<h2 class="text-xl font-bold mb-4">Verifying OTP...</h2>';
                
                try {
                    $email = $_POST['email'];
                    $otpCode = $_POST['otp_code'];
                    
                    $db = getDB();
                    
                    // Get OTP record
                    $stmt = $db->prepare("
                        SELECT otp_id, otp_code, attempts, max_attempts, is_verified, expires_at,
                               CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END as is_valid
                        FROM otp_verifications
                        WHERE email = ? AND otp_type = 'order' AND is_verified = 0
                        ORDER BY created_at DESC
                        LIMIT 1
                    ");
                    $stmt->execute([$email]);
                    $otp = $stmt->fetch();
                    
                    if (!$otp) {
                        throw new Exception("No valid OTP found for this email");
                    }
                    
                    echo '<div class="bg-blue-50 p-4 rounded mb-4">';
                    echo '<p class="font-bold">OTP Record Found:</p>';
                    echo '<pre class="text-xs mt-2">' . json_encode($otp, JSON_PRETTY_PRINT) . '</pre>';
                    echo '</div>';
                    
                    // Check if expired
                    if ($otp['is_valid'] == 0) {
                        throw new Exception("OTP has expired");
                    }
                    
                    // Check attempts
                    if ($otp['attempts'] >= $otp['max_attempts']) {
                        throw new Exception("Maximum attempts exceeded");
                    }
                    
                    // Verify code
                    if ($otp['otp_code'] !== $otpCode) {
                        // Increment attempts
                        $update = $db->prepare("UPDATE otp_verifications SET attempts = attempts + 1 WHERE otp_id = ?");
                        $update->execute([$otp['otp_id']]);
                        
                        $remaining = $otp['max_attempts'] - $otp['attempts'] - 1;
                        throw new Exception("Invalid OTP code. $remaining attempts remaining.");
                    }
                    
                    // Mark as verified
                    $verify = $db->prepare("UPDATE otp_verifications SET is_verified = 1, verified_at = NOW() WHERE otp_id = ?");
                    $verify->execute([$otp['otp_id']]);
                    
                    echo '<div class="bg-green-100 border border-green-400 text-green-800 p-4 rounded">';
                    echo '<p class="font-bold text-lg">✅ OTP VERIFIED SUCCESSFULLY!</p>';
                    echo '<p class="mt-2">The OTP system is working correctly.</p>';
                    echo '<p class="text-sm mt-2">OTP ID: ' . $otp['otp_id'] . '</p>';
                    echo '<p class="text-sm">Code: ' . htmlspecialchars($otpCode) . '</p>';
                    echo '</div>';
                    
                    // Check updated record
                    $check = $db->prepare("SELECT * FROM otp_verifications WHERE otp_id = ?");
                    $check->execute([$otp['otp_id']]);
                    $updated = $check->fetch();
                    
                    echo '<div class="mt-4 bg-blue-50 p-4 rounded">';
                    echo '<p class="font-bold">Updated Record:</p>';
                    echo '<pre class="text-xs mt-2">' . json_encode($updated, JSON_PRETTY_PRINT) . '</pre>';
                    echo '</div>';
                    
                } catch (Exception $e) {
                    echo '<div class="bg-red-100 border border-red-400 text-red-800 p-4 rounded">';
                    echo '<p class="font-bold">❌ VERIFICATION FAILED</p>';
                    echo '<p class="mt-2">' . htmlspecialchars($e->getMessage()) . '</p>';
                    echo '</div>';
                }
                
                echo '</div>';
            }
        }
        ?>
        
        <!-- Generate OTP Form -->
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Step 1: Generate OTP</h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="generate_order_otp">
                <div>
                    <label class="block text-sm font-semibold mb-2">Student ID</label>
                    <input type="text" name="student_id" value="2024-<?php echo rand(1000, 9999); ?>" class="w-full border-2 border-gray-300 rounded px-4 py-2" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">First Name</label>
                        <input type="text" name="fname" value="Juan" class="w-full border-2 border-gray-300 rounded px-4 py-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Last Name</label>
                        <input type="text" name="lname" value="DelaCruz" class="w-full border-2 border-gray-300 rounded px-4 py-2" required>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Email (@umak.edu.ph)</label>
                    <input type="email" name="email" value="test<?php echo rand(100, 999); ?>@umak.edu.ph" class="w-full border-2 border-gray-300 rounded px-4 py-2" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
                    Generate OTP
                </button>
            </form>
        </div>
        
        <div class="mt-6 text-center">
            <a href="diagnose_otp_system.php" class="text-blue-600 hover:underline">← Back to Diagnostics</a>
        </div>
    </div>
</body>
</html>
