<?php
/**
 * Database Configuration for Q-Mak System
 * Automatically detects localhost vs production environment
 * 
 * SETUP INSTRUCTIONS FOR HOSTINGER:
 * =================================
 * 1. Copy this file and rename it to: database.php
 * 2. Find your Hostinger database credentials in cPanel > MySQL Databases
 * 3. Replace the PRODUCTION section values below:
 *    - DB_USER: Your Hostinger database username (format: u123456789_username)
 *    - DB_PASS: Your database password (set in cPanel)
 *    - DB_NAME: Your database name (format: u123456789_dbname)
 *    - BASE_URL: Your domain (e.g., https://yourdomain.com or https://yourdomain.com/Q-Mak)
 * 4. Update SMTP credentials with your production email settings
 * 5. DO NOT commit database.php to GitHub (it's in .gitignore)
 */

// Set timezone to Philippine Time (UTC+8)
date_default_timezone_set('Asia/Manila');

// Detect environment (localhost vs production)
if (!function_exists('isLocalhost')) {
    function isLocalhost() {
        $localhost_names = ['localhost', '127.0.0.1', '::1'];
        return in_array($_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost', $localhost_names);
    }
}

// Environment-specific database credentials
if (isLocalhost()) {
    // LOCALHOST (XAMPP/WAMP) - Development Environment
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');  // Empty password for XAMPP
    define('DB_NAME', 'qmak_db');
    define('BASE_URL', 'http://localhost/Q-Mak');
    define('IS_PRODUCTION', false);
} else {
    // PRODUCTION (Hostinger/Live Server)
    // ⚠️ IMPORTANT: Replace these values with your actual Hostinger credentials
    define('DB_HOST', 'localhost');  // Usually 'localhost' on Hostinger (DO NOT CHANGE)
    define('DB_USER', 'u123456789_qmak');  // ⚠️ REPLACE: Your Hostinger database username
    define('DB_PASS', 'YOUR_SECURE_PASSWORD_HERE');  // ⚠️ REPLACE: Your database password
    define('DB_NAME', 'u123456789_qmak_db');  // ⚠️ REPLACE: Your Hostinger database name
    define('BASE_URL', 'https://yourdomain.com');  // ⚠️ REPLACE: Your production domain
    define('IS_PRODUCTION', true);
}

// Common database settings
define('DB_CHARSET', 'utf8mb4');

// Email configuration (environment-specific)
if (isLocalhost()) {
    // LOCALHOST - Gmail for testing
    define('SMTP_HOST', 'smtp.gmail.com');
    define('SMTP_PORT', 587);
    define('SMTP_USERNAME', 'your-test-email@gmail.com');  // ⚠️ Your Gmail for testing
    define('SMTP_PASSWORD', 'your-gmail-app-password');  // ⚠️ Gmail App Password (16 chars)
    define('SMTP_FROM_EMAIL', 'your-test-email@gmail.com');
    define('SMTP_FROM_NAME', 'UMak COOP [DEV]');
} else {
    // PRODUCTION - Hostinger email
    define('SMTP_HOST', 'smtp.hostinger.com');
    define('SMTP_PORT', 587);  // Use 587 for TLS or 465 for SSL
    define('SMTP_USERNAME', 'noreply@yourdomain.com');  // ⚠️ REPLACE: Your full Hostinger email
    define('SMTP_PASSWORD', 'YOUR_HOSTINGER_EMAIL_PASSWORD');  // ⚠️ REPLACE: Email password from hPanel
    define('SMTP_FROM_EMAIL', 'noreply@yourdomain.com');
    define('SMTP_FROM_NAME', 'UMak COOP Order Hub');
}

// Application settings
define('OTP_EXPIRY_MINUTES', 10);
define('QR_EXPIRY_MINUTES', 30);

// Error logging configuration
define('DB_ERROR_LOG', __DIR__ . '/../../logs/db_errors.log');

/**
 * Get database connection (global function)
 */
function getDB() {
    static $db = null;

    if ($db === null) {
        $database = new Database();
        $db = $database->getConnection();
    }

    return $db;
}

/**
 * Create database connection with environment-aware credentials
 */
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;

    public function __construct() {
        // Use environment-specific credentials defined above
        $this->host = DB_HOST;
        $this->db_name = DB_NAME;
        $this->username = DB_USER;
        $this->password = DB_PASS;
    }

    public function getConnection() {
        $this->conn = null;

        try {
            // Attempt database connection
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . DB_CHARSET;
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Set PDO attributes for better security and performance
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            $this->conn->setAttribute(PDO::MYSQL_ATTR_INIT_COMMAND, "SET NAMES " . DB_CHARSET);
            
            // Set MySQL session timezone to Philippine Time (UTC+8)
            try {
                $this->conn->exec("SET time_zone = '+08:00';");
            } catch (PDOException $tz_error) {
                // Log timezone error but don't fail connection
                error_log("MySQL timezone setting failed: " . $tz_error->getMessage());
            }
            
        } catch(PDOException $exception) {
            // Log error securely to file instead of displaying
            $this->logDatabaseError($exception);
            
            // Throw generic error message (don't expose credentials)
            if (IS_PRODUCTION) {
                // Production: Generic error message
                throw new Exception("Unable to connect to database. Please contact support.");
            } else {
                // Development: More detailed error for debugging
                throw new Exception("Database connection failed: " . $exception->getMessage());
            }
        }

        return $this->conn;
    }

    /**
     * Log database errors securely to file
     * 
     * @param PDOException $exception The exception to log
     */
    private function logDatabaseError($exception) {
        $logDir = dirname(DB_ERROR_LOG);
        
        // Create logs directory if it doesn't exist
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        // Prepare log entry
        $timestamp = date('Y-m-d H:i:s');
        $environment = IS_PRODUCTION ? 'PRODUCTION' : 'LOCALHOST';
        $errorMessage = $exception->getMessage();
        $errorCode = $exception->getCode();
        $file = $exception->getFile();
        $line = $exception->getLine();
        
        // Format log entry (don't log credentials)
        $logEntry = sprintf(
            "[%s] [%s] DATABASE CONNECTION FAILED\n" .
            "Error: %s\n" .
            "Code: %s\n" .
            "File: %s\n" .
            "Line: %s\n" .
            "Host: %s\n" .
            "Database: %s\n" .
            "User: %s\n" .
            "---\n\n",
            $timestamp,
            $environment,
            $errorMessage,
            $errorCode,
            $file,
            $line,
            $this->host,
            $this->db_name,
            $this->username  // Log username but NEVER password
        );

        // Write to log file
        @file_put_contents(DB_ERROR_LOG, $logEntry, FILE_APPEND | LOCK_EX);
        
        // Also use PHP's error_log for server logs
        error_log("[$environment] Database Connection Error: " . $errorMessage);
    }

    /**
     * Test database connection
     * 
     * @return array Status information
     */
    public static function testConnection() {
        try {
            $db = new Database();
            $conn = $db->getConnection();
            
            return [
                'success' => true,
                'message' => 'Database connection successful',
                'environment' => IS_PRODUCTION ? 'production' : 'localhost',
                'host' => DB_HOST,
                'database' => DB_NAME
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'environment' => IS_PRODUCTION ? 'production' : 'localhost'
            ];
        }
    }
}
?>
