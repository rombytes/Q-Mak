-- Migration Script: Add Student Authentication System
-- Run this on existing databases to add student login/registration features
-- Date: January 2025

USE `qmak_db`;

-- --------------------------------------------------------
-- Step 1: Add authentication fields to students table
-- --------------------------------------------------------

ALTER TABLE `students` 
ADD COLUMN `password` VARCHAR(255) NULL COMMENT 'Hashed password for student accounts' AFTER `email`,
ADD COLUMN `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Email verification status' AFTER `section`,
ADD COLUMN `verified_at` DATETIME NULL AFTER `is_verified`,
ADD COLUMN `last_login` DATETIME NULL AFTER `verified_at`,
ADD INDEX `idx_is_verified` (`is_verified`);

-- --------------------------------------------------------
-- Step 2: Add 'registration' OTP type
-- --------------------------------------------------------

ALTER TABLE `otp_verifications` 
MODIFY COLUMN `otp_type` ENUM('order', 'status', 'login', 'registration') NOT NULL DEFAULT 'order';

-- --------------------------------------------------------
-- Step 3: Update existing students to mark them as verified (optional)
-- --------------------------------------------------------

-- This sets existing student records as verified since they were created through the old system
-- Comment this out if you want to require all existing students to verify their emails
UPDATE `students` 
SET `is_verified` = 1, `verified_at` = NOW() 
WHERE `password` IS NULL;

-- --------------------------------------------------------
-- Verification Queries
-- --------------------------------------------------------

-- Check if columns were added successfully
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'qmak_db' 
AND TABLE_NAME = 'students' 
AND COLUMN_NAME IN ('password', 'is_verified', 'verified_at', 'last_login');

-- Check OTP types
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'qmak_db' 
AND TABLE_NAME = 'otp_verifications' 
AND COLUMN_NAME = 'otp_type';

-- Check index on is_verified
SHOW INDEX FROM `students` WHERE Key_name = 'idx_is_verified';

COMMIT;

-- --------------------------------------------------------
-- Migration Complete
-- --------------------------------------------------------
-- 
-- Next Steps:
-- 1. Test student registration: http://localhost/Q-Mak/pages/student/student_register.html
-- 2. Test student login: http://localhost/Q-Mak/pages/student/student_login.html
-- 3. Verify email OTP delivery is working
-- 4. Test dashboard functionality
-- 
-- Notes:
-- - Existing student records will have NULL passwords (guest orders)
-- - Students with NULL passwords can register using their existing email
-- - New registrations require @umak.edu.ph email addresses
-- - OTP verification is required for new account creation
--
