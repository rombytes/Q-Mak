/**
 * Student Registration Page Script
 * Q-Mak Queue Management System
 * Handles student account creation with OTP verification
 * Enhanced with multi-step wizard and password strength validation
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();
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
// INPUT FORMATTING UTILITIES
// ========================

/**
 * Convert string to Proper Case (Title Case)
 * Example: "juan dela cruz" -> "Juan Dela Cruz"
 */
function toProperCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Format middle initial - only letters, max 2 chars, auto-capitalize
 */
function formatMiddleInitial(str) {
    // Remove all non-letters and dots
    let cleaned = str.replace(/[^a-zA-Z]/g, '');
    // Limit to 2 characters
    cleaned = cleaned.substring(0, 2);
    // Uppercase
    return cleaned.toUpperCase();
}

/**
 * Remove common suffixes from last name
 */
function removeNameSuffixes(lastName) {
    const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v'];
    let cleaned = lastName.toLowerCase().trim();
    
    // Remove suffix if present at the end
    suffixes.forEach(suffix => {
        const regex = new RegExp('\\s+' + suffix.replace('.', '\\.') + '$', 'i');
        cleaned = cleaned.replace(regex, '');
    });
    
    return cleaned.trim();
}

/**
 * Calculate expected email based on name and student ID
 */
function calculateExpectedEmail(firstName, lastName, studentId) {
    if (!firstName || !lastName || !studentId) return '';
    
    // Get first letter of first name
    const firstLetter = firstName.charAt(0).toLowerCase();
    
    // Clean last name: remove spaces and suffixes
    let cleanedLastName = lastName.toLowerCase().replace(/\s+/g, '');
    cleanedLastName = removeNameSuffixes(cleanedLastName);
    
    // Use student ID as-is (already formatted)
    const studentIdLower = studentId.toLowerCase();
    
    // Build email: firstletter + lastname.studentid@umak.edu.ph
    return `${firstLetter}${cleanedLastName}.${studentIdLower}@umak.edu.ph`;
}

/**
 * Validate email against expected format
 */
function validateEmailFormat(email, expectedEmail) {
    if (!email || !expectedEmail) return false;
    return email.toLowerCase() === expectedEmail.toLowerCase();
}

// ========================
// REAL-TIME INPUT FORMATTING
// ========================

function initializeInputFormatting() {
    // First Name - Proper Case
    const firstNameInput = document.getElementById('firstName');
    if (firstNameInput) {
        firstNameInput.addEventListener('input', function(e) {
            const cursorPos = e.target.selectionStart;
            const formatted = toProperCase(e.target.value);
            e.target.value = formatted;
            e.target.setSelectionRange(cursorPos, cursorPos);
            validateEmailRealtime();
        });
        
        firstNameInput.addEventListener('blur', function(e) {
            e.target.value = toProperCase(e.target.value);
            validateEmailRealtime();
        });
    }
    
    // Last Name - Proper Case
    const lastNameInput = document.getElementById('lastName');
    if (lastNameInput) {
        lastNameInput.addEventListener('input', function(e) {
            const cursorPos = e.target.selectionStart;
            const formatted = toProperCase(e.target.value);
            e.target.value = formatted;
            e.target.setSelectionRange(cursorPos, cursorPos);
            validateEmailRealtime();
        });
        
        lastNameInput.addEventListener('blur', function(e) {
            e.target.value = toProperCase(e.target.value);
            validateEmailRealtime();
        });
    }
    
    // Middle Initial - Letters only, max 2 chars, uppercase
    const middleInitialInput = document.getElementById('middleInitial');
    if (middleInitialInput) {
        middleInitialInput.addEventListener('input', function(e) {
            const cursorPos = e.target.selectionStart;
            const formatted = formatMiddleInitial(e.target.value);
            e.target.value = formatted;
            e.target.setSelectionRange(Math.min(cursorPos, formatted.length), Math.min(cursorPos, formatted.length));
        });
    }
    
    // Student ID - Auto-capitalize
    const studentIdInput = document.getElementById('studentId');
    if (studentIdInput) {
        studentIdInput.addEventListener('input', function(e) {
            const cursorPos = e.target.selectionStart;
            const formatted = e.target.value.toUpperCase();
            e.target.value = formatted;
            e.target.setSelectionRange(cursorPos, cursorPos);
            validateEmailRealtime();
        });
        
        studentIdInput.addEventListener('blur', function(e) {
            e.target.value = e.target.value.toUpperCase();
            validateEmailRealtime();
        });
    }
    
    // Email - Real-time validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', validateEmailRealtime);
        emailInput.addEventListener('blur', validateEmailRealtime);
    }
}

/**
 * Real-time email validation with visual feedback
 */
function validateEmailRealtime() {
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const studentIdInput = document.getElementById('studentId');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!firstNameInput || !lastNameInput || !studentIdInput || !emailInput) return;
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const studentId = studentIdInput.value.trim();
    const email = emailInput.value.trim();
    
    // Calculate expected email
    const expectedEmail = calculateExpectedEmail(firstName, lastName, studentId);
    
    // Get or create error message div
    let errorDiv = document.getElementById('emailValidationError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'emailValidationError';
        errorDiv.className = 'mt-2 text-sm';
        emailInput.parentNode.appendChild(errorDiv);
    }
    
    // Only validate if all required fields have values
    if (firstName && lastName && studentId && email) {
        const isValid = validateEmailFormat(email, expectedEmail);
        
        if (isValid) {
            // Valid - Green border
            emailInput.classList.remove('border-red-500');
            emailInput.classList.add('border-green-500');
            errorDiv.classList.add('hidden');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } else {
            // Invalid - Red border and show error
            emailInput.classList.remove('border-green-500');
            emailInput.classList.add('border-red-500');
            errorDiv.classList.remove('hidden');
            errorDiv.className = 'mt-2 text-sm text-red-600 font-medium';
            errorDiv.innerHTML = `
                <div class="flex items-start gap-2">
                    <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                        <p>Email format incorrect.</p>
                        <p class="mt-1">Expected: <span class="font-mono bg-red-50 px-2 py-0.5 rounded">${expectedEmail}</span></p>
                    </div>
                </div>
            `;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    } else {
        // Not enough data to validate
        emailInput.classList.remove('border-green-500', 'border-red-500');
        errorDiv.classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Initialize formatting when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInputFormatting);
} else {
    initializeInputFormatting();
}

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

    // Validate UMak email format using the standardized calculation
    const expectedEmail = calculateExpectedEmail(firstName, lastName, studentId);
    
    if (!expectedEmail) {
        notificationManager.error('Invalid Student ID format');
        return;
    }
    
    // Check if email matches the expected format (case-insensitive)
    if (!validateEmailFormat(email, expectedEmail)) {
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

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server error: Invalid response format');
        }

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
        notificationManager.error(error.message || 'An error occurred. Please try again.');
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
