# Q-Mak COOP Order System

> A modern web-based queue management and order system for the University of Makati Cooperative with enhanced QR codes and responsive email templates

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![PHP](https://img.shields.io/badge/PHP-7.4+-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Build](https://img.shields.io/badge/Build-Enhanced-brightgreen.svg)

**Enhanced with QR code integration and modern email UI**

## Overview

Q-Mak is a comprehensive order management system designed for the University of Makati (UMak) Cooperative. It streamlines the ordering process for students, reduces wait times, and provides efficient queue management through QR code verification and real-time notifications.

**Developed as part of academic requirements at University of Makati**

## Features

### For Students
- **Easy Order Placement** - Simple form-based ordering system
- **Email OTP Verification** - Secure order confirmation via beautiful email templates
- **QR Code Generation** - High-quality QR codes for order pickup with enhanced error handling
- **Queue Management** - Real-time queue number and wait time estimates
- **Push Notifications** - Browser notifications for order updates
- **Order Status Tracking** - Check order status anytime
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

### For Administrators
- **Modern Admin Dashboard** - Comprehensive order management interface with analytics
- **Real-time Analytics** - Track orders, queue status, and performance metrics
- **Order Processing** - Update order status with one-click actions
- **Order History** - View and manage historical orders with search and filters
- **Archive System** - Archive completed orders for record-keeping
- **Email Management** - Monitor email delivery status and logs

### Technical Features
- **Enhanced Email System** - Beautiful responsive email templates with modern UI/UX
- **Advanced QR Integration** - QR codes embedded in email receipts with fallback handling
- **Secure Authentication** - Admin login with bcrypt password hashing
- **Email Integration** - Automated OTP and receipt emails via SMTP with delivery tracking
- **Modern UI/UX** - Clean, responsive design with Tailwind CSS and smooth animations
- **Mobile-First Design** - Optimized for all devices and screen sizes
- **Interactive Elements** - Smooth transitions, hover effects, and visual feedback
- **Performance Optimized** - Fast loading with optimized assets and queries

## Recent Enhancements

### QR Code System
- **Enhanced Generation** - Improved QR code quality with better error handling
- **Email Integration** - QR codes automatically embedded in email receipts
- **Mobile Optimization** - Responsive QR codes that work on all devices
- **Fallback Support** - Alternative verification methods when QR codes fail

### Email UI/UX
- **Modern Templates** - Professional, responsive email designs
- **Mobile-Responsive** - Optimized layouts for mobile email clients
- **Brand Consistency** - UMak COOP branding throughout all communications
- **Interactive Elements** - Clickable buttons and clear call-to-actions
- **Accessibility** - Proper contrast, readable fonts, and screen reader support

## System Architecture

### Frontend
- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first styling
- **JavaScript (ES6+)** - Modern vanilla JavaScript
- **QRCode.js** - QR code generation
- **Inter Font** - Professional typography

### Backend
- **PHP 7.4+** - Server-side logic
- **MySQL 8.0+** - Database management
- **RESTful API** - JSON-based communication
- **PHPMailer** - Email delivery

### Database Schema
- **Students** - Student information and profiles
- **Orders** - Order details and queue management
- **Admins** - Administrator accounts with role-based access
- **OTP Verifications** - Temporary verification codes
- **Email Logs** - Email delivery tracking

## Installation

### Prerequisites
- PHP 7.4 or higher
- MySQL 8.0 or higher
- Apache/Nginx web server
- Composer (for dependencies)
- Git (for version control)

### Setup Instructions

#### Step 1: Clone the Repository
```bash
git clone https://github.com/rombytes/Q-Mak.git
cd Q-Mak
```

#### Step 2: Install Dependencies
```bash
composer install
```

#### Step 3: Database Configuration
1. Create a new MySQL database:
```sql
CREATE DATABASE qmak_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import the database schema:
```bash
mysql -u your_username -p qmak_db < database/qmak_schema.sql
```

3. Configure database and email settings:
```bash
cp php/config/database.example.php php/config/database.php
```

4. Edit `php/config/database.php` with your credentials:
```php
// Database settings
define('DB_HOST', 'localhost');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_NAME', 'qmak_db');

// Email settings (for SMTP)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'your-app-password');
```

#### Step 4: Admin Setup
The admin accounts are automatically created when you import the database schema. No additional setup is required for basic functionality.

**Optional:** If you need to create additional admin accounts or reset passwords, you can use the setup script:
```bash
php php/generate_password.php
```

#### Step 5: Access the System
1. Start your web server (XAMPP/WAMP)
2. Open your browser
3. Navigate to: `http://localhost/Q-Mak/homepage.html`
4. For admin: `http://localhost/Q-Mak/pages/admin/login.html`

### Default Admin Credentials

#### Super Administrator (Full Access)
- **Email:** `superadmin@umakcoop.local`
- **Password:** `coopsuperadmin@123`
- **Role:** Super Admin

#### Regular Administrator
- **Email:** `admin@umakcoop.local`
- **Password:** `coopadmin@123`
- **Role:** Admin

**IMPORTANT: Change these passwords immediately after first login!**

### Alternative Setup (Standalone Email Config)
If you prefer separate email configuration:

```bash
cp php/config/email.example.php php/config/email.php
```

Edit `php/config/email.php` with your SMTP settings.

## Usage

### For Students

#### Creating an Order
1. Go to homepage
2. Click "Order Now"
3. Select "Create Order"
4. Fill in your information:
   - Student ID
   - Name
   - Email (for OTP)
   - College and Program
   - Item to order
5. Submit form
6. Check email for OTP code
7. Enter OTP to verify
8. Receive QR code for pickup

#### Checking Order Status
1. Click "Check Order Status"
2. Enter your email
3. Receive OTP via email
4. Enter OTP to view status
5. See current order status and queue position

### For Administrators

#### Managing Orders
1. Log in to admin dashboard
2. View all pending orders
3. Update order status as needed:
   - **Pending** - Order received, waiting to process
   - **Processing** - Currently preparing the order
   - **Ready** - Order ready for pickup
   - **Completed** - Order picked up
   - **Cancelled** - Order cancelled
4. Archive completed orders
5. View analytics and reports

## Project Structure

```
Q-Mak/
├── homepage.html              # Main entry point
├── README.md                  # Project documentation
├── .gitignore                 # Git ignore rules
├── composer.json              # PHP dependencies
├── composer.lock              # Dependency lock file
│
├── docs/                      # Documentation and guides
│   ├── GIT_COMMANDS_CHEATSHEET.md
│   ├── GITHUB_SETUP_GUIDE.md
│   └── *.md
│
├── tests/                     # Test files and validation scripts
│   ├── test_api.php          # API testing and diagnostics
│   ├── qr_test.php           # QR code generation tests
│   ├── complete_qr_test.php  # End-to-end QR system tests
│   ├── api_qr_test.php       # API integration tests
│   └── *.html                # Visual testing interfaces
│
├── pages/                     # HTML pages
│   ├── admin/                 # Admin interface
│   │   ├── login.html
│   │   └── dashboard.html
│   └── student/               # Student interface
│       ├── create_order.html
│       ├── check_status.html
│       ├── otp_verification.html
│       └── order_result.html
│
├── js/                        # JavaScript files
│   └── notifications.js       # Push notifications
│
├── images/                    # Static assets
│   └── UMAK COOP.png         # Logo and branding
│
├── php/                       # PHP backend
│   ├── config/                # Configuration files
│   │   ├── database.example.php  # Database setup template
│   │   ├── email.example.php     # Email configuration template
│   │   ├── database.php          # Main configuration (DB + Email)
│   │   └── constants.php         # Application constants
│   │
│   ├── utils/                 # Utility functions
│   │   └── email.php          # Enhanced email service with templates
│   │
│   └── api/                   # REST API endpoints
│       ├── create_order.php
│       ├── verify_otp.php
│       ├── check_status.php
│       ├── admin_login.php
│       └── admin_*.php
│
├── database/                  # Database files
│   ├── qmak_schema.sql        # Complete database schema
│   └── update_admin_accounts.sql
│
└── vendor/                    # Composer packages (PHPMailer, etc.)
```

## Security Features

- **Password Hashing** - Bcrypt algorithm for secure password storage
- **OTP Verification** - Email-based one-time passwords
- **Session Management** - Secure session handling
- **SQL Injection Prevention** - Prepared statements
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Token-based validation
- **Role-Based Access** - Super Admin and Admin roles

## Technologies Used

### Frontend
- **HTML5** - Semantic markup with modern standards
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **JavaScript (ES6+)** - Modern vanilla JavaScript with async/await
- **QRCode.js** - QR code generation for web interfaces
- **Google Fonts (Inter)** - Professional typography
- **PWA Features** - Progressive web app capabilities

### Backend
- **PHP 7.4+** - Server-side logic with modern practices
- **MySQL 8.0+** - Database management with advanced features
- **PHPMailer** - Professional email delivery system
- **Composer** - PHP dependency management
- **RESTful API** - JSON-based communication with error handling

### Development Tools
- **Git** - Version control with conventional commits
- **XAMPP/WAMP** - Local development environment
- **Visual Studio Code** - Code editor with PHP support
- **Endroid QR Code** - Advanced QR code generation library

### Email System Features
- **Responsive Templates** - Mobile-optimized email designs
- **Template Engine** - Dynamic content with PHP variables
- **Delivery Tracking** - Email status logging and monitoring
- **Error Handling** - Graceful fallbacks when email fails
- **Brand Consistency** - Professional UMak COOP styling

## API Endpoints

### Student Endpoints
- `POST /php/api/create_order.php` - Create new order with validation
- `POST /php/api/verify_otp.php` - Verify OTP code and process order
- `GET /php/api/check_status.php` - Check order status with email OTP

### Admin Endpoints
- `POST /php/api/admin_login.php` - Admin authentication with session management
- `GET /php/api/admin_orders.php` - Get all orders with filtering options
- `PUT /php/api/update_order_status.php` - Update order status (pending → completed)
- `POST /php/api/archive_order.php` - Archive completed orders
- `GET /php/api/admin_analytics.php` - Get system analytics and metrics

### Configuration
- Database connection with singleton pattern
- Email configuration with PHPMailer integration
- Constants-based configuration for security
- Environment-specific settings support

## Testing

The project includes comprehensive testing for quality assurance:

### Test Coverage
- **API Testing** - `tests/test_api.php` (system diagnostics)
- **QR Code Testing** - `tests/qr_test.php` (generation validation)
- **End-to-End Testing** - `tests/complete_qr_test.php` (full workflow)
- **Integration Testing** - `tests/api_qr_test.php` (API + QR combination)

### Running Tests
```bash
# Run API tests
php tests/test_api.php

# Test QR code generation
php tests/qr_test.php

# Full system test
php tests/complete_qr_test.php

# Visual testing (open in browser)
open tests/qr_test.html
```

**See `tests/` folder for all available tests!**

## Acknowledgments

- **University of Makati** - For the opportunity to develop this system
- **UMak Cooperative** - For the use case and requirements
- **Faculty Advisors** - For guidance and support
- **Open Source Community** - For PHPMailer, Tailwind CSS, and other libraries

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Developer:** rombytes  
**GitHub:** [https://github.com/rombytes](https://github.com/rombytes)  
**Repository:** [https://github.com/rombytes/Q-Mak](https://github.com/rombytes/Q-Mak)

---

**Developed for University of Makati | Academic Year 2024-2025**

**Enhanced with modern web technologies and professional development practices**
