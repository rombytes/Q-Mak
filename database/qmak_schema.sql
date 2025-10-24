-- Q-Mak Database Schema
-- University of Makati Cooperative Queue Management System
-- Created: 2025

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: qmak_db
CREATE DATABASE IF NOT EXISTS `qmak_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `qmak_db`;

-- --------------------------------------------------------
-- Table structure for table `admin_accounts`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin_accounts` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Super Admin Account
-- Email: superadmin@umak.edu.ph
-- Password: SuperAdmin123
INSERT INTO `admin_accounts` 
(`username`, `email`, `password`, `full_name`, `is_super_admin`) 
VALUES 
('superadmin', 
 'superadmin@umak.edu.ph', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'Super Administrator', 
 1);

-- Insert default Regular Admin Account
-- Email: admin@umak.edu.ph
-- Password: Admin123
INSERT INTO `admin_accounts` 
(`username`, `email`, `password`, `full_name`, `is_super_admin`) 
VALUES 
('admin', 
 'admin@umak.edu.ph', 
 '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 
 'Regular Administrator', 
 0);

-- --------------------------------------------------------
-- Table structure for table `students`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `students` (
  `student_id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_number` VARCHAR(50) NOT NULL UNIQUE,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `college` VARCHAR(100) NULL,
  `program` VARCHAR(100) NULL,
  `year_level` VARCHAR(20) NULL,
  `section` VARCHAR(20) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  INDEX `idx_student_number` (`student_number`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_id` INT(11) NOT NULL,
  `queue_number` VARCHAR(20) NOT NULL UNIQUE,
  `item_name` VARCHAR(100) NOT NULL,
  `quantity` INT(11) NOT NULL DEFAULT 1,
  `status` ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ready_time` DATETIME NULL,
  `completed_time` DATETIME NULL,
  `notes` TEXT NULL,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `archived_at` DATETIME NULL,
  `archived_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_queue_number` (`queue_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_order_date` (`order_date`),
  INDEX `idx_is_archived` (`is_archived`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `email_logs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `email_logs` (
  `log_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL DEFAULT 0,
  `student_id` INT(11) NOT NULL DEFAULT 0,
  `email_to` VARCHAR(100) NOT NULL,
  `email_type` ENUM('otp', 'receipt', 'status_update', 'order_placed', 'order_ready', 'order_completed') NOT NULL DEFAULT 'otp',
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
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `services`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `service_id` INT(11) NOT NULL AUTO_INCREMENT,
  `service_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `estimated_time` INT(11) NOT NULL DEFAULT 10 COMMENT 'Estimated time in minutes',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_id`),
  INDEX `idx_service_name` (`service_name`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default services
INSERT INTO `services` (`service_name`, `description`, `estimated_time`, `is_active`) VALUES
('Coffee & Drinks', 'Hot and cold beverages', 5, 1),
('Snacks & Food', 'Light meals and snacks', 10, 1),
('School Supplies', 'Notebooks, pens, stationery', 8, 1),
('Printing Services', 'Document printing and copying', 5, 1),
('Books & References', 'Academic books and materials', 12, 1),
('ID Lace', 'Student ID accessories', 5, 1),
('School Uniform', 'Complete uniform sets', 10, 1),
('PE Uniform', 'Physical education uniforms', 10, 1);

-- --------------------------------------------------------
-- Table structure for table `otp_verifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_verifications` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `settings`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `settings` (
  `setting_id` INT(11) NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  INDEX `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
('queue_prefix', 'Q', 'Prefix for queue numbers'),
('max_queue_per_day', '999', 'Maximum queue numbers per day'),
('auto_email_notifications', '1', 'Enable automatic email notifications'),
('business_hours_start', '08:00', 'Business hours start time'),
('business_hours_end', '17:00', 'Business hours end time'),
('qr_expiry_minutes', '60', 'QR code expiry time in minutes'),
('otp_expiry_minutes', '5', 'OTP code expiry time in minutes'),
('otp_max_attempts', '3', 'Maximum OTP verification attempts'),
('email_from_name', 'UMak COOP', 'From name in emails'),
('email_from_address', 'coop@umak.edu.ph', 'From email address');

COMMIT;
