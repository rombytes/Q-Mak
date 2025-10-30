# Q-Mak Queue Management System

University of Makati Cooperative Queue Management System

## Overview

Q-Mak is a comprehensive web-based queue management system designed for the University of Makati (UMak) Cooperative. The system streamlines the ordering process for students, reduces wait times, and provides efficient queue management through QR code verification, OTP authentication, and real-time notifications.

## Features

### Student Portal
- **Multi-item ordering**: Place orders for 1-5 items simultaneously
- Secure OTP-based order placement with email verification
- QR code generation for order confirmation and pickup
- Real-time order status tracking with refresh functionality
- Order history with detailed item listings
- Email notifications for order updates
- Professional UI with SVG icons and modern design

### Admin Dashboard
- **Order quantity display**: Shows "X items" count for multi-item orders
- Real-time queue management with status updates
- **Student records fetching**: Automatic loading of all registered students
- **Queue history**: Displays actual items ordered with quantity indicators
- Comprehensive analytics and reporting with Chart.js integration
- Email logs monitoring with search and filter capabilities
- CSV/Excel export functionality for orders and email logs
- Archive management system for data organization
- Service configuration and management
- Role-based access control (Admin/Super Admin)
- **Session debugging tools**: Auto-check PHP session on page load

### Advanced Features
- QR code generation using Google Charts API
- Email automation with PHPMailer integration
- Archive system for data management
- Multi-level administrative controls
- Mobile-responsive design

## Technology Stack

- **Frontend:** HTML5, TailwindCSS, JavaScript (Vanilla JS)
- **Backend:** PHP 7.4+
- **Database:** MySQL 5.7+
- **Web Server:** Apache/Nginx
- **External APIs:** Google Charts API (QR codes)
- **Libraries:** 
  - PHPMailer (Email automation)
  - Chart.js (Analytics dashboard)
  - Custom modal_utils.js (Modal system)
  - Custom notifications.js (Toast notifications)

## Installation

### Quick Start

For detailed installation instructions, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)** which includes:
- Complete setup for new GitHub users
- Git installation and repository management
- XAMPP installation and configuration
- Composer dependency management
- Database setup and configuration
- Email configuration (Gmail/SMTP)
- Troubleshooting common issues

### Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server (XAMPP recommended)
- Composer (for dependency management)
- SMTP server (for email functionality)

### Basic Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/Q-Mak.git
   cd Q-Mak
   ```

2. **Install Dependencies**
   ```bash
   composer install
   
   # Or install required packages individually:
   composer require phpmailer/phpmailer:^6.8
   composer require endroid/qr-code:^4.8
   ```

3. **Database Setup**
   - Import `database/qmak_schema.sql` into your MySQL database
   - Optionally import `database/sample_data.sql` for testing
   - See `database/README.md` for detailed database documentation

4. **Configuration**
   - Edit `php/config/database.php` with your database and SMTP credentials
   - Update `BASE_URL` constant to match your environment
   - Configure email settings for OTP and notifications

5. **Access the Application**
   - Homepage: `http://localhost/Q-Mak/pages/index.html`
   - Admin Login: `http://localhost/Q-Mak/pages/admin/admin_login.html`
   - Student Login: `http://localhost/Q-Mak/pages/student/student_login.html`

## Default Accounts

### Super Administrator
- Email: `superadmin@umak.edu.ph`
- Password: `SuperAdmin123`

### Regular Administrator
- Email: `admin@umak.edu.ph`
- Password: `Admin123`

**Security Note:** Change these default passwords immediately after installation.

## Project Structure

```
Q-Mak/
├── database/                    # Database schemas and migrations
│   ├── qmak_schema.sql          # Complete database schema
│   ├── fix_database.php         # Automated database fixes
│   ├── check_admin_permissions.php  # Debug admin permissions
│   ├── migration_student_auth.sql
│   ├── sample_data.sql
│   └── README.md
├── js/                          # JavaScript utilities
│   ├── modal_utils.js           # Custom modal system (NEW)
│   ├── notifications.js         # Toast notification system
│   ├── inventory_helper.js      # Inventory management utilities
│   └── admin_archive_functions.js # Archive operations
├── pages/                       # Frontend HTML pages
│   ├── index.html               # Homepage/Landing page
│   ├── admin/                   # Admin portal pages
│   │   ├── admin_login.html     # Admin authentication
│   │   └── admin_dashboard.html # Main admin interface
│   └── student/                 # Student portal pages
│       ├── student_login.html   # Student authentication
│       ├── student_register.html # Account creation
│       ├── student_dashboard.html # Student main page
│       ├── create_order.html    # Order creation
│       ├── order_result.html    # Order confirmation with QR
│       ├── check_status.html    # Status checking
│       ├── status_display.html  # Status display
│       └── otp_verification.html # OTP verification
├── php/
│   ├── api/                     # REST API endpoints
│   │   ├── admin/               # Admin API endpoints
│   │   │   ├── admin_login.php  # Admin authentication
│   │   │   ├── admin_orders.php # Order management
│   │   │   ├── admin_students.php # Student records
│   │   │   ├── admin_reports.php # Analytics and reports
│   │   │   ├── admin_management.php # Admin accounts
│   │   │   ├── email_logs.php   # Email monitoring
│   │   │   ├── check_status.php # Order status checking
│   │   │   ├── check_session.php # Session debug endpoint (NEW)
│   │   │   ├── export_orders.php # CSV export
│   │   │   └── archive_manager.php # Archive operations
│   │   ├── student/             # Student API endpoints
│   │   │   ├── student_login.php # Student authentication
│   │   │   ├── student_register.php # Account creation
│   │   │   ├── student_session.php # Session management
│   │   │   ├── create_order.php # Order creation
│   │   │   └── verify_otp.php   # OTP verification
│   │   └── services.php         # Service management (general)
│   ├── config/                  # Configuration files
│   │   ├── database.php         # Database connection
│   │   ├── database.example.php # Example configuration
│   │   ├── constants.php        # System constants
│   │   └── email.example.php    # Example email config
│   └── utils/                   # Utility functions
│       └── email.php            # Email sending and QR generation
├── scripts/                     # Setup and utility scripts
│   ├── QUICK_SETUP.php          # Installation wizard
│   ├── setup_database.php       # Database initialization
│   ├── generate_password.php    # Password hash generator
│   └── add_archive_columns.php  # Migration scripts
├── tests/                       # Test files
├── vendor/                      # Composer dependencies
├── DIRECTORY_STRUCTURE.md       # Directory organization guide
└── README.md
```

## Database Schema

### Core Tables
- **admin_accounts** - Administrative user accounts with role-based access
- **students** - Student information (ID, name, email, college, program, year, section)
  - Removed: phone column
  - Added: email verification system
- **orders** - Order records with queue numbers and multi-item support
  - item_ordered: Comma-separated list of items
  - purchasing: Alias for item_ordered
  - estimated_wait_time: Calculated wait time
  - QR code data URI storage
- **email_logs** - Email delivery tracking and history with archiving
- **services** - Available services configuration
- **otp_verifications** - OTP codes for email verification with attempts tracking
- **settings** - System configuration parameters

### Key Features
- Foreign key constraints for data integrity
- Optimized indexes for performance
- Archive support for data management
- Comprehensive logging for audit trails

## API Endpoints

### Student APIs
- `POST /php/api/student/student_login.php` - Student authentication
- `POST /php/api/student/student_register.php` - Account registration
- `GET /php/api/student/student_session.php` - Session validation
- `POST /php/api/student/create_order.php` - Create new order
- `POST /php/api/student/verify_otp.php` - OTP verification and order creation
- `POST /php/api/student/resend_otp.php` - Resend OTP code

### Admin APIs (Authentication Required)
- `POST /php/api/admin/admin_login.php` - Admin authentication
- `GET /php/api/admin/admin_orders.php` - Retrieve orders with filtering
- `PUT /php/api/admin/admin_orders.php` - Update order status
- `GET /php/api/admin/admin_students.php` - Student records management
- `GET /php/api/admin/admin_reports.php` - Analytics and reporting data
- `GET /php/api/admin/admin_management.php` - Admin account management
- `GET /php/api/admin/email_logs.php` - Email logs with search/filter
- `GET /php/api/admin/check_status.php` - Order status checking
- `GET /php/api/admin/export_orders.php` - Export orders to CSV
- `GET /php/api/admin/export_email_logs.php` - Export email logs
- `POST /php/api/admin/archive_manager.php` - Archive management operations

### General APIs
- `POST /php/api/services.php` - Service configuration management

## Security Features

- Password hashing using bcrypt
- Session-based authentication
- SQL injection prevention with prepared statements
- XSS protection measures
- Role-based access control (Super Admin vs Regular Admin)
- OTP verification with expiration
- Input validation and sanitization

## Configuration

### Database Settings
Edit `php/config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'qmak_db');
define('DB_USER', 'username');
define('DB_PASS', 'password');
```

### Email Settings
Edit `php/config/email.php`:
```php
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_USER', 'your-email@gmail.com');
define('SMTP_PASS', 'your-app-password');
```

### System Constants
Edit `php/config/constants.php`:
```php
define('QR_EXPIRY_MINUTES', 60);
define('OTP_EXPIRY_MINUTES', 5);
define('OTP_MAX_ATTEMPTS', 3);
```

## User Roles

### Super Administrator
- Full system access
- Admin account management
- Archive deletion capabilities
- System configuration

### Regular Administrator
- Order and queue management
- Student records access
- Report generation
- Archive management (view)

### Student
- Order placement with OTP verification
- Order status tracking
- QR code generation for pickup
- Email notifications

## Development

### File Organization
- API endpoints follow RESTful conventions
- Configuration files are centralized
- Database operations use prepared statements
- Error handling with comprehensive logging

### Code Quality
- Consistent coding standards
- Input validation on all endpoints
- Session management for security
- Responsive design principles

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Verify database credentials
   - Check MySQL service status
   - Ensure database exists and is accessible

2. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall settings
   - Enable less secure apps or use app passwords

3. **QR Codes Not Displaying**
   - Check internet connection (uses Google Charts API)
   - Verify browser console for errors
   - Ensure proper URL encoding

### Debug Mode
Enable error reporting in `php/config/database.php`:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow the existing code style and structure
4. Test thoroughly before submitting
5. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete installation and setup instructions
- **[DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md)** - Detailed directory organization guide
- **[DATABASE_FIX_GUIDE.md](DATABASE_FIX_GUIDE.md)** - Database troubleshooting and fixes
- **[DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md)** - Production deployment guidelines

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact: University of Makati Cooperative
- Documentation: See guides above for detailed information

---

Developed for University of Makati Cooperative
Academic Project - 2025
