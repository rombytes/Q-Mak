/**
 * Create Order Page Script
 * Q-Mak Queue Management System
 * Handles order creation with email validation, inventory checking, and OTP flow
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();
let selectedQuantity = 1;
let inventoryStock = {};

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

// currentServiceType is now defined globally in the HTML head
// selectServiceType function is also defined in the HTML head for inline onclick handlers

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
    const submitBtn = document.querySelector('button[type="submit"]');
    
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

// ============================================================================
// CUTOFF WARNING SYSTEM
// ============================================================================

async function checkCutoffWarning() {
    try {
        const response = await fetch(`${API_BASE}/student/check_cutoff.php`);
        const data = await response.json();
        
        if (data.success && data.warning) {
            const banner = document.getElementById('cutoffWarningBanner');
            const warning = data.warning;
            
            if (warning.level === 'error') {
                // COOP is closed
                banner.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 mb-6 rounded-lg shadow-md">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div class="ml-3 flex-1">
                                <p class="font-bold text-lg">COOP Closed</p>
                                <p class="mt-1">${warning.message}</p>
                                <p class="mt-2 text-sm">Your order will be scheduled for the next business day (${warning.next_business_day}).</p>
                            </div>
                        </div>
                    </div>
                `;
            } else if (warning.level === 'warning') {
                // Closing soon
                banner.innerHTML = `
                    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 mb-6 rounded-lg shadow-md animate-pulse">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <svg class="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </div>
                            <div class="ml-3 flex-1">
                                <p class="font-bold text-lg">Closing Soon!</p>
                                <p class="mt-1">${warning.message}</p>
                                <p class="mt-2 text-sm font-semibold">Orders placed after closing will be scheduled for ${warning.next_business_day}.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error checking cutoff warning:', error);
    }
}

// Check cutoff warning on page load and refresh every minute
checkCutoffWarning();
setInterval(checkCutoffWarning, 60 * 1000);

// ============================================================================
// EMAIL EXISTENCE CHECK
// ============================================================================

let emailCheckTimeout = null;
let isRegisteredAccount = false;
let emailInput = null;
let emailFeedback = null;

// Initialize email validation after DOM loads
function initializeEmailValidation() {
    emailInput = document.getElementById('email');
    emailFeedback = document.getElementById('emailFeedback');
    
    if (!emailInput || !emailFeedback) {
        console.warn('Email input or feedback element not found');
        return;
    }
    
    // Add event listener to email input
    emailInput.addEventListener('blur', checkEmailExists);
    emailInput.addEventListener('input', function() {
        clearTimeout(emailCheckTimeout);
        emailFeedback.classList.add('hidden');
        emailInput.classList.remove('border-red-500', 'border-green-500');
        isRegisteredAccount = false;
        
        emailCheckTimeout = setTimeout(() => {
            if (emailInput.value && emailInput.validity.valid) {
                checkEmailExists();
            }
        }, 1000);
    });
}

async function checkEmailExists() {
    const email = emailInput.value.trim();
    
    if (!email || !emailInput.validity.valid) {
        return;
    }
    
    // Validate UMak email format
    if (!email.endsWith('@umak.edu.ph')) {
        emailFeedback.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="bi bi-exclamation-triangle-fill text-red-500"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">Please use your UMak email address (@umak.edu.ph)</p>
                    </div>
                </div>
            </div>
        `;
        emailFeedback.classList.remove('hidden');
        emailInput.classList.add('border-red-500');
        emailInput.classList.remove('border-green-500');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/check_email.php?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.exists && data.has_account) {
            isRegisteredAccount = true;
            
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
                submitBtn.classList.remove('hover:bg-blue-800', 'hover:shadow-lg', 'hover:scale-105');
            }
            
            emailFeedback.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm animate-fadeIn">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-semibold text-red-800">Registered Account Detected</h3>
                            <p class="mt-1 text-sm text-red-700">This email has a registered account. Please login to place your order.</p>
                            <div class="mt-3 flex gap-3">
                                <button onclick="window.location.href='../login.html'" 
                                        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                    Go to Login
                                </button>
                                <button onclick="emailInput.value=''; emailFeedback.classList.add('hidden'); isRegisteredAccount=false; const btn=document.getElementById('submitBtn'); if(btn){btn.disabled=false; btn.classList.remove('opacity-50','cursor-not-allowed'); btn.classList.add('hover:bg-blue-800','hover:shadow-lg','hover:scale-105');} emailInput.classList.remove('border-red-500'); emailInput.focus();" 
                                        class="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all">
                                    Use Different Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            emailFeedback.classList.remove('hidden');
            emailInput.classList.add('border-red-500');
        } else if (data.success && !data.exists) {
            isRegisteredAccount = false;
            
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                submitBtn.classList.add('hover:bg-blue-800', 'hover:shadow-lg', 'hover:scale-105');
            }
            
            emailFeedback.classList.add('hidden');
            emailInput.classList.add('border-green-500');
            emailInput.classList.remove('border-red-500');
        }
    } catch (error) {
        console.error('Error checking email:', error);
    }
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

async function fetchInventoryStatus() {
    try {
        const response = await fetch(`${API_BASE}/inventory_status.php`);
        const result = await response.json();
        
        if (result.success && result.data.items) {
            inventoryStock = {};
            result.data.items.forEach(item => {
                inventoryStock[item.item_name] = item.is_available && item.stock_quantity > 0;
            });
            updateItemSelects();
        }
    } catch (error) {
        console.error('Error fetching inventory status:', error);
    }
}

function updateItemSelects() {
    const selectIds = ['purchasing', 'item2', 'item3', 'item4', 'item5'];
    
    selectIds.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        Array.from(select.options).forEach(option => {
            if (!option.value) return;
            
            if (!option.dataset.originalText) {
                option.dataset.originalText = option.textContent.trim();
            }
            
            const itemName = option.dataset.originalText;
            const isInStock = inventoryStock[itemName];
            
            if (isInStock === false) {
                option.disabled = true;
                option.textContent = itemName + ' (Out of Stock)';
                option.style.color = '#999';
                option.style.fontStyle = 'italic';
            } else {
                option.disabled = false;
                option.textContent = itemName;
                option.style.color = '';
                option.style.fontStyle = '';
            }
        });
    });
}

function selectQuantity(qty) {
    selectedQuantity = qty;
    
    const activeClass = 'py-3 px-4 border-2 border-blue-900 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-800 transition-all';
    const inactiveClass = 'py-3 px-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:border-blue-900 hover:bg-blue-50 transition-all';
    
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`qty${i}Btn`);
        if (btn) {
            btn.className = i === qty ? activeClass : inactiveClass;
        }
    }
    
    for (let i = 2; i <= 5; i++) {
        const container = document.getElementById(`item${i}Container`);
        const select = document.getElementById(`item${i}`);
        if (container && select) {
            if (i <= qty) {
                container.classList.remove('hidden');
                select.setAttribute('required', 'required');
            } else {
                container.classList.add('hidden');
                select.removeAttribute('required');
                select.value = '';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    selectQuantity(1);
    loadInventoryItems();
    initializeEmailValidation();
});

async function loadInventoryItems() {
    await populateInventorySelect('purchasing', false);
    await populateInventorySelect('item2', false);
    await populateInventorySelect('item3', false);
    await populateInventorySelect('item4', false);
    await populateInventorySelect('item5', false);
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('email').value.trim();
    
    // Service type specific validation
    if (currentServiceType === 'printing') {
        const printFile = document.getElementById('printFile').files[0];
        const pageCount = parseInt(document.getElementById('pageCount').value);
        
        if (!printFile) {
            showAlert('Please select a file to print', 'error');
            return;
        }
        
        if (!pageCount || pageCount <= 0) {
            showAlert('Please enter the number of pages', 'error');
            return;
        }
        
        // Validate file
        const validation = validatePrintFile(printFile);
        if (!validation.valid) {
            showAlert(validation.message, 'error');
            return;
        }
    }
    
    if (email) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying email...';
        
        try {
            const response = await fetch(`${API_BASE}/student/check_email.php?email=${encodeURIComponent(email)}`);
            const data = await response.json();
            
            if (data.success && data.exists && data.has_account) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Order';
                
                if (window.notificationManager) {
                    window.notificationManager.error('This email has a registered account. Please login to place your order.');
                }
                return;
            }
        } catch (error) {
            console.error('Error verifying email:', error);
        }
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Prepare form data based on service type
    const studentIdField = document.getElementById('studentId');
    console.log('Student ID field:', studentIdField, 'Value:', studentIdField?.value);
    
    const baseFormData = {
        studentId: studentIdField?.value?.trim() || '',
        fname: document.getElementById('firstName')?.value?.trim() || '',
        lname: document.getElementById('lastName')?.value?.trim() || '',
        minitial: document.getElementById('middleInitial')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim() || '',
        college: document.getElementById('college')?.value || '',
        program: document.getElementById('program')?.value?.trim() || '',
        year: document.getElementById('year')?.value || '',
        section: document.getElementById('section')?.value?.trim() || '',
        order_type_service: currentServiceType
    };
    
    console.log('Base form data being sent:', baseFormData);
    
    let formData;
    
    if (currentServiceType === 'items') {
        // Items order
        const items = [];
        items.push(document.getElementById('purchasing').value);
        for (let i = 2; i <= selectedQuantity; i++) {
            const itemValue = document.getElementById(`item${i}`).value;
            if (itemValue) {
                items.push(itemValue);
            }
        }
        const itemsOrdered = items.join(', ');
        
        formData = {
            ...baseFormData,
            purchasing: itemsOrdered
        };
    } else {
        // Printing order - use FormData for file upload
        formData = new FormData();
        
        // Add base fields
        Object.keys(baseFormData).forEach(key => {
            formData.append(key, baseFormData[key]);
        });
        
        // Add printing-specific fields
        formData.append('print_file', document.getElementById('printFile').files[0]);
        formData.append('page_count', document.getElementById('pageCount').value);
        formData.append('color_mode', document.getElementById('colorMode').value);
        formData.append('paper_size', document.getElementById('paperSize').value);
        formData.append('copies', document.getElementById('copies').value);
        formData.append('double_sided', document.getElementById('doubleSided').checked ? '1' : '0');
        formData.append('instructions', document.getElementById('printInstructions').value);
        formData.append('estimated_price', updatePrintingPriceDisplay());
    }
    
    try {
        // Different request setup for items vs printing
        const requestOptions = {
            method: 'POST'
        };
        
        if (currentServiceType === 'items') {
            requestOptions.headers = { 'Content-Type': 'application/json' };
            requestOptions.body = JSON.stringify(formData);
            console.log('Sending items order:', formData);
        } else {
            // FormData handles its own content-type for file uploads
            requestOptions.body = formData;
            console.log('Sending printing order with FormData');
            // Log FormData contents
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
        }
        
        const response = await fetch(`${API_BASE}/student/create_order.php`, requestOptions);
        
        const result = await response.json();
        
        if (result.success) {
            // Store order data for OTP verification (excluding file for printing)
            let orderData;
            if (currentServiceType === 'items') {
                orderData = formData;
            } else {
                // For printing, store all data except the file object
                orderData = {
                    ...baseFormData,
                    page_count: document.getElementById('pageCount').value,
                    color_mode: document.getElementById('colorMode').value,
                    paper_size: document.getElementById('paperSize').value,
                    copies: document.getElementById('copies').value,
                    double_sided: document.getElementById('doubleSided').checked ? '1' : '0',
                    instructions: document.getElementById('printInstructions').value || '',
                    estimated_price: updatePrintingPriceDisplay(),
                    file_name: document.getElementById('printFile').files[0]?.name || '',
                    // Include the stored filename from server response
                    stored_file_name: result.data.stored_file_name || ''
                };
            }
            sessionStorage.setItem('orderFormData', JSON.stringify(orderData));
            sessionStorage.setItem('currentOtp', result.data.otp_code);
            sessionStorage.setItem('otpMode', 'order');
            sessionStorage.setItem('userEmail', baseFormData.email);
            sessionStorage.setItem('orderServiceType', currentServiceType);
            
            if (window.notificationManager) {
                window.notificationManager.otpSent(baseFormData.email);
            }
            
            const serviceTypeLabel = currentServiceType === 'items' ? 'Items Order' : 'Printing Service';
            await showAlert(`${serviceTypeLabel} - OTP has been sent to your email: ` + baseFormData.email, 'success');
            console.log('Development OTP:', result.data.otp_code);
            
            setTimeout(() => {
                window.location.href = 'otp_verification.html';
            }, 1000);
        } else {
            if (window.notificationManager) {
                window.notificationManager.error(result.message || 'Failed to create order');
            }
            await showAlert(result.message || 'Failed to create order. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Order creation error:', error);
        if (window.notificationManager) {
            window.notificationManager.error('Connection error. Please try again.');
        }
        await showAlert('An error occurred. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Order';
    }
});
