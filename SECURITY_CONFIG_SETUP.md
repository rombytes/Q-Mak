# 🔐 Security Configuration Setup

## ⚠️ IMPORTANT: Required Before Running the System

The security system requires configuration with your own Google reCAPTCHA keys. Follow these steps:

---

## 📋 Setup Instructions

### **Step 1: Get Your reCAPTCHA Keys**

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create)
2. Sign in with your Google account
3. Register a new site:
   - **Label**: `Q-Mak System` (or your preferred name)
   - **reCAPTCHA type**: Select **reCAPTCHA v2** → **"I'm not a robot" Checkbox**
   - **Domains**: Add your domains:
     - For localhost testing: `localhost`, `127.0.0.1`
     - For production: `yourdomain.com`
   - Accept the reCAPTCHA Terms of Service
   - Click **Submit**

4. You'll receive two keys:
   - **Site Key** (public key - used in frontend)
   - **Secret Key** (private key - used in backend)

### **Step 2: Create Your Security Config File**

1. Navigate to: `php/config/`
2. Copy `security_config.example.php` to `security_config.php`:
   ```bash
   cp php/config/security_config.example.php php/config/security_config.php
   ```
   
   **Windows Command Prompt:**
   ```cmd
   copy php\config\security_config.example.php php\config\security_config.php
   ```
   
   **Windows PowerShell:**
   ```powershell
   Copy-Item php\config\security_config.example.php php\config\security_config.php
   ```

3. Open `security_config.php` in your text editor

4. Replace the placeholder keys with your actual keys:
   ```php
   // BEFORE (example file):
   define('RECAPTCHA_SITE_KEY', 'YOUR_RECAPTCHA_SITE_KEY_HERE');
   define('RECAPTCHA_SECRET_KEY', 'YOUR_RECAPTCHA_SECRET_KEY_HERE');
   
   // AFTER (with your keys):
   define('RECAPTCHA_SITE_KEY', '6LfxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXX');
   define('RECAPTCHA_SECRET_KEY', '6LfxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXX');
   ```

5. Update admin notification emails:
   ```php
   // Replace with your actual admin emails
   define('SECURITY_NOTIFICATION_EMAILS', 'admin@yourdomain.com,security@yourdomain.com');
   ```

6. **Save the file**

### **Step 3: Run Security Setup**

1. Open your browser and navigate to:
   ```
   http://localhost/Q-Mak/scripts/setup_security.php
   ```

2. This will create all security tables in your database

3. Verify you see: **"✅ Security tables created successfully!"**

### **Step 4: Test the System**

1. Go to admin login:
   ```
   http://localhost/Q-Mak/pages/admin/admin_login.html
   ```

2. Try logging in with wrong password 3 times

3. After the 3rd attempt, the reCAPTCHA checkbox should appear

4. Complete the CAPTCHA and login with correct credentials

---

## 🧪 Testing with Test Keys

For **development/testing only**, you can use Google's test keys that always succeed:

```php
// Test Site Key (always succeeds)
define('RECAPTCHA_SITE_KEY', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI');

// Test Secret Key (always succeeds)
define('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe');
```

⚠️ **WARNING**: These test keys will **always succeed** regardless of whether the user completes the CAPTCHA. **DO NOT use in production!**

---

## 🔒 Security Notes

### **Files NOT in GitHub (Protected by .gitignore)**

The following files contain sensitive information and are **NOT uploaded to GitHub**:

- ✅ `php/config/security_config.php` - Your actual config with real keys
- ✅ `php/config/database.php` - Database credentials
- ✅ `php/config/email.php` - Email server credentials
- ✅ `sessions/*` - Session data

### **Files IN GitHub (Safe)**

These example files are included and are safe:

- ✅ `php/config/security_config.example.php` - Template without real keys
- ✅ `php/config/database.example.php` - Database config template
- ✅ `php/config/email.example.php` - Email config template

### **Why This Matters**

If you accidentally commit your real keys to GitHub:

1. Anyone can see your reCAPTCHA secret key
2. They could bypass your security system
3. They could use your keys on their own sites (affecting your quota)

**Always use .example files as templates and keep real credentials local!**

---

## 🚨 If You Already Committed Real Keys

If you accidentally pushed real keys to GitHub:

1. **Immediately delete the keys** from Google reCAPTCHA Admin Console
2. **Generate new keys** and update your local `security_config.php`
3. **Remove the file from Git history**:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch php/config/security_config.php" \
   --prune-empty --tag-name-filter cat -- --all
   ```
4. **Force push** to GitHub:
   ```bash
   git push origin --force --all
   ```

---

## 📁 File Structure

```
Q-Mak/
├── php/
│   └── config/
│       ├── security_config.example.php  ← Template (in GitHub)
│       ├── security_config.php          ← Your config (NOT in GitHub)
│       ├── database.example.php         ← Template (in GitHub)
│       ├── database.php                 ← Your config (NOT in GitHub)
│       ├── email.example.php            ← Template (in GitHub)
│       └── email.php                    ← Your config (NOT in GitHub)
└── .gitignore                           ← Protects sensitive files
```

---

## ✅ Checklist

Before running the system, make sure:

- [ ] You have your own reCAPTCHA keys (Site Key + Secret Key)
- [ ] You created `security_config.php` from the example file
- [ ] You replaced the placeholder keys with your real keys
- [ ] You updated the admin notification emails
- [ ] You ran `setup_security.php` to create database tables
- [ ] You tested the login with wrong password 3 times
- [ ] reCAPTCHA appears and works correctly
- [ ] `security_config.php` is listed in `.gitignore`
- [ ] You did NOT commit `security_config.php` to Git

---

## 📞 Need Help?

1. Check: `docs/BRUTE_FORCE_PROTECTION_GUIDE.md` - Full documentation
2. Check: `docs/RECAPTCHA_TESTING_GUIDE.md` - Testing procedures
3. Check: `BRUTE_FORCE_IMPLEMENTATION_COMPLETE.md` - Complete summary

**Ready to go!** Follow the setup steps above and your security system will be fully operational. 🚀
