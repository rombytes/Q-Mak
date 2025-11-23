/**
 * Admin Login Script
 * Q-Mak Queue Management System
 * Handles admin authentication with reCAPTCHA protection
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();
let captchaRequired = false;
let recaptchaWidgetId = null;
let recaptchaSiteKey = null;

// Load CAPTCHA configuration
async function loadCaptchaConfig() {
    try {
        const response = await fetch(`${API_BASE}/get_captcha_config.php`);
        const result = await response.json();
        if (result.success && result.captcha) {
            recaptchaSiteKey = result.captcha.site_key;
            console.log('CAPTCHA config loaded, site key:', recaptchaSiteKey);
        }
    } catch (error) {
        console.error('Failed to load CAPTCHA config:', error);
        // Fallback to hardcoded key (should be avoided)
        recaptchaSiteKey = '6LfhpwMsAAAAAMwJ0NfsBcudpHvk95VurbzQ5pQC';
    }
}

// Load config on page load
loadCaptchaConfig();

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
    } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Add setup link for connection errors
    if (message.includes('Connection error')) {
        message += ' <a href="../../setup.php" class="underline text-blue-600 hover:text-blue-800">Run Setup</a>';
    }

    errorText.innerHTML = message;
    errorDiv.classList.remove('hidden');

    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 8000);
}

// Show reCAPTCHA widget
function showCaptcha() {
    console.log('Showing CAPTCHA with site key:', recaptchaSiteKey);
    const container = document.getElementById('recaptchaContainer');
    container.classList.remove('hidden');
    container.classList.add('flex');
    captchaRequired = true;
    
    // Render reCAPTCHA if not already rendered
    if (recaptchaWidgetId === null) {
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            try {
                const widget = document.getElementById('recaptchaWidget');
                // Check if widget already has content (auto-rendered)
                if (widget.innerHTML.trim() === '') {
                    const siteKey = recaptchaSiteKey || '6LfhpwMsAAAAAMwJ0NfsBcudpHvk95VurbzQ5pQC';
                    recaptchaWidgetId = grecaptcha.render('recaptchaWidget', {
                        'sitekey': siteKey
                    });
                    console.log('reCAPTCHA rendered successfully with ID:', recaptchaWidgetId);
                } else {
                    // Widget already auto-rendered, get its ID
                    recaptchaWidgetId = 0; // First widget is always ID 0
                    console.log('reCAPTCHA was auto-rendered, using ID:', recaptchaWidgetId);
                }
            } catch (error) {
                console.error('Error rendering reCAPTCHA:', error);
                // If error, assume it was auto-rendered
                recaptchaWidgetId = 0;
            }
        } else {
            console.warn('grecaptcha not loaded yet');
        }
    }
}

// Hide reCAPTCHA widget
function hideCaptcha() {
    const container = document.getElementById('recaptchaContainer');
    container.classList.add('hidden');
    container.classList.remove('flex');
    captchaRequired = false;
    if (recaptchaWidgetId !== null && typeof grecaptcha !== 'undefined') {
        try {
            grecaptcha.reset(recaptchaWidgetId);
        } catch (error) {
            console.error('Error resetting reCAPTCHA:', error);
        }
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    
    // Hide any previous errors
    document.getElementById('errorMessage').classList.add('hidden');
    
    // Check if CAPTCHA is required and get response
    let recaptchaResponse = null;
    if (captchaRequired) {
        if (typeof grecaptcha === 'undefined' || typeof grecaptcha.getResponse !== 'function') {
            showError('reCAPTCHA not loaded properly. Please refresh the page.');
            return;
        }
        
        try {
            // Get response using widget ID if available
            recaptchaResponse = recaptchaWidgetId !== null 
                ? grecaptcha.getResponse(recaptchaWidgetId)
                : grecaptcha.getResponse();
        } catch (error) {
            console.error('Error getting reCAPTCHA response:', error);
            showError('Error accessing reCAPTCHA. Please refresh the page.');
            return;
        }
            
        if (!recaptchaResponse) {
            showError('Please complete the reCAPTCHA verification.');
            return;
        }
    }
    
    submitBtn.disabled = true;
    submitText.innerHTML = '<svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Logging in...';
    
    try {
        const requestBody = { email, password };
        if (recaptchaResponse) {
            requestBody.recaptcha_response = recaptchaResponse;
        }
        
        const response = await fetch(`${API_BASE}/admin/admin_login.php`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminData', JSON.stringify(result.data));
            
            // Success animation
            submitText.innerHTML = '<svg class="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Success!';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('bg-green-600');
            
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 500);
        } else {
            // Check if CAPTCHA is now required
            if (result.requires_captcha || result.captcha_required) {
                showCaptcha();
                showError(result.message + ' Please complete the CAPTCHA to continue.');
            } else {
                showError(result.message || 'Invalid credentials. Please try again.');
                // Reset CAPTCHA if it was shown
                if (captchaRequired && recaptchaWidgetId !== null && typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset(recaptchaWidgetId);
                }
            }
            
            submitBtn.disabled = false;
            submitText.textContent = 'Log In';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please check your internet and try again.');
        submitBtn.disabled = false;
        submitText.textContent = 'Log In';
        
        // Reset CAPTCHA on error
        if (captchaRequired && recaptchaWidgetId !== null && typeof grecaptcha !== 'undefined') {
            grecaptcha.reset(recaptchaWidgetId);
        }
    }
});
