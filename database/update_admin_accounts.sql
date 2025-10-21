-- Update Admin Accounts Script
-- This script updates the admin table structure and creates proper admin accounts
-- Run this if you've already created the database

USE qmak_db;

-- Step 1: Add role column if it doesn't exist
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin') DEFAULT 'admin' AFTER full_name;

-- Step 2: Add index for role if it doesn't exist
ALTER TABLE admins 
ADD INDEX IF NOT EXISTS idx_role (role);

-- Step 3: Delete old admin accounts (if they exist)
DELETE FROM admins WHERE email IN ('jeromeg7000@gmail.com', 'ibangadm12@gmail.com');

-- Step 4: Insert new default admin accounts
-- Super Admin password: coopsuperadmin@123
-- Regular Admin password: coopadmin@123

INSERT INTO admins (email, password_hash, full_name, role) VALUES 
('superadmin@umakcoop.local', '$2y$10$1mapploCHKcL3IOqy3EaC.VvHRGzmSbQeYGHVT7iaJsuhTYOuqj1e', 'Super Administrator', 'super_admin'),
('admin@umakcoop.local', '$2y$10$L40YaqEmyMxTfcChovUv3OIIWp5MIwl3H.QwfEfTicYfsgcPxwO.e', 'Administrator', 'admin')
ON DUPLICATE KEY UPDATE 
    password_hash = VALUES(password_hash),
    full_name = VALUES(full_name),
    role = VALUES(role);

-- Step 5: Verify the accounts
SELECT 'Admin accounts updated successfully!' AS status;
SELECT admin_id, email, full_name, role, is_active, created_at FROM admins ORDER BY role DESC;
