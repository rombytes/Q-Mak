-- Q-Mak Database Schema for UMak COOP Order System
-- Created: 2025-10-01

CREATE DATABASE IF NOT EXISTS qmak_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qmak_db;

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_initial VARCHAR(5),
    email VARCHAR(255) NOT NULL UNIQUE,
    college VARCHAR(50) NOT NULL,
    program VARCHAR(100) NOT NULL,
    year_level INT NOT NULL,
    section VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    queue_number VARCHAR(20) NOT NULL UNIQUE,
    student_id VARCHAR(20) NOT NULL,
    item_ordered VARCHAR(100) NOT NULL,
    order_status ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
    estimated_wait_time INT NOT NULL COMMENT 'in minutes',
    qr_code VARCHAR(255),
    qr_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_queue_number (queue_number),
    INDEX idx_student_id (student_id),
    INDEX idx_status (order_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Verification Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    otp_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    otp_type ENUM('order', 'status') NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    INDEX idx_email_otp (email, otp_code),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    email_type ENUM('otp', 'receipt', 'status_update') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('sent', 'failed') DEFAULT 'sent',
    error_message TEXT,
    INDEX idx_recipient (recipient_email),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin users
-- Super Admin password: coopsuperadmin@123
-- Regular Admin password: coopadmin@123
-- Password hashes generated using password_hash()
INSERT INTO admins (email, password_hash, full_name, role) VALUES 
('superadmin@umakcoop.local', '$2y$10$1mapploCHKcL3IOqy3EaC.VvHRGzmSbQeYGHVT7iaJsuhTYOuqj1e', 'Super Administrator', 'super_admin'),
('admin@umakcoop.local', '$2y$10$L40YaqEmyMxTfcChovUv3OIIWp5MIwl3H.QwfEfTicYfsgcPxwO.e', 'Administrator', 'admin');

-- Sample data for testing (optional)
INSERT INTO students (student_id, first_name, last_name, middle_initial, email, college, program, year_level, section) VALUES
('2024-00001', 'Juan', 'Dela Cruz', 'A', '2024-00001@umak.edu.ph', 'CCIS', 'BS Computer Science', 3, 'A'),
('2024-00002', 'Maria', 'Santos', 'B', '2024-00002@umak.edu.ph', 'CTHM', 'BS Tourism Management', 2, 'B');
