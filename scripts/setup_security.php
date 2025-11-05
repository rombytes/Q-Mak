<?php
/**
 * Quick Setup Script for Brute Force Protection
 * Run this once to set up the security system
 * 
 * Usage: Navigate to http://localhost/Q-Mak/scripts/setup_security.php
 */

// Prevent direct access from non-localhost
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    die('Access denied. Run this script from localhost only.');
}

require_once __DIR__ . '/../php/config/database.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security System Setup - Q-Mak</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-6">
                🔒 Brute Force Protection Setup
            </h1>
            
            <?php
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['setup'])) {
                setupSecuritySystem();
            } else {
                showSetupForm();
            }
            ?>
        </div>
    </div>
</body>
</html>

<?php

function showSetupForm() {
    ?>
    <div class="mb-6">
        <p class="text-gray-600 mb-4">
            This script will set up the brute force protection system for your Q-Mak application.
        </p>
        
        <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h3 class="font-bold text-blue-800 mb-2">What will be installed:</h3>
            <ul class="list-disc list-inside text-blue-700 space-y-1">
                <li>Security database tables (security_attempts, security_logs, ip_blacklist, captcha_challenges)</li>
                <li>Initial configuration verification</li>
                <li>Sample test data (optional)</li>
            </ul>
        </div>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <h3 class="font-bold text-yellow-800 mb-2">⚠️ Prerequisites:</h3>
            <ul class="list-disc list-inside text-yellow-700 space-y-1">
                <li>Database 'qmak_db' must exist</li>
                <li>Database credentials must be configured in php/config/database.php</li>
                <li>PHP version 7.4 or higher</li>
            </ul>
        </div>
    </div>
    
    <form method="POST" action="">
        <div class="mb-6">
            <label class="flex items-center">
                <input type="checkbox" name="include_test_data" value="1" class="mr-2">
                <span class="text-gray-700">Include test data (for development/testing)</span>
            </label>
        </div>
        
        <button type="submit" name="setup" value="1" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
            🚀 Install Security System
        </button>
    </form>
    <?php
}

function setupSecuritySystem() {
    echo '<div class="space-y-4">';
    
    try {
        $db = getDB();
        
        // Step 1: Check existing tables
        echo '<div class="bg-gray-50 rounded p-4">';
        echo '<h3 class="font-bold text-gray-800 mb-2">Step 1: Checking existing tables...</h3>';
        
        $tables = ['security_attempts', 'security_logs', 'ip_blacklist', 'captcha_challenges'];
        $existingTables = [];
        
        foreach ($tables as $table) {
            $stmt = $db->query("SHOW TABLES LIKE '{$table}'");
            if ($stmt->rowCount() > 0) {
                $existingTables[] = $table;
                echo '<p class="text-yellow-600">⚠️ Table `' . $table . '` already exists (will skip creation)</p>';
            }
        }
        echo '</div>';
        
        // Step 2: Create tables
        echo '<div class="bg-gray-50 rounded p-4">';
        echo '<h3 class="font-bold text-gray-800 mb-2">Step 2: Creating security tables...</h3>';
        
        // Create tables directly
        try {
            // Create security_attempts table
            $db->exec("
                CREATE TABLE IF NOT EXISTS `security_attempts` (
                  `attempt_id` INT(11) NOT NULL AUTO_INCREMENT,
                  `identifier` VARCHAR(255) NOT NULL COMMENT 'Email address or IP address',
                  `identifier_type` ENUM('email', 'ip', 'email_ip') NOT NULL DEFAULT 'email',
                  `attempt_type` ENUM('admin_login', 'student_login', 'otp_verify', 'password_reset') NOT NULL,
                  `failed_attempts` INT(11) NOT NULL DEFAULT 0,
                  `first_attempt_at` DATETIME NOT NULL,
                  `last_attempt_at` DATETIME NOT NULL,
                  `locked_until` DATETIME NULL COMMENT 'Account locked until this time',
                  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
                  `lockout_count` INT(11) NOT NULL DEFAULT 0 COMMENT 'Number of times account has been locked',
                  `ip_address` VARCHAR(45) NULL COMMENT 'IPv4 or IPv6 address',
                  `user_agent` TEXT NULL,
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (`attempt_id`),
                  UNIQUE KEY `unique_identifier_type` (`identifier`, `identifier_type`, `attempt_type`),
                  INDEX `idx_identifier` (`identifier`),
                  INDEX `idx_locked_until` (`locked_until`),
                  INDEX `idx_is_locked` (`is_locked`),
                  INDEX `idx_attempt_type` (`attempt_type`),
                  INDEX `idx_ip_address` (`ip_address`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo '<p class="text-green-600">✅ Created table: security_attempts</p>';
            
            // Create security_logs table
            $db->exec("
                CREATE TABLE IF NOT EXISTS `security_logs` (
                  `log_id` INT(11) NOT NULL AUTO_INCREMENT,
                  `event_type` ENUM(
                    'login_success',
                    'login_failed',
                    'account_locked',
                    'account_unlocked',
                    'ip_blocked',
                    'ip_unblocked',
                    'password_changed',
                    'password_reset_requested',
                    'otp_failed',
                    'otp_success',
                    'suspicious_activity',
                    'captcha_failed',
                    'captcha_success'
                  ) NOT NULL,
                  `severity` ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
                  `user_type` ENUM('admin', 'student', 'guest', 'system') NOT NULL DEFAULT 'guest',
                  `user_identifier` VARCHAR(255) NULL COMMENT 'Email or ID',
                  `ip_address` VARCHAR(45) NULL,
                  `user_agent` TEXT NULL,
                  `description` TEXT NULL,
                  `metadata` JSON NULL COMMENT 'Additional event data',
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`log_id`),
                  INDEX `idx_event_type` (`event_type`),
                  INDEX `idx_severity` (`severity`),
                  INDEX `idx_user_type` (`user_type`),
                  INDEX `idx_user_identifier` (`user_identifier`),
                  INDEX `idx_ip_address` (`ip_address`),
                  INDEX `idx_created_at` (`created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo '<p class="text-green-600">✅ Created table: security_logs</p>';
            
            // Create ip_blacklist table
            $db->exec("
                CREATE TABLE IF NOT EXISTS `ip_blacklist` (
                  `blacklist_id` INT(11) NOT NULL AUTO_INCREMENT,
                  `ip_address` VARCHAR(45) NOT NULL,
                  `reason` TEXT NOT NULL,
                  `blocked_by` INT(11) NULL COMMENT 'Admin ID who blocked this IP',
                  `block_type` ENUM('automatic', 'manual') NOT NULL DEFAULT 'automatic',
                  `blocked_until` DATETIME NULL COMMENT 'NULL = permanent block',
                  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (`blacklist_id`),
                  UNIQUE KEY `unique_ip` (`ip_address`),
                  INDEX `idx_ip_address` (`ip_address`),
                  INDEX `idx_is_active` (`is_active`),
                  INDEX `idx_blocked_until` (`blocked_until`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo '<p class="text-green-600">✅ Created table: ip_blacklist</p>';
            
            // Create captcha_challenges table
            $db->exec("
                CREATE TABLE IF NOT EXISTS `captcha_challenges` (
                  `challenge_id` INT(11) NOT NULL AUTO_INCREMENT,
                  `identifier` VARCHAR(255) NOT NULL COMMENT 'Email or IP',
                  `challenge_token` VARCHAR(64) NOT NULL,
                  `challenge_answer` VARCHAR(10) NOT NULL,
                  `is_solved` TINYINT(1) NOT NULL DEFAULT 0,
                  `attempts` INT(11) NOT NULL DEFAULT 0,
                  `expires_at` DATETIME NOT NULL,
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`challenge_id`),
                  UNIQUE KEY `unique_token` (`challenge_token`),
                  INDEX `idx_identifier` (`identifier`),
                  INDEX `idx_expires_at` (`expires_at`),
                  INDEX `idx_is_solved` (`is_solved`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo '<p class="text-green-600">✅ Created table: captcha_challenges</p>';
            
            echo '<p class="text-green-600 font-bold mt-2">✅ All security tables created successfully!</p>';
            
        } catch (PDOException $e) {
            echo '<p class="text-red-600">❌ Error creating tables: ' . htmlspecialchars($e->getMessage()) . '</p>';
            echo '</div></div>';
            return;
        }
        echo '</div>';
        
        // Step 3: Verify configuration files
        echo '<div class="bg-gray-50 rounded p-4">';
        echo '<h3 class="font-bold text-gray-800 mb-2">Step 3: Verifying configuration files...</h3>';
        
        $configFile = __DIR__ . '/../php/config/security_config.php';
        $protectionFile = __DIR__ . '/../php/utils/brute_force_protection.php';
        
        if (file_exists($configFile)) {
            echo '<p class="text-green-600">✅ security_config.php found</p>';
        } else {
            echo '<p class="text-red-600">❌ security_config.php not found</p>';
        }
        
        if (file_exists($protectionFile)) {
            echo '<p class="text-green-600">✅ brute_force_protection.php found</p>';
        } else {
            echo '<p class="text-red-600">❌ brute_force_protection.php not found</p>';
        }
        echo '</div>';
        
        // Step 4: Insert test data (if requested)
        if (isset($_POST['include_test_data'])) {
            echo '<div class="bg-gray-50 rounded p-4">';
            echo '<h3 class="font-bold text-gray-800 mb-2">Step 4: Inserting test data...</h3>';
            
            // Insert sample failed attempt
            $stmt = $db->prepare("
                INSERT INTO security_attempts 
                (identifier, identifier_type, attempt_type, failed_attempts, first_attempt_at, last_attempt_at, ip_address)
                VALUES (?, ?, ?, ?, NOW(), NOW(), ?)
            ");
            $stmt->execute(['test@example.com', 'email', 'student_login', 2, '192.168.1.100']);
            
            // Insert sample security log
            $stmt = $db->prepare("
                INSERT INTO security_logs 
                (event_type, severity, user_type, user_identifier, ip_address, description)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute(['login_failed', 'info', 'student', 'test@example.com', '192.168.1.100', 'Test failed login attempt']);
            
            echo '<p class="text-green-600">✅ Test data inserted successfully!</p>';
            echo '</div>';
        }
        
        // Step 5: Configuration summary
        echo '<div class="bg-green-50 border border-green-200 rounded p-4">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ Setup Complete!</h3>';
        echo '<p class="text-green-700 mb-4">The brute force protection system has been successfully installed.</p>';
        
        echo '<div class="bg-white rounded p-4 mb-4">';
        echo '<h4 class="font-bold text-gray-800 mb-2">Current Configuration:</h4>';
        
        if (file_exists($configFile)) {
            require_once $configFile;
            echo '<ul class="space-y-1 text-sm text-gray-700">';
            echo '<li>• Max Login Attempts: <strong>' . MAX_LOGIN_ATTEMPTS . '</strong></li>';
            echo '<li>• Lockout Duration: <strong>' . LOCKOUT_DURATION_MINUTES . ' minutes</strong></li>';
            echo '<li>• CAPTCHA Threshold: <strong>' . CAPTCHA_THRESHOLD . ' attempts</strong></li>';
            echo '<li>• IP Ban Threshold: <strong>' . IP_BAN_THRESHOLD . ' lockouts</strong></li>';
            echo '<li>• Progressive Delay: <strong>' . (ENABLE_PROGRESSIVE_DELAY ? 'Enabled' : 'Disabled') . '</strong></li>';
            echo '<li>• Security Logging: <strong>' . (ENABLE_SECURITY_LOGGING ? 'Enabled' : 'Disabled') . '</strong></li>';
            echo '</ul>';
        } else {
            echo '<p class="text-red-600">⚠️ Configuration file not found. Please check php/config/security_config.php</p>';
        }
        echo '</div>';
        
        echo '<div class="space-y-2">';
        echo '<p class="font-bold text-gray-800">Next Steps:</p>';
        echo '<ol class="list-decimal list-inside text-gray-700 space-y-1">';
        echo '<li>Test the login protection by attempting failed logins</li>';
        echo '<li>Access the security dashboard: <a href="../pages/admin/security_dashboard.html" class="text-blue-600 hover:underline">Security Dashboard</a></li>';
        echo '<li>Review the documentation: <a href="../docs/BRUTE_FORCE_PROTECTION_GUIDE.md" class="text-blue-600 hover:underline">Implementation Guide</a></li>';
        echo '<li>Configure security settings in <code class="bg-gray-200 px-1 rounded">php/config/security_config.php</code></li>';
        echo '<li>Set up admin notification emails</li>';
        echo '</ol>';
        echo '</div>';
        
        echo '<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">';
        echo '<p class="text-yellow-800"><strong>⚠️ Security Note:</strong> Delete or restrict access to this setup script in production!</p>';
        echo '</div>';
        
        echo '</div>';
        
    } catch (Exception $e) {
        echo '<div class="bg-red-50 border border-red-200 rounded p-4">';
        echo '<h3 class="font-bold text-red-800 mb-2">❌ Setup Failed</h3>';
        echo '<p class="text-red-700">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
        echo '<p class="text-red-600 text-sm mt-2">Please check your database configuration and try again.</p>';
        echo '</div>';
    }
    
    echo '</div>';
}

?>
