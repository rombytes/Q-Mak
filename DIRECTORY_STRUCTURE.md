# Q-Mak Directory Structure

## Overview
This document outlines the organized directory structure of the Q-Mak project.

## Directory Layout

```
Q-Mak/
├── database/               # Database schemas and migrations
│   ├── qmak_schema.sql
│   ├── migration_student_auth.sql
│   ├── fix_orders_table.sql
│   └── sample_data.sql
│
├── docs/                   # Documentation files
│   └── (documentation files)
│
├── images/                 # Image assets
│   └── (image files)
│
├── js/                     # JavaScript files
│   └── (JS files)
│
├── pages/                  # Frontend HTML pages
│   ├── index.html         # Main homepage (formerly homepage.html)
│   ├── admin/             # Admin pages
│   │   ├── admin_login.html
│   │   ├── admin_login_debug.html
│   │   └── admin_dashboard.html
│   └── student/           # Student pages
│       ├── student_login.html
│       ├── student_register.html
│       ├── student_dashboard.html
│       ├── otp_verification.html
│       ├── create_order.html
│       ├── order_result.html
│       ├── check_status.html
│       └── status_display.html
│
├── php/                    # Backend PHP files
│   ├── api/               # API endpoints
│   │   ├── admin/         # Admin API endpoints
│   │   │   ├── admin_login.php
│   │   │   ├── admin_login_debug.php
│   │   │   ├── admin_logout.php
│   │   │   ├── admin_management.php
│   │   │   ├── admin_orders.php
│   │   │   ├── admin_password.php
│   │   │   ├── admin_reports.php
│   │   │   ├── admin_students.php
│   │   │   ├── archive_manager.php
│   │   │   ├── check_status.php
│   │   │   ├── email_logs.php
│   │   │   ├── export_email_logs.php
│   │   │   ├── export_orders.php
│   │   │   └── get_students.php
│   │   ├── student/       # Student API endpoints
│   │   │   ├── student_login.php
│   │   │   ├── student_register.php
│   │   │   ├── student_session.php
│   │   │   ├── verify_otp.php
│   │   │   ├── resend_otp.php
│   │   │   └── create_order.php
│   │   └── services.php   # General services API
│   ├── config/            # Configuration files
│   │   ├── database.php
│   │   ├── database.example.php
│   │   ├── email.example.php
│   │   └── constants.php
│   └── utils/             # Utility functions
│       └── email.php
│
├── scripts/                # Setup and utility scripts
│   ├── QUICK_SETUP.php
│   ├── setup_database.php
│   ├── add_archive_columns.php
│   ├── generate_password.php
│   └── test_error_log.php
│
├── tests/                  # Test files
│   ├── test_api.php
│   ├── test_admin_dashboard.html
│   ├── qr_test.html
│   ├── qr_test.php
│   ├── api_qr_test.php
│   └── complete_qr_test.php
│
├── vendor/                 # Composer dependencies
│
├── .gitignore
├── .htaccess
├── composer.json
├── composer.lock
├── CHANGELOG.md
├── DATABASE_FIX_GUIDE.md
├── DEPLOYMENT_NOTES.md
├── DIRECTORY_STRUCTURE.md
├── LICENSE
├── README.md
└── SETUP_GUIDE.md
```

## Key Changes

### Moved Files
- `homepage.html` → `pages/index.html`
- `QUICK_SETUP.php` → `scripts/QUICK_SETUP.php`
- `setup_database.php` → `scripts/setup_database.php`
- `add_archive_columns.php` → `scripts/add_archive_columns.php`
- `test_error_log.php` → `scripts/test_error_log.php`
- `php/generate_password.php` → `scripts/generate_password.php`

### Reorganized API Endpoints
- Admin API files moved to `php/api/admin/`
- Student API files moved to `php/api/student/`
- General services remain in `php/api/services.php`

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
