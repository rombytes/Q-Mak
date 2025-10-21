# Q-Mak COOP Order System

> A web-based queue management and order system for the University of Makati Cooperative

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![PHP](https://img.shields.io/badge/PHP-7.4+-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

## Overview

Q-Mak is a comprehensive order management system designed for the University of Makati (UMak) Cooperative. It streamlines the ordering process for students, reduces wait times, and provides efficient queue management through QR code verification and real-time notifications.

**Developed as part of academic requirements at University of Makati**

## Features

### For Students
- **Easy Order Placement** - Simple form-based ordering system
- **Email OTP Verification** - Secure order confirmation via email
- **QR Code Generation** - Downloadable QR codes for order pickup
- **Queue Management** - Real-time queue number and wait time estimates
- **Push Notifications** - Browser notifications for order updates
- **Order Status Tracking** - Check order status anytime

### For Administrators
- **Admin Dashboard** - Comprehensive order management interface
- **Real-time Analytics** - Track orders, queue status, and performance
- **Order Processing** - Update order status (pending, processing, ready, completed)
- **Order History** - View and manage historical orders
- **Archive System** - Archive completed orders for record-keeping

### Technical Features
- **Secure Authentication** - Admin login with password hashing (bcrypt)
- **Email Integration** - Automated OTP and receipt emails via SMTP
- **Modern UI/UX** - Clean, responsive design with Tailwind CSS
- **Mobile Responsive** - Works seamlessly on all devices
- **Interactive Animations** - Smooth transitions and visual feedback
- **Fast Performance** - Optimized for quick load times

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

3. Configure database connection:
```bash
cp php/config/database.example.php php/config/database.php
```

4. Edit `php/config/database.php` with your credentials:
```php
$host = 'localhost';
$dbname = 'qmak_db';
$username = 'your_username';
$password = 'your_password';
```

#### Step 4: Email Configuration
1. Copy the example email config:
```bash
cp php/config/email.example.php php/config/email.php
```

2. Edit `php/config/email.php` with your SMTP settings:
```php
$smtp_host = 'smtp.gmail.com';
$smtp_port = 587;
$smtp_username = 'your-email@gmail.com';
$smtp_password = 'your-app-password';
```

#### Step 5: Access the System
1. Open your browser
2. Navigate to: `http://localhost/Q-Mak/homepage.html`
3. For admin: `http://localhost/Q-Mak/pages/admin/admin_login.html`

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
│
├── docs/                      # Documentation
│   ├── ADMIN_ACCOUNTS_GUIDE.md
│   ├── GITHUB_SETUP_GUIDE.md
│   └── ...
│
├── pages/                     # HTML pages
│   ├── admin/                 # Admin pages
│   │   ├── admin_login.html
│   │   └── admin_dashboard.html
│   └── student/               # Student pages
│       ├── create_order.html
│       ├── check_status.html
│       ├── otp_verification.html
│       └── order_result.html
│
├── js/                        # JavaScript files
│   └── notifications.js
│
├── images/                    # Image assets
│   └── ...
│
├── php/                       # PHP backend
│   ├── config/                # Configuration files
│   │   ├── database.example.php
│   │   └── email.example.php
│   └── api/                   # API endpoints
│       ├── create_order.php
│       ├── verify_otp.php
│       ├── check_status.php
│       └── admin_*.php
│
├── database/                  # Database files
│   ├── qmak_schema.sql
│   └── update_admin_accounts.sql
│
└── vendor/                    # Composer packages
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
- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- QRCode.js
- Google Fonts (Inter)

### Backend
- PHP 7.4+
- MySQL 8.0+
- PHPMailer
- Composer

### Tools & Libraries
- Git (Version Control)
- XAMPP (Development Environment)
- Visual Studio Code (IDE)

## Database Schema

### Tables
1. **admins** - Administrator accounts with role-based access
2. **students** - Student information and profiles
3. **orders** - Order details with queue management
4. **otp_verifications** - Temporary OTP codes for verification
5. **email_logs** - Email delivery tracking and history

## API Endpoints

### Student Endpoints
- `POST /php/api/create_order.php` - Create new order
- `POST /php/api/verify_otp.php` - Verify OTP code
- `GET /php/api/check_status.php` - Check order status

### Admin Endpoints
- `POST /php/api/admin_login.php` - Admin authentication
- `GET /php/api/admin_orders.php` - Get all orders
- `PUT /php/api/update_order_status.php` - Update order status
- `POST /php/api/archive_order.php` - Archive completed order

## Contributing

This is an academic project for University of Makati. Contributions, suggestions, and feedback are welcome!

## Acknowledgments

- **University of Makati** - For the opportunity to develop this system
- **UMak Cooperative** - For the use case and requirements
- **Faculty Advisors** - For guidance and support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Developer:** rombytes  
**GitHub:** [https://github.com/rombytes](https://github.com/rombytes)  
**Repository:** [https://github.com/rombytes/Q-Mak](https://github.com/rombytes/Q-Mak)

---

**Developed for University of Makati | Academic Year 2024-2025**
