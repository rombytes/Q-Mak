/**
 * Student Registration Page Script
 * Q-Mak Queue Management System
 * Handles student account creation with OTP verification
 * Enhanced with multi-step wizard and password strength validation
 */

const API_BASE = '../../php/api';
let registrationEmail = '';
let currentStep = 1;
const totalSteps = 3;

// Password strength state
let passwordStrength = {
    score: 0,
    label: '',
    isValid: false
};

// ========================
// STEP NAVIGATION
// ========================

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.registration-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Update progress indicators
    updateProgressIndicators(stepNumber);
    
    // Update button visibility
    updateNavigationButtons(stepNumber);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressIndicators(stepNumber) {
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        const label = document.getElementById(`stepLabel${i}`);
        
        if (!indicator || !label) continue;
        
        if (i < stepNumber) {
            // Completed step
            indicator.classList.remove('step-indicator-active');
            indicator.classList.add('step-indicator-completed', 'bg-green-500');
            indicator.classList.remove('bg-gray-300', 'bg-blue-600');
            label.classList.remove('text-gray-500', 'text-blue-600');
            label.classList.add('text-green-600');
            indicator.innerHTML = '✓';
        } else if (i === stepNumber) {
            // Active step
            indicator.classList.add('step-indicator-active', 'bg-blue-600');
            indicator.classList.remove('step-indicator-completed', 'bg-gray-300', 'bg-green-500');
            label.classList.add('text-blue-600');
            label.classList.remove('text-gray-500', 'text-green-600');
            indicator.textContent = i;
        } else {
            // Pending step
            indicator.classList.remove('step-indicator-active', 'step-indicator-completed', 'bg-blue-600', 'bg-green-500');
            indicator.classList.add('bg-gray-300');
            label.classList.add('text-gray-500');
            label.classList.remove('text-blue-600', 'text-green-600');
            indicator.textContent = i;
        }
    }
    
    // Update progress lines
    for (let i = 1; i < totalSteps; i++) {
        const line = document.getElementById(`progressLine${i}`);
        if (!line) continue;
        
        if (i < stepNumber) {
            line.classList.add('progress-line-active', 'bg-green-500');
            line.classList.remove('bg-gray-300');
        } else {
            line.classList.remove('progress-line-active', 'bg-green-500');
            line.classList.add('bg-gray-300');
        }
    }
}

function updateNavigationButtons(stepNumber) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Back button (hide on step 1)
    if (prevBtn) {
        prevBtn.style.display = stepNumber === 1 ? 'none' : 'flex';
    }
    
    // Continue button (hide on step 3)
    if (nextBtn) {
        nextBtn.style.display = stepNumber === totalSteps ? 'none' : 'flex';
    }
    
    // Submit button (show only on step 3)
    if (submitBtn) {
        submitBtn.style.display = stepNumber === totalSteps ? 'flex' : 'none';
    }
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
            
            // Auto-show password requirements on step 3
            if (currentStep === 3) {
                setTimeout(() => {
                    const reqPanel = document.getElementById('passwordRequirements');
                    if (reqPanel && reqPanel.classList.contains('hidden')) {
                        togglePasswordRequirements();
                    }
                }, 300);
            }
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    if (!currentStepElement) return true;
    
    // Get all required inputs in current step
    const requiredInputs = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalidField = null;
    
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            if (!firstInvalidField) firstInvalidField = input;
            input.classList.add('border-red-500');
        } else {
            input.classList.remove('border-red-500');
        }
    });
    
    // Step-specific validation
    if (currentStep === 1) {
        // Validate Student ID format
        const studentId = document.getElementById('studentId').value.trim();
        if (studentId && !/^[A-Za-z0-9\-]+$/.test(studentId)) {
            notificationManager.error('Invalid Student ID format');
            document.getElementById('studentId').classList.add('border-red-500');
            return false;
        }
        
        // Validate email domain
        const email = document.getElementById('email').value.trim().toLowerCase();
        if (email && !email.endsWith('@umak.edu.ph')) {
            notificationManager.error('Please use a valid UMak email address (@umak.edu.ph)');
            document.getElementById('email').classList.add('border-red-500');
            return false;
        }
        
        // Validate names
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        if (firstName && !/^[A-Za-z\s\-\.]+$/.test(firstName)) {
            notificationManager.error('First name contains invalid characters');
            document.getElementById('firstName').classList.add('border-red-500');
            return false;
        }
        if (lastName && !/^[A-Za-z\s\-\.]+$/.test(lastName)) {
            notificationManager.error('Last name contains invalid characters');
            document.getElementById('lastName').classList.add('border-red-500');
            return false;
        }
    }
    
    if (currentStep === 2) {
        const college = document.getElementById('college').value;
        const program = document.getElementById('program').value.trim();
        const yearLevel = document.getElementById('yearLevel').value;
        
        if (!college) {
            notificationManager.error('Please select your college/school/institute');
            document.getElementById('college').classList.add('border-red-500');
            return false;
        }
        if (!program) {
            notificationManager.error('Please enter your program/course');
            document.getElementById('program').classList.add('border-red-500');
            return false;
        }
        if (!yearLevel) {
            notificationManager.error('Please select your year level');
            document.getElementById('yearLevel').classList.add('border-red-500');
            return false;
        }
    }
    
    if (currentStep === 3) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Check password strength
        if (!passwordStrength.isValid) {
            notificationManager.error('Password does not meet security requirements');
            document.getElementById('password').classList.add('border-red-500');
            return false;
        }
        
        // Check password match
        if (password !== confirmPassword) {
            notificationManager.error('Passwords do not match');
            document.getElementById('confirmPassword').classList.add('border-red-500');
            return false;
        }
    }
    
    if (!isValid && firstInvalidField) {
        notificationManager.error('Please fill in all required fields');
        firstInvalidField.focus();
        return false;
    }
    
    return isValid;
}

// ========================
// PASSWORD STRENGTH VALIDATION
// ========================

function checkPasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    // Update requirement indicators
    updateRequirementIndicator('req-length', requirements.length);
    updateRequirementIndicator('req-uppercase', requirements.uppercase);
    updateRequirementIndicator('req-lowercase', requirements.lowercase);
    updateRequirementIndicator('req-number', requirements.number);
    updateRequirementIndicator('req-special', requirements.special);
    
    // Calculate strength score
    const score = Object.values(requirements).filter(Boolean).length;
    
    // Determine strength level
    let strength = {
        score: score,
        label: '',
        className: '',
        isValid: false
    };
    
    if (score === 0) {
        strength.label = 'Enter password';
        strength.className = '';
    } else if (score <= 2) {
        strength.label = 'Very Weak';
        strength.className = 'strength-very-weak';
        strength.color = 'text-red-600';
    } else if (score === 3) {
        strength.label = 'Weak';
        strength.className = 'strength-weak';
        strength.color = 'text-orange-600';
    } else if (score === 4) {
        strength.label = 'So-so';
        strength.className = 'strength-so-so';
        strength.color = 'text-yellow-600';
    } else if (score === 5 && password.length < 12) {
        strength.label = 'Good';
        strength.className = 'strength-good';
        strength.color = 'text-green-600';
        strength.isValid = true;
    } else if (score === 5 && password.length >= 12) {
        strength.label = 'Strong';
        strength.className = 'strength-strong';
        strength.color = 'text-green-700';
        strength.isValid = true;
    }
    
    // Update UI
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (strengthFill) {
        strengthFill.className = 'password-strength-fill ' + strength.className;
    }
    
    if (strengthText) {
        strengthText.textContent = strength.label;
        strengthText.className = 'text-sm font-medium ' + strength.color;
    }
    
    passwordStrength = strength;
    return strength;
}

function updateRequirementIndicator(elementId, isMet) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const icon = element.querySelector('.req-icon');
    if (isMet) {
        element.classList.remove('text-gray-600');
        element.classList.add('text-green-600', 'font-semibold');
        if (icon) icon.textContent = '✓';
    } else {
        element.classList.add('text-gray-600');
        element.classList.remove('text-green-600', 'font-semibold');
        if (icon) icon.textContent = '○';
    }
}

function togglePasswordRequirements() {
    const panel = document.getElementById('passwordRequirements');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// ========================
// FORM SUBMISSION
// ========================

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

// ========================
// EVENT LISTENERS
// ========================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show first step
    showStep(1);
    
    // Password strength listener
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // Password match indicator
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            const matchMessage = document.getElementById('passwordMatchMessage');
            
            if (confirmPassword.length > 0) {
                if (password === confirmPassword) {
                    matchMessage.textContent = '✓ Passwords match';
                    matchMessage.className = 'text-xs mt-1 text-green-600';
                    matchMessage.classList.remove('hidden');
                    this.classList.remove('border-red-500');
                    this.classList.add('border-green-500');
                } else {
                    matchMessage.textContent = '✗ Passwords do not match';
                    matchMessage.className = 'text-xs mt-1 text-red-600';
                    matchMessage.classList.remove('hidden');
                    this.classList.add('border-red-500');
                    this.classList.remove('border-green-500');
                }
            } else {
                matchMessage.classList.add('hidden');
                this.classList.remove('border-red-500', 'border-green-500');
            }
        });
    }
    
    // Clear border colors on input
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('border-red-500');
        });
    });
});
