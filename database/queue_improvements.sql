-- ============================================================
-- Queue System Improvements Migration
-- Q-Mak Queue Management System
-- ============================================================
-- 
-- This migration adds:
-- 1. Reference numbers for unique order tracking
-- 2. Queue date for daily resets
-- 3. Completion time tracking for accurate wait estimates
-- 4. Queue analytics table
-- 5. Enhanced settings for queue management
--
-- Created: October 31, 2025
-- Version: 2.0
-- ============================================================

USE `qmak_db`;

-- ============================================================
-- STEP 1: Backup existing data (recommended)
-- ============================================================
-- Run this before migration:
-- CREATE TABLE orders_backup AS SELECT * FROM orders;

-- ============================================================
-- STEP 2: Add new columns to orders table
-- ============================================================

-- Add reference_number column (unique identifier for each order)
ALTER TABLE `orders` 
ADD COLUMN `reference_number` VARCHAR(20) NULL AFTER `order_id` 
COMMENT 'Unique reference number for tracking (e.g., REF-A7C9D2E1)';

-- Add queue_date column (for daily queue resets)
ALTER TABLE `orders` 
ADD COLUMN `queue_date` DATE NULL DEFAULT (CURDATE()) AFTER `queue_number`
COMMENT 'Date of the queue for daily reset tracking';

-- Add completion time tracking columns
ALTER TABLE `orders` 
ADD COLUMN `actual_completion_time` INT(11) NULL AFTER `estimated_wait_time`
COMMENT 'Actual time taken in minutes from creation to completion',
ADD COLUMN `started_processing_at` DATETIME NULL AFTER `created_at`
COMMENT 'When staff started processing the order',
ADD COLUMN `completed_at` DATETIME NULL AFTER `claimed_at`
COMMENT 'When order was marked as completed';

-- ============================================================
-- STEP 3: Populate queue_date for existing orders
-- ============================================================

-- Set queue_date based on created_at for existing orders
UPDATE `orders` 
SET `queue_date` = DATE(`created_at`) 
WHERE `queue_date` IS NULL;

-- ============================================================
-- STEP 4: Generate reference numbers for existing orders
-- ============================================================

-- Generate unique reference numbers for existing orders without one
UPDATE `orders` 
SET `reference_number` = CONCAT('REF-', UPPER(SUBSTRING(MD5(CONCAT(order_id, RAND())), 1, 8)))
WHERE `reference_number` IS NULL;

-- ============================================================
-- STEP 5: Update constraints and indexes
-- ============================================================

-- Drop existing queue_number unique constraint
ALTER TABLE `orders` 
DROP INDEX IF EXISTS `queue_number`;

-- Add composite unique index for queue_number per day
ALTER TABLE `orders` 
ADD UNIQUE KEY `unique_queue_per_day` (`queue_number`, `queue_date`);

-- Add unique constraint for reference_number
ALTER TABLE `orders` 
ADD UNIQUE KEY `unique_reference_number` (`reference_number`);

-- Add indexes for better query performance
ALTER TABLE `orders` 
ADD INDEX `idx_queue_date` (`queue_date`),
ADD INDEX `idx_reference_number` (`reference_number`),
ADD INDEX `idx_started_processing_at` (`started_processing_at`),
ADD INDEX `idx_completed_at` (`completed_at`);

-- ============================================================
-- STEP 6: Make columns NOT NULL after populating
-- ============================================================

-- Set reference_number and queue_date as NOT NULL
ALTER TABLE `orders` 
MODIFY `reference_number` VARCHAR(20) NOT NULL,
MODIFY `queue_date` DATE NOT NULL DEFAULT (CURDATE());

-- ============================================================
-- STEP 7: Create queue analytics table
-- ============================================================

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

-- ============================================================
-- STEP 8: Create working hours tables
-- ============================================================

-- Table for regular weekly schedule
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

-- Table for special hours/holidays
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

-- ============================================================
-- STEP 9: Add order type and scheduling columns
-- ============================================================

-- Add columns for pre-orders and scheduling
ALTER TABLE `orders`
ADD COLUMN `order_type` ENUM('immediate', 'pre-order') NOT NULL DEFAULT 'immediate' 
  COMMENT 'immediate = same day order, pre-order = scheduled for future date',
ADD COLUMN `scheduled_date` DATE NULL 
  COMMENT 'For pre-orders, the date customer wants to pick up the order',
ADD COLUMN `ordered_outside_hours` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Flag indicating order was placed outside operating hours';

-- Add indexes for performance
ALTER TABLE `orders`
ADD INDEX `idx_order_type` (`order_type`),
ADD INDEX `idx_scheduled_date` (`scheduled_date`),
ADD INDEX `idx_ordered_outside_hours` (`ordered_outside_hours`);

-- ============================================================
-- STEP 10: Add new settings
-- ============================================================

INSERT INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
('queue_start_number', '1', 'Starting queue number each day'),
('queue_reset_time', '00:00:00', 'Time to reset queue counter daily'),
('queue_max_per_day', '999', 'Maximum queue numbers allowed per day'),
('reference_prefix', 'REF', 'Prefix for reference numbers'),
('reference_length', '8', 'Length of random reference number'),
('wait_time_buffer_percent', '20', 'Buffer percentage added to calculated wait time'),
('wait_time_min', '5', 'Minimum wait time in minutes'),
('wait_time_max', '60', 'Maximum wait time in minutes'),
('enable_queue_analytics', '1', 'Enable automatic queue analytics generation'),
('analytics_lookback_days', '7', 'Number of days to use for average calculations'),
('default_opening_time', '10:00:00', 'Default opening time for COOP'),
('default_closing_time', '17:00:00', 'Default closing time for COOP'),
('closing_warning_minutes', '30', 'Minutes before closing to warn about pending orders'),
('auto_move_pending_to_next_day', '1', 'Auto-move pending orders to next business day at closing'),
('allow_preorders', '1', 'Allow orders to be placed for next business day outside hours'),
('max_preorder_days', '3', 'Maximum days in advance for pre-orders'),
('schedule_display_days', '7', 'Number of days to show in schedule display'),
('enable_lunch_break', '0', 'Enable lunch break period'),
('lunch_break_start', '12:00:00', 'Lunch break start time'),
('lunch_break_end', '13:00:00', 'Lunch break end time')
ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value),
  description = VALUES(description);

-- ============================================================
-- STEP 11: Create stored procedure for queue number generation
-- ============================================================

DELIMITER $$

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

DELIMITER ;

-- ============================================================
-- STEP 12: Create stored procedure for reference number generation
-- ============================================================

DELIMITER $$

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

-- ============================================================
-- STEP 13: Create view for today's queue
-- ============================================================

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

-- ============================================================
-- STEP 14: Create view for pending orders count
-- ============================================================

CREATE OR REPLACE VIEW `v_pending_orders_today` AS
SELECT 
  COUNT(*) as pending_count,
  AVG(estimated_wait_time) as avg_estimated_wait
FROM orders
WHERE queue_date = CURDATE()
  AND status IN ('pending', 'processing')
  AND is_archived = 0;

-- ============================================================
-- STEP 15: Create views for working hours
-- ============================================================

-- View: Current operating status
CREATE OR REPLACE VIEW `v_current_operating_status` AS
SELECT 
  DAYOFWEEK(CURDATE()) as current_day,
  CURTIME() as current_time,
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

-- View: Upcoming schedule (next 7 days)
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

-- ============================================================
-- STEP 16: Create event for daily analytics generation
-- ============================================================

-- Enable event scheduler if not already enabled
SET GLOBAL event_scheduler = ON;

DELIMITER $$

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
-- STEP 17: Verify migration
-- ============================================================

-- Check if all columns were added
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'qmak_db'
  AND TABLE_NAME = 'orders'
  AND COLUMN_NAME IN ('reference_number', 'queue_date', 'actual_completion_time', 'started_processing_at', 'completed_at');

-- Check if views were created
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'qmak_db' 
  AND TABLE_NAME IN ('v_today_queue', 'v_pending_orders_today');

-- Check if procedures were created
SELECT ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'qmak_db' 
  AND ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_NAME IN ('sp_get_next_queue_number', 'sp_generate_reference_number');

-- Show sample data
SELECT 
  order_id,
  reference_number,
  queue_number,
  queue_date,
  status,
  estimated_wait_time,
  created_at
FROM orders
ORDER BY order_id DESC
LIMIT 5;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

SELECT 
  '✓ Migration completed successfully!' as Status,
  NOW() as Timestamp,
  'Queue system improvements applied' as Message;
