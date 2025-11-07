/**
 * Create Order Page Script
 * Q-Mak Queue Management System
 * Handles order creation with email validation, inventory checking, and OTP flow
 */

const API_BASE = '/Q-Mak/php/api';
let selectedQuantity = 1;
let inventoryStock = {};

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
const emailInput = document.getElementById('email');
const emailFeedback = document.getElementById('emailFeedback');

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

async function checkEmailExists() {
    const email = emailInput.value.trim();
    
    if (!email || !emailInput.validity.valid) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/check_email.php?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.exists && data.has_account) {
            isRegisteredAccount = true;
            
            const submitBtn = document.getElementById('submitOrderBtn');
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.remove('hover:bg-blue-800', 'hover:shadow-lg', 'hover:scale-105');
            
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
                                <button onclick="window.location.href='student_login.html'" 
                                        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                    Go to Login
                                </button>
                                <button onclick="emailInput.value=''; emailFeedback.classList.add('hidden'); isRegisteredAccount=false; document.getElementById('submitOrderBtn').disabled=false; document.getElementById('submitOrderBtn').classList.remove('opacity-50','cursor-not-allowed'); document.getElementById('submitOrderBtn').classList.add('hover:bg-blue-800','hover:shadow-lg','hover:scale-105'); emailInput.classList.remove('border-red-500'); emailInput.focus();" 
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
            
            const submitBtn = document.getElementById('submitOrderBtn');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.add('hover:bg-blue-800', 'hover:shadow-lg', 'hover:scale-105');
            
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
    
    const items = [];
    items.push(document.getElementById('purchasing').value);
    for (let i = 2; i <= selectedQuantity; i++) {
        const itemValue = document.getElementById(`item${i}`).value;
        if (itemValue) {
            items.push(itemValue);
        }
    }
    const itemsOrdered = items.join(', ');
    
    const formData = {
        studentId: document.getElementById('studentId').value,
        fname: document.getElementById('fname').value,
        lname: document.getElementById('lname').value,
        minitial: document.getElementById('minitial').value,
        email: document.getElementById('email').value,
        college: document.getElementById('college').value,
        program: document.getElementById('program').value,
        year: document.getElementById('year').value,
        section: document.getElementById('section').value,
        purchasing: itemsOrdered
    };
    
    try {
        const response = await fetch(`${API_BASE}/student/create_order.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('orderFormData', JSON.stringify(formData));
            sessionStorage.setItem('currentOtp', result.data.otp_code);
            sessionStorage.setItem('otpMode', 'order');
            sessionStorage.setItem('userEmail', formData.email);
            
            if (window.notificationManager) {
                window.notificationManager.otpSent(formData.email);
            }
            
            await showAlert('OTP has been sent to your email: ' + formData.email, 'success');
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
