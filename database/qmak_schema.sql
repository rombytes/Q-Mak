-- ============================================================
-- Q-Mak Database Schema
-- University of Makati Cooperative Queue Management System
-- Version: 1.0.0
-- Created: November 2025
-- Description: Complete database schema for queue management,
--              inventory tracking, and admin/student portals
-- 
-- IMPORTANT NOTES:
-- ============================================================
-- 1. PRINTING SERVICES STANDARDIZATION:
--    - All printing orders use item_name = "Printing Services"
--    - File details are stored in item_ordered column
--    - This ensures proper analytics grouping
--    - Backend automatically detects and categorizes printing orders
--
-- 2. AFTER IMPORTING THIS SCHEMA:
--    If you have existing orders that need standardization, run:
--    UPDATE orders 
--    SET item_name = 'Printing Services', updated_at = NOW()
--    WHERE (item_name REGEXP '\\.(pdf|doc|docx)' 
--           OR item_name REGEXP ' - [0-9]+ (page|pages)')
--    AND item_name != 'Printing Services';
--
-- 3. DEFAULT ADMIN ACCOUNTS:
--    - Super Admin: superadmin@umak.edu.ph / SuperAdmin123
--    - Regular Admin: admin@umak.edu.ph / Admin123
--    CHANGE THESE PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

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
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Archive status',
  `archived_at` DATETIME NULL,
  `archived_by` INT(11) NULL COMMENT 'Super Admin ID who archived',
  PRIMARY KEY (`admin_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_username` (`username`),
  INDEX `idx_is_super_admin` (`is_super_admin`),
  INDEX `idx_is_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Super Admin Account
-- NOTE: Change password after first login for security
-- Default Login: superadmin@umak.edu.ph / SuperAdmin123
INSERT INTO `admin_accounts` 
(`username`, `email`, `password`, `full_name`, `is_super_admin`) 
VALUES 
('superadmin', 
 'superadmin@umak.edu.ph', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'Super Administrator', 
 1)
ON DUPLICATE KEY UPDATE username = username;

-- Insert default Regular Admin Account
-- Default Login: admin@umak.edu.ph / Admin123
INSERT INTO `admin_accounts` 
(`username`, `email`, `password`, `full_name`, `is_super_admin`) 
VALUES 
('admin', 
 'admin@umak.edu.ph', 
 '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 
 'Regular Administrator', 
 0)
ON DUPLICATE KEY UPDATE username = username;

-- --------------------------------------------------------
-- Table structure for table `students`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `students` (
  `student_id` VARCHAR(50) NOT NULL,
  `student_number` VARCHAR(50) NULL,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `middle_initial` VARCHAR(5) NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL COMMENT 'Hashed password for student accounts',
  `college` VARCHAR(100) NULL,
  `program` VARCHAR(100) NULL,
  `year_level` INT(11) NULL,
  `section` VARCHAR(20) NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Email verification status',
  `verified_at` DATETIME NULL,
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Archive status',
  `archived_at` DATETIME NULL,
  `archived_by` INT(11) NULL COMMENT 'Admin ID who archived',
  PRIMARY KEY (`student_id`),
  INDEX `idx_student_number` (`student_number`),
  INDEX `idx_email` (`email`),
  INDEX `idx_is_verified` (`is_verified`),
  INDEX `idx_is_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` INT(11) NOT NULL AUTO_INCREMENT,
  `reference_number` VARCHAR(20) NOT NULL COMMENT 'Unique reference number for order tracking (QMAK-XXXXXX)',
  `student_id` VARCHAR(50) NOT NULL,
  `queue_number` VARCHAR(50) NULL COMMENT 'Can be NULL for scheduled orders until check-in',
  `queue_date` DATE NOT NULL COMMENT 'Date for daily queue resets',
  `item_name` TEXT NULL COMMENT 'For printing orders, always set to "Printing Services"',
  `item_ordered` TEXT NULL COMMENT 'Comma-separated list of items',
  `purchasing` TEXT NULL COMMENT 'Alias for item_ordered',
  `quantity` INT(11) NOT NULL DEFAULT 1 COMMENT 'Number of items in order',
  `notes` TEXT NULL,
  `status` ENUM('pending', 'processing', 'completed', 'cancelled', 'scheduled') NOT NULL DEFAULT 'pending',
  `cancellation_reason` TEXT NULL COMMENT 'Reason for cancellation (if status is cancelled)',
  `order_type` ENUM('walk-in', 'online', 'immediate', 'pre-order') NOT NULL DEFAULT 'online' COMMENT 'Order source type',
  `scheduled_date` DATE NULL COMMENT 'For pre-orders, the date customer wants to pick up the order',
  `moved_from_date` DATE NULL COMMENT 'Original date if order was auto-moved',
  `ordered_outside_hours` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Flag indicating order was placed outside operating hours',
  `estimated_wait_time` INT(11) DEFAULT 10 COMMENT 'Estimated wait time in minutes',
  `actual_completion_time` INT(11) NULL COMMENT 'Actual time taken to complete order in minutes',
  `qr_code` LONGTEXT NULL COMMENT 'QR code data URI',
  `qr_expiry` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_processing_at` DATETIME NULL COMMENT 'When order processing started',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL COMMENT 'When order was completed',
  `cancelled_at` DATETIME NULL COMMENT 'When order was cancelled',
  `claimed_at` DATETIME NULL,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Archive status',
  `archived_at` DATETIME NULL,
  `archived_by` INT(11) NULL COMMENT 'Admin ID who archived',
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `unique_reference_number` (`reference_number`),
  UNIQUE KEY `unique_queue_per_day` (`queue_number`, `queue_date`),
  INDEX `idx_reference_number` (`reference_number`),
  INDEX `idx_queue_date` (`queue_date`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_order_type` (`order_type`),
  INDEX `idx_scheduled_date` (`scheduled_date`),
  INDEX `idx_ordered_outside_hours` (`ordered_outside_hours`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_started_processing_at` (`started_processing_at`),
  INDEX `idx_completed_at` (`completed_at`),
  INDEX `idx_is_archived` (`is_archived`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `printing_jobs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `printing_jobs` (
  `job_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL COMMENT 'Location of the uploaded PDF/Doc',
  `file_name` VARCHAR(255) NOT NULL COMMENT 'Original filename (e.g. Thesis_Final.pdf)',
  `file_size` INT(11) NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
  `page_count` INT(11) DEFAULT NULL COMMENT 'Number of pages detected',
  `color_mode` ENUM('B&W', 'Colored') NOT NULL DEFAULT 'B&W',
  `paper_size` ENUM('Short', 'Long', 'A4') NOT NULL DEFAULT 'A4',
  `copies` INT(11) NOT NULL DEFAULT 1,
  `collate` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Collate multiple copies',
  `double_sided` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Print on both sides',
  `instructions` TEXT NULL COMMENT 'Extra notes like "Back to back" or "Slide handout mode"',
  `estimated_price` DECIMAL(10,2) NULL COMMENT 'Calculated price based on settings',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `email_logs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `email_logs` (
  `log_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL DEFAULT 0,
  `student_id` VARCHAR(50) NULL,
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
  INDEX `idx_is_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `system_notifications`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `system_notifications` (
  `notification_id` INT(11) NOT NULL AUTO_INCREMENT,
  `notification_type` VARCHAR(50) NOT NULL COMMENT 'Type: closing_time_summary, system_alert, etc.',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL COMMENT 'Auto-delete after this date',
  PRIMARY KEY (`notification_id`),
  INDEX `idx_type` (`notification_type`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `notifications`
-- Student-specific notifications for orders and system messages
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('order', 'system', 'promotion', 'announcement') NOT NULL DEFAULT 'order',
  `related_order_id` INT(11) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` DATETIME NULL,
  PRIMARY KEY (`notification_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `services`
-- Service catalog with estimated completion times
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `services` (
  `service_id` INT(11) NOT NULL AUTO_INCREMENT,
  `service_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `estimated_time` INT(11) NOT NULL DEFAULT 10 COMMENT 'Estimated service time in minutes',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_id`),
  UNIQUE KEY `unique_service_name` (`service_name`),
  INDEX `idx_service_name` (`service_name`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phase 8: Service Management Migration (November 25, 2025)
-- Populate services table for global service switches
TRUNCATE TABLE `services`;
INSERT INTO `services` (`service_name`, `description`, `is_active`) VALUES
('School Items', 'Merchandise like Uniforms, ID Laces, and Books', 1),
('Printing Services', 'Document printing and photocopying', 1);

-- --------------------------------------------------------
-- Table structure for table `admin_logs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin_logs` (
  `log_id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) NOT NULL COMMENT 'Admin who performed the action',
  `action_type` VARCHAR(50) NOT NULL COMMENT 'Type of action performed',
  `target_type` VARCHAR(50) NULL COMMENT 'Type of target (student, admin, order, etc.)',
  `target_id` VARCHAR(100) NULL COMMENT 'ID of the target entity',
  `description` TEXT NOT NULL COMMENT 'Human-readable description of the action',
  `details` JSON NULL COMMENT 'Additional JSON data about the action',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP address of the admin',
  `user_agent` TEXT NULL COMMENT 'Browser/device information',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_target_type` (`target_type`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts`(`admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `inventory_items`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `inventory_items` (
  `item_id` INT(11) NOT NULL AUTO_INCREMENT,
  `item_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `stock_quantity` INT(11) NOT NULL DEFAULT 0 COMMENT 'Current stock level',
  `low_stock_threshold` INT(11) NOT NULL DEFAULT 20 COMMENT 'Alert when stock falls below this',
  `estimated_time` INT(11) NOT NULL DEFAULT 10 COMMENT 'Estimated preparation/service time in minutes',
  `is_available` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Auto-set to 0 when stock_quantity = 0',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Admin can manually disable',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `unique_item_name` (`item_name`),
  INDEX `idx_item_name` (`item_name`),
  INDEX `idx_is_available` (`is_available`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_stock_quantity` (`stock_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default inventory items with stock
INSERT INTO `inventory_items` 
(`item_name`, `description`, `stock_quantity`, `low_stock_threshold`, `estimated_time`, `is_available`, `is_active`) 
VALUES
('Coffee & Drinks', 'Hot and cold beverages', 150, 20, 5, 1, 1),
('Snacks & Food', 'Light meals and snacks', 200, 20, 10, 1, 1),
('School Supplies', 'Notebooks, pens, stationery', 180, 20, 8, 1, 1),
('Books & References', 'Academic books and materials', 75, 20, 12, 1, 1),
('ID Lace', 'Student ID accessories', 15, 20, 5, 1, 1),
('School Uniform', 'Complete uniform sets', 30, 20, 10, 1, 1),
('PE Uniform', 'Physical education uniforms', 0, 20, 10, 0, 1)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  estimated_time = VALUES(estimated_time);

-- Phase 8: Remove 'Printing Services' from inventory (it's now a service, not inventory)
DELETE FROM `inventory_items` WHERE `item_name` = 'Printing Services';

-- --------------------------------------------------------
-- Triggers for inventory_items
-- --------------------------------------------------------

DELIMITER $$

-- Trigger on INSERT: Auto-set is_available based on stock
CREATE TRIGGER `trg_inventory_availability_insert`
BEFORE INSERT ON `inventory_items`
FOR EACH ROW
BEGIN
  IF NEW.stock_quantity <= 0 THEN
    SET NEW.is_available = 0;
  ELSE
    SET NEW.is_available = 1;
  END IF;
END$$

-- Trigger on UPDATE: Auto-set is_available based on stock
CREATE TRIGGER `trg_inventory_availability_update`
BEFORE UPDATE ON `inventory_items`
FOR EACH ROW
BEGIN
  IF NEW.stock_quantity <= 0 THEN
    SET NEW.is_available = 0;
  ELSEIF NEW.stock_quantity > 0 AND OLD.is_available = 0 THEN
    -- Only auto-enable if admin hasn't manually disabled it
    IF NEW.is_active = 1 THEN
      SET NEW.is_available = 1;
    END IF;
  END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- Table structure for table `stock_movement_log`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `stock_movement_log` (
  `movement_id` INT(11) NOT NULL AUTO_INCREMENT,
  `item_id` INT(11) NOT NULL,
  `movement_type` ENUM('restock', 'sale', 'adjustment', 'return') NOT NULL DEFAULT 'adjustment',
  `quantity_change` INT(11) NOT NULL COMMENT 'Positive for additions, negative for reductions',
  `previous_quantity` INT(11) NOT NULL,
  `new_quantity` INT(11) NOT NULL,
  `reason` VARCHAR(255) NULL,
  `admin_id` INT(11) NULL COMMENT 'Admin who made the change',
  `order_id` INT(11) NULL COMMENT 'Related order if movement is from sale',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_movement_type` (`movement_type`),
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_order_id` (`order_id`),
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Stored Procedure for stock adjustment
-- --------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE `sp_adjust_stock`(
  IN p_item_id INT,
  IN p_quantity_change INT,
  IN p_movement_type VARCHAR(20),
  IN p_reason VARCHAR(255),
  IN p_admin_id INT
)
BEGIN
  DECLARE v_current_stock INT;
  DECLARE v_new_stock INT;
  
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock 
  FROM inventory_items 
  WHERE item_id = p_item_id;
  
  -- Calculate new stock
  SET v_new_stock = v_current_stock + p_quantity_change;
  
  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    SET v_new_stock = 0;
  END IF;
  
  -- Update inventory
  UPDATE inventory_items 
  SET stock_quantity = v_new_stock 
  WHERE item_id = p_item_id;
  
  -- Log the movement
  INSERT INTO stock_movement_log 
  (item_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, admin_id)
  VALUES 
  (p_item_id, p_movement_type, p_quantity_change, v_current_stock, v_new_stock, p_reason, p_admin_id);
  
  -- Return new stock level
  SELECT v_new_stock as new_stock_quantity;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- Views for inventory queries
-- --------------------------------------------------------

-- View: Low stock items
CREATE OR REPLACE VIEW `v_low_stock_items` AS
SELECT 
  item_id,
  item_name,
  stock_quantity,
  low_stock_threshold,
  (stock_quantity - low_stock_threshold) as stock_difference,
  is_available,
  is_active
FROM inventory_items
WHERE stock_quantity <= low_stock_threshold
  AND is_active = 1
ORDER BY stock_quantity ASC;

-- View: Out of stock items
CREATE OR REPLACE VIEW `v_out_of_stock_items` AS
SELECT 
  item_id,
  item_name,
  stock_quantity,
  is_active
FROM inventory_items
WHERE stock_quantity = 0
  OR is_available = 0
ORDER BY item_name ASC;

-- View: Available items for ordering (matches XAMPP database)
CREATE OR REPLACE VIEW `v_available_items` AS
SELECT 
  item_id,
  item_name,
  description,
  stock_quantity,
  low_stock_threshold,
  CASE 
    WHEN stock_quantity = 0 THEN 'Out of Stock'
    WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
    ELSE 'In Stock'
  END as stock_status,
  estimated_time
FROM inventory_items
WHERE is_available = 1 
  AND is_active = 1
ORDER BY item_name;

-- --------------------------------------------------------
-- Table structure for table `otp_verifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_verifications` (
  `otp_id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL,
  `otp_code` VARCHAR(6) NOT NULL,
  `otp_type` ENUM('order', 'status', 'login', 'registration') NOT NULL DEFAULT 'order',
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
('queue_start_number', '1', 'Starting queue number each day'),
('queue_reset_time', '00:00:00', 'Time to reset queue counter daily'),
('queue_max_per_day', '999', 'Maximum queue numbers allowed per day'),
('max_queue_per_day', '999', 'Maximum queue numbers per day'),
('reference_prefix', 'QMAK', 'Prefix for reference numbers'),
('reference_length', '6', 'Length of random reference number'),
('wait_time_buffer_percent', '20', 'Buffer percentage added to calculated wait time'),
('wait_time_min', '5', 'Minimum wait time in minutes'),
('wait_time_max', '60', 'Maximum wait time in minutes'),
('enable_queue_analytics', '1', 'Enable automatic queue analytics generation'),
('analytics_lookback_days', '7', 'Number of days to use for average calculations'),
('auto_email_notifications', '1', 'Enable automatic email notifications'),
('business_hours_start', '08:00', 'Business hours start time'),
('business_hours_end', '17:00', 'Business hours end time'),
('default_opening_time', '10:00:00', 'Default opening time for COOP'),
('default_closing_time', '17:00:00', 'Default closing time for COOP'),
('closing_warning_minutes', '30', 'Minutes before closing to warn about pending orders'),
('auto_move_pending_to_next_day', '1', 'Auto-move pending orders to next business day at closing'),
('allow_preorders', '1', 'Allow orders to be placed for next business day outside hours'),
('max_preorder_days', '3', 'Maximum days in advance for pre-orders'),
('schedule_display_days', '7', 'Number of days to show in schedule display'),
('enable_lunch_break', '0', 'Enable lunch break period'),
('lunch_break_start', '12:00:00', 'Lunch break start time'),
('lunch_break_end', '13:00:00', 'Lunch break end time'),
('qr_expiry_minutes', '60', 'QR code expiry time in minutes'),
('otp_expiry_minutes', '5', 'OTP code expiry time in minutes'),
('otp_max_attempts', '3', 'Maximum OTP verification attempts'),
('email_from_name', 'UMak COOP', 'From name in emails'),
('email_from_address', 'coop@umak.edu.ph', 'From email address'),
('printing_price_bw_short', '1.00', 'Price per page: Black & White on Short bond'),
('printing_price_bw_long', '1.50', 'Price per page: Black & White on Long bond'),
('printing_price_bw_a4', '1.25', 'Price per page: Black & White on A4'),
('printing_price_colored_short', '5.00', 'Price per page: Colored on Short bond'),
('printing_price_colored_long', '7.50', 'Price per page: Colored on Long bond'),
('printing_price_colored_a4', '6.00', 'Price per page: Colored on A4'),
('printing_max_file_size', '10485760', 'Maximum file size for printing in bytes (10MB default)'),
('printing_allowed_extensions', 'pdf,doc,docx', 'Allowed file extensions for printing'),
('avg_processing_time', '5', 'Average processing time per order in minutes'),
('item_complexity_factor', '2', 'Additional time per item in order (minutes)');

-- --------------------------------------------------------
-- Table structure for table `queue_analytics`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `queue_analytics` (
  `analytics_id` INT(11) NOT NULL AUTO_INCREMENT,
  `queue_date` DATE NOT NULL,
  `total_orders` INT(11) NOT NULL DEFAULT 0 COMMENT 'Total orders placed that day',
  `completed_orders` INT(11) NOT NULL DEFAULT 0 COMMENT 'Orders completed that day',
  `cancelled_orders` INT(11) NOT NULL DEFAULT 0 COMMENT 'Orders cancelled that day',
  `avg_wait_time` DECIMAL(5,2) DEFAULT NULL COMMENT 'Average wait time in minutes',
  `avg_completion_time` DECIMAL(5,2) DEFAULT NULL COMMENT 'Average completion time in minutes',
  `peak_hour_start` TIME NULL COMMENT 'Start of busiest hour',
  `peak_hour_end` TIME NULL COMMENT 'End of busiest hour',
  `peak_hour_orders` INT(11) DEFAULT 0 COMMENT 'Number of orders during peak hour',
  `busiest_items` TEXT NULL COMMENT 'Most ordered items (JSON format)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`analytics_id`),
  UNIQUE KEY `unique_queue_date` (`queue_date`),
  INDEX `idx_queue_date` (`queue_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `working_hours`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `working_hours` (
  `schedule_id` INT(11) NOT NULL AUTO_INCREMENT,
  `day_of_week` TINYINT(1) NOT NULL COMMENT '1=Monday, 2=Tuesday, ..., 7=Sunday',
  `is_open` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Is COOP open on this day',
  `opening_time` TIME NOT NULL DEFAULT '10:00:00',
  `closing_time` TIME NOT NULL DEFAULT '17:00:00',
  `break_start` TIME NULL COMMENT 'Optional lunch break start',
  `break_end` TIME NULL COMMENT 'Optional lunch break end',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_id`),
  UNIQUE KEY `unique_day` (`day_of_week`),
  INDEX `idx_day_of_week` (`day_of_week`),
  INDEX `idx_is_open` (`is_open`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default schedule (Monday-Friday, 10am-5pm)
INSERT INTO `working_hours` (`day_of_week`, `is_open`, `opening_time`, `closing_time`) VALUES
(1, 1, '10:00:00', '17:00:00'), -- Monday
(2, 1, '10:00:00', '17:00:00'), -- Tuesday
(3, 1, '10:00:00', '17:00:00'), -- Wednesday
(4, 1, '10:00:00', '17:00:00'), -- Thursday
(5, 1, '10:00:00', '17:00:00'), -- Friday
(6, 0, '10:00:00', '17:00:00'), -- Saturday (closed)
(7, 0, '10:00:00', '17:00:00')  -- Sunday (closed)
ON DUPLICATE KEY UPDATE 
  is_open = VALUES(is_open),
  opening_time = VALUES(opening_time),
  closing_time = VALUES(closing_time);

-- --------------------------------------------------------
-- Table structure for table `special_hours`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `special_hours` (
  `special_id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `is_open` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Override normal schedule',
  `opening_time` TIME NULL,
  `closing_time` TIME NULL,
  `reason` VARCHAR(255) NULL COMMENT 'Holiday name or reason for closure/change',
  `created_by` INT(11) NULL COMMENT 'Admin who created this entry',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `unique_date` (`date`),
  INDEX `idx_date` (`date`),
  INDEX `idx_is_open` (`is_open`),
  FOREIGN KEY (`created_by`) REFERENCES `admin_accounts`(`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Stored Procedures for Queue Management
-- --------------------------------------------------------

DELIMITER $$

-- Procedure: Get next queue number for a date
DROP PROCEDURE IF EXISTS `sp_get_next_queue_number`$$

CREATE PROCEDURE `sp_get_next_queue_number`(
  IN p_queue_date DATE,
  OUT p_queue_number VARCHAR(50)
)
BEGIN
  DECLARE v_last_number INT;
  DECLARE v_next_number INT;
  DECLARE v_queue_prefix VARCHAR(10);
  
  -- Get queue prefix from settings (default: 'Q')
  SELECT setting_value INTO v_queue_prefix 
  FROM settings 
  WHERE setting_key = 'queue_prefix' 
  LIMIT 1;
  
  IF v_queue_prefix IS NULL THEN
    SET v_queue_prefix = 'Q';
  END IF;
  
  -- Get the last queue number for the date
  SELECT MAX(CAST(SUBSTRING(queue_number, LOCATE('-', queue_number) + 1) AS UNSIGNED))
  INTO v_last_number
  FROM orders
  WHERE queue_date = p_queue_date;
  
  -- If no orders today, start from 1
  IF v_last_number IS NULL THEN
    SET v_next_number = 1;
  ELSE
    SET v_next_number = v_last_number + 1;
  END IF;
  
  -- Format as Q-1, Q-2, etc.
  SET p_queue_number = CONCAT(v_queue_prefix, '-', v_next_number);
END$$

-- Procedure: Generate unique reference number
DROP PROCEDURE IF EXISTS `sp_generate_reference_number`$$

CREATE PROCEDURE `sp_generate_reference_number`(
  OUT p_reference_number VARCHAR(20)
)
BEGIN
  DECLARE v_prefix VARCHAR(10);
  DECLARE v_length INT;
  DECLARE v_random VARCHAR(20);
  DECLARE v_exists INT;
  DECLARE v_attempts INT DEFAULT 0;
  
  -- Get settings
  SELECT setting_value INTO v_prefix 
  FROM settings WHERE setting_key = 'reference_prefix' LIMIT 1;
  
  SELECT setting_value INTO v_length 
  FROM settings WHERE setting_key = 'reference_length' LIMIT 1;
  
  IF v_prefix IS NULL THEN SET v_prefix = 'REF'; END IF;
  IF v_length IS NULL THEN SET v_length = 8; END IF;
  
  -- Try to generate unique reference number
  generate_loop: LOOP
    -- Generate random string
    SET v_random = UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, v_length));
    SET p_reference_number = CONCAT(v_prefix, '-', v_random);
    
    -- Check if exists
    SELECT COUNT(*) INTO v_exists 
    FROM orders 
    WHERE reference_number = p_reference_number;
    
    IF v_exists = 0 THEN
      LEAVE generate_loop;
    END IF;
    
    SET v_attempts = v_attempts + 1;
    
    -- Safety: max 10 attempts, then use timestamp
    IF v_attempts >= 10 THEN
      SET p_reference_number = CONCAT(v_prefix, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'));
      LEAVE generate_loop;
    END IF;
  END LOOP;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- Views for Queue Management
-- --------------------------------------------------------

-- View: Today's queue (matches XAMPP database)
CREATE OR REPLACE VIEW `v_today_queue` AS
SELECT 
  o.order_id,
  o.reference_number,
  o.queue_number,
  o.queue_date,
  o.student_id,
  CONCAT(s.first_name, ' ', s.last_name) as student_name,
  s.email,
  o.item_ordered,
  o.status,
  o.estimated_wait_time,
  o.actual_completion_time,
  o.created_at,
  o.started_processing_at,
  o.completed_at,
  CAST(SUBSTRING(o.queue_number, LOCATE('-', o.queue_number) + 1) AS UNSIGNED) as queue_position
FROM orders o
LEFT JOIN students s ON o.student_id = s.student_id
WHERE o.queue_date = CURDATE()
  AND o.is_archived = 0
ORDER BY queue_position ASC;

-- View: Pending orders count (matches XAMPP database)
CREATE OR REPLACE VIEW `v_pending_orders_today` AS
SELECT 
  COUNT(*) as pending_count,
  AVG(estimated_wait_time) as avg_estimated_wait
FROM orders
WHERE queue_date = CURDATE()
  AND status IN ('pending', 'processing')
  AND is_archived = 0;

-- View: Current operating status (matches XAMPP database)
CREATE OR REPLACE VIEW `v_current_operating_status` AS
SELECT 
  DAYOFWEEK(CURDATE()) as current_day,
  CURTIME() as time_now,
  wh.is_open as is_scheduled_open,
  wh.opening_time,
  wh.closing_time,
  wh.break_start,
  wh.break_end,
  CASE 
    WHEN sh.is_open IS NOT NULL THEN sh.is_open
    ELSE wh.is_open
  END as is_actually_open,
  sh.reason as special_reason,
  CASE
    WHEN sh.is_open = 0 THEN 'Closed (Special)'
    WHEN wh.is_open = 0 THEN 'Closed (Regular)'
    WHEN CURTIME() < wh.opening_time THEN 'Not Yet Open'
    WHEN wh.break_start IS NOT NULL 
         AND CURTIME() >= wh.break_start 
         AND CURTIME() < wh.break_end THEN 'Lunch Break'
    WHEN CURTIME() >= wh.closing_time THEN 'Closed for Day'
    ELSE 'Open'
  END as status_text
FROM working_hours wh
LEFT JOIN special_hours sh ON sh.date = CURDATE()
WHERE wh.day_of_week = DAYOFWEEK(CURDATE())
  AND wh.is_active = 1;

-- View: Upcoming schedule (next 7 days) - matches XAMPP database
CREATE OR REPLACE VIEW `v_upcoming_schedule` AS
SELECT 
  d.date,
  DAYNAME(d.date) as day_name,
  DAYOFWEEK(d.date) as day_of_week,
  COALESCE(sh.is_open, wh.is_open) as is_open,
  COALESCE(sh.opening_time, wh.opening_time) as opening_time,
  COALESCE(sh.closing_time, wh.closing_time) as closing_time,
  wh.break_start,
  wh.break_end,
  sh.reason,
  CASE 
    WHEN sh.special_id IS NOT NULL THEN 'special'
    ELSE 'regular'
  END as schedule_type
FROM (
  SELECT CURDATE() + INTERVAL 0 DAY as date UNION ALL
  SELECT CURDATE() + INTERVAL 1 DAY UNION ALL
  SELECT CURDATE() + INTERVAL 2 DAY UNION ALL
  SELECT CURDATE() + INTERVAL 3 DAY UNION ALL
  SELECT CURDATE() + INTERVAL 4 DAY UNION ALL
  SELECT CURDATE() + INTERVAL 5 DAY UNION ALL
  SELECT CURDATE() + INTERVAL 6 DAY
) d
LEFT JOIN working_hours wh ON wh.day_of_week = DAYOFWEEK(d.date) AND wh.is_active = 1
LEFT JOIN special_hours sh ON sh.date = d.date
ORDER BY d.date;

-- --------------------------------------------------------
-- Events for Queue Analytics
-- --------------------------------------------------------

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

DELIMITER $$

-- Event: Generate daily analytics
DROP EVENT IF EXISTS `evt_generate_daily_analytics`$$

CREATE EVENT `evt_generate_daily_analytics`
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 23:55:00')
DO
BEGIN
  DECLARE v_date DATE;
  DECLARE v_total INT;
  DECLARE v_completed INT;
  DECLARE v_cancelled INT;
  DECLARE v_avg_wait DECIMAL(5,2);
  DECLARE v_avg_completion DECIMAL(5,2);
  
  SET v_date = CURDATE();
  
  -- Calculate statistics
  SELECT 
    COUNT(*) INTO v_total
  FROM orders
  WHERE queue_date = v_date;
  
  SELECT 
    COUNT(*) INTO v_completed
  FROM orders
  WHERE queue_date = v_date AND status = 'completed';
  
  SELECT 
    COUNT(*) INTO v_cancelled
  FROM orders
  WHERE queue_date = v_date AND status = 'cancelled';
  
  SELECT 
    AVG(estimated_wait_time) INTO v_avg_wait
  FROM orders
  WHERE queue_date = v_date AND estimated_wait_time IS NOT NULL;
  
  SELECT 
    AVG(actual_completion_time) INTO v_avg_completion
  FROM orders
  WHERE queue_date = v_date AND actual_completion_time IS NOT NULL;
  
  -- Insert or update analytics
  INSERT INTO queue_analytics 
    (queue_date, total_orders, completed_orders, cancelled_orders, avg_wait_time, avg_completion_time)
  VALUES 
    (v_date, v_total, v_completed, v_cancelled, v_avg_wait, v_avg_completion)
  ON DUPLICATE KEY UPDATE
    total_orders = v_total,
    completed_orders = v_completed,
    cancelled_orders = v_cancelled,
    avg_wait_time = v_avg_wait,
    avg_completion_time = v_avg_completion,
    updated_at = NOW();
END$$

DELIMITER ;

-- ============================================================
-- SECURITY TABLES FOR BRUTE FORCE PROTECTION
-- Created: November 6, 2025
-- ============================================================

-- --------------------------------------------------------
-- Table structure for table `security_attempts`
-- Tracks failed login attempts and lockouts
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `security_attempts` (
  `attempt_id` INT(11) NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(255) NOT NULL COMMENT 'Email address or IP address',
  `identifier_type` ENUM('email', 'ip', 'email_ip') NOT NULL DEFAULT 'email',
  `attempt_type` ENUM('admin_login', 'student_login', 'otp_verify', 'password_reset') NOT NULL,
  `failed_attempts` INT(11) NOT NULL DEFAULT 0,
  `first_attempt_at` DATETIME NOT NULL,
  `last_attempt_at` DATETIME NOT NULL,
  `locked_until` DATETIME NULL COMMENT 'Account locked until this time',
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `lockout_count` INT(11) NOT NULL DEFAULT 0 COMMENT 'Number of times account has been locked',
  `ip_address` VARCHAR(45) NULL COMMENT 'IPv4 or IPv6 address',
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attempt_id`),
  UNIQUE KEY `unique_identifier_type` (`identifier`, `identifier_type`, `attempt_type`),
  INDEX `idx_identifier` (`identifier`),
  INDEX `idx_locked_until` (`locked_until`),
  INDEX `idx_is_locked` (`is_locked`),
  INDEX `idx_attempt_type` (`attempt_type`),
  INDEX `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `security_logs`
-- Comprehensive audit logging for security events
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `security_logs` (
  `log_id` INT(11) NOT NULL AUTO_INCREMENT,
  `event_type` ENUM(
    'login_success',
    'login_failed',
    'account_locked',
    'account_unlocked',
    'ip_blocked',
    'ip_unblocked',
    'password_changed',
    'password_reset_requested',
    'otp_failed',
    'otp_success',
    'suspicious_activity',
    'captcha_failed',
    'captcha_success'
  ) NOT NULL,
  `severity` ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  `user_type` ENUM('admin', 'student', 'guest', 'system') NOT NULL DEFAULT 'guest',
  `user_identifier` VARCHAR(255) NULL COMMENT 'Email or ID',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `description` TEXT NULL,
  `metadata` JSON NULL COMMENT 'Additional event data',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_user_type` (`user_type`),
  INDEX `idx_user_identifier` (`user_identifier`),
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ip_blacklist`
-- Persistent IP blocking for severe threats
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ip_blacklist` (
  `blacklist_id` INT(11) NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `reason` TEXT NOT NULL,
  `blocked_by` INT(11) NULL COMMENT 'Admin ID who blocked this IP',
  `block_type` ENUM('automatic', 'manual') NOT NULL DEFAULT 'automatic',
  `blocked_until` DATETIME NULL COMMENT 'NULL = permanent block',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`blacklist_id`),
  UNIQUE KEY `unique_ip` (`ip_address`),
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_blocked_until` (`blocked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `captcha_challenges`
-- Track CAPTCHA challenges and verification
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `captcha_challenges` (
  `challenge_id` INT(11) NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(255) NOT NULL COMMENT 'Email or IP',
  `challenge_token` VARCHAR(64) NOT NULL,
  `challenge_answer` VARCHAR(10) NOT NULL,
  `is_solved` TINYINT(1) NOT NULL DEFAULT 0,
  `attempts` INT(11) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`challenge_id`),
  UNIQUE KEY `unique_token` (`challenge_token`),
  INDEX `idx_identifier` (`identifier`),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_is_solved` (`is_solved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Add security indexes to existing tables
-- --------------------------------------------------------

ALTER TABLE `admin_accounts` 
  ADD INDEX IF NOT EXISTS `idx_last_login` (`last_login`);

ALTER TABLE `students` 
  ADD INDEX IF NOT EXISTS `idx_last_login` (`last_login`);

-- ============================================================
-- END OF SECURITY TABLES
-- ============================================================

-- ============================================================
-- FINAL STEPS
-- ============================================================

-- Reset AUTO_INCREMENT for fresh installation
-- ALTER TABLE `orders` AUTO_INCREMENT = 1;
-- ALTER TABLE `students` AUTO_INCREMENT = 1;
-- ALTER TABLE `admin_accounts` AUTO_INCREMENT = 3;
-- ALTER TABLE `inventory_items` AUTO_INCREMENT = 9;

-- Enable event scheduler for analytics
SET GLOBAL event_scheduler = ON;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================================
-- Installation Complete!
-- ============================================================
-- Next Steps:
-- 1. Update php/config/database.php with your database credentials
-- 2. Update php/config/constants.php with your SMTP settings
-- 3. Run composer install to install dependencies
-- 4. Change default admin passwords immediately
-- 5. Configure working hours in admin panel
-- 6. Add inventory items through admin dashboard
-- ============================================================

