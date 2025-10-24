# Q-Mak - Queue Management System

University of Makati Cooperative Queue Management System

## Overview

Q-Mak is a comprehensive order management system designed for the University of Makati (UMak) Cooperative. It streamlines the ordering process for students, reduces wait times, and provides efficient queue management through QR code verification and real-time notifications.

Developed as part of academic requirements at University of Makati.

## Features

- **Student Queue Management**: Students can place orders and receive queue numbers
- **Real-time Status Updates**: Track order status (Pending → Processing → Ready → Completed)
- **Email Notifications**: Automatic email notifications when orders are ready
- **Admin Dashboard**: Comprehensive admin panel for managing orders and students
- **Admin Management**: Super admin can create and manage admin accounts
- **Queue History**: View and search past orders

## Technology Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Backend**: PHP 8.x
- **Database**: MySQL 8.x
- **Web Server**: Apache (XAMPP)

## Installation

### Prerequisites

- XAMPP (or any Apache + MySQL + PHP environment)
- PHP 8.0 or higher
- MySQL 5.7 or higher

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Q-Mak.git
   cd Q-Mak
   ```

2. **Move to XAMPP htdocs**
   ```bash
   # Copy the project to your XAMPP htdocs folder
   # Windows: c:\xampp\htdocs\Q-Mak
   # Mac/Linux: /opt/lampp/htdocs/Q-Mak
   ```

3. **Configure Database**
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - Import the database schema: `database/qmak_schema.sql`
   - This will create the database `qmak_db` with all required tables

4. **Configure Database Connection**
   - Copy `php/config/database.example.php` to `php/config/database.php`
   - Update database credentials if needed (default: root with no password)

5. **Start Apache and MySQL**
   - Open XAMPP Control Panel
   - Start Apache and MySQL services

6. **Access the Application**
   - Homepage: `http://localhost/Q-Mak/homepage.html`
   - Student Portal: `http://localhost/Q-Mak/pages/student/student_login.html`
   - Admin Portal: `http://localhost/Q-Mak/pages/admin/admin_login.html`

## Default Admin Credentials

**Super Administrator:**
- Email: `superadmin@umak.edu.ph`
- Password: `SuperAdmin123`

**Regular Administrator:**
- Email: `admin@umak.edu.ph`
- Password: `Admin123`

⚠️ **IMPORTANT**: Change these default passwords after first login!

## Project Structure

```
Q-Mak/
├── css/
│   └── styles.css
├── database/
│   └── qmak_schema.sql
├── images/
│   ├── UMAK COOP.png
│   └── UMak-Facade-Admin-2024.jpg
├── js/
│   └── main.js
├── pages/
│   ├── admin/
│   │   ├── admin_login.html
│   │   └── admin_dashboard.html
│   └── student/
│       ├── student_login.html
│       └── student_dashboard.html
├── php/
│   ├── api/
│   │   ├── admin_login.php
│   │   ├── admin_management.php
│   │   ├── orders.php
│   │   └── students.php
│   └── config/
│       ├── database.php
│       └── constants.php
├── .gitignore
├── homepage.html
└── README.md
```

## Features by User Role

### Students
- Login with student number
- Place new orders
- View order status
- Receive queue numbers
- Get email notifications

### Admin
- View all orders
- Update order status
- Manage students
- View queue history
- Export reports

### Super Admin
- All admin features
- Create/edit/delete admin accounts
- Manage admin privileges
- System settings

## Database Schema

### Tables
- `admin_accounts` - Admin user accounts
- `students` - Student information
- `orders` - Order records and queue management
- `email_logs` - Email notification history
- `settings` - System configuration

## Security Features

- Password hashing with bcrypt
- Session management
- SQL injection prevention (prepared statements)
- XSS protection
- Role-based access control (Admin/Super Admin)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

- Developer: rombytes  
- GitHub: [https://github.com/rombytes](https://github.com/rombytes)  
- Repository: [https://github.com/rombytes/Q-Mak](https://github.com/rombytes/Q-Mak)

## Acknowledgments

- University of Makati
- UMak Cooperative Team
- All contributors

---

**Note**: This is a student project for educational purposes.
