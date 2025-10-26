<?php
/**
 * Add Archive Columns to Tables
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/php/config/database.php';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Add Archive Columns</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; }
        .success { color: #059669; background: #d1fae5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .error { color: #dc2626; background: #fee2e2; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .info { color: #0284c7; background: #e0f2fe; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Adding Archive Columns</h1>

<?php
try {
    $db = getDB();
    
    echo "<div class='info'>Adding archive columns to orders and email_logs tables...</div>";
    
    // Add to orders table
    try {
        $db->exec("ALTER TABLE orders 
                   ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0,
                   ADD COLUMN archived_at DATETIME NULL,
                   ADD COLUMN archived_by INT(11) NULL,
                   ADD INDEX idx_is_archived (is_archived)");
        echo "<div class='success'>✅ Archive columns added to orders table</div>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "<div class='info'>ℹ️ Archive columns already exist in orders table</div>";
        } else {
            throw $e;
        }
    }
    
    // Add to email_logs table
    try {
        $db->exec("ALTER TABLE email_logs 
                   ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0,
                   ADD COLUMN archived_at DATETIME NULL,
                   ADD COLUMN archived_by INT(11) NULL,
                   ADD INDEX idx_is_archived (is_archived)");
        echo "<div class='success'>✅ Archive columns added to email_logs table</div>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "<div class='info'>ℹ️ Archive columns already exist in email_logs table</div>";
        } else {
            throw $e;
        }
    }
    
    echo "<hr>";
    echo "<div class='success'>";
    echo "<h3>✅ Archive Columns Setup Complete!</h3>";
    echo "<p>The following features are now available:</p>";
    echo "<ul>";
    echo "<li>Regular admins can archive orders and email logs</li>";
    echo "<li>Super admins can view and permanently delete archived items</li>";
    echo "<li>Export to Excel functionality is ready</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<p><a href='pages/admin/admin_dashboard.html' style='display: inline-block; padding: 12px 24px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 5px;'>→ Go to Dashboard</a></p>";
    
} catch (Exception $e) {
    echo "<div class='error'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</div>";
}
?>
    </div>
</body>
</html>
