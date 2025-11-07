/**
 * Student Registration Page Script
 * Q-Mak Queue Management System
 * Handles student account creation with OTP verification
 */

const API_BASE = '../../php/api';
let registrationEmail = '';

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const studentId = document.getElementById('studentId').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate password match
    if (password !== confirmPassword) {
        notificationManager.error('Passwords do not match');
        return;
    }

    // Validate UMak email format based on student ID and name
    // Format: firstLetterOfFirstName + lastName + . + studentID + @umak.edu.ph
    // Example: jgillego.12345324@umak.edu.ph or jfaustino.a12345404@umak.edu.ph
    
    // Extract the actual ID part (after dash if present, or entire ID if no dash)
    // Handle formats like: 2021-12345, A12345678, K12345, etc.
    let studentIdPart = studentId;
    if (studentId.includes('-')) {
        // Format like 2021-12345, extract the part after the dash
        studentIdPart = studentId.split('-').pop();
    }
    // Convert to lowercase for case-insensitive comparison
    studentIdPart = studentIdPart.toLowerCase();
    
    if (!studentIdPart || studentIdPart.length === 0) {
        notificationManager.error('Invalid Student ID format');
        return;
    }
    
    // Build expected email format (no prefix, just dot separator)
    // All comparisons in lowercase for case-insensitive matching
    const firstLetter = firstName.charAt(0).toLowerCase();
    const lastNameLower = lastName.toLowerCase();
    const expectedEmailPrefix = `${firstLetter}${lastNameLower}.${studentIdPart}`;
    const expectedEmail = `${expectedEmailPrefix}@umak.edu.ph`;
    
    // Check if email matches the expected format (case-insensitive)
    // Both are already in lowercase from earlier trim().toLowerCase()
    if (email !== expectedEmail) {
        notificationManager.error(`Email format doesn't match your Student ID and Name`);
        
        setTimeout(() => {
            notificationManager.error(`Expected format: ${expectedEmail}`);
        }, 2000);
        
        setTimeout(() => {
            notificationManager.error(`Your email: ${email}`);
        }, 3500);
        
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    const formData = {
        action: 'register',
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        middle_initial: document.getElementById('middleInitial').value.trim(),
        email: email,
        password: password,
        college: document.getElementById('college').value,
        program: document.getElementById('program').value.trim(),
        year_level: document.getElementById('yearLevel').value,
        section: document.getElementById('section').value.trim()
    };

    try {
        const response = await fetch(`${API_BASE}/student/student_register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            registrationEmail = formData.email;
            document.getElementById('otpEmail').textContent = formData.email;
            document.getElementById('otpModal').classList.remove('hidden');
            notificationManager.success(result.message);
        } else {
            // Show debug info if available
            if (result.debug) {
                console.error('Server error:', result.debug);
            }
            notificationManager.error(result.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        notificationManager.error('An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

async function verifyOTP() {
    const otpCode = document.getElementById('otpCode').value.trim();

    if (otpCode.length !== 6) {
        notificationManager.error('Please enter a 6-digit code');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';

    try {
        const response = await fetch(`${API_BASE}/student/student_register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                email: registrationEmail,
                otp_code: otpCode
            })
        });

        const result = await response.json();

        if (result.success) {
            notificationManager.success('Account created successfully! Redirecting...');
            setTimeout(() => {
                window.location.href = 'student_dashboard.html';
            }, 1500);
        } else {
            // Show debug info if available
            if (result.debug) {
                console.error('❌ Database Error:', result.debug);
                if (result.trace) {
                    console.error('📍 Location:', result.trace);
                }
            }
            notificationManager.error(result.message || 'Verification failed');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Complete Registration';
        }
    } catch (error) {
        console.error('Verification error:', error);
        notificationManager.error('An error occurred. Please try again.');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Complete Registration';
    }
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.add('hidden');
    document.getElementById('otpCode').value = '';
}
