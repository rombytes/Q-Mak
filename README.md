# Q-Mak Queue Management System

University of Makati Cooperative Queue Management System

## Overview

Q-Mak is a comprehensive web-based queue management system designed for the University of Makati (UMak) Cooperative. The system streamlines the ordering process for students, reduces wait times, and provides efficient queue management through QR code verification, OTP authentication, and real-time notifications.

## Features

### Student Portal
- Secure OTP-based order placement with email verification
- QR code generation for order confirmation and pickup
- Real-time order status tracking
- Email notifications for order updates

### Admin Dashboard
- Real-time queue management with status updates
- Student records management with College, Program, Year Level, and Section
- Comprehensive analytics and reporting with Chart.js integration
- Email logs monitoring with search and filter capabilities
- CSV/Excel export functionality for orders and email logs
- Archive management system for data organization
- Service configuration and management
- Role-based access control (Admin/Super Admin)

### Advanced Features
- QR code generation using Google Charts API
- Email automation with PHPMailer integration
- Archive system for data management
- Multi-level administrative controls
- Mobile-responsive design

## Technology Stack

- **Frontend:** HTML5, TailwindCSS, JavaScript
- **Backend:** PHP 7.4+
- **Database:** MySQL 5.7+
- **Web Server:** Apache/Nginx
- **External APIs:** Google Charts API (QR codes)
- **Libraries:** PHPMailer, Chart.js

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
   - Homepage: `http://localhost/Q-Mak/homepage.html`
   - Admin Login: `http://localhost/Q-Mak/pages/admin/admin_login.html`

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
├── database/
│   └── qmak_schema.sql          # Complete database schema
├── pages/
│   ├── admin/
│   │   ├── admin_login.html     # Admin authentication
│   │   └── admin_dashboard.html # Main admin interface
│   └── student/
│       ├── order_result.html    # Order confirmation with QR
│       └── check_status.html    # Status checking page
├── php/
│   ├── api/                     # REST API endpoints
│   │   ├── admin_orders.php     # Order management
│   │   ├── admin_students.php   # Student records
│   │   ├── admin_reports.php    # Analytics and reports
│   │   ├── email_logs.php       # Email monitoring
│   │   ├── services.php         # Service management
│   │   ├── verify_otp.php       # OTP verification
│   │   ├── export_orders.php    # CSV export
│   │   ├── export_email_logs.php # Email logs export
│   │   └── archive_manager.php  # Archive operations
│   ├── config/                  # Configuration files
│   │   ├── database.php         # Database connection
│   │   ├── constants.php        # System constants
│   │   └── email.php           # Email configuration
│   └── utils/                    # Utility functions
│       └── email.php            # Email sending and QR generation
├── QUICK_SETUP.php              # Installation wizard
├── homepage.html                # Landing page
└── README.md
```

## Database Schema

### Core Tables
- **admin_accounts** - Administrative user accounts with role-based access
- **students** - Student information (ID, name, college, program, year level, section)
- **orders** - Order records with queue numbers and status tracking
- **email_logs** - Email delivery tracking and history
- **services** - Available services configuration
- **otp_verifications** - OTP codes for email verification
- **settings** - System configuration parameters

### Key Features
- Foreign key constraints for data integrity
- Optimized indexes for performance
- Archive support for data management
- Comprehensive logging for audit trails

## API Endpoints

### Student APIs
- `POST /php/api/verify_otp.php` - OTP verification and order creation
- `GET /php/api/check_status.php` - Order status checking

### Admin APIs (Authentication Required)
- `GET /php/api/admin_orders.php` - Retrieve orders with filtering
- `PUT /php/api/admin_orders.php` - Update order status
- `GET /php/api/admin_students.php` - Student records management
- `GET /php/api/admin_reports.php` - Analytics and reporting data
- `GET /php/api/email_logs.php` - Email logs with search/filter
- `POST /php/api/services.php` - Service management
- `GET /php/api/export_orders.php` - Export orders to CSV
- `POST /php/api/archive_manager.php` - Archive management operations

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
- Archive management (restore/view)

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

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact: University of Makati Cooperative
- Documentation: See IMPLEMENTATION_GUIDE.md for detailed setup instructions

---

Developed for University of Makati Cooperative
Academic Project - 2025
