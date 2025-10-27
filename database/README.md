# Database Directory

This directory contains all database-related SQL files for the Q-Mak Queue Management System.

## 📁 Files

### qmak_schema.sql
**Complete database schema with all tables and default data (MAIN FILE)**

This file contains:
- Database creation statement
- All 8 table structures with proper indexes and foreign keys
- Default admin accounts (superadmin and admin)
- Default services configuration
- Default system settings
- Default inventory items
- Optimized for MySQL 5.7+ and MariaDB 10.2+

**Usage for New Installation:**
```bash
# Import the complete schema
mysql -u root -p < qmak_schema.sql

# Or via phpMyAdmin: Import tab > Choose file > qmak_schema.sql > Go
```

### check_database.php
**Automated migration checker and updater**

**Safe to run on existing databases** - only adds missing tables/columns.

**Usage:**
1. Open in browser: `http://localhost/Q-Mak/database/check_database.php`
2. Review what's missing
3. Auto-apply migrations

**Features:**
- ✅ Checks all tables and columns
- ✅ Adds missing structure automatically
- ✅ Safe to run multiple times
- ✅ Shows current database status
- ✅ No data loss

**Use this if:** You have an existing database and want to add new features (inventory system, email archiving, etc.)

### sample_data.sql
**Optional sample/test data for development and testing.**

This file contains:
- 5 sample student records
- 5 sample orders with various statuses
- Sample email logs
- Sample OTP verifications
- Additional test admin account

**Usage:**
```bash
# Import after importing qmak_schema.sql
mysql -u root -p qmak_db < sample_data.sql
```

**Note:** Only use this in development/testing environments. Do not import sample data into production databases.

## Database Structure

### Core Tables

1. **admin_accounts**
   - Stores admin user credentials
   - Supports role-based access (Super Admin / Regular Admin)
   - Passwords are hashed using bcrypt

2. **students**
   - Student information and academic details
   - Linked to orders via student_id
   - Email used for OTP verification

3. **orders**
   - Order records with queue numbers
   - Tracks order status lifecycle
   - Stores QR code data for pickup verification
   - Supports archiving for data management

4. **email_logs**
   - Tracks all emails sent by the system
   - Useful for debugging email delivery issues
   - Supports filtering and searching in admin panel

5. **services**
   - Configurable list of available services
   - Each service has estimated preparation time
   - Can be enabled/disabled without deletion

6. **otp_verifications**
   - Temporary OTP codes for email verification
   - Expires after configured time period
   - Tracks verification attempts for security

7. **settings**
   - System-wide configuration parameters
   - Queue number prefix, expiry times, etc.
   - Can be modified via admin interface

8. **inventory_items**
   - Manages stock availability for items
   - Controls which items can be ordered
   - Updated by admins via dashboard
   - Prevents out-of-stock items from being ordered

## Database Indexes

All tables include optimized indexes for:
- Primary keys (auto-indexed)
- Foreign keys
- Frequently queried columns (email, queue_number, status, etc.)
- Date/time fields used in sorting and filtering

## Foreign Key Relationships

```
students (student_id)
    └── orders (student_id) [CASCADE DELETE/UPDATE]
```

Email logs do not have foreign key constraints to allow logging of emails sent before order/student records exist (e.g., OTP emails).

## Default Accounts

### Super Administrator
- **Email:** superadmin@umak.edu.ph
- **Password:** SuperAdmin123
- **Capabilities:** Full system access, manage admins, delete archives

### Regular Administrator  
- **Email:** admin@umak.edu.ph
- **Password:** Admin123
- **Capabilities:** Manage orders, view reports, restore archives

### Test Admin (sample_data.sql only)
- **Email:** testadmin@umak.edu.ph
- **Password:** TestAdmin123

**IMPORTANT:** Change all default passwords immediately after installation in production environments.

## Database Configuration

The database connection settings are configured in:
```
php/config/database.php
```

Default XAMPP settings:
```php
DB_HOST: localhost
DB_USER: root
DB_PASS: (empty)
DB_NAME: qmak_db
```

## Database Maintenance

### Backup

**Manual Backup:**
```bash
# Full database backup
mysqldump -u root -p qmak_db > qmak_backup_$(date +%Y%m%d).sql

# Structure only
mysqldump -u root -p --no-data qmak_db > qmak_structure.sql

# Data only
mysqldump -u root -p --no-create-info qmak_db > qmak_data.sql
```

**Automated Backup (Windows Task Scheduler / Linux Cron):**
```bash
# Add to crontab for daily backup at 2 AM
0 2 * * * mysqldump -u root -pYOURPASSWORD qmak_db > /backups/qmak_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
# Restore from backup
mysql -u root -p qmak_db < qmak_backup_20250126.sql
```

### Clean Old Data

```sql
-- Remove verified OTPs older than 24 hours
DELETE FROM otp_verifications 
WHERE is_verified = TRUE 
AND verified_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Remove expired unverified OTPs
DELETE FROM otp_verifications 
WHERE is_verified = FALSE 
AND expires_at < NOW();

-- Archive completed orders older than 90 days
UPDATE orders 
SET is_archived = 1, archived_at = NOW() 
WHERE status = 'completed' 
AND completed_time < DATE_SUB(NOW(), INTERVAL 90 DAY) 
AND is_archived = 0;
```

## Troubleshooting

### Error: "Table doesn't exist"
```bash
# Re-import schema
mysql -u root -p < qmak_schema.sql
```

### Error: "Duplicate entry for key 'PRIMARY'"
```bash
# Drop and recreate database
mysql -u root -p
> DROP DATABASE qmak_db;
> exit
mysql -u root -p < qmak_schema.sql
```

### Error: "Foreign key constraint fails"
Ensure you import tables in the correct order:
1. students (parent table)
2. orders (child table referencing students)
3. All other tables

The qmak_schema.sql file is already ordered correctly.

### Check Table Structure
```sql
-- View table structure
DESCRIBE students;
SHOW CREATE TABLE orders;

-- View all tables
SHOW TABLES;

-- View indexes
SHOW INDEX FROM orders;
```

## 🔄 Database Migration

### For New Installations
Run `qmak_schema.sql` - creates everything from scratch.

### For Existing Databases
Run `check_database.php` in your browser:
```
http://localhost/Q-Mak/database/check_database.php
```

This will:
1. Check what's missing
2. Add new tables (e.g., inventory_items)
3. Add new columns (e.g., orders.quantity, orders.order_type)
4. Preserve all your existing data

**Always backup first!**
```bash
mysqldump -u root -p qmak_db > backup_$(date +%Y%m%d).sql
```

## Performance Optimization

### Index Analysis
```sql
-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = "qmak_db"
ORDER BY (data_length + index_length) DESC;

-- Analyze slow queries
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
```

### Recommendations
- Regularly archive old completed orders
- Clean up old OTP records (automated task recommended)
- Monitor table sizes and index usage
- Use EXPLAIN to optimize complex queries
- Consider partitioning for large tables (>1M rows)

## Character Set and Collation

All tables use:
- **Character Set:** utf8mb4 (Full Unicode support including emojis)
- **Collation:** utf8mb4_unicode_ci (Case-insensitive Unicode)

This ensures proper support for:
- Filipino names with special characters
- Accented characters
- Emojis in notes/messages
- International character sets

## Timezone

Database timestamps use server timezone. Ensure consistent timezone:

```sql
-- Check current timezone
SELECT @@global.time_zone, @@session.time_zone;

-- Set timezone (add to my.cnf/my.ini)
[mysqld]
default-time-zone='+08:00'  # Philippines timezone
```

Or in PHP:
```php
date_default_timezone_set('Asia/Manila');
```

## Security Recommendations

1. **Change default passwords immediately**
2. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)
3. **Restrict database user permissions** (don't use root in production)
4. **Enable MySQL SSL** for remote connections
5. **Regular backups** stored securely off-server
6. **Monitor access logs** for suspicious activity
7. **Keep MySQL updated** to latest stable version

## Support

For database-related issues:
- Check MySQL error log: `C:\xampp\mysql\data\mysql_error.log` (Windows)
- Check slow query log if enabled
- Review PHP error logs for connection issues
- Verify database credentials in `php/config/database.php`

---

**Last Updated:** January 2025
**Database Version:** 1.0
**Compatible with:** MySQL 5.7+, MariaDB 10.2+
