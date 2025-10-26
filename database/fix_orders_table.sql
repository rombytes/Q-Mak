-- Fix Orders Table Structure
-- Run this in phpMyAdmin SQL tab

-- Check if orders table exists, if not create it
CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` INT(11) NOT NULL AUTO_INCREMENT,
  `queue_number` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `item_name` TEXT DEFAULT NULL,
  `item_ordered` TEXT DEFAULT NULL,
  `purchasing` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
  `order_status` ENUM('pending', 'processing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
  `estimated_wait_time` INT(11) DEFAULT 10,
  `qr_code` LONGTEXT DEFAULT NULL,
  `qr_expiry` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `claimed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `queue_number` (`queue_number`),
  KEY `student_id` (`student_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add missing columns if they don't exist (safe to run multiple times)
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `item_name` TEXT DEFAULT NULL AFTER `student_id`,
ADD COLUMN IF NOT EXISTS `item_ordered` TEXT DEFAULT NULL AFTER `item_name`,
ADD COLUMN IF NOT EXISTS `purchasing` TEXT DEFAULT NULL AFTER `item_ordered`,
ADD COLUMN IF NOT EXISTS `estimated_wait_time` INT(11) DEFAULT 10 AFTER `order_status`,
ADD COLUMN IF NOT EXISTS `qr_code` LONGTEXT DEFAULT NULL AFTER `estimated_wait_time`,
ADD COLUMN IF NOT EXISTS `qr_expiry` DATETIME DEFAULT NULL AFTER `qr_code`,
ADD COLUMN IF NOT EXISTS `claimed_at` DATETIME DEFAULT NULL AFTER `updated_at`;

-- Sync data between item columns (use whichever column has data)
UPDATE `orders` 
SET `item_ordered` = COALESCE(`item_ordered`, `purchasing`, `item_name`)
WHERE `item_ordered` IS NULL OR `item_ordered` = '';

UPDATE `orders` 
SET `purchasing` = COALESCE(`purchasing`, `item_ordered`, `item_name`)
WHERE `purchasing` IS NULL OR `purchasing` = '';

-- Add first_name, last_name columns to orders for easier queries (optional but helpful)
ALTER TABLE `orders`
ADD COLUMN IF NOT EXISTS `first_name` VARCHAR(100) DEFAULT NULL AFTER `student_id`,
ADD COLUMN IF NOT EXISTS `last_name` VARCHAR(100) DEFAULT NULL AFTER `first_name`;

-- Check students table doesn't have phone column issue
-- If phone column exists and causes errors, you can drop it:
-- ALTER TABLE `students` DROP COLUMN IF EXISTS `phone`;

-- Verify structure
SHOW COLUMNS FROM `orders`;
