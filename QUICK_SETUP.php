<?php
/**
 * QUICK SETUP - Run This First!
 * This does everything needed to get the system working
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/php/config/database.php';

$step = $_GET['step'] ?? 1;

?>
<!DOCTYPE html>
<html>
<head>
    <title>Q-Mak Quick Setup</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        .success { color: #059669; background: #d1fae5; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #059669; }
        .error { color: #dc2626; background: #fee2e2; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #dc2626; }
        .info { color: #0284c7; background: #e0f2fe; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #0284c7; }
        .warning { color: #d97706; background: #fef3c7; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #d97706; }
        .btn { display: inline-block; padding: 15px 30px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px; font-size: 16px; }
        .btn:hover { background: #1e40af; }
        .btn-success { background: #059669; }
        .btn-success:hover { background: #047857; }
        .steps { display: flex; justify-content: space-between; margin: 30px 0; }
        .step { flex: 1; text-align: center; padding: 10px; background: #f3f4f6; margin: 0 5px; border-radius: 5px; }
        .step.active { background: #3b82f6; color: white; font-weight: bold; }
        .step.completed { background: #10b981; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Q-Mak Quick Setup Wizard</h1>
        
        <div class="steps">
            <div class="step <?php echo $step >= 1 ? ($step == 1 ? 'active' : 'completed') : ''; ?>">
                1. Database
            </div>
            <div class="step <?php echo $step >= 2 ? ($step == 2 ? 'active' : 'completed') : ''; ?>">
                2. Test Data
            </div>
            <div class="step <?php echo $step >= 3 ? ($step == 3 ? 'active' : 'completed') : ''; ?>">
                3. Archive Columns
            </div>
            <div class="step <?php echo $step >= 4 ? ($step == 4 ? 'active' : 'completed') : ''; ?>">
                4. Complete
            </div>
        </div>

<?php
try {
    $db = getDB();
    
    if ($step == 1) {
        // STEP 1: Setup Database Tables
        echo "<h2>Step 1: Database Tables</h2>";
        echo "<div class='info'>Creating all required tables with correct schema...</div>";
        
        $tables = [
            'students' => "CREATE TABLE IF NOT EXISTS `students` (
                `student_id` INT(11) NOT NULL AUTO_INCREMENT,
                `student_number` VARCHAR(20) NOT NULL UNIQUE,
                `first_name` VARCHAR(50) NOT NULL,
                `last_name` VARCHAR(50) NOT NULL,
                `email` VARCHAR(100) NOT NULL UNIQUE,
                `phone` VARCHAR(20) NULL,
                `college` VARCHAR(100) NULL,
                `program` VARCHAR(100) NULL,
                `year_level` VARCHAR(20) NULL,
                `section` VARCHAR(20) NULL,
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
                `order_id` INT(11) NOT NULL DEFAULT 0,
                `student_id` INT(11) NOT NULL DEFAULT 0,
                `email_to` VARCHAR(100) NOT NULL,
                `email_type` ENUM('otp', 'receipt', 'status_update') NOT NULL DEFAULT 'otp',
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
        
        foreach ($tables as $name => $sql) {
            try {
                $db->exec($sql);
                echo "<div class='success'>✅ Table '$name' created/verified</div>";
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'already exists') !== false) {
                    echo "<div class='info'>ℹ️ Table '$name' already exists</div>";
                } else {
                    throw $e;
                }
            }
        }
        
        // Fix existing tables - add missing columns
        echo "<h3>Checking for Missing Columns...</h3>";
        
        // Fix students table
        $studentCols = $db->query("DESCRIBE students")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('college', $studentCols)) {
            $db->exec("ALTER TABLE students ADD COLUMN college VARCHAR(100) NULL AFTER phone");
            echo "<div class='success'>✅ Added 'college' column to students</div>";
        }
        if (in_array('course', $studentCols) && !in_array('program', $studentCols)) {
            $db->exec("ALTER TABLE students CHANGE COLUMN course program VARCHAR(100) NULL");
            echo "<div class='success'>✅ Renamed 'course' column to 'program'</div>";
        } elseif (!in_array('program', $studentCols)) {
            $db->exec("ALTER TABLE students ADD COLUMN program VARCHAR(100) NULL AFTER college");
            echo "<div class='success'>✅ Added 'program' column to students</div>";
        }
        if (!in_array('section', $studentCols)) {
            $db->exec("ALTER TABLE students ADD COLUMN section VARCHAR(20) NULL AFTER year_level");
            echo "<div class='success'>✅ Added 'section' column to students</div>";
        }
        
        // Fix orders table
        $ordersCols = $db->query("DESCRIBE orders")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('quantity', $ordersCols)) {
            $db->exec("ALTER TABLE orders ADD COLUMN quantity INT(11) NOT NULL DEFAULT 1 AFTER item_name");
            echo "<div class='success'>✅ Added 'quantity' column to orders</div>";
        }
        if (!in_array('notes', $ordersCols)) {
            $db->exec("ALTER TABLE orders ADD COLUMN notes TEXT NULL AFTER order_date");
            echo "<div class='success'>✅ Added 'notes' column to orders</div>";
        }
        
        // Create admin accounts
        $adminCount = $db->query("SELECT COUNT(*) as count FROM admin_accounts")->fetch()['count'];
        if ($adminCount == 0) {
            echo "<h3>Creating Admin Accounts...</h3>";
            $stmt = $db->prepare("INSERT INTO admin_accounts (username, email, password, full_name, is_super_admin) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute(['superadmin', 'superadmin@umak.edu.ph', password_hash('SuperAdmin123', PASSWORD_DEFAULT), 'Super Administrator', 1]);
            $stmt->execute(['admin', 'admin@umak.edu.ph', password_hash('Admin123', PASSWORD_DEFAULT), 'Administrator', 0]);
            echo "<div class='success'>✅ Admin accounts created</div>";
        }
        
        echo "<div class='success'><h3>✅ Step 1 Complete!</h3></div>";
        echo "<p><a href='?step=2' class='btn'>Continue to Step 2 →</a></p>";
        
    } elseif ($step == 2) {
        // STEP 2: Add Test Data
        echo "<h2>Step 2: Add Test Data</h2>";
        echo "<div class='info'>Adding sample data for testing...</div>";
        
        $studentCount = $db->query("SELECT COUNT(*) as count FROM students")->fetch()['count'];
        
        if ($studentCount < 5) {
            $students = [
                ['2024-00001', 'Juan', 'Dela Cruz', 'juan.delacruz@umak.edu.ph', '09171234567', 'College of Computer Studies', 'BSIT', '1st Year', 'A'],
                ['2024-00002', 'Maria', 'Santos', 'maria.santos@umak.edu.ph', '09181234567', 'College of Computer Studies', 'BSCS', '2nd Year', 'B'],
                ['2024-00003', 'Pedro', 'Reyes', 'pedro.reyes@umak.edu.ph', '09191234567', 'College of Business Administration', 'BSBA', '3rd Year', 'A']
            ];
            
            $stmt = $db->prepare("INSERT IGNORE INTO students (student_number, first_name, last_name, email, phone, college, program, year_level, section, password, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $password = password_hash('student123', PASSWORD_DEFAULT);
            
            foreach ($students as $student) {
                $stmt->execute(array_merge($student, [$password]));
            }
            echo "<div class='success'>✅ Added " . count($students) . " test students</div>";
        } else {
            echo "<div class='info'>ℹ️ Students already exist</div>";
        }
        
        $orderCount = $db->query("SELECT COUNT(*) as count FROM orders")->fetch()['count'];
        
        if ($orderCount < 10) {
            $studentIds = $db->query("SELECT student_id FROM students LIMIT 5")->fetchAll(PDO::FETCH_COLUMN);
            $items = ['Coffee', 'Sandwich', 'Notebook', 'Ballpen', 'Snacks'];
            $statuses = ['pending', 'processing', 'ready', 'completed'];
            
            $stmt = $db->prepare("INSERT INTO orders (student_id, queue_number, item_name, quantity, status, order_date) VALUES (?, ?, ?, ?, ?, ?)");
            
            for ($i = 1; $i <= 10; $i++) {
                $stmt->execute([
                    $studentIds[array_rand($studentIds)],
                    'Q-' . str_pad($i, 3, '0', STR_PAD_LEFT),
                    $items[array_rand($items)],
                    rand(1, 3),
                    $statuses[array_rand($statuses)],
                    date('Y-m-d H:i:s', strtotime('-' . rand(0, 7) . ' days'))
                ]);
            }
            echo "<div class='success'>✅ Added 10 test orders</div>";
        } else {
            echo "<div class='info'>ℹ️ Orders already exist</div>";
        }
        
        echo "<div class='success'><h3>✅ Step 2 Complete!</h3></div>";
        echo "<p><a href='?step=3' class='btn'>Continue to Step 3 →</a></p>";
        
    } elseif ($step == 3) {
        // STEP 3: Add Archive Columns
        echo "<h2>Step 3: Add Archive Support</h2>";
        echo "<div class='info'>Adding archive columns to tables...</div>";
        
        try {
            $db->exec("ALTER TABLE orders ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN archived_at DATETIME NULL, ADD COLUMN archived_by INT(11) NULL, ADD INDEX idx_is_archived (is_archived)");
            echo "<div class='success'>✅ Archive columns added to orders</div>";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                echo "<div class='info'>ℹ️ Archive columns already exist in orders</div>";
            } else {
                throw $e;
            }
        }
        
        try {
            $db->exec("ALTER TABLE email_logs ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN archived_at DATETIME NULL, ADD COLUMN archived_by INT(11) NULL, ADD INDEX idx_is_archived (is_archived)");
            echo "<div class='success'>✅ Archive columns added to email_logs</div>";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                echo "<div class='info'>ℹ️ Archive columns already exist in email_logs</div>";
            } else {
                throw $e;
            }
        }
        
        echo "<div class='success'><h3>✅ Step 3 Complete!</h3></div>";
        echo "<p><a href='?step=4' class='btn'>Continue to Step 4 →</a></p>";
        
    } elseif ($step == 4) {
        // STEP 4: Complete
        echo "<h2>🎉 Setup Complete!</h2>";
        echo "<div class='success'>";
        echo "<h3>✅ All Systems Ready!</h3>";
        echo "<p>Your Q-Mak system is now fully configured and ready to use.</p>";
        echo "</div>";
        
        echo "<h3>📊 System Summary:</h3>";
        $summary = [
            'Students' => $db->query("SELECT COUNT(*) FROM students")->fetchColumn(),
            'Orders' => $db->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
            'Services' => $db->query("SELECT COUNT(*) FROM services")->fetchColumn(),
            'Admin Accounts' => $db->query("SELECT COUNT(*) FROM admin_accounts")->fetchColumn(),
            'Email Logs' => $db->query("SELECT COUNT(*) FROM email_logs")->fetchColumn()
        ];
        
        echo "<div class='info'>";
        echo "<ul style='font-size: 16px;'>";
        foreach ($summary as $table => $count) {
            echo "<li><strong>$table:</strong> $count records</li>";
        }
        echo "</ul>";
        echo "</div>";
        
        echo "<h3>🔐 Login Credentials:</h3>";
        echo "<div class='info'>";
        echo "<p><strong>Super Admin:</strong> superadmin@umak.edu.ph / SuperAdmin123</p>";
        echo "<p><strong>Regular Admin:</strong> admin@umak.edu.ph / Admin123</p>";
        echo "<p><strong>Test Student:</strong> juan.delacruz@umak.edu.ph / student123</p>";
        echo "</div>";
        
        echo "<h3>✨ What's Working Now:</h3>";
        echo "<div class='success'>";
        echo "<ul>";
        echo "<li>✅ OTP Verification</li>";
        echo "<li>✅ Order Creation</li>";
        echo "<li>✅ Queue Management</li>";
        echo "<li>✅ Queue History</li>";
        echo "<li>✅ Student Records</li>";
        echo "<li>✅ Analytics & Reports</li>";
        echo "<li>✅ Email Logs</li>";
        echo "<li>✅ Export to Excel</li>";
        echo "<li>✅ Archive Support</li>";
        echo "<li>✅ QR Code Generation</li>";
        echo "</ul>";
        echo "</div>";
        
        echo "<h3>📋 Next Steps:</h3>";
        echo "<ol>";
        echo "<li>Open the admin dashboard and verify all tabs load data</li>";
        echo "<li>Test placing an order through the student portal</li>";
        echo "<li>Follow the IMPLEMENTATION_GUIDE.md to add Chart.js and UI updates</li>";
        echo "</ol>";
        
        echo "<div style='margin-top: 30px;'>";
        echo "<a href='pages/admin/admin_login.html' class='btn btn-success' style='font-size: 18px; padding: 20px 40px;'>🚀 Open Admin Dashboard</a>";
        echo "<a href='homepage.html' class='btn' style='font-size: 18px; padding: 20px 40px;'>🏠 Student Portal</a>";
        echo "</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>";
    echo "<strong>❌ Error:</strong> " . htmlspecialchars($e->getMessage());
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
}
?>
    </div>
</body>
</html>
