<?php
/**
 * Complete Database Setup
 * Creates ALL required tables for Q-Mak system
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/php/config/database.php';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Database Setup</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        .success { color: #059669; background: #d1fae5; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #059669; }
        .error { color: #dc2626; background: #fee2e2; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #dc2626; }
        .info { color: #0284c7; background: #e0f2fe; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #0284c7; }
        .step { background: #f8fafc; padding: 10px 15px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #6b7280; }
        pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ Complete Database Setup</h1>

<?php
try {
    $db = getDB();
    echo "<div class='success'><strong>✅ Database connection successful</strong></div>";
    
    echo "<h2>Creating Required Tables...</h2>";
    
    // Table creation SQL
    $tables = [
        'students' => "CREATE TABLE IF NOT EXISTS `students` (
            `student_id` INT(11) NOT NULL AUTO_INCREMENT,
            `student_number` VARCHAR(20) NOT NULL UNIQUE,
            `first_name` VARCHAR(50) NOT NULL,
            `last_name` VARCHAR(50) NOT NULL,
            `email` VARCHAR(100) NOT NULL UNIQUE,
            `phone` VARCHAR(20) NULL,
            `course` VARCHAR(100) NOT NULL,
            `year_level` VARCHAR(20) NOT NULL,
            `password` VARCHAR(255) NOT NULL,
            `otp_code` VARCHAR(6) NULL,
            `otp_expires` DATETIME NULL,
            `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`student_id`),
            INDEX `idx_student_number` (`student_number`),
            INDEX `idx_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        'orders' => "CREATE TABLE IF NOT EXISTS `orders` (
            `order_id` INT(11) NOT NULL AUTO_INCREMENT,
            `student_id` INT(11) NOT NULL,
            `queue_number` VARCHAR(20) NOT NULL UNIQUE,
            `item_name` VARCHAR(100) NOT NULL,
            `quantity` INT(11) NOT NULL DEFAULT 1,
            `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            `status` ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
            `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `ready_time` DATETIME NULL,
            `completed_time` DATETIME NULL,
            `notes` TEXT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`order_id`),
            INDEX `idx_student_id` (`student_id`),
            INDEX `idx_queue_number` (`queue_number`),
            INDEX `idx_status` (`status`),
            INDEX `idx_order_date` (`order_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        'email_logs' => "CREATE TABLE IF NOT EXISTS `email_logs` (
            `log_id` INT(11) NOT NULL AUTO_INCREMENT,
            `order_id` INT(11) NOT NULL,
            `student_id` INT(11) NOT NULL,
            `email_to` VARCHAR(100) NOT NULL,
            `email_type` ENUM('order_placed', 'order_ready', 'order_completed') NOT NULL,
            `subject` VARCHAR(255) NOT NULL,
            `message` TEXT NOT NULL,
            `status` ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
            `sent_at` DATETIME NULL,
            `error_message` TEXT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`log_id`),
            INDEX `idx_order_id` (`order_id`),
            INDEX `idx_student_id` (`student_id`),
            INDEX `idx_status` (`status`),
            INDEX `idx_email_type` (`email_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        'services' => "CREATE TABLE IF NOT EXISTS `services` (
            `service_id` INT(11) NOT NULL AUTO_INCREMENT,
            `service_name` VARCHAR(100) NOT NULL UNIQUE,
            `description` TEXT NULL,
            `estimated_time` INT(11) NOT NULL DEFAULT 10,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`service_id`),
            INDEX `idx_service_name` (`service_name`),
            INDEX `idx_is_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        'otp_verifications' => "CREATE TABLE IF NOT EXISTS `otp_verifications` (
            `otp_id` INT(11) NOT NULL AUTO_INCREMENT,
            `email` VARCHAR(100) NOT NULL,
            `otp_code` VARCHAR(6) NOT NULL,
            `otp_type` ENUM('order', 'status', 'login') NOT NULL DEFAULT 'order',
            `attempts` INT(11) NOT NULL DEFAULT 0,
            `max_attempts` INT(11) NOT NULL DEFAULT 3,
            `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
            `expires_at` DATETIME NOT NULL,
            `verified_at` DATETIME NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`otp_id`),
            INDEX `idx_email` (`email`),
            INDEX `idx_otp_type` (`otp_type`),
            INDEX `idx_is_verified` (`is_verified`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        'admin_accounts' => "CREATE TABLE IF NOT EXISTS `admin_accounts` (
            `admin_id` INT(11) NOT NULL AUTO_INCREMENT,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `email` VARCHAR(100) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `full_name` VARCHAR(100) NOT NULL,
            `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
            `last_login` DATETIME NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`admin_id`),
            INDEX `idx_email` (`email`),
            INDEX `idx_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    
    // Create tables
    foreach ($tables as $tableName => $sql) {
        echo "<div class='step'>";
        echo "<strong>📋 Table: $tableName</strong><br>";
        
        try {
            $db->exec($sql);
            echo "<span class='success'>✅ Created successfully</span>";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'already exists') !== false) {
                echo "<span class='info'>ℹ️ Already exists (skipped)</span>";
            } else {
                throw $e;
            }
        }
        
        echo "</div>";
    }
    
    echo "<hr>";
    echo "<h2>🔐 Setting up Admin Accounts...</h2>";
    
    // Check if admin accounts exist
    $countStmt = $db->query("SELECT COUNT(*) as count FROM admin_accounts");
    $count = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($count == 0) {
        echo "<div class='info'>Creating default admin accounts...</div>";
        
        $accounts = [
            ['superadmin', 'superadmin@umak.edu.ph', 'SuperAdmin123', 'Super Administrator', 1],
            ['admin', 'admin@umak.edu.ph', 'Admin123', 'Administrator', 0]
        ];
        
        $stmt = $db->prepare("INSERT INTO admin_accounts (username, email, password, full_name, is_super_admin) VALUES (?, ?, ?, ?, ?)");
        
        foreach ($accounts as $account) {
            $hash = password_hash($account[2], PASSWORD_DEFAULT);
            $stmt->execute([$account[0], $account[1], $hash, $account[3], $account[4]]);
            
            echo "<div class='success'>";
            echo "✅ Created: <strong>{$account[3]}</strong><br>";
            echo "Email: <code>{$account[1]}</code><br>";
            echo "Password: <code>{$account[2]}</code>";
            echo "</div>";
        }
    } else {
        echo "<div class='info'>Admin accounts already exist. Updating passwords...</div>";
        
        $stmt = $db->prepare("UPDATE admin_accounts SET password = ? WHERE email = ?");
        $stmt->execute([password_hash('SuperAdmin123', PASSWORD_DEFAULT), 'superadmin@umak.edu.ph']);
        $stmt->execute([password_hash('Admin123', PASSWORD_DEFAULT), 'admin@umak.edu.ph']);
        
        echo "<div class='success'>✅ Passwords updated for existing accounts</div>";
    }
    
    echo "<hr>";
    echo "<h2>📊 Database Summary</h2>";
    
    $stmt = $db->query("SHOW TABLES");
    $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<table border='1' cellpadding='10' style='width: 100%; border-collapse: collapse;'>";
    echo "<tr style='background: #1e3a8a; color: white;'><th>Table Name</th><th>Row Count</th><th>Status</th></tr>";
    
    foreach ($allTables as $table) {
        $countStmt = $db->query("SELECT COUNT(*) as count FROM `$table`");
        $count = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        echo "<tr>";
        echo "<td><strong>$table</strong></td>";
        echo "<td>$count rows</td>";
        echo "<td><span style='color: #059669;'>✅ Active</span></td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
    echo "<hr>";
    echo "<div class='success'>";
    echo "<h2>✅ Setup Complete!</h2>";
    echo "<p><strong>Next Steps:</strong></p>";
    echo "<ol>";
    echo "<li>Login to admin portal with the credentials shown above</li>";
    echo "<li>Test all dashboard features</li>";
    echo "<li>Delete this setup file for security</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<p>";
    echo "<a href='pages/admin/admin_login.html' style='display: inline-block; padding: 12px 24px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;'>→ Go to Admin Login</a>";
    echo "<a href='check_database.php' style='display: inline-block; padding: 12px 24px; background: #6b7280; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>View Database Status</a>";
    echo "</p>";
    
} catch (Exception $e) {
    echo "<div class='error'>";
    echo "<strong>❌ Error:</strong> " . htmlspecialchars($e->getMessage());
    echo "<br><br><strong>Troubleshooting:</strong>";
    echo "<ul>";
    echo "<li>Ensure XAMPP MySQL is running</li>";
    echo "<li>Verify database 'qmak_db' exists (create it in phpMyAdmin if needed)</li>";
    echo "<li>Check database credentials in php/config/database.php</li>";
    echo "</ul>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
}
?>
    </div>
</body>
</html>
