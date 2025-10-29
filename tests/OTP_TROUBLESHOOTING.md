# OTP System Troubleshooting Guide

## Quick Start - Diagnose the Issue

### Step 1: Run System Diagnostics
Open in your browser:
```
http://localhost/Q-Mak/tests/diagnose_otp_system.php
```

This will check:
- ✅ Database connection
- ✅ OTP table structure
- ✅ Configuration constants
- ✅ OTP insertion/retrieval
- ✅ Email libraries (PHPMailer)
- ✅ API endpoints

### Step 2: Test OTP Backend Directly
If diagnostics pass, test the backend directly:
```
http://localhost/Q-Mak/tests/direct_otp_test.php
```

This bypasses the frontend and tests:
- OTP generation
- Database storage
- OTP verification
- Expiry checking

### Step 3: Test Full Flow
If backend works, test the complete flow:
```
http://localhost/Q-Mak/tests/test_otp_complete.php
```

## Common Issues & Fixes

### Issue 1: Database Connection Failed
**Error:** "Database connection failed"

**Fix:**
1. Start MySQL in XAMPP Control Panel
2. Check credentials in `php/config/database.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   define('DB_NAME', 'qmak_db');
   ```
3. Import database schema:
   - Open phpMyAdmin: http://localhost/phpmyadmin
   - Create database: `qmak_db`
   - Import: `database/qmak_schema.sql`

### Issue 2: OTP Table Missing
**Error:** "otp_verifications table doesn't exist"

**Fix:**
1. Open phpMyAdmin
2. Select `qmak_db` database
3. Run this SQL:
```sql
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
```

### Issue 3: Constants Not Defined
**Error:** "Undefined constant OTP_EXPIRY_MINUTES"

**Fix:**
Constants are now defined in both:
- `php/config/database.php` (lines 23-24)
- `php/config/constants.php` (lines 31-36)

We've already fixed this in:
- ✅ `php/api/student/student_register.php`
- ✅ `php/api/student/create_order.php`
- ✅ `php/api/student/resend_otp.php`

### Issue 4: PHPMailer Not Found
**Error:** "Mailer unavailable" or "Class PHPMailer not found"

**Fix:**
1. Open terminal in project root
2. Run:
   ```bash
   composer install
   ```
3. If composer not installed, download from: https://getcomposer.org/

**Note:** Emails won't send but OTP will still work (codes shown in dev mode)

### Issue 5: Email Not Sending
**Error:** "SMTP Error" or "Failed to send email"

**Fix:**
Update SMTP settings in `php/config/database.php`:
```php
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'your-app-password');  // NOT your regular password
```

**Gmail App Password Setup:**
1. Go to: https://myaccount.google.com/apppasswords
2. Generate new app password
3. Copy the 16-character code
4. Paste in SMTP_PASSWORD (no spaces)

### Issue 6: OTP Expired Immediately
**Error:** "OTP has expired" right after generation

**Fix:**
Check server timezone and MySQL timezone:
```php
// Add to database.php after getConnection()
$db->exec("SET time_zone = '+08:00'");  // Philippines timezone
```

### Issue 7: Frontend Error - Network Request Failed
**Error in browser console:** "Failed to fetch" or "Network error"

**Fix:**
1. Check if XAMPP Apache is running
2. Verify API path is correct:
   ```javascript
   const API_BASE = '../../php/api';  // Relative path
   ```
3. Check browser console for specific error
4. Test API directly: http://localhost/Q-Mak/php/api/student/create_order.php

### Issue 8: Session Issues
**Error:** "Registration session expired"

**Fix:**
Make sure session is started. Already fixed in files, but verify:
```php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
```

## Verification Checklist

Before asking for help, verify:

- [ ] XAMPP Apache & MySQL are running
- [ ] Database `qmak_db` exists
- [ ] All tables imported from schema
- [ ] `composer install` was run
- [ ] Database credentials correct
- [ ] Browser console shows no errors
- [ ] Ran diagnostic tool (diagnose_otp_system.php)
- [ ] Tested backend directly (direct_otp_test.php)

## Testing Sequence

### Test Order Flow:
1. Go to: http://localhost/Q-Mak/tests/direct_otp_test.php
2. Click "Generate OTP"
3. Copy the OTP code shown
4. Paste in verification field
5. Click "Verify OTP"
6. Should show "✅ OTP VERIFIED SUCCESSFULLY!"

### Test Registration Flow:
1. Go to: http://localhost/Q-Mak/tests/test_otp_complete.php
2. Fill registration form
3. Click "Send Registration OTP"
4. Copy OTP code
5. Enter in verification field
6. Click "Verify"
7. Should create account successfully

## What Each File Does

| File | Purpose |
|------|---------|
| `student_register.php` | Handles account registration + OTP |
| `create_order.php` | Handles guest orders + OTP |
| `verify_otp.php` | Verifies OTP and completes action |
| `resend_otp.php` | Resends OTP with cooldown |
| `database.php` | Database connection & config |
| `constants.php` | System constants (OTP expiry, etc) |
| `email.php` | Email sending (PHPMailer) |

## Still Not Working?

If OTP still doesn't work after all checks:

1. **Check PHP Error Log:**
   - XAMPP: `xampp/apache/logs/error.log`
   - Look for SQL errors or PHP warnings

2. **Enable Debug Mode:**
   Add to top of API files:
   ```php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   ```

3. **Check Database Logs:**
   Run in phpMyAdmin:
   ```sql
   SELECT * FROM otp_verifications ORDER BY created_at DESC LIMIT 10;
   ```
   
4. **Test Direct SQL:**
   ```sql
   INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
   VALUES ('test@umak.edu.ph', '123456', 'order', DATE_ADD(NOW(), INTERVAL 10 MINUTE));
   ```
   
   If this fails, there's a database issue.

## Need More Help?

Provide this information:
1. Screenshots from diagnostic tool
2. Browser console errors (F12 → Console)
3. PHP error log entries
4. Database table structure: `DESCRIBE otp_verifications;`
5. Test result from direct_otp_test.php
