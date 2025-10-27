<?php
/**
 * Database Migration Checker
 * Checks current database structure and adds any missing tables or columns
 * Safe to run multiple times - only adds what's missing
 */

require_once __DIR__ . '/../php/config/database.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q-Mak Database Migration Checker</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1000px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1e40af;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
        }
        .success {
            color: #059669;
            background: #d1fae5;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .error {
            color: #dc2626;
            background: #fee2e2;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .warning {
            color: #d97706;
            background: #fef3c7;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .info {
            color: #0284c7;
            background: #e0f2fe;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        pre {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #3b82f6;
            background: #f8fafc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Q-Mak Database Migration Checker</h1>
        <p>This tool checks your database and adds any missing tables or columns.</p>

<?php

try {
    $db = getDB();
    echo "<div class='success'>✅ Database connection successful!</div>";
    
    $changes = [];
    $errors = [];
    
    // Function to check if table exists
    function tableExists($db, $table) {
        $stmt = $db->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        return $stmt->rowCount() > 0;
    }
    
    // Function to check if column exists
    function columnExists($db, $table, $column) {
        $stmt = $db->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return $stmt->rowCount() > 0;
    }
    
    echo "<div class='section'><h2>📋 Checking Tables...</h2>";
    
    // Check and create inventory_items table
    if (!tableExists($db, 'inventory_items')) {
        try {
            $db->exec("
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
            
            // Insert default items
            $db->exec("
                INSERT INTO `inventory_items` (`item_name`, `is_in_stock`) VALUES
                ('ID Lace', 1),
                ('School Uniform', 1),
                ('PE Uniform', 1),
                ('NSTP Shirt', 1),
                ('School Patch', 1),
                ('Book/Manual', 1),
                ('School Supplies', 1),
                ('UMak Merchandise', 1)
                ON DUPLICATE KEY UPDATE item_name=item_name
            ");
            
            $changes[] = "Created table: inventory_items (with 8 default items)";
        } catch (Exception $e) {
            $errors[] = "Failed to create inventory_items: " . $e->getMessage();
        }
    } else {
        echo "<div class='info'>ℹ️ Table 'inventory_items' already exists</div>";
    }
    
    // Check orders table columns
    if (tableExists($db, 'orders')) {
        echo "<h3>Checking 'orders' table columns...</h3>";
        
        if (!columnExists($db, 'orders', 'quantity')) {
            try {
                $db->exec("ALTER TABLE `orders` ADD COLUMN `quantity` INT(11) NOT NULL DEFAULT 1 COMMENT 'Number of items in order' AFTER `purchasing`");
                $changes[] = "Added column: orders.quantity";
            } catch (Exception $e) {
                $errors[] = "Failed to add orders.quantity: " . $e->getMessage();
            }
        }
        
        if (!columnExists($db, 'orders', 'order_type')) {
            try {
                $db->exec("ALTER TABLE `orders` ADD COLUMN `order_type` ENUM('walk-in', 'online') NOT NULL DEFAULT 'online' COMMENT 'Order source type' AFTER `order_status`");
                $db->exec("ALTER TABLE `orders` ADD INDEX `idx_order_type` (`order_type`)");
                $changes[] = "Added column: orders.order_type";
            } catch (Exception $e) {
                $errors[] = "Failed to add orders.order_type: " . $e->getMessage();
            }
        }
    }
    
    // Check email_logs table columns
    if (tableExists($db, 'email_logs')) {
        echo "<h3>Checking 'email_logs' table columns...</h3>";
        
        if (!columnExists($db, 'email_logs', 'is_archived')) {
            try {
                $db->exec("ALTER TABLE `email_logs` ADD COLUMN `is_archived` TINYINT(1) NOT NULL DEFAULT 0 AFTER `error_message`");
                $db->exec("ALTER TABLE `email_logs` ADD INDEX `idx_is_archived` (`is_archived`)");
                $changes[] = "Added column: email_logs.is_archived";
            } catch (Exception $e) {
                $errors[] = "Failed to add email_logs.is_archived: " . $e->getMessage();
            }
        }
        
        if (!columnExists($db, 'email_logs', 'archived_at')) {
            try {
                $db->exec("ALTER TABLE `email_logs` ADD COLUMN `archived_at` DATETIME NULL AFTER `is_archived`");
                $changes[] = "Added column: email_logs.archived_at";
            } catch (Exception $e) {
                $errors[] = "Failed to add email_logs.archived_at: " . $e->getMessage();
            }
        }
        
        if (!columnExists($db, 'email_logs', 'archived_by')) {
            try {
                $db->exec("ALTER TABLE `email_logs` ADD COLUMN `archived_by` INT(11) NULL AFTER `archived_at`");
                $changes[] = "Added column: email_logs.archived_by";
            } catch (Exception $e) {
                $errors[] = "Failed to add email_logs.archived_by: " . $e->getMessage();
            }
        }
    }
    
    echo "</div>";
    
    // Display results
    echo "<div class='section'><h2>📊 Migration Results</h2>";
    
    if (count($changes) > 0) {
        echo "<div class='success'><h3>✅ Changes Applied:</h3><ul>";
        foreach ($changes as $change) {
            echo "<li>$change</li>";
        }
        echo "</ul></div>";
    } else {
        echo "<div class='info'>✨ Database is up to date! No changes needed.</div>";
    }
    
    if (count($errors) > 0) {
        echo "<div class='error'><h3>❌ Errors:</h3><ul>";
        foreach ($errors as $error) {
            echo "<li>$error</li>";
        }
        echo "</ul></div>";
    }
    
    echo "</div>";
    
    // Display current database structure
    echo "<div class='section'><h2>📦 Current Database Structure</h2>";
    
    $tables = ['admin_accounts', 'students', 'orders', 'email_logs', 'services', 'otp_verifications', 'settings', 'inventory_items'];
    
    foreach ($tables as $table) {
        if (tableExists($db, $table)) {
            $stmt = $db->query("SELECT COUNT(*) as count FROM `$table`");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            echo "<div class='info'>✅ <strong>$table</strong>: $count records</div>";
        } else {
            echo "<div class='warning'>⚠️ <strong>$table</strong>: Table missing!</div>";
        }
    }
    
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='error'><h3>❌ Database Error:</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}

?>

        <div class='section'>
            <h2>📖 Next Steps</h2>
            <ol>
                <li>If all checks passed, your database is ready to use!</li>
                <li>If there were errors, check your database permissions</li>
                <li>You can run this script again anytime - it's safe to run multiple times</li>
                <li>For a fresh install, run <code>qmak_schema.sql</code> in phpMyAdmin instead</li>
            </ol>
        </div>
    </div>
</body>
</html>
