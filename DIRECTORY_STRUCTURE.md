# Q-Mak Directory Structure

## Overview
This document outlines the organized directory structure of the Q-Mak project.

## Directory Layout

```
Q-Mak/
├── database/               # Database schemas and migrations
│   ├── qmak_schema.sql              # Complete schema including security tables
│   ├── migration_student_auth.sql
│   ├── fix_orders_table.sql
│   ├── sample_data.sql
│   ├── check_database.php           # Database structure checker
│   ├── fix_database.php             # Automated database fixes
│   └── README.md
│
├── docs/                   # Documentation files
│   └── (documentation files)
│
├── images/                 # Image assets
│   └── (image files)
│
├── js/                     # JavaScript files
│   ├── modal_utils.js     # NEW: Custom modal system (showAlert/showConfirm)
│   ├── notifications.js   # Toast notification system with stacking
│   ├── inventory_helper.js # Inventory management utilities
│   └── admin_archive_functions.js # Archive operation utilities
│
├── pages/                  # Frontend HTML pages
│   ├── index.html         # Main homepage (formerly homepage.html)
│   ├── admin/             # Admin pages
│   │   ├── admin_login.html        # reCAPTCHA v2 integrated
│   │   ├── admin_login_debug.html
│   │   ├── admin_dashboard.html    # Enhanced with custom modals & notifications
│   │   └── security_dashboard.html # NEW: Security monitoring and management
│   └── student/           # Student pages
│       ├── student_login.html      # reCAPTCHA v2 integrated
│       ├── student_register.html   # Enhanced with email format validation
│       ├── student_dashboard.html
│       ├── otp_verification.html   # Uses modal_utils.js
│       ├── create_order.html       # Uses modal_utils.js
│       ├── order_result.html       # Uses modal_utils.js
│       ├── check_status.html       # Uses modal_utils.js
│       └── status_display.html     # Uses modal_utils.js
│
├── php/                    # Backend PHP files
│   ├── api/               # API endpoints
│   │   ├── admin/         # Admin API endpoints
│   │   │   ├── admin_login.php       # Brute force protected
│   │   │   ├── admin_login_debug.php
│   │   │   ├── admin_logout.php
│   │   │   ├── admin_management.php
│   │   │   ├── admin_orders.php
│   │   │   ├── admin_password.php
│   │   │   ├── admin_reports.php
│   │   │   ├── admin_students.php    # Debug logging & session checks
│   │   │   ├── analytics.php         # Real-time analytics API
│   │   │   ├── archive_manager.php
│   │   │   ├── check_session.php     # Session debug endpoint
│   │   │   ├── check_status.php
│   │   │   ├── email_logs.php
│   │   │   ├── export_email_logs.php
│   │   │   ├── export_orders.php
│   │   │   ├── get_students.php
│   │   │   └── security_management.php # NEW: Security monitoring API
│   │   ├── student/       # Student API endpoints
│   │   │   ├── student_login.php     # Brute force protected
│   │   │   ├── student_register.php  # Enhanced email validation
│   │   │   ├── student_session.php
│   │   │   ├── verify_otp.php        # Rate limited with security logging
│   │   │   ├── resend_otp.php
│   │   │   ├── create_order.php      # Enhanced with EmailSender
│   │   │   ├── change_password.php   # Password change API
│   │   │   ├── forgot_password.php   # Password recovery API
│   │   │   └── update_profile.php    # Profile management API
│   │   ├── inventory.php             # NEW: Inventory management API
│   │   └── inventory_status.php      # Enhanced inventory status
│   ├── config/            # Configuration files
│   │   ├── database.php
│   │   ├── database.example.php
│   │   ├── email.example.php
│   │   ├── security_config.php          # Contains reCAPTCHA keys (gitignored)
│   │   ├── security_config.example.php  # Template for deployment
│   │   └── constants.php
│   └── utils/             # Utility functions
│       ├── email.php              # Legacy email handler (with debug logging)
│       ├── email_sender.php       # Simplified OTP email sender
│       └── brute_force_protection.php # NEW: Security and authentication protection
│
├── scripts/                # Setup and utility scripts
│   ├── QUICK_SETUP.php
│   ├── setup_database.php
│   ├── setup_security.php       # NEW: Security system installation
│   ├── add_archive_columns.php
│   ├── generate_password.php
│   ├── handle_closing_time.php  # Automated closing time handler (cron job)
│   ├── SYSTEM_CHECK.php         # Comprehensive system diagnostics
│   └── test_error_log.php
│
├── tests/                  # Test files
│   ├── test_api.php
│   ├── test_admin_dashboard.html
│   ├── qr_test.html
│   ├── qr_test.php
│   ├── api_qr_test.php
│   ├── complete_qr_test.php
│   ├── diagnose_otp_system.php  # NEW: OTP diagnostic tool
│   ├── direct_otp_test.php      # NEW: Direct OTP backend test
│   ├── get_email_logs.php       # NEW: Email log viewer
│   └── OTP_TROUBLESHOOTING.md   # NEW: OTP troubleshooting guide
│
├── vendor/                 # Composer dependencies
│
├── .gitignore
├── .htaccess
├── composer.json
├── composer.lock
├── CHANGELOG.md
├── DIRECTORY_STRUCTURE.md
├── LICENSE
├── README.md
├── SETUP_GUIDE.md
└── SECURITY_CONFIG_SETUP.md  # NEW: Security configuration guide
```

## Recent Updates (November 2025)

### Security System Implementation
- **Brute Force Protection**
  - Failed login tracking by email and IP address
  - Progressive delays with exponential backoff
  - Temporary account lockout after 5 failed attempts
  - Automatic IP blacklisting for persistent attacks
  - Google reCAPTCHA v2 integration on login pages
  - Comprehensive security audit logging
  - Real-time security dashboard for monitoring

- **Database Security Tables**
  - security_attempts: Track failed login attempts
  - security_logs: Comprehensive security event logging
  - ip_blacklist: Manage blocked IP addresses
  - captcha_challenges: CAPTCHA verification tracking

- **Configuration Management**
  - security_config.php: Contains sensitive keys (gitignored)
  - security_config.example.php: Template for deployment

## Recent Updates (October 2025)

### New Features
- **Custom Modal System** (`js/modal_utils.js`)
  - Replaces browser alerts/confirms throughout the application
  - Promise-based showAlert() and showConfirm() functions
  - Professional UI with icons, backdrop blur, and animations
  - Danger mode for destructive actions

- **Enhanced Notification System** (`js/notifications.js`)
  - Stacked toast notifications with auto-dismiss
  - Color-coded by type (success, error, warning, info)
  - Smooth slide-in/out animations
  - Non-blocking user feedback

- **Debug Tools**
  - `database/check_admin_permissions.php` - Visual admin permission checker
  - `php/api/admin/check_session.php` - Session debug endpoint
  - Auto-session check on admin dashboard load
  - Comprehensive logging in admin_students.php

### Updated Files
- **All Student Pages**: Now use modal_utils.js instead of browser alerts
  - create_order.html, check_status.html, otp_verification.html
  - status_display.html, order_result.html

- **Admin Dashboard**: Enhanced with 50+ modal replacements
  - All archive/restore operations use custom modals
  - All delete operations use danger mode confirmations
  - Auto-session debugging on page load

### Key Changes

#### Moved Files
- `homepage.html` → `pages/index.html`
- `QUICK_SETUP.php` → `scripts/QUICK_SETUP.php`
- `setup_database.php` → `scripts/setup_database.php`
- `add_archive_columns.php` → `scripts/add_archive_columns.php`
- `test_error_log.php` → `scripts/test_error_log.php`
- `php/generate_password.php` → `scripts/generate_password.php`

#### Reorganized API Endpoints
- Admin API files moved to `php/api/admin/`
- Student API files moved to `php/api/student/`
- General services remain in `php/api/services.php`

#### Session Management Notes
- PHP sessions are shared across all tabs in the same browser
- Logging in as different admins in duplicated tabs will overwrite the session
- Use different browsers or incognito windows for multi-user testing

## Path Updates Required

When referencing files, use these new paths:

### API Endpoints
- Admin APIs: `php/api/admin/[filename].php`
- Student APIs: `php/api/student/[filename].php`

### Frontend Pages
- Homepage: `pages/index.html`
- Admin pages: `pages/admin/[filename].html`
- Student pages: `pages/student/[filename].html`

### Scripts
- All setup scripts: `scripts/[filename].php`
