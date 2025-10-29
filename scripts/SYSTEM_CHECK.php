<?php
/**
 * Q-Mak System Verification Script
 * Run this to check if all components are properly configured
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Styling for output
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Q-Mak System Check</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .check-section { margin-bottom: 30px; border-left: 4px solid #e0e0e0; padding-left: 20px; }
        .check-section h2 { font-size: 20px; color: #333; margin-bottom: 15px; display: flex; align-items: center; }
        .check-section h2 .icon { margin-right: 10px; font-size: 24px; }
        .check-item { padding: 12px; margin-bottom: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; }
        .check-item.success { background: #e8f5e9; border-left: 4px solid #4caf50; }
        .check-item.warning { background: #fff3e0; border-left: 4px solid #ff9800; }
        .check-item.error { background: #ffebee; border-left: 4px solid #f44336; }
        .check-item.info { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .check-label { flex: 1; font-weight: 500; color: #333; }
        .check-status { font-weight: bold; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
        .status-pass { background: #4caf50; color: white; }
        .status-fail { background: #f44336; color: white; }
        .status-warn { background: #ff9800; color: white; }
        .status-info { background: #2196f3; color: white; }
        .check-details { font-size: 13px; color: #666; margin-top: 5px; padding-left: 10px; }
        .summary { background: #f9f9f9; padding: 20px; border-radius: 6px; margin-top: 30px; }
        .summary h3 { margin-bottom: 15px; color: #333; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { padding: 15px; border-radius: 6px; text-align: center; }
        .summary-item.success { background: #e8f5e9; }
        .summary-item.error { background: #ffebee; }
        .summary-item.warning { background: #fff3e0; }
        .summary-item .number { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
        .summary-item .label { font-size: 13px; color: #666; text-transform: uppercase; }
        .action-buttons { margin-top: 20px; display: flex; gap: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .code-block { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Q-Mak System Verification</h1>
            <p>Checking all system components and configurations...</p>
        </div>
        <div class="content">
<?php

$checks = [
    'passed' => 0,
    'failed' => 0,
    'warnings' => 0
];

// ========================================
// 1. PHP ENVIRONMENT CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">🐘</span>PHP Environment</h2>';

// PHP Version
$phpVersion = phpversion();
if (version_compare($phpVersion, '7.4.0', '>=')) {
    echo '<div class="check-item success"><span class="check-label">PHP Version: ' . $phpVersion . '</span><span class="check-status status-pass">PASS</span></div>';
    $checks['passed']++;
} else {
    echo '<div class="check-item error"><span class="check-label">PHP Version: ' . $phpVersion . ' (Required: 7.4+)</span><span class="check-status status-fail">FAIL</span></div>';
    $checks['failed']++;
}

// Required Extensions
$requiredExtensions = ['pdo', 'pdo_mysql', 'mysqli', 'curl', 'mbstring', 'openssl', 'json'];
foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        echo '<div class="check-item success"><span class="check-label">Extension: ' . $ext . '</span><span class="check-status status-pass">LOADED</span></div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item error"><span class="check-label">Extension: ' . $ext . '</span><span class="check-status status-fail">MISSING</span></div>';
        $checks['failed']++;
    }
}

echo '</div>';

// ========================================
// 2. FILE STRUCTURE CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">📁</span>File Structure</h2>';

$criticalFiles = [
    '../php/config/database.php' => 'Database Configuration',
    '../php/config/constants.php' => 'Constants Configuration',
    '../php/utils/email.php' => 'Email Utility',
    '../vendor/autoload.php' => 'Composer Autoloader',
    '../database/qmak_schema.sql' => 'Database Schema',
];

foreach ($criticalFiles as $file => $description) {
    $fullPath = __DIR__ . '/' . $file;
    if (file_exists($fullPath)) {
        echo '<div class="check-item success"><span class="check-label">' . $description . '</span><span class="check-status status-pass">EXISTS</span></div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item error"><span class="check-label">' . $description . ' (' . $file . ')</span><span class="check-status status-fail">MISSING</span></div>';
        $checks['failed']++;
    }
}

echo '</div>';

// ========================================
// 3. COMPOSER DEPENDENCIES CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">📦</span>Composer Dependencies</h2>';

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
    
    // PHPMailer
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        echo '<div class="check-item success"><span class="check-label">PHPMailer</span><span class="check-status status-pass">INSTALLED</span></div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item error"><span class="check-label">PHPMailer (Required for OTP emails)</span><span class="check-status status-fail">MISSING</span></div>';
        echo '<div class="check-details">Run: <code>composer require phpmailer/phpmailer:^6.8</code></div>';
        $checks['failed']++;
    }
    
    // Endroid QR Code
    if (class_exists('Endroid\\QrCode\\QrCode')) {
        echo '<div class="check-item success"><span class="check-label">Endroid QR Code</span><span class="check-status status-pass">INSTALLED</span></div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item warning"><span class="check-label">Endroid QR Code (Optional - uses fallback)</span><span class="check-status status-warn">MISSING</span></div>';
        echo '<div class="check-details">Run: <code>composer require endroid/qr-code:^6.0</code></div>';
        $checks['warnings']++;
    }
} else {
    echo '<div class="check-item error"><span class="check-label">Composer Dependencies</span><span class="check-status status-fail">NOT INSTALLED</span></div>';
    echo '<div class="check-details">Run: <code>composer install</code> in the project root directory</div>';
    $checks['failed']++;
}

echo '</div>';

// ========================================
// 4. DATABASE CONNECTION CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">🗄️</span>Database Connection</h2>';

if (file_exists(__DIR__ . '/../php/config/database.php')) {
    require_once __DIR__ . '/../php/config/database.php';
    
    try {
        $db = getDB();
        echo '<div class="check-item success"><span class="check-label">Database Connection</span><span class="check-status status-pass">CONNECTED</span></div>';
        echo '<div class="check-details">Host: ' . DB_HOST . ' | Database: ' . DB_NAME . ' | User: ' . DB_USER . '</div>';
        $checks['passed']++;
        
        // Check database tables
        $requiredTables = [
            'admin_accounts',
            'students',
            'orders',
            'otp_verifications',
            'email_logs',
            'services',
            'settings',
            'inventory_items'
        ];
        
        $stmt = $db->query("SHOW TABLES");
        $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($requiredTables as $table) {
            if (in_array($table, $existingTables)) {
                // Count rows
                $countStmt = $db->query("SELECT COUNT(*) FROM `$table`");
                $count = $countStmt->fetchColumn();
                echo '<div class="check-item success"><span class="check-label">Table: ' . $table . ' (' . $count . ' records)</span><span class="check-status status-pass">EXISTS</span></div>';
                $checks['passed']++;
            } else {
                echo '<div class="check-item error"><span class="check-label">Table: ' . $table . '</span><span class="check-status status-fail">MISSING</span></div>';
                $checks['failed']++;
            }
        }
        
        // Check default admin accounts
        $adminStmt = $db->query("SELECT COUNT(*) FROM admin_accounts");
        $adminCount = $adminStmt->fetchColumn();
        if ($adminCount > 0) {
            echo '<div class="check-item success"><span class="check-label">Admin Accounts (' . $adminCount . ' accounts)</span><span class="check-status status-pass">EXISTS</span></div>';
            $checks['passed']++;
        } else {
            echo '<div class="check-item warning"><span class="check-label">Admin Accounts</span><span class="check-status status-warn">EMPTY</span></div>';
            echo '<div class="check-details">No admin accounts found. Import sample data or create manually.</div>';
            $checks['warnings']++;
        }
        
    } catch (Exception $e) {
        echo '<div class="check-item error"><span class="check-label">Database Connection</span><span class="check-status status-fail">FAILED</span></div>';
        echo '<div class="check-details">Error: ' . htmlspecialchars($e->getMessage()) . '</div>';
        echo '<div class="check-details">
            <strong>Possible fixes:</strong><br>
            1. Ensure MySQL/MariaDB is running in XAMPP<br>
            2. Check credentials in php/config/database.php<br>
            3. Import database: mysql -u root -p &lt; database/qmak_schema.sql
        </div>';
        $checks['failed']++;
    }
}

echo '</div>';

// ========================================
// 5. EMAIL/OTP CONFIGURATION CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">📧</span>Email & OTP Configuration</h2>';

// SMTP Settings
if (defined('SMTP_USERNAME') && defined('SMTP_PASSWORD')) {
    $smtpConfigured = (SMTP_USERNAME !== 'your-email@gmail.com' && SMTP_PASSWORD !== 'your-app-password');
    
    if ($smtpConfigured) {
        echo '<div class="check-item success"><span class="check-label">SMTP Configuration</span><span class="check-status status-pass">CONFIGURED</span></div>';
        echo '<div class="check-details">Host: ' . SMTP_HOST . ':' . SMTP_PORT . ' | From: ' . SMTP_FROM_EMAIL . '</div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item warning"><span class="check-label">SMTP Configuration</span><span class="check-status status-warn">NOT CONFIGURED</span></div>';
        echo '<div class="check-details">Update SMTP credentials in php/config/database.php for OTP emails to work</div>';
        $checks['warnings']++;
    }
} else {
    echo '<div class="check-item error"><span class="check-label">SMTP Constants</span><span class="check-status status-fail">MISSING</span></div>';
    $checks['failed']++;
}

// OTP Settings
if (defined('OTP_EXPIRY_MINUTES') && defined('QR_EXPIRY_MINUTES')) {
    echo '<div class="check-item success"><span class="check-label">OTP Settings</span><span class="check-status status-pass">CONFIGURED</span></div>';
    echo '<div class="check-details">OTP Expiry: ' . OTP_EXPIRY_MINUTES . ' min | QR Expiry: ' . QR_EXPIRY_MINUTES . ' min</div>';
    $checks['passed']++;
} else {
    echo '<div class="check-item warning"><span class="check-label">OTP Settings</span><span class="check-status status-warn">USING DEFAULTS</span></div>';
    $checks['warnings']++;
}

echo '</div>';

// ========================================
// 6. API ENDPOINTS CHECK
// ========================================
echo '<div class="check-section">';
echo '<h2><span class="icon">🔌</span>API Endpoints</h2>';

$apiEndpoints = [
    'Student Registration' => '../php/api/student/student_register.php',
    'Student Login' => '../php/api/student/student_login.php',
    'Create Order' => '../php/api/student/create_order.php',
    'Verify OTP' => '../php/api/student/verify_otp.php',
    'Resend OTP' => '../php/api/student/resend_otp.php',
    'Admin Login' => '../php/api/admin/admin_login.php',
    'Admin Orders' => '../php/api/admin/admin_orders.php',
];

foreach ($apiEndpoints as $name => $path) {
    $fullPath = __DIR__ . '/' . $path;
    if (file_exists($fullPath)) {
        echo '<div class="check-item success"><span class="check-label">' . $name . '</span><span class="check-status status-pass">EXISTS</span></div>';
        $checks['passed']++;
    } else {
        echo '<div class="check-item error"><span class="check-label">' . $name . ' (' . $path . ')</span><span class="check-status status-fail">MISSING</span></div>';
        $checks['failed']++;
    }
}

echo '</div>';

// ========================================
// 7. SUMMARY
// ========================================
$total = $checks['passed'] + $checks['failed'] + $checks['warnings'];
$successRate = $total > 0 ? round(($checks['passed'] / $total) * 100) : 0;

echo '<div class="summary">';
echo '<h3>📊 Summary</h3>';
echo '<div class="summary-grid">';
echo '<div class="summary-item success"><div class="number">' . $checks['passed'] . '</div><div class="label">Passed</div></div>';
echo '<div class="summary-item error"><div class="number">' . $checks['failed'] . '</div><div class="label">Failed</div></div>';
echo '<div class="summary-item warning"><div class="number">' . $checks['warnings'] . '</div><div class="label">Warnings</div></div>';
echo '<div class="summary-item ' . ($successRate >= 80 ? 'success' : ($successRate >= 50 ? 'warning' : 'error')) . '"><div class="number">' . $successRate . '%</div><div class="label">Success Rate</div></div>';
echo '</div>';

// Overall Status
echo '<div style="margin-top: 20px; padding: 15px; border-radius: 6px; text-align: center; font-weight: bold; font-size: 16px; ';
if ($checks['failed'] === 0 && $checks['warnings'] === 0) {
    echo 'background: #e8f5e9; color: #2e7d32;">✅ All systems operational! Your Q-Mak system is ready to use.';
} elseif ($checks['failed'] === 0) {
    echo 'background: #fff3e0; color: #e65100;">⚠️ System functional with warnings. Review warnings above for optimal performance.';
} else {
    echo 'background: #ffebee; color: #c62828;">❌ System has critical issues. Please fix failed checks before proceeding.';
}
echo '</div>';

echo '<div class="action-buttons">';
echo '<a href="../pages/index.html" class="btn btn-primary">Go to Homepage</a>';
echo '<a href="../pages/admin/admin_login.html" class="btn btn-secondary">Admin Login</a>';
echo '<a href="?refresh=1" class="btn btn-secondary">Refresh Check</a>';
echo '</div>';

echo '</div>'; // summary

// Quick Fix Guide
if ($checks['failed'] > 0 || $checks['warnings'] > 0) {
    echo '<div class="check-section">';
    echo '<h2><span class="icon">🛠️</span>Quick Fix Guide</h2>';
    
    if ($checks['failed'] > 0) {
        echo '<div class="check-item info">';
        echo '<div style="width: 100%;">';
        echo '<div class="check-label">Common Fixes</div>';
        echo '<div class="code-block">';
        echo '# 1. Install Composer dependencies:<br>';
        echo 'cd C:\\xampp\\htdocs\\Q-Mak<br>';
        echo 'composer install<br><br>';
        
        echo '# 2. Import database schema:<br>';
        echo 'mysql -u root -p < database/qmak_schema.sql<br><br>';
        
        echo '# 3. Configure email (edit php/config/database.php):<br>';
        echo 'define(\'SMTP_USERNAME\', \'your-email@gmail.com\');<br>';
        echo 'define(\'SMTP_PASSWORD\', \'your-app-password\');<br><br>';
        
        echo '# 4. Ensure XAMPP Apache and MySQL are running';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    echo '</div>';
}

?>
        </div>
    </div>
</body>
</html>
