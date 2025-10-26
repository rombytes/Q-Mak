# Changelog

All notable changes to the Q-Mak Queue Management System.

## [1.2.0] - 2025-01-27

### Added
- **Multi-item ordering**: Students can now order 1-5 items in a single order
- **Order quantity display**: Admin dashboard shows item count for orders with multiple items
- **Student records fetching**: Admin can now view all registered students
- **Queue history improvements**: Actual items now displayed instead of placeholders
- **Refresh button**: Order history has refresh functionality
- **Professional UI**: Replaced emoji icons with professional SVG icons

### Fixed
- **Critical**: OTP verification 500 error - Fixed data structure sent to verify_otp.php
- **Critical**: Student login error - Removed non-existent phone column references
- **Database**: Updated orders table schema to support multiple items
- **UI/UX**: Consistent design across student dashboard and create order pages

### Changed
- Students table: Removed phone column
- Orders table: Added item_ordered, purchasing, estimated_wait_time columns
- OTP verification: Now sends complete order_data object
- Admin dashboard: Shows "X items: ..." format for multiple items
- Student dashboard: Dynamic quantity selector (1-5 items)

### Security
- Proper password hashing for student accounts
- Email verification system for new registrations
- OTP validation with attempt limits

---

## [1.1.0] - 2025-01-20

### Added
- Student registration with email verification
- OTP-based order confirmation
- QR code generation for orders
- Admin dashboard with queue management
- Email notification system
- Order status tracking

### Features
- Student authentication system
- Admin multi-level access (Super Admin / Regular Admin)
- Real-time queue monitoring
- Order history tracking
- Email logs with archiving capability

---

## [1.0.0] - 2025-01-15

### Initial Release
- Basic queue management system
- Student and admin authentication
- Order creation and processing
- Email notifications
- QR code functionality
- Database schema setup

---

## Database Migrations

### v1.2.0 Migration
```sql
-- Remove phone column from students
ALTER TABLE students DROP COLUMN IF EXISTS phone;

-- Update orders table for multiple items
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS item_ordered TEXT NULL,
ADD COLUMN IF NOT EXISTS purchasing TEXT NULL,
ADD COLUMN IF NOT EXISTS estimated_wait_time INT(11) DEFAULT 10;
```

### Notes
- Always backup database before running migrations
- Test in development environment first
- Check application logs after deployment
