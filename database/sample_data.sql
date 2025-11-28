-- Q-Mak Sample Data
-- University of Makati Cooperative Queue Management System
-- This file contains sample data for testing and demonstration purposes

USE `qmak_db`;

-- --------------------------------------------------------
-- Sample Students
-- --------------------------------------------------------

INSERT INTO `students` 
(`student_id`, `first_name`, `last_name`, `middle_initial`, `email`, `college`, `program`, `year_level`, `section`) 
VALUES
('2021-12345', 'Juan', 'Dela Cruz', 'M', 'jdelacruz.a12345@umak.edu.ph', 'College of Engineering', 'Computer Engineering', 3, 'A'),
('2022-23456', 'Maria', 'Santos', 'R', 'msantos.a23456@umak.edu.ph', 'College of Business Administration', 'Business Management', 2, 'B'),
('2020-34567', 'Jose', 'Reyes', 'L', 'jreyes.a34567@umak.edu.ph', 'College of Education', 'Secondary Education', 4, 'C'),
('2023-45678', 'Ana', 'Garcia', 'P', 'agarcia.a45678@umak.edu.ph', 'College of Nursing', 'Nursing', 1, 'A'),
('2021-56789', 'Pedro', 'Ramos', 'S', 'pramos.a56789@umak.edu.ph', 'College of Information Technology', 'Information Technology', 3, 'D');

-- --------------------------------------------------------
-- Sample Orders
-- --------------------------------------------------------

INSERT INTO `orders` 
(`student_id`, `queue_number`, `item_name`, `quantity`, `status`, `order_date`) 
VALUES
('2021-12345', 'Q-001', 'Coffee & Drinks', 2, 'completed', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('2022-23456', 'Q-002', 'School Supplies', 1, 'ready', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('2020-34567', 'Q-003', 'Snacks & Food', 3, 'processing', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('2023-45678', 'Q-004', 'PE Uniform', 1, 'pending', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('2021-56789', 'Q-005', 'ID Lace', 2, 'pending', DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Update completed order timestamp
UPDATE `orders` SET `completed_time` = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE `queue_number` = 'Q-001';

-- Update ready order timestamp
UPDATE `orders` SET `ready_time` = DATE_SUB(NOW(), INTERVAL 45 MINUTE) WHERE `queue_number` = 'Q-002';

-- --------------------------------------------------------
-- Sample Email Logs
-- --------------------------------------------------------

INSERT INTO `email_logs` 
(`order_id`, `student_id`, `email_to`, `email_type`, `subject`, `message`, `status`, `sent_at`) 
VALUES
(1, '2021-12345', 'jdelacruz.a12345@umak.edu.ph', 'receipt', 'Order Confirmation', 'Your order has been confirmed', 'sent', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, '2021-12345', 'jdelacruz.a12345@umak.edu.ph', 'status_update', 'Order Status Update', 'Your order is ready for pickup', 'sent', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, '2022-23456', 'msantos.a23456@umak.edu.ph', 'receipt', 'Order Confirmation', 'Your order has been confirmed', 'sent', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, '2020-34567', 'jreyes.a34567@umak.edu.ph', 'receipt', 'Order Confirmation', 'Your order has been confirmed', 'sent', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(4, '2023-45678', 'agarcia.a45678@umak.edu.ph', 'receipt', 'Order Confirmation', 'Your order has been confirmed', 'sent', DATE_SUB(NOW(), INTERVAL 15 MINUTE));

-- --------------------------------------------------------
-- Sample OTP Verifications (Active/Recent)
-- --------------------------------------------------------

-- Note: OTPs are typically short-lived. These are examples only.
-- In production, old OTPs should be cleaned up regularly.

INSERT INTO `otp_verifications` 
(`email`, `otp_code`, `otp_type`, `is_verified`, `expires_at`) 
VALUES
('testuser@umak.edu.ph', '123456', 'order', 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE)),
('newstudent@umak.edu.ph', '654321', 'status', 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE));

-- --------------------------------------------------------
-- Additional Admin Account (For Testing)
-- --------------------------------------------------------

-- Test Admin Account
-- Email: testadmin@umak.edu.ph
-- Password: TestAdmin123
INSERT INTO `admin_accounts` 
(`username`, `email`, `password`, `full_name`, `is_super_admin`) 
VALUES 
('testadmin', 
 'testadmin@umak.edu.ph', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'Test Administrator', 
 0);

COMMIT;

-- --------------------------------------------------------
-- Notes:
-- --------------------------------------------------------
-- 
-- Password Hashes:
-- - SuperAdmin123: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- - Admin123: $2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm
-- - TestAdmin123: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--
-- All sample student emails follow UMak format: [firstname][lastname].a[studentnumber]@umak.edu.ph
-- 
-- Order statuses:
-- - pending: Just placed, awaiting processing
-- - processing: Being prepared by staff
-- - ready: Ready for pickup
-- - completed: Picked up by student
-- - cancelled: Cancelled by staff or system
--
-- To reset sample data, first truncate all tables then re-import qmak_schema.sql and this file.
-- 
