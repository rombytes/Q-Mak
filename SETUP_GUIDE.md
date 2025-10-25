# Q-Mak Queue Management System - Complete Setup Guide

This comprehensive guide will walk you through setting up the Q-Mak Queue Management System from scratch, whether you're new to Git/GitHub or an experienced developer.

---

## Table of Contents

1. [For New GitHub Users](#for-new-github-users)
2. [For Experienced GitHub Users](#for-experienced-github-users)
3. [System Requirements](#system-requirements)
4. [Installation Steps](#installation-steps)
5. [Configuration](#configuration)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)
8. [Contributing to the Project](#contributing-to-the-project)

---

## For New GitHub Users

### Step 1: Install Git

**Windows:**
1. Download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer and follow the setup wizard
3. Keep default settings unless you have specific preferences
4. Open Command Prompt or PowerShell to verify installation:
   ```bash
   git --version
   ```

**macOS:**
```bash
# Install using Homebrew
brew install git

# Or download from https://git-scm.com/download/mac
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install git
```

### Step 2: Create a GitHub Account

1. Go to [https://github.com](https://github.com)
2. Click "Sign up" and follow the registration process
3. Verify your email address

### Step 3: Fork the Repository

1. Navigate to the Q-Mak repository: `https://github.com/[original-repo-owner]/Q-Mak`
2. Click the "Fork" button in the top-right corner
3. This creates a copy of the repository under your GitHub account

### Step 4: Clone Your Fork

```bash
# Navigate to where you want to store the project
cd C:\xampp\htdocs    # Windows
cd ~/Sites            # macOS
cd /var/www/html      # Linux

# Clone the repository (replace YOUR-USERNAME with your GitHub username)
git clone https://github.com/YOUR-USERNAME/Q-Mak.git
cd Q-Mak
```

### Step 5: Set Up Remote Repositories

```bash
# Add the original repository as "upstream" to get future updates
git remote add upstream https://github.com/[original-repo-owner]/Q-Mak.git

# Verify remotes
git remote -v
```

### Basic Git Commands You'll Need

```bash
# Check status of your changes
git status

# Stage files for commit
git add .                    # Add all changed files
git add filename.php         # Add specific file

# Commit changes
git commit -m "Description of your changes"

# Push to your fork
git push origin main

# Pull latest changes from original repo
git pull upstream main

# Create a new branch for features
git checkout -b feature-name
```

### Making Your First Pull Request

1. Make changes to the code
2. Commit and push to your fork:
   ```bash
   git add .
   git commit -m "Brief description of changes"
   git push origin main
   ```
3. Go to your fork on GitHub
4. Click "New Pull Request"
5. Add a detailed description of your changes
6. Submit the pull request

---

## For Experienced GitHub Users

### Quick Start

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/Q-Mak.git
cd Q-Mak

# Add upstream remote
git remote add upstream https://github.com/[original-repo-owner]/Q-Mak.git

# Create feature branch
git checkout -b feature/your-feature-name

# After changes
git add .
git commit -m "feat: descriptive commit message following conventional commits"
git push origin feature/your-feature-name
```

### Commit Message Convention

Follow Conventional Commits specification:

```
feat: add QR code generation for order receipts
fix: resolve duplicate key constraint in OTP table
docs: update setup guide with database configuration
refactor: improve email service error handling
perf: optimize database queries with proper indexing
test: add unit tests for OTP verification
chore: update dependencies to latest versions
```

---

## System Requirements

### Required Software

- **PHP:** Version 7.4 or higher (8.0+ recommended)
- **MySQL:** Version 5.7 or higher (8.0+ recommended)
- **Web Server:** Apache 2.4+ or Nginx 1.18+
- **Composer:** Latest version for dependency management
- **Node.js:** (Optional) For development tools

### Recommended Development Environment

- **XAMPP** (Windows/macOS/Linux) - All-in-one package
- **MAMP** (macOS/Windows) - Alternative to XAMPP
- **Laravel Valet** (macOS) - Lightweight option
- **Docker** - For containerized environment

---

## Installation Steps

### Step 1: Install XAMPP

**Windows:**
1. Download from [https://www.apachefriends.org](https://www.apachefriends.org)
2. Run installer and choose installation directory (default: `C:\xampp`)
3. Select components: Apache, MySQL, PHP, phpMyAdmin
4. Complete installation

**macOS:**
1. Download XAMPP for macOS
2. Open the DMG file and drag XAMPP to Applications
3. Run XAMPP from Applications

**Linux:**
```bash
# Download XAMPP
wget https://www.apachefriends.org/xampp-files/8.2.12/xampp-linux-x64-8.2.12-0-installer.run

# Make executable
chmod +x xampp-linux-x64-8.2.12-0-installer.run

# Run installer
sudo ./xampp-linux-x64-8.2.12-0-installer.run
```

### Step 2: Install Composer

**Windows:**
1. Download from [https://getcomposer.org/Composer-Setup.exe](https://getcomposer.org/Composer-Setup.exe)
2. Run the installer
3. Follow setup wizard and select PHP executable (e.g., `C:\xampp\php\php.exe`)

**macOS/Linux:**
```bash
# Download and install globally
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"
sudo mv composer.phar /usr/local/bin/composer

# Verify installation
composer --version
```

### Step 3: Clone and Setup Project

```bash
# Navigate to web server directory
cd C:\xampp\htdocs          # Windows
cd /Applications/XAMPP/htdocs    # macOS XAMPP
cd ~/Sites                  # macOS Valet
cd /opt/lampp/htdocs       # Linux XAMPP

# Clone repository
git clone https://github.com/YOUR-USERNAME/Q-Mak.git
cd Q-Mak
```

### Step 4: Install PHP Dependencies

```bash
# Install required packages
composer install

# If composer.json doesn't exist, create it and install manually
composer init --no-interaction
composer require phpmailer/phpmailer:^6.8
composer require endroid/qr-code:^4.8
```

### Step 5: Database Setup

#### Start MySQL Service

**XAMPP Control Panel:**
1. Open XAMPP Control Panel
2. Click "Start" next to Apache
3. Click "Start" next to MySQL
4. Both should show green "Running" status

#### Import Database Schema

**Method 1: Using phpMyAdmin**
1. Open browser and go to `http://localhost/phpmyadmin`
2. Click "New" in left sidebar
3. Enter database name: `qmak_db`
4. Click "Create"
5. Select `qmak_db` from left sidebar
6. Click "Import" tab
7. Click "Choose File" and select `database/qmak_schema.sql`
8. Click "Go" at bottom
9. Wait for success message

**Method 2: Using Command Line**
```bash
# Navigate to project directory
cd C:\xampp\htdocs\Q-Mak

# Import schema (Windows)
C:\xampp\mysql\bin\mysql -u root -p < database/qmak_schema.sql

# Import schema (macOS/Linux)
/opt/lampp/bin/mysql -u root -p < database/qmak_schema.sql

# When prompted, press Enter (default XAMPP has no root password)
```

**Method 3: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to local instance (localhost:3306, user: root)
3. Go to Server > Data Import
4. Select "Import from Self-Contained File"
5. Browse to `database/qmak_schema.sql`
6. Select or create schema: `qmak_db`
7. Click "Start Import"

#### Optional: Import Sample Data

```bash
# If sample data file exists
mysql -u root -p qmak_db < database/sample_data.sql
```

### Step 6: Configure Database Connection

1. Navigate to `php/config/database.php`
2. Verify settings match your environment:

```php
<?php
// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // Default XAMPP username
define('DB_PASS', '');              // Default XAMPP password (empty)
define('DB_NAME', 'qmak_db');
define('DB_CHARSET', 'utf8mb4');

// Email configuration (for sending OTP and receipts)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@gmail.com');      // Update this
define('SMTP_PASSWORD', 'your-app-password');          // Update this
define('SMTP_FROM_EMAIL', 'your-email@gmail.com');     // Update this
define('SMTP_FROM_NAME', 'UMak COOP Order Hub');

// Application settings
define('OTP_EXPIRY_MINUTES', 10);
define('QR_EXPIRY_MINUTES', 30);
define('BASE_URL', 'http://localhost/Q-Mak');          // Update if different
?>
```

### Step 7: Configure Email Settings (Gmail Example)

#### Enable 2-Factor Authentication
1. Go to Google Account Settings
2. Security > 2-Step Verification
3. Enable if not already enabled

#### Generate App Password
1. Go to Google Account > Security
2. Under "2-Step Verification," find "App passwords"
3. Select "Mail" and "Windows Computer" (or your device)
4. Click "Generate"
5. Copy the 16-character password
6. Update `SMTP_PASSWORD` in `php/config/database.php`

#### Update Email Configuration
```php
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'abcd efgh ijkl mnop');  // Your app password
define('SMTP_FROM_EMAIL', 'your-email@gmail.com');
```

---

## Configuration

### Web Server Configuration

#### Apache (.htaccess)

Ensure `mod_rewrite` is enabled in Apache. The project includes `.htaccess` files for routing.

**Enable mod_rewrite (XAMPP):**
1. Open `C:\xampp\apache\conf\httpd.conf`
2. Find line: `#LoadModule rewrite_module modules/mod_rewrite.so`
3. Remove the `#` to uncomment
4. Save and restart Apache

#### Virtual Host (Optional)

Create a custom domain for development:

**Windows (`C:\xampp\apache\conf\extra\httpd-vhosts.conf`):**
```apache
<VirtualHost *:80>
    ServerName qmak.local
    DocumentRoot "C:/xampp/htdocs/Q-Mak"
    <Directory "C:/xampp/htdocs/Q-Mak">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Update hosts file (`C:\Windows\System32\drivers\etc\hosts`):**
```
127.0.0.1    qmak.local
```

Restart Apache and access via `http://qmak.local`

### PHP Configuration

Edit `php.ini` (XAMPP: `C:\xampp\php\php.ini`):

```ini
; Enable required extensions
extension=curl
extension=fileinfo
extension=gd
extension=mbstring
extension=mysqli
extension=openssl
extension=pdo_mysql

; Increase limits
max_execution_time = 300
max_input_time = 300
memory_limit = 256M
post_max_size = 50M
upload_max_filesize = 50M

; Session settings
session.save_handler = files
session.gc_maxlifetime = 3600

; Timezone
date.timezone = Asia/Manila
```

Restart Apache after changes.

### File Permissions

**Linux/macOS:**
```bash
# Make directories writable
chmod -R 755 Q-Mak/
chmod -R 777 Q-Mak/uploads  # If uploads directory exists
chmod -R 777 Q-Mak/logs     # If logs directory exists
```

**Windows:**
Generally no permission changes needed. Ensure XAMPP has write access to the folder.

---

## Testing the System

### Step 1: Access Homepage

Open browser and navigate to:
```
http://localhost/Q-Mak/homepage.html
```

You should see the Q-Mak landing page.

### Step 2: Test Student Order Flow

1. Click "Create Order" or navigate to:
   ```
   http://localhost/Q-Mak/pages/student/create_order.html
   ```

2. Fill out the order form:
   - Student ID: `2021-12345`
   - Name: Your name
   - Email: Your UMak email (`yourname@umak.edu.ph`)
   - College, Program, Year, Section
   - Select item to purchase

3. Submit form and check for OTP email

4. Enter OTP on verification page

5. Check for order confirmation with QR code

### Step 3: Test Admin Login

1. Navigate to:
   ```
   http://localhost/Q-Mak/pages/admin/admin_login.html
   ```

2. Login with default super admin credentials:
   - Email: `superadmin@umak.edu.ph`
   - Password: `SuperAdmin123`

3. Verify access to admin dashboard

### Step 4: Test Order Status Check

1. Navigate to:
   ```
   http://localhost/Q-Mak/pages/student/check_status.html
   ```

2. Enter your email

3. Check for OTP email

4. Verify you can see order status

### Step 5: Verify Email Sending

Check if emails are being sent:
1. Create a test order
2. Check spam folder if email doesn't arrive
3. Check PHP error logs for SMTP errors:
   ```
   C:\xampp\php\logs\php_error_log    # Windows
   /opt/lampp/logs/php_error_log      # Linux
   ```

---

## Troubleshooting

### Database Connection Issues

**Error:** "Connection failed: Access denied"
```bash
# Reset MySQL root password (XAMPP)
# Stop MySQL first, then:
C:\xampp\mysql\bin\mysqladmin -u root password newpassword

# Update database.php with new password
```

**Error:** "Unknown database 'qmak_db'"
```bash
# Re-import schema
mysql -u root -p < database/qmak_schema.sql
```

### Email Not Sending

**Check 1:** Verify SMTP credentials
```php
// In database.php
define('SMTP_USERNAME', 'correct-email@gmail.com');
define('SMTP_PASSWORD', 'correct-app-password');
```

**Check 2:** Test connection manually
```bash
# Windows
telnet smtp.gmail.com 587

# If telnet not available, enable it:
# Control Panel > Programs > Turn Windows features on or off > Telnet Client
```

**Check 3:** Check firewall
- Ensure port 587 (SMTP) is not blocked
- Try port 465 with SSL instead

**Check 4:** Enable error logging
```php
// In php/utils/email.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
```

### QR Code Not Displaying

**Issue:** Blank QR code area

**Solution 1:** Check browser console (F12)
- Look for CORS errors
- Verify QRCode.js library is loading

**Solution 2:** Test Google Charts API
```html
<!-- Add to test page -->
<img src="https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=test">
```

**Solution 3:** Install Endroid QR Code library
```bash
composer require endroid/qr-code:^4.8
```

### PHP Errors

**Error:** "Call to undefined function"
- Enable required PHP extensions in `php.ini`
- Restart Apache

**Error:** "Headers already sent"
```php
// Check for whitespace before <?php tags
// Ensure no output before header() calls
```

### Apache Won't Start

**Port 80 Already in Use:**
1. Check if IIS or Skype is using port 80
2. Change Apache port in `httpd.conf`:
   ```apache
   Listen 8080
   ServerName localhost:8080
   ```
3. Access via `http://localhost:8080/Q-Mak/`

**MySQL Won't Start:**
- Port 3306 conflict
- Check services using port: `netstat -ano | findstr :3306`
- Stop conflicting service or change MySQL port

### Session Issues

**Error:** "Session not starting"
```php
// Check session path exists and is writable
// In php.ini:
session.save_path = "C:/xampp/tmp"  // Windows
session.save_path = "/tmp"          // Linux/macOS
```

---

## Contributing to the Project

### Before You Start

1. **Check existing issues** on GitHub
2. **Create a new branch** for your feature
3. **Follow coding standards** already in the project
4. **Test thoroughly** before submitting

### Contribution Workflow

#### 1. Sync Your Fork

```bash
# Fetch latest changes from original repository
git fetch upstream

# Merge into your local main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

#### 2. Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/descriptive-name

# Examples:
git checkout -b feature/email-queue-system
git checkout -b fix/otp-expiry-issue
git checkout -b docs/api-documentation
```

#### 3. Make Changes

- Write clean, readable code
- Follow existing patterns and conventions
- Comment complex logic
- Update documentation if needed

#### 4. Test Your Changes

- Test all affected functionality
- Verify database queries work
- Check for PHP errors
- Test on different browsers if frontend changes

#### 5. Commit Changes

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add email queueing system for bulk notifications"

# Push to your fork
git push origin feature/descriptive-name
```

#### 6. Create Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out PR template:
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   
   ## Testing
   - Tested on local XAMPP environment
   - Verified database queries
   - Checked email sending functionality
   
   ## Screenshots (if applicable)
   Add screenshots here
   ```

4. Submit pull request

### Code Style Guidelines

#### PHP
```php
<?php
// Use strict comparison
if ($value === 'expected') {
    // Code here
}

// Use prepared statements for database queries
$stmt = $db->prepare("SELECT * FROM orders WHERE order_id = ?");
$stmt->execute([$orderId]);

// Proper error handling
try {
    // Code that might throw exception
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    // Handle error
}
```

#### JavaScript
```javascript
// Use const/let, not var
const apiBase = '../../php/api';
let currentPage = 1;

// Use async/await for promises
async function fetchOrders() {
    try {
        const response = await fetch(`${apiBase}/admin_orders.php`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}
```

#### SQL
```sql
-- Use meaningful table and column names
-- Add indexes for frequently queried columns
-- Use foreign keys for referential integrity

CREATE TABLE orders (
    order_id INT(11) NOT NULL AUTO_INCREMENT,
    student_id INT(11) NOT NULL,
    queue_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (order_id),
    INDEX idx_student_id (student_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
```

### What to Contribute

**Bug Fixes:**
- Report bugs with detailed steps to reproduce
- Include error messages and screenshots
- Provide environment details (OS, PHP version, etc.)

**New Features:**
- Discuss major features in issues first
- Ensure features align with project goals
- Provide thorough testing

**Documentation:**
- Improve existing documentation
- Add code comments
- Create tutorials or guides

**Performance Improvements:**
- Optimize database queries
- Reduce API response times
- Improve frontend load times

---

## Additional Resources

### Official Documentation
- [PHP Manual](https://www.php.net/manual/en/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Git Documentation](https://git-scm.com/doc)
- [Composer Documentation](https://getcomposer.org/doc/)

### Libraries Used
- [PHPMailer](https://github.com/PHPMailer/PHPMailer)
- [Endroid QR Code](https://github.com/endroid/qr-code)
- [TailwindCSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/)

### Learning Resources
- [PHP The Right Way](https://phptherightway.com/)
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [MySQL Tutorial](https://www.mysqltutorial.org/)

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check existing GitHub issues:** Someone may have faced the same problem
2. **Search documentation:** Use Ctrl+F in this guide
3. **Create a new issue:** Provide detailed information:
   - Operating system and version
   - PHP and MySQL versions
   - Error messages with full stack trace
   - Steps to reproduce the problem
   - What you've already tried

4. **Contact maintainers:** See README.md for contact information

---

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Last Updated:** January 2025

For the latest updates and changes, visit the [GitHub repository](https://github.com/rombytes/Q-Mak).
