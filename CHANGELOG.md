# Changelog

All notable changes to Q-Mak Queue Management System will be documented in this file.

## [1.9.0] - 2025-10-30

### Changed - Export UI Redesign 🎨
- **Hidden Checkboxes by Default**: Cleaner interface with checkboxes hidden until needed
  - Checkboxes only appear when entering "export mode"
  - Single "Export" button replaces multiple export buttons
  - Removed redundant "Export to Excel" buttons
  
- **New Export Workflow**:
  1. Click "Export" button → Checkboxes appear
  2. Choose "Export All" or select specific items
  3. Click "Export Selected (X)" for chosen records
  4. Click "Cancel" to exit export mode
  5. Auto-exit after export completes

- **Smart Selection Mode**:
  - `enterStudentExportMode()` / `exitStudentExportMode()` functions
  - `enterAdminLogExportMode()` / `exitAdminLogExportMode()` functions
  - Real-time counter in button: "Export Selected (3)"
  - Automatic cleanup after export

### Fixed
- ✅ Export no longer fails when no items selected (removed that requirement)
- ✅ Removed confusion from multiple export buttons
- ✅ Interface less cluttered with checkboxes hidden by default

### UI Improvements
- Action buttons appear/disappear based on export mode
- "View Archived" button hides during export mode (Student Records)
- Cancel button provides clear exit from selection
- Consistent workflow across Student Records and Admin Logs

### Backend
- No changes required - existing export APIs work perfectly
- `export_students.php` continues to support GET/POST
- `export_admin_logs.php` continues to support GET/POST

### Documentation
- Created `EXPORT_UI_REDESIGN.md` with full implementation details

## [1.8.1] - 2025-10-30

### Added - Export with Selection Feature
- **Selective Export**: Choose specific records to export with checkboxes
  - Added checkbox column to Student Records table
  - Added checkbox column to Admin Logs table
  - "Select All" checkbox in table headers
  - Real-time selection counter (e.g., "5 selected")
  - "Export Selected" button appears when items are selected
  - Works alongside existing "Export All" functionality

### Updated - Export Functionality
- **Export Students**: Can now export ALL or SELECTED students
- **Export Admin Logs**: Can now export ALL or SELECTED logs (Super Admin only)
- Both GET (export all) and POST (export selected) request methods supported
- Backend validates selected IDs and handles both scenarios

### UI Improvements
- Selection buttons auto-appear/disappear based on selection
- Visual feedback with selection counter
- Familiar interface matching email logs pattern
- Renamed "Export to Excel" to "Export All" in admin logs for clarity

## [1.8.0] - 2025-10-30

### Added - Export to Excel Feature
- **Student Records Export**: Export student data to Excel (CSV format)
  - Accessible by all admins and super admins
  - Includes personal info, academic details, order history, and archive status
  - Respects search filters and archived view
  - File: `php/api/admin/export_students.php`

- **Email Logs Export**: Export email delivery logs to Excel
  - Accessible by all admins and super admins
  - Includes email details, status, timestamps, and error messages
  - Respects type, status, and search filters
  - Button integration added to Email Logs tab

- **Admin Logs Export**: Export admin activity logs to Excel (Super Admin Only)
  - Accessible only by super admins
  - Includes complete admin activity history with IP addresses
  - Button visible only to super admins
  - Respects all filter options (admin, action type, date, search)
  - File: `php/api/admin/export_admin_logs.php`

### Features
- UTF-8 BOM encoding for proper Excel compatibility
- Timestamp-based file naming (e.g., `students_2025-10-30_143052.csv`)
- All exports logged in admin_logs for audit trail
- Filter-aware exports (exports only filtered data)
- Professional green button design with Excel icon
- Security checks for authentication and authorization

### Documentation
- Added `EXPORT_TO_EXCEL_FEATURE.md` - Complete technical documentation
- Added `EXPORT_QUICK_REFERENCE.md` - Quick usage guide
- Added `EXPORT_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- Added `EXPORT_BUTTON_LOCATIONS.md` - Visual button location guide

### Security
- All exports require admin authentication
- Admin logs export restricted to super admins (returns 403 for regular admins)
- All export actions logged with admin ID, IP address, and record count

## [1.3.0] - 2025-01-28

### Added - Inventory Management System
- **Inventory stock management**: Admins can mark items as "In Stock" or "Out of Stock"
- **Stock validation**: Out-of-stock items automatically disabled in order forms
- **Visual indicators**: Grayed-out items with "(Out of Stock)" labels
- **Enhanced admin UI**: Beautiful gradient design with icons and animations
- **Inventory tracking**: Shows last updated timestamp for each item
- **8 default items**: ID Lace, School Uniform, PE Uniform, NSTP Shirt, School Patch, Book/Manual, School Supplies, UMak Merchandise

### Added - Admin Features
- **Admin management tab**: Super admins can create/edit/delete admin accounts
- **Email log archiving**: Archive, restore, and permanently delete email logs
- **Role-based permissions**: Regular admins vs Super admins
- **Batch operations**: Select multiple email logs for archiving/deletion
- **Top items fix**: Individual item counting for multi-item orders

### Added - Database Tools
- **Consolidated schema**: Single `qmak_schema.sql` with all 8 tables
- **Migration checker**: Automated `check_database.php` tool
- **Smart migrations**: Only adds missing tables/columns, preserves data

### Fixed
- **Item counting**: Multi-item orders now counted individually (e.g., "ID Lace, NSTP Shirt" = 2 items)
- **Admin tab visibility**: Super admin management tab now shows correctly
- **Stock checking**: Works in both student dashboard and create order page

### Changed
- Database: Added `inventory_items` table
- Orders: Added `quantity` and `order_type` columns
- Email logs: Added archive tracking columns (`is_archived`, `archived_at`, `archived_by`)
- Inventory UI: Modern gradient design with purple/blue theme
- Database folder: Consolidated from multiple migration files to single schema

### Database Changes
```sql
-- New table
CREATE TABLE inventory_items (...)

-- New columns
ALTER TABLE orders ADD quantity INT(11) DEFAULT 1;
ALTER TABLE orders ADD order_type ENUM('walk-in', 'online') DEFAULT 'online';
ALTER TABLE email_logs ADD is_archived TINYINT(1) DEFAULT 0;
ALTER TABLE email_logs ADD archived_at DATETIME NULL;
ALTER TABLE email_logs ADD archived_by INT(11) NULL;
```

### Migration Path
- **New installations**: Import `qmak_schema.sql`
- **Existing databases**: Run `check_database.php` in browser

---

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
