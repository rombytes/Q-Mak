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
├── images/                 # Image assets
│   └── (image files)
│
├── js/                     # Shared JavaScript utilities
│   ├── admin_archive_functions.js # Archive operation utilities
│   ├── inventory_helper.js # Inventory management utilities
│   ├── modal_utils.js     # Custom modal system (showAlert/showConfirm)
│   └── notifications.js   # Toast notification system with stacking
│
├── pages/                  # Frontend HTML pages
│   ├── index.html         # Main homepage
│   ├── assets/            # Shared page assets
│   │   ├── css/           # Shared CSS files
│   │   └── js/            # Shared JavaScript files
│   ├── admin/             # Admin portal pages
│   │   ├── assets/        # Admin-specific assets
│   │   │   ├── css/       # External CSS files (2 files)
│   │   │   └── js/        # External JavaScript files (5 files)
│   │   ├── admin_dashboard.html    # Main admin interface with modals
│   │   ├── admin_login.html        # Admin authentication with reCAPTCHA v2
│   │   └── security_dashboard.html # Security monitoring and management
│   └── student/           # Student portal pages
│       ├── assets/        # Student-specific assets
│       │   ├── css/       # External CSS files (9 files)
│       │   └── js/        # External JavaScript files (9 files)
│       ├── check_status.html       # Order status checking
│       ├── create_order.html       # Order creation form
│       ├── order_result.html       # Order confirmation with QR
│       ├── otp_verification.html   # OTP verification
│       ├── queue_dashboard.html    # Real-time queue display
│       ├── status_display.html     # Status display page
│       ├── student_dashboard.html  # Main student interface
│       ├── student_login.html      # Student authentication with reCAPTCHA v2
│       └── student_register.html   # Account registration
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
│   │   │   ├── security_management.php # Security monitoring API
│   │   │   └── settings.php           # System settings management
│   │   ├── student/       # Student API endpoints
│   │   │   ├── change_password.php    # Password change API
│   │   │   ├── check_cutoff.php       # Cutoff time checking
│   │   │   ├── check_email.php        # Email existence validation
│   │   │   ├── create_order.php       # Order creation
│   │   │   ├── forgot_password.php    # Password recovery API
│   │   │   ├── get_current_order.php  # Current order retrieval
│   │   │   ├── get_order_history.php  # Order history
│   │   │   ├── get_profile.php        # Profile data
│   │   │   ├── resend_otp.php         # OTP resending
│   │   │   ├── student_login.php      # Brute force protected
│   │   │   ├── student_register.php   # Account registration
│   │   │   ├── student_session.php    # Session management
│   │   │   ├── update_profile.php     # Profile management
│   │   │   └── verify_otp.php         # Rate limited OTP verification
│   │   ├── get_captcha_config.php    # reCAPTCHA configuration
│   │   ├── inventory.php             # Inventory management API
│   │   ├── inventory_status.php      # Inventory status checking
│   │   └── services.php              # Service management
│   ├── config/            # Configuration files (gitignored)
│   │   ├── constants.php
│   │   ├── database.php              # Database credentials (gitignored)
│   │   ├── database.example.php      # Example configuration template
│   │   ├── email.example.php         # Example email configuration
│   │   ├── security_config.php       # reCAPTCHA keys (gitignored)
│   │   └── security_config.example.php # Security template
│   └── utils/             # Utility functions
│       ├── brute_force_protection.php # Security and authentication
│       ├── email.php                  # Email handler with QR generation
│       └── email_sender.php           # Simplified OTP email sender
│
├── scripts/                # Setup and utility scripts
│   ├── add_archive_columns.php
│   ├── generate_password.php    # Password hash generator (gitignored)
│   ├── handle_closing_time.php  # Automated closing time handler (cron)
│   ├── QUICK_SETUP.php          # Installation wizard
│   ├── setup_database.php       # Database initialization
│   ├── setup_security.php       # Security system installation
│   ├── SYSTEM_CHECK.php         # System diagnostics tool
│   └── test_error_log.php       # Error logging test
│
├── tests/                  # Test files
│   ├── api_qr_test.php
│   ├── complete_qr_test.php
│   ├── diagnose_otp_system.php  # OTP diagnostic tool
│   ├── direct_otp_test.php      # Direct OTP backend test
│   ├── get_email_logs.php       # Email log viewer
│   ├── OTP_TROUBLESHOOTING.md   # OTP troubleshooting guide
│   ├── qr_test.html
│   ├── qr_test.php
│   ├── test_admin_dashboard.html
│   └── test_api.php
│
├── vendor/                 # Composer dependencies (gitignored)
│
├── .gitignore              # Git ignore rules
├── .htaccess               # Apache configuration
├── CHANGELOG.md            # Project changelog
├── composer.json           # PHP dependencies
├── composer.lock           # Dependency lock file
├── DIRECTORY_STRUCTURE.md  # This file
├── LICENSE                 # MIT License
├── README.md               # Project documentation
├── SECURITY_CONFIG_SETUP.md # Security configuration guide
└── SETUP_GUIDE.md          # Complete setup instructions
```

## Code Organization (November 2025)

### CSS and JavaScript Extraction
- **Separation of Concerns**: All inline CSS and JavaScript have been extracted into external files
- **Admin Pages**: 5 JavaScript files for modular dashboard functionality
- **Student Pages**: 9 CSS files and 9 JavaScript files for clean code organization
- **Benefits**:
  - Improved browser caching and page load performance
  - Better code maintainability and debugging
  - Professional project structure
  - Easy to locate and modify styles and scripts

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
