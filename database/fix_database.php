<?php
/**
 * Database Fix Script
 * Creates database and sets up all tables
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Q-Mak Database Fix Script</h1>";
echo "<pre>";

// Step 1: Create database if it doesn't exist
try {
    echo "Step 1: Creating database...\n";
    $pdo = new PDO('mysql:host=localhost', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->exec('CREATE DATABASE IF NOT EXISTS qmak_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "✓ Database 'qmak_db' created or already exists\n\n";
    
    // Select the database
    $pdo->exec('USE qmak_db');
    
    // Step 2: Check current tables
    echo "Step 2: Checking existing tables...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "Existing tables: " . implode(', ', $tables) . "\n\n";
    } else {
        echo "No tables found. Will create all tables.\n\n";
    }
    
    // Step 3: Create all required tables
    echo "Step 3: Creating tables...\n";
    
    // Create admin_accounts table
    if (!in_array('admin_accounts', $tables)) {
        $pdo->exec("
            CREATE TABLE `admin_accounts` (
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
                INDEX `idx_username` (`username`),
                INDEX `idx_is_super_admin` (`is_super_admin`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insert default admin accounts
        $pdo->exec("
            INSERT INTO `admin_accounts` (`username`, `email`, `password`, `full_name`, `is_super_admin`) VALUES
            ('superadmin', 'superadmin@umak.edu.ph', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Administrator', 1),
            ('admin', 'admin@umak.edu.ph', '\$2y\$10\$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'Regular Administrator', 0)
        ");
        
        echo "✓ Created table: admin_accounts (with 2 default accounts)\n";
    } else {
        echo "- Table admin_accounts already exists\n";
    }
    
    // Create students table
    if (!in_array('students', $tables)) {
        $pdo->exec("
            CREATE TABLE `students` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `student_id` VARCHAR(50) NOT NULL UNIQUE,
                `first_name` VARCHAR(50) NOT NULL,
                `last_name` VARCHAR(50) NOT NULL,
                `email` VARCHAR(100) NOT NULL UNIQUE,
                `phone` VARCHAR(20) NULL,
                `college` VARCHAR(100) NULL,
                `program` VARCHAR(100) NULL,
                `year_level` VARCHAR(20) NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_student_id` (`student_id`),
                INDEX `idx_email` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "✓ Created table: students\n";
    } else {
        echo "- Table students already exists\n";
    }
    
    // Create orders table
    if (!in_array('orders', $tables)) {
        $pdo->exec("
            CREATE TABLE `orders` (
                `order_id` INT(11) NOT NULL AUTO_INCREMENT,
                `student_id` INT(11) NOT NULL,
                `queue_number` VARCHAR(20) NOT NULL UNIQUE,
                `item_ordered` TEXT NOT NULL,
                `purchasing` TEXT NULL,
                `quantity` INT(11) NOT NULL DEFAULT 1,
                `order_status` ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
                `order_type` ENUM('walk-in', 'online') NOT NULL DEFAULT 'online',
                `qr_code` TEXT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`order_id`),
                INDEX `idx_student_id` (`student_id`),
                INDEX `idx_queue_number` (`queue_number`),
                INDEX `idx_order_status` (`order_status`),
                INDEX `idx_order_type` (`order_type`),
                INDEX `idx_created_at` (`created_at`),
                FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "✓ Created table: orders\n";
    } else {
        echo "- Table orders already exists\n";
    }
    
    // Create email_logs table
    if (!in_array('email_logs', $tables)) {
        $pdo->exec("
            CREATE TABLE `email_logs` (
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
                `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
                `archived_at` DATETIME NULL,
                `archived_by` INT(11) NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`log_id`),
                INDEX `idx_order_id` (`order_id`),
                INDEX `idx_student_id` (`student_id`),
                INDEX `idx_status` (`status`),
                INDEX `idx_email_type` (`email_type`),
                INDEX `idx_is_archived` (`is_archived`),
                FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE,
                FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "✓ Created table: email_logs\n";
    } else {
        echo "- Table email_logs already exists\n";
    }
    
    // Create services table
    if (!in_array('services', $tables)) {
        $pdo->exec("
            CREATE TABLE `services` (
                `service_id` INT(11) NOT NULL AUTO_INCREMENT,
                `service_name` VARCHAR(100) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`service_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "✓ Created table: services\n";
    } else {
        echo "- Table services already exists\n";
    }
    
    // Create otp_verifications table
    if (!in_array('otp_verifications', $tables)) {
        $pdo->exec("
            CREATE TABLE `otp_verifications` (
                `otp_id` INT(11) NOT NULL AUTO_INCREMENT,
                `email` VARCHAR(100) NOT NULL,
                `otp_code` VARCHAR(6) NOT NULL,
                `expires_at` DATETIME NOT NULL,
                `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`otp_id`),
                INDEX `idx_email` (`email`),
                INDEX `idx_otp_code` (`otp_code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "✓ Created table: otp_verifications\n";
    } else {
        echo "- Table otp_verifications already exists\n";
    }
    
    // Create settings table
    if (!in_array('settings', $tables)) {
        $pdo->exec("
            CREATE TABLE `settings` (
                `setting_id` INT(11) NOT NULL AUTO_INCREMENT,
                `setting_key` VARCHAR(50) NOT NULL UNIQUE,
                `setting_value` TEXT NOT NULL,
                `description` VARCHAR(255) NULL,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`setting_id`),
                INDEX `idx_setting_key` (`setting_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        $pdo->exec("
            INSERT INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
            ('queue_prefix', 'Q', 'Prefix for queue numbers'),
            ('max_queue_per_day', '999', 'Maximum queue numbers per day'),
            ('auto_email_notifications', '1', 'Enable automatic email notifications'),
            ('business_hours_start', '08:00', 'Business hours start time'),
            ('business_hours_end', '17:00', 'Business hours end time')
        ");
        echo "✓ Created table: settings (with default values)\n";
    } else {
        echo "- Table settings already exists\n";
    }
    
    // Create inventory_items table
    if (!in_array('inventory_items', $tables)) {
        $pdo->exec("
            CREATE TABLE `inventory_items` (
                `item_id` INT(11) NOT NULL AUTO_INCREMENT,
                `item_name` VARCHAR(255) NOT NULL UNIQUE,
                `is_in_stock` TINYINT(1) NOT NULL DEFAULT 1,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `updated_by` INT(11) NULL,
                PRIMARY KEY (`item_id`),
                INDEX `idx_stock_status` (`is_in_stock`),
                FOREIGN KEY (`updated_by`) REFERENCES `admin_accounts`(`admin_id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        $pdo->exec("
            INSERT INTO `inventory_items` (`item_name`, `is_in_stock`) VALUES
            ('ID Lace', 1),
            ('School Uniform', 1),
            ('PE Uniform', 1),
            ('NSTP Shirt', 1),
            ('School Patch', 1),
            ('Book/Manual', 1),
            ('School Supplies', 1),
            ('UMak Merchandise', 1)
        ");
        echo "✓ Created table: inventory_items (with 8 default items)\n";
    } else {
        echo "- Table inventory_items already exists\n";
    }
    
    echo "\n";
    echo "Step 4: Verifying database structure...\n";
    
    // Get final table list
    $stmt = $pdo->query("SHOW TABLES");
    $finalTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $requiredTables = [
        'admin_accounts',
        'students',
        'orders',
        'email_logs',
        'services',
        'otp_verifications',
        'settings',
        'inventory_items'
    ];
    
    $allTablesPresent = true;
    foreach ($requiredTables as $table) {
        if (in_array($table, $finalTables)) {
            // Get row count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            echo "✓ $table: $count records\n";
        } else {
            echo "✗ MISSING: $table\n";
            $allTablesPresent = false;
        }
    }
    
    echo "\n";
    if ($allTablesPresent) {
        echo "========================================\n";
        echo "✓ DATABASE SETUP COMPLETE!\n";
        echo "========================================\n\n";
        echo "Default Admin Credentials:\n";
        echo "  Super Admin:\n";
        echo "    Email: superadmin@umak.edu.ph\n";
        echo "    Password: SuperAdmin123\n\n";
        echo "  Regular Admin:\n";
        echo "    Email: admin@umak.edu.ph\n";
        echo "    Password: Admin123\n\n";
        echo "You can now use the system!\n";
        echo "Go to: http://localhost/Q-Mak/pages/admin/admin_login.html\n";
    } else {
        echo "⚠ WARNING: Some tables are missing. Please check the errors above.\n";
    }
    
} catch (PDOException $e) {
    echo "\n";
    echo "========================================\n";
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "========================================\n\n";
    echo "Troubleshooting steps:\n";
    echo "1. Make sure XAMPP MySQL is running\n";
    echo "2. Check if you can access phpMyAdmin at http://localhost/phpmyadmin\n";
    echo "3. Verify your database credentials in php/config/database.php\n";
    echo "4. Check MySQL error log for details\n";
}

echo "</pre>";
echo "<hr>";
echo "<p><a href='check_database.php'>Run Database Checker</a> | ";
echo "<a href='../pages/admin/admin_login.html'>Go to Admin Login</a></p>";
?>
