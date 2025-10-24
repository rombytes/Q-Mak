<?php
/**
 * Database Configuration Example for Q-Mak System
 *
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to: database.php
 * 2. Update the values below with your actual database credentials
 * 3. DO NOT commit database.php to GitHub (it's in .gitignore)
 */

// Database credentials
define('DB_HOST', 'localhost');           // Database host (usually 'localhost')
define('DB_USER', 'root');                // Database username (default: 'root' for XAMPP)
define('DB_PASS', '');                    // Database password (default: empty for XAMPP)
define('DB_NAME', 'qmak_db');             // Database name
define('DB_CHARSET', 'utf8mb4');          // Character set

// Email configuration (for sending OTP and receipts)
define('SMTP_HOST', 'smtp.gmail.com');                           // SMTP server (Gmail: smtp.gmail.com)
define('SMTP_PORT', 587);                                        // SMTP port (587 for TLS, 465 for SSL)
define('SMTP_USERNAME', 'your-email@gmail.com');                // Your email address
define('SMTP_PASSWORD', 'your-app-password');                   // Your email password or app password
define('SMTP_FROM_EMAIL', 'your-email@gmail.com');              // Sender email address
define('SMTP_FROM_NAME', 'UMak COOP Order Hub');                // Sender name

// Application settings
define('OTP_EXPIRY_MINUTES', 10);                               // OTP expiry time in minutes
define('QR_EXPIRY_MINUTES', 30);                               // QR code expiry time in minutes
define('BASE_URL', 'http://localhost/Q-Mak');                   // Update this to your project URL

// Timezone
date_default_timezone_set('Asia/Manila');

/**
 * Database connection class
 */
class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            $this->connection->exec("SET time_zone = '+8:00'");

        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            die(json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please contact administrator.'
            ]));
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }
}

/**
 * Helper function to get database connection
 */
function getDB() {
    return Database::getInstance()->getConnection();
}
?>
