<?php
/**
 * OTP System Diagnostic Tool
 * Tests all aspects of the OTP functionality
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP System Diagnostics - Q-Mak</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold text-blue-900 mb-6">🔍 OTP System Diagnostics</h1>
        
        <?php
        $results = [];
        $allPassed = true;
        
        // Test 1: Database Connection
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">1. Database Connection</h2>';
        
        try {
            require_once __DIR__ . '/../php/config/database.php';
            $db = getDB();
            echo '<p class="text-green-600 font-semibold">✅ Database connection successful</p>';
            echo '<p class="text-sm text-gray-600 mt-2">Host: ' . DB_HOST . '</p>';
            echo '<p class="text-sm text-gray-600">Database: ' . DB_NAME . '</p>';
            $results['db_connection'] = true;
        } catch (Exception $e) {
            echo '<p class="text-red-600 font-semibold">❌ Database connection failed</p>';
            echo '<p class="text-sm text-red-500 mt-2">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
            $results['db_connection'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 2: Check otp_verifications table
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">2. OTP Table Structure</h2>';
        
        try {
            $stmt = $db->query("DESCRIBE otp_verifications");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo '<p class="text-green-600 font-semibold">✅ otp_verifications table exists</p>';
            echo '<div class="mt-4 overflow-x-auto">';
            echo '<table class="min-w-full border text-sm">';
            echo '<thead class="bg-gray-100"><tr><th class="border px-4 py-2">Field</th><th class="border px-4 py-2">Type</th><th class="border px-4 py-2">Null</th><th class="border px-4 py-2">Default</th></tr></thead>';
            echo '<tbody>';
            foreach ($columns as $col) {
                echo '<tr>';
                echo '<td class="border px-4 py-2 font-mono">' . htmlspecialchars($col['Field']) . '</td>';
                echo '<td class="border px-4 py-2 font-mono">' . htmlspecialchars($col['Type']) . '</td>';
                echo '<td class="border px-4 py-2">' . htmlspecialchars($col['Null']) . '</td>';
                echo '<td class="border px-4 py-2 font-mono">' . htmlspecialchars($col['Default'] ?? 'NULL') . '</td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
            echo '</div>';
            
            // Check required columns
            $requiredColumns = ['otp_id', 'email', 'otp_code', 'otp_type', 'attempts', 'max_attempts', 'is_verified', 'expires_at', 'created_at'];
            $existingColumns = array_column($columns, 'Field');
            $missingColumns = array_diff($requiredColumns, $existingColumns);
            
            if (empty($missingColumns)) {
                echo '<p class="text-green-600 mt-4">✅ All required columns present</p>';
                $results['table_structure'] = true;
            } else {
                echo '<p class="text-red-600 mt-4">❌ Missing columns: ' . implode(', ', $missingColumns) . '</p>';
                $results['table_structure'] = false;
                $allPassed = false;
            }
        } catch (Exception $e) {
            echo '<p class="text-red-600 font-semibold">❌ Table check failed</p>';
            echo '<p class="text-sm text-red-500 mt-2">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
            $results['table_structure'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 3: Constants Check
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">3. Configuration Constants</h2>';
        
        $constants = [
            'OTP_EXPIRY_MINUTES' => defined('OTP_EXPIRY_MINUTES') ? OTP_EXPIRY_MINUTES : 'NOT DEFINED',
            'QR_EXPIRY_MINUTES' => defined('QR_EXPIRY_MINUTES') ? QR_EXPIRY_MINUTES : 'NOT DEFINED',
            'SMTP_HOST' => defined('SMTP_HOST') ? SMTP_HOST : 'NOT DEFINED',
            'SMTP_PORT' => defined('SMTP_PORT') ? SMTP_PORT : 'NOT DEFINED',
            'SMTP_USERNAME' => defined('SMTP_USERNAME') ? (SMTP_USERNAME ? '✓ Set' : '❌ Empty') : 'NOT DEFINED',
            'SMTP_PASSWORD' => defined('SMTP_PASSWORD') ? (SMTP_PASSWORD ? '✓ Set' : '❌ Empty') : 'NOT DEFINED',
        ];
        
        echo '<table class="w-full border text-sm">';
        foreach ($constants as $key => $value) {
            $isOk = !in_array($value, ['NOT DEFINED', '❌ Empty']);
            $rowClass = $isOk ? 'text-green-700' : 'text-red-700';
            echo "<tr class='$rowClass'>";
            echo '<td class="border px-4 py-2 font-mono font-bold">' . htmlspecialchars($key) . '</td>';
            echo '<td class="border px-4 py-2">' . htmlspecialchars($value) . '</td>';
            echo '</tr>';
        }
        echo '</table>';
        
        $constantsOk = !in_array('NOT DEFINED', $constants) && !in_array('❌ Empty', $constants);
        if ($constantsOk) {
            echo '<p class="text-green-600 mt-4 font-semibold">✅ All constants configured</p>';
            $results['constants'] = true;
        } else {
            echo '<p class="text-red-600 mt-4 font-semibold">❌ Some constants missing or empty</p>';
            $results['constants'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 4: Test OTP Insertion
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">4. OTP Insertion Test</h2>';
        
        try {
            $testEmail = 'test_' . time() . '@umak.edu.ph';
            $testOtp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Delete any old test OTPs
            $deleteStmt = $db->prepare("DELETE FROM otp_verifications WHERE email LIKE 'test_%@umak.edu.ph'");
            $deleteStmt->execute();
            
            // Insert test OTP
            $insertStmt = $db->prepare("
                INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
                VALUES (?, ?, 'order', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
            ");
            $insertStmt->execute([$testEmail, $testOtp]);
            
            $otpId = $db->lastInsertId();
            
            echo '<p class="text-green-600 font-semibold">✅ OTP insertion successful</p>';
            echo '<p class="text-sm text-gray-600 mt-2">Test Email: ' . htmlspecialchars($testEmail) . '</p>';
            echo '<p class="text-sm text-gray-600">Test OTP: ' . htmlspecialchars($testOtp) . '</p>';
            echo '<p class="text-sm text-gray-600">OTP ID: ' . htmlspecialchars($otpId) . '</p>';
            
            // Verify insertion
            $verifyStmt = $db->prepare("SELECT * FROM otp_verifications WHERE otp_id = ?");
            $verifyStmt->execute([$otpId]);
            $otpRecord = $verifyStmt->fetch();
            
            if ($otpRecord) {
                echo '<p class="text-green-600 mt-2">✅ OTP retrieval successful</p>';
                echo '<div class="mt-2 bg-gray-50 p-3 rounded text-xs">';
                echo '<pre>' . json_encode($otpRecord, JSON_PRETTY_PRINT) . '</pre>';
                echo '</div>';
                $results['otp_operations'] = true;
            } else {
                echo '<p class="text-red-600 mt-2">❌ Could not retrieve inserted OTP</p>';
                $results['otp_operations'] = false;
                $allPassed = false;
            }
            
            // Cleanup
            $deleteStmt = $db->prepare("DELETE FROM otp_verifications WHERE otp_id = ?");
            $deleteStmt->execute([$otpId]);
            
        } catch (Exception $e) {
            echo '<p class="text-red-600 font-semibold">❌ OTP operation failed</p>';
            echo '<p class="text-sm text-red-500 mt-2">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
            $results['otp_operations'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 5: Check existing OTP records
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">5. Existing OTP Records</h2>';
        
        try {
            $stmt = $db->query("
                SELECT otp_id, email, otp_code, otp_type, attempts, max_attempts, is_verified, 
                       expires_at, verified_at, created_at,
                       CASE WHEN expires_at > NOW() THEN 'Valid' ELSE 'Expired' END as status
                FROM otp_verifications 
                ORDER BY created_at DESC 
                LIMIT 10
            ");
            $otps = $stmt->fetchAll();
            
            if (count($otps) > 0) {
                echo '<p class="text-blue-600 mb-4">Found ' . count($otps) . ' recent OTP records</p>';
                echo '<div class="overflow-x-auto">';
                echo '<table class="min-w-full border text-xs">';
                echo '<thead class="bg-gray-100"><tr>';
                echo '<th class="border px-2 py-1">ID</th>';
                echo '<th class="border px-2 py-1">Email</th>';
                echo '<th class="border px-2 py-1">Code</th>';
                echo '<th class="border px-2 py-1">Type</th>';
                echo '<th class="border px-2 py-1">Attempts</th>';
                echo '<th class="border px-2 py-1">Verified</th>';
                echo '<th class="border px-2 py-1">Status</th>';
                echo '<th class="border px-2 py-1">Created</th>';
                echo '</tr></thead><tbody>';
                
                foreach ($otps as $otp) {
                    $statusColor = $otp['status'] === 'Valid' ? 'text-green-700' : 'text-red-700';
                    $verifiedColor = $otp['is_verified'] ? 'text-green-700' : 'text-gray-700';
                    echo '<tr>';
                    echo '<td class="border px-2 py-1">' . htmlspecialchars($otp['otp_id']) . '</td>';
                    echo '<td class="border px-2 py-1 font-mono text-xs">' . htmlspecialchars($otp['email']) . '</td>';
                    echo '<td class="border px-2 py-1 font-mono font-bold">' . htmlspecialchars($otp['otp_code']) . '</td>';
                    echo '<td class="border px-2 py-1">' . htmlspecialchars($otp['otp_type']) . '</td>';
                    echo '<td class="border px-2 py-1 text-center">' . htmlspecialchars($otp['attempts']) . '/' . htmlspecialchars($otp['max_attempts']) . '</td>';
                    echo '<td class="border px-2 py-1 text-center ' . $verifiedColor . '">' . ($otp['is_verified'] ? '✓' : '✗') . '</td>';
                    echo '<td class="border px-2 py-1 ' . $statusColor . '">' . htmlspecialchars($otp['status']) . '</td>';
                    echo '<td class="border px-2 py-1">' . htmlspecialchars($otp['created_at']) . '</td>';
                    echo '</tr>';
                }
                echo '</tbody></table>';
                echo '</div>';
            } else {
                echo '<p class="text-yellow-600">⚠️ No OTP records found (this is normal if no OTPs have been generated yet)</p>';
            }
            $results['existing_otps'] = true;
        } catch (Exception $e) {
            echo '<p class="text-red-600 font-semibold">❌ Could not retrieve OTP records</p>';
            echo '<p class="text-sm text-red-500 mt-2">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
            $results['existing_otps'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 6: Email Library Check
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">6. Email Library Check</h2>';
        
        $vendorPath = __DIR__ . '/../vendor/autoload.php';
        if (file_exists($vendorPath)) {
            require_once $vendorPath;
            echo '<p class="text-green-600 font-semibold">✅ Composer autoload found</p>';
            
            // Check PHPMailer
            if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                echo '<p class="text-green-600 mt-2">✅ PHPMailer available</p>';
                $results['phpmailer'] = true;
            } else {
                echo '<p class="text-red-600 mt-2">❌ PHPMailer not available</p>';
                echo '<p class="text-sm text-yellow-600 mt-1">Run: composer install</p>';
                $results['phpmailer'] = false;
                $allPassed = false;
            }
            
            // Check QR Code library
            if (class_exists('Endroid\\QrCode\\QrCode')) {
                echo '<p class="text-green-600 mt-2">✅ QR Code library available</p>';
            } else {
                echo '<p class="text-yellow-600 mt-2">⚠️ QR Code library not available (will use fallback)</p>';
            }
        } else {
            echo '<p class="text-red-600 font-semibold">❌ Composer dependencies not installed</p>';
            echo '<p class="text-sm text-yellow-600 mt-2">Run: composer install</p>';
            $results['phpmailer'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Test 7: API Endpoints Check
        echo '<div class="bg-white rounded-lg shadow p-6 mb-6">';
        echo '<h2 class="text-xl font-bold text-gray-800 mb-4">7. API Endpoints Check</h2>';
        
        $endpoints = [
            'student_register.php' => __DIR__ . '/../php/api/student/student_register.php',
            'create_order.php' => __DIR__ . '/../php/api/student/create_order.php',
            'verify_otp.php' => __DIR__ . '/../php/api/student/verify_otp.php',
            'resend_otp.php' => __DIR__ . '/../php/api/student/resend_otp.php',
        ];
        
        echo '<table class="w-full border text-sm">';
        echo '<thead class="bg-gray-100"><tr><th class="border px-4 py-2">Endpoint</th><th class="border px-4 py-2">Status</th></tr></thead>';
        echo '<tbody>';
        
        $allEndpointsExist = true;
        foreach ($endpoints as $name => $path) {
            $exists = file_exists($path);
            $statusClass = $exists ? 'text-green-700' : 'text-red-700';
            $statusText = $exists ? '✅ Exists' : '❌ Missing';
            
            echo "<tr class='$statusClass'>";
            echo '<td class="border px-4 py-2 font-mono">' . htmlspecialchars($name) . '</td>';
            echo '<td class="border px-4 py-2">' . $statusText . '</td>';
            echo '</tr>';
            
            if (!$exists) $allEndpointsExist = false;
        }
        echo '</tbody></table>';
        
        if ($allEndpointsExist) {
            echo '<p class="text-green-600 mt-4 font-semibold">✅ All API endpoints present</p>';
            $results['api_endpoints'] = true;
        } else {
            echo '<p class="text-red-600 mt-4 font-semibold">❌ Some API endpoints missing</p>';
            $results['api_endpoints'] = false;
            $allPassed = false;
        }
        echo '</div>';
        
        // Summary
        echo '<div class="bg-white rounded-lg shadow p-6 border-4 ' . ($allPassed ? 'border-green-500' : 'border-red-500') . '">';
        echo '<h2 class="text-2xl font-bold text-gray-800 mb-4">📊 Diagnostic Summary</h2>';
        
        if ($allPassed) {
            echo '<p class="text-green-700 text-xl font-bold mb-4">✅ All Tests Passed!</p>';
            echo '<p class="text-gray-700">Your OTP system should be working correctly. If you\'re still experiencing issues, try the test page at:</p>';
            echo '<p class="mt-2 font-mono bg-blue-50 p-2 rounded">http://localhost/Q-Mak/tests/test_otp_complete.php</p>';
        } else {
            echo '<p class="text-red-700 text-xl font-bold mb-4">❌ Issues Detected</p>';
            echo '<p class="text-gray-700 mb-4">Please fix the following issues:</p>';
            echo '<ul class="list-disc list-inside space-y-2">';
            
            foreach ($results as $test => $passed) {
                if (!$passed) {
                    $testName = str_replace('_', ' ', ucwords($test));
                    echo '<li class="text-red-600">❌ ' . htmlspecialchars($testName) . '</li>';
                }
            }
            echo '</ul>';
            
            echo '<div class="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">';
            echo '<p class="font-bold text-yellow-800">Common Fixes:</p>';
            echo '<ul class="list-disc list-inside mt-2 text-sm text-yellow-800 space-y-1">';
            echo '<li>Run <code class="bg-yellow-100 px-2 py-1 rounded">composer install</code> in project root</li>';
            echo '<li>Ensure MySQL/MariaDB is running in XAMPP</li>';
            echo '<li>Import database schema: <code class="bg-yellow-100 px-2 py-1 rounded">database/qmak_schema.sql</code></li>';
            echo '<li>Check database credentials in <code class="bg-yellow-100 px-2 py-1 rounded">php/config/database.php</code></li>';
            echo '<li>Configure SMTP settings for email sending</li>';
            echo '</ul>';
            echo '</div>';
        }
        echo '</div>';
        ?>
        
        <div class="mt-6 text-center">
            <a href="test_otp_complete.php" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                Go to OTP Test Page →
            </a>
        </div>
    </div>
</body>
</html>
