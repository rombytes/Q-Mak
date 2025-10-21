<?php
/**
 * Database Configuration Example
 * 
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to: database.php
 * 2. Update the values below with your actual database credentials
 * 3. DO NOT commit database.php to GitHub (it's in .gitignore)
 */

// Database connection settings
$host = 'localhost';           // Database host (usually 'localhost')
$dbname = 'qmak_db';          // Database name
$username = 'root';            // Database username (default: 'root' for XAMPP)
$password = '';                // Database password (default: empty for XAMPP)
$charset = 'utf8mb4';          // Character set

// PDO options for better security and error handling
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// Create DSN (Data Source Name)
$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

try {
    // Create PDO instance
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    // Log error and show user-friendly message
    error_log('Database Connection Error: ' . $e->getMessage());
    die('Database connection failed. Please contact the administrator.');
}

?>
