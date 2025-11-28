/**
 * Student Dashboard - Main Script
 * Q-Mak Queue Management System - SPA Version
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();
let currentOrder = null;
let orderHistory = [];
let orderStats = { total: 0, completed: 0, pending: 0, cancelled: 0 };
let currentPage = 1;
let currentFilter = 'all';
let currentSearch = '';

// Make studentData globally accessible
window.studentData = null;

// Phase 8: Store service status globally
let servicesStatus = {
    'School Items': true,
    'Printing Services': true
};

// Check session on page load
async function checkSession() {
    if (!sessionStorage.getItem('studentLoggedIn')) {
        window.location.href = '../login.html';
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/student_session.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            sessionStorage.clear();
            window.location.href = '../login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Session check error:', error);
        sessionStorage.clear();
        window.location.href = '../login.html';
        return false;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        await initDashboard();
    }
});

async function initDashboard() {
    try {
        await loadStudentProfile();
        await loadCurrentOrder();
        await loadOrderHistory();
        calculateOrderStats();
        updateDashboardStats();
        fetchInventoryStatus();
        // Phase 7: Check active orders and disable buttons if needed
        await checkActiveOrdersAndDisableButtons();
        // Phase 8: Check service status and update UI
        await checkServicesStatusAndUpdate();
        // Check cutoff warning
        await checkDashboardCutoff();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('error', 'Error', 'Failed to load dashboard data');
    }
}

// Load student profile
async function loadStudentProfile() {
    try {
        const response = await fetch(`${API_BASE}/student/get_profile.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response from get_profile.php:', text);
            throw new Error('Server returned invalid response format');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            window.studentData = result.data;
            window.profileLoadRetries = 0; // Reset retry counter on success
            // Update nav profile (function may be in dashboard_tabs.js)
            if (typeof updateNavProfile === 'function') {
                updateNavProfile(window.studentData);
            } else {
                // Fallback: update directly
                updateProfileDisplay(window.studentData);
            }
            return true;
        } else {
            console.error('Failed to load profile:', result.message || 'Unknown error');
            if (result.error) console.error('Error details:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        console.error('Error details:', error.message);
        return false;
    }
}

// Fallback function to update profile display
function updateProfileDisplay(data) {
    const getInitials = (firstName, lastName) => {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last || '?';
    };
    
    const initials = getInitials(data.first_name, data.last_name);
    const fullName = `${data.first_name} ${data.last_name}`;
    
    // Update nav bar
    const navName = document.getElementById('navStudentName');
    const navId = document.getElementById('navStudentId');
    const navInitials = document.getElementById('navAvatarInitials');
    const navAvatar = document.getElementById('navAvatarImg');
    
    if (navName) navName.textContent = fullName;
    if (navId) navId.textContent = data.student_id;
    if (navInitials) navInitials.textContent = initials;
    
    // Set default profile picture (Herons.png)
    if (navAvatar) {
        const profilePic = data.profile_picture ? '../../' + data.profile_picture : '../../images/Herons.png';
        navAvatar.src = profilePic;
        navAvatar.onerror = function() {
            this.src = '../../images/Herons.png';
        };
    }
    
    // Update dropdown
    const dropdownName = document.getElementById('dropdownStudentName');
    const dropdownId = document.getElementById('dropdownStudentId');
    const dropdownInitials = document.getElementById('dropdownAvatarInitials');
    const dropdownAvatar = document.getElementById('dropdownAvatarImg');
    
    if (dropdownName) dropdownName.textContent = fullName;
    if (dropdownId) dropdownId.textContent = data.student_id;
    if (dropdownInitials) dropdownInitials.textContent = initials;
    
    // Set default profile picture in dropdown
    if (dropdownAvatar) {
        const profilePic = data.profile_picture ? '../../' + data.profile_picture : '../../images/Herons.png';
        dropdownAvatar.src = profilePic;
        dropdownAvatar.onerror = function() {
            this.src = '../../images/Herons.png';
        };
    }
    
    // Update profile tab content
    updateProfileTabContent(data);
}

// Update profile tab with student data
function updateProfileTabContent(data) {
    // Profile header
    const profileFullName = document.getElementById('profileFullName');
    const profileStudentId = document.getElementById('profileStudentId');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatarLargeImg = document.getElementById('profileAvatarLargeImg');
    const profileAvatarLarge = document.getElementById('profileAvatarLarge');
    
    if (profileFullName) profileFullName.textContent = `${data.first_name} ${data.last_name}`;
    if (profileStudentId) profileStudentId.textContent = `Student ID: ${data.student_id}`;
    if (profileEmail) profileEmail.textContent = data.email;
    
    // Large profile picture
    if (profileAvatarLargeImg) {
        const profilePic = data.profile_picture ? '../../' + data.profile_picture : '../../images/Herons.png';
        profileAvatarLargeImg.src = profilePic;
        profileAvatarLargeImg.onerror = function() {
            this.src = '../../images/Herons.png';
        };
    }
    
    // Profile info cards
    const profileInfoEmail = document.getElementById('profileInfoEmail');
    const profileInfoPhone = document.getElementById('profileInfoPhone');
    const profileInfoProgram = document.getElementById('profileInfoProgram');
    const profileInfoYear = document.getElementById('profileInfoYear');
    
    if (profileInfoEmail) profileInfoEmail.textContent = data.email;
    if (profileInfoPhone) profileInfoPhone.textContent = data.phone || 'Not set';
    if (profileInfoProgram) profileInfoProgram.textContent = data.program || 'Not set';
    if (profileInfoYear) profileInfoYear.textContent = data.year_level ? `${data.year_level}${getOrdinalSuffix(data.year_level)} Year` : 'Not set';
    
    // Profile statistics
    const profileStatTotal = document.getElementById('profileStatTotal');
    const profileStatCompleted = document.getElementById('profileStatCompleted');
    const profileStatSpent = document.getElementById('profileStatSpent');
    const profileStatMemberSince = document.getElementById('profileStatMemberSince');
    
    if (profileStatTotal) profileStatTotal.textContent = orderStats.total;
    if (profileStatCompleted) profileStatCompleted.textContent = orderStats.completed;
    if (profileStatSpent) profileStatSpent.textContent = '0.00'; // TODO: Calculate from orders
    if (profileStatMemberSince) {
        const memberSince = new Date(data.created_at || Date.now());
        profileStatMemberSince.textContent = memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
}

// Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Load current active order
async function loadCurrentOrder() {
    try {
        const response = await fetch(`${API_BASE}/student/get_current_order.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            currentOrder = result.data;
            displayCurrentOrder(currentOrder);
        } else {
            displayNoCurrentOrder();
        }
    } catch (error) {
        console.error('Error loading current order:', error);
        displayNoCurrentOrder();
    }
}

// Display current order in hero section
// Store current order data globally for download
let currentActiveOrder = null;

function displayCurrentOrder(order) {
    currentActiveOrder = order; // Store for download function
    const heroSection = document.getElementById('heroSection');
    
    const statusColors = {
        pending: 'bg-warning-100 text-warning-800 border-warning-300',
        processing: 'bg-accent-100 text-accent-800 border-accent-300',
        ready: 'bg-success-100 text-success-800 border-success-300',
        scheduled: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    
    const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Phase 3: Check-in button for scheduled orders
    let checkInButtonHTML = '';
    if (order.status === 'scheduled') {
        checkInButtonHTML = `
            <div class="mb-6">
                <div class="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-2xl text-white">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="bi bi-hand-pointer text-white text-3xl"></i>
                            </div>
                            <div class="text-left">
                                <h3 class="text-2xl font-bold mb-1">Ready to Check In?</h3>
                                <p class="text-purple-100 text-sm">Click the button to join the queue and receive your number</p>
                            </div>
                        </div>
                        <button 
                            onclick="activateOrderDashboard()" 
                            id="dashboardCheckInButton"
                            class="bg-white text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-2xl hover:scale-105 flex items-center gap-3 min-w-[200px] justify-center">
                            <i class="bi bi-check-circle-fill text-2xl"></i>
                            <span>I'M HERE</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Phase 4: Cancel button for cancellable orders (pending/scheduled)
    let cancelButtonHTML = '';
    if (order.status === 'pending' || order.status === 'scheduled') {
        cancelButtonHTML = `
            <div class="mb-6">
                <div class="bg-gradient-to-r from-gray-50 to-red-50 rounded-xl p-5 border border-red-200 shadow-md">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <i class="bi bi-exclamation-triangle-fill text-red-600 text-xl"></i>
                            </div>
                            <div class="text-left">
                                <h4 class="text-lg font-bold text-gray-800">Need to Cancel?</h4>
                                <p class="text-gray-600 text-sm">Your reserved item will be released back to inventory</p>
                            </div>
                        </div>
                        <button 
                            onclick="cancelOrderDashboard()" 
                            id="dashboardCancelButton"
                            class="bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 rounded-lg font-bold transition-all hover:shadow-lg flex items-center gap-2">
                            <i class="bi bi-x-circle-fill text-xl"></i>
                            <span>Cancel Order</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Progress steps - New flow: Confirmed → Waiting → Processing → Completed
    const steps = [
        { name: 'Confirmed', status: 'completed', icon: 'bi-check-circle-fill' },
        { name: 'Waiting', status: order.status === 'pending' || order.status === 'scheduled' ? 'active' : 'completed', icon: 'bi-hourglass-split' },
        { name: 'Processing', status: order.status === 'processing' ? 'active' : (order.status === 'completed' ? 'completed' : 'pending'), icon: 'bi-bell-fill' },
        { name: 'Completed', status: order.status === 'completed' ? 'completed' : 'pending', icon: 'bi-hand-thumbs-up-fill' }
    ];
    
    heroSection.innerHTML = checkInButtonHTML + cancelButtonHTML + `
        <div class="bg-gradient-to-r from-accent-600 to-accent-500 rounded-2xl p-8 shadow-2xl text-white" style="background: linear-gradient(to right, #2563eb, #3b82f6); color: #ffffff !important;">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 class="text-3xl font-bold mb-2" style="color: #ffffff !important; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Active Order ${order.queue_number}</h2>
                    <p class="text-accent-100" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">Placed at ${new Date(order.created_at).toLocaleTimeString()}</p>
                </div>
                <span class="px-6 py-3 ${statusColor} rounded-xl font-bold text-sm border-2 shadow-lg">
                    ${(order.order_status || order.status || 'pending').toUpperCase()}
                </span>
            </div>
            
            <!-- Progress Bar -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                    ${steps.map(step => `
                        <div class="flex flex-col items-center flex-1">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                                step.status === 'completed' ? 'bg-success-500' :
                                step.status === 'active' ? (step.name === 'Processing' ? 'bg-orange-500 animate-pulse' : 'bg-yellow-400 animate-pulse') :
                                'bg-white bg-opacity-30'
                            }" style="${
                                step.status === 'completed' ? 'background-color: #22c55e; color: #ffffff;' :
                                step.status === 'active' ? (step.name === 'Processing' ? 'background-color: #f97316; color: #ffffff; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : 'background-color: #facc15; color: #ffffff;') :
                                'background-color: rgba(255,255,255,0.3); color: #ffffff;'
                            }">
                                <i class="bi ${step.icon} text-xl" style="color: #ffffff;"></i>
                            </div>
                            <span class="text-sm font-semibold" style="color: #ffffff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${step.name}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="h-2 bg-white bg-opacity-30 rounded-full" style="background-color: rgba(255,255,255,0.3);">
                    <div class="h-full bg-success-500 rounded-full transition-all duration-500" style="width: ${
                        (order.order_status || order.status || 'pending') === 'pending' ? '33%' :
                        (order.order_status || order.status || 'pending') === 'processing' ? '66%' :
                        (order.order_status || order.status || 'pending') === 'completed' ? '100%' : '33%'
                    }; background-color: #22c55e;"></div>
                </div>
            </div>
            
            <!-- Processing Alert -->
            ${(order.order_status || order.status || 'pending') === 'processing' ? `
                <div class="bg-orange-500 text-white rounded-xl p-4 mb-6 shadow-lg animate-pulse" style="background-color: #f97316;">
                    <div class="flex items-center gap-3">
                        <i class="bi bi-bell-fill text-3xl"></i>
                        <div>
                            <h4 class="font-bold text-lg">Your Turn!</h4>
                            <p class="text-sm">Please proceed to the COOP counter now</p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- QR Code and Order Details Section -->
            <div class="bg-white bg-opacity-10 rounded-2xl p-6 mb-6" style="background-color: rgba(255,255,255,0.15);">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- QR Code -->
                    <div class="flex flex-col items-center justify-center">
                        <div class="bg-white p-4 rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl transition-all" onclick="openDashboardQRZoom()">
                            <canvas id="activeOrderQRCode" class="mx-auto"></canvas>
                        </div>
                        <p class="text-xs text-center mt-3 flex items-center gap-1" style="color: #dbeafe !important;">
                            <i class="bi bi-qr-code"></i>
                            Present this at COOP counter
                        </p>
                        <p class="text-xs text-center mt-1 flex items-center justify-center gap-1" style="color: #93c5fd !important;">
                            <i class="bi bi-search"></i>
                            Tap to enlarge
                        </p>
                        <button onclick="downloadActiveOrderQR()" class="mt-3 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center gap-2 touch-manipulation active:bg-gray-200 w-full justify-center">
                            <i class="bi bi-download"></i>
                            Download QR
                        </button>
                    </div>
                    
                    <!-- Order Details -->
                    <div class="flex flex-col gap-3">
                        <!-- Queue Number -->
                        <div class="bg-white rounded-xl p-4 shadow-md">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <i class="bi bi-hash text-blue-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-600">Queue Number</h4>
                                    <p class="text-2xl font-extrabold ${order.status === 'scheduled' ? 'text-purple-600' : 'bg-gradient-to-r from-blue-900 to-blue-700'}" style="${order.status === 'scheduled' ? 'color: #a855f7;' : 'background: linear-gradient(to right, #1e3a8a, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'}">${order.status === 'scheduled' ? 'SCHEDULED' : order.queue_number}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Reference Number -->
                        <div class="bg-white rounded-xl p-4 shadow-md">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <i class="bi bi-upc-scan text-purple-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-600">Reference Number</h4>
                                    <p class="text-base font-bold text-purple-600">${order.reference_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Ordered -->
                        <div class="bg-white rounded-xl p-4 shadow-md">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <i class="bi bi-bag-check text-green-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-600">Items Ordered</h4>
                                    <p class="text-sm font-semibold text-gray-800">${order.item_name || order.item_ordered}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Wait Time -->
                        <div class="bg-white rounded-xl p-4 shadow-md">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <i class="bi bi-clock text-orange-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-600">Estimated Wait Time</h4>
                                    ${order.status === 'scheduled' ? `
                                        <p class="text-base font-bold text-purple-600">Check In Required</p>
                                        <p class="text-xs text-gray-500 mt-1"><i class="bi bi-info-circle"></i> No queue number yet</p>
                                    ` : `
                                        <p class="text-base font-bold text-orange-600">${order.estimated_minutes || order.estimated_wait_time} minutes</p>
                                        ${order.orders_ahead !== undefined ? `<p class="text-xs text-gray-500 mt-1">${order.orders_ahead === 0 ? "You're next!" : order.orders_ahead + ' order' + (order.orders_ahead > 1 ? 's' : '') + ' ahead'}</p>` : ''}
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Instructions -->
            <div class="bg-white bg-opacity-10 rounded-xl p-5 mb-4" style="background-color: rgba(255,255,255,0.15);">
                <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i class="bi bi-list-check text-white text-lg"></i>
                    </div>
                    <h4 class="font-bold text-lg" style="color: #ffffff !important;">What to do next:</h4>
                </div>
                <div class="space-y-2 ml-12">
                    <div class="flex items-start gap-3 bg-white bg-opacity-20 rounded-lg p-3">
                        <div class="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="text-blue-600 font-bold text-xs">1</span>
                        </div>
                        <p class="text-sm" style="color: #ffffff !important;">Wait for your queue number to be called</p>
                    </div>
                    <div class="flex items-start gap-3 bg-white bg-opacity-20 rounded-lg p-3">
                        <div class="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="text-orange-600 font-bold text-xs">2</span>
                        </div>
                        <p class="text-sm" style="color: #ffffff !important;">Present QR code (or reference number if not available) at the COOP counter</p>
                    </div>
                    <div class="flex items-start gap-3 bg-white bg-opacity-20 rounded-lg p-3">
                        <div class="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="text-green-600 font-bold text-xs">3</span>
                        </div>
                        <p class="text-sm" style="color: #ffffff !important;">Collect your order and enjoy!</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Generate QR Code after DOM is ready - matching order_result.html format
    setTimeout(() => {
        generateActiveOrderQR(order);
    }, 100);
}

/**
 * Activate a scheduled order from dashboard - Phase 3: Check-In System
 */
// Phase 4: Cancel Order Function
async function cancelOrderDashboard() {
    const cancelButton = document.getElementById('dashboardCancelButton');
    
    if (!currentActiveOrder || !currentActiveOrder.reference_number) {
        showToast('error', 'Error', 'Order information not found');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(
        '⚠️ Are you sure you want to cancel this order?\n\n' +
        'This action will:\n' +
        '• Cancel your order immediately\n' +
        '• Release your reserved item back to inventory\n' +
        '• Remove you from the queue (if applicable)\n\n' +
        'This cannot be undone.'
    );
    
    if (!confirmed) {
        return; // User cancelled the confirmation
    }
    
    // Disable button and show loading state
    if (cancelButton) {
        cancelButton.disabled = true;
        cancelButton.innerHTML = '<i class="bi bi-arrow-repeat spin text-xl"></i> <span>Cancelling...</span>';
        cancelButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/cancel_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                reference_number: currentActiveOrder.reference_number
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success toast
            showToast('success', 'Order Cancelled', 'Your reserved item has been released.');
            
            // Reload current order to clear display
            setTimeout(async () => {
                await loadCurrentOrder();
                await loadOrderHistory(); // Refresh history to show cancelled status
                // Phase 7: Refresh active orders status after cancellation
                await checkActiveOrdersAndDisableButtons();
            }, 1500);
            
        } else {
            // Handle errors
            const errorMessage = result.message || 'Failed to cancel order. Please try again.';
            showToast('error', 'Cancel Failed', errorMessage);
            
            // Re-enable button
            if (cancelButton) {
                cancelButton.disabled = false;
                cancelButton.innerHTML = '<i class="bi bi-x-circle-fill text-xl"></i> <span>Cancel Order</span>';
                cancelButton.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }
        
    } catch (error) {
        console.error('Cancel order error:', error);
        showToast('error', 'Network Error', 'Please check your connection and try again.');
        
        // Re-enable button
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.innerHTML = '<i class="bi bi-x-circle-fill text-xl"></i> <span>Cancel Order</span>';
            cancelButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

async function activateOrderDashboard() {
    const checkInButton = document.getElementById('dashboardCheckInButton');
    
    if (!currentActiveOrder || !currentActiveOrder.reference_number) {
        showToast('error', 'Error', 'Order information not found');
        return;
    }
    
    // Disable button and show loading state
    if (checkInButton) {
        checkInButton.disabled = true;
        checkInButton.innerHTML = '<i class="bi bi-arrow-repeat spin text-2xl"></i> <span>Checking In...</span>';
        checkInButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/activate_scheduled_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_number: currentActiveOrder.reference_number
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success toast
            showToast('success', 'Checked In!', `Your queue number is ${result.data.queue_number}`);
            
            // Reload current order to show updated status
            setTimeout(() => {
                loadCurrentOrder();
            }, 1500);
            
        } else {
            // Handle errors
            const errorMessage = result.message || 'Failed to check in. Please try again.';
            showToast('error', 'Check-in Failed', errorMessage);
            
            // Re-enable button
            if (checkInButton) {
                checkInButton.disabled = false;
                checkInButton.innerHTML = '<i class="bi bi-check-circle-fill text-2xl"></i> <span>I\'M HERE</span>';
                checkInButton.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        showToast('error', 'Network Error', 'Please check your connection and try again.');
        
        // Re-enable button
        if (checkInButton) {
            checkInButton.disabled = false;
            checkInButton.innerHTML = '<i class="bi bi-check-circle-fill text-2xl"></i> <span>I\'M HERE</span>';
            checkInButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

// Generate QR Code for active order - standardized format matching order_result.html
function generateActiveOrderQR(order) {
    const canvas = document.getElementById('activeOrderQRCode');
    if (!canvas) {
        console.error('QR canvas not found');
        return;
    }
    
    // Create QR data in same format as order_result.html
    const qrData = JSON.stringify({
        queue_number: order.queue_number,
        reference_number: order.reference_number || order.queue_number,
        email: order.email || 'N/A',
        queue_date: order.created_at || new Date().toISOString(),
        order_type: order.order_type || 'immediate',
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });
    
    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined' || !QRCode.toCanvas) {
        console.error('QRCode library not loaded');
        showQRFallback(canvas, order.reference_number || order.queue_number);
        return;
    }
    
    // Generate QR code with exact same settings as order_result.html
    QRCode.toCanvas(canvas, qrData, {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function (error) {
        if (error) {
            console.error('QR Code generation error:', error);
            showQRFallback(canvas, order.reference_number || order.queue_number);
        } else {
            console.log('Active order QR code generated successfully');
        }
    });
}

// Fallback QR display if generation fails
function showQRFallback(canvas, identifier) {
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    
    // Blue border
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 180, 180);
    
    // Corner markers (typical QR pattern)
    ctx.fillStyle = '#1e3a8a';
    const markerSize = 25;
    const positions = [[15, 15], [15, 165], [165, 15]];
    
    positions.forEach(pos => {
        ctx.fillRect(pos[0], pos[1], markerSize, markerSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pos[0] + 5, pos[1] + 5, markerSize - 10, markerSize - 10);
        ctx.fillStyle = '#1e3a8a';
    });
    
    // Text identifier
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(identifier, 100, 105);
}

// Display when no current order
function displayNoCurrentOrder() {
    const heroSection = document.getElementById('heroSection');
    heroSection.innerHTML = `
        <div class="bg-white rounded-2xl p-12 shadow-xl border-2 border-dashed border-gray-300 text-center">
            <div class="w-24 h-24 bg-gradient-to-br from-accent-100 to-accent-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="bi bi-cart-x text-accent-600 text-4xl"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-800 mb-3">No Active Orders</h3>
            <p class="text-gray-600 mb-8 max-w-md mx-auto">You don't have any orders in progress. Ready to place an order?</p>
            <button onclick="showQuickOrder()" class="px-8 py-4 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center gap-3">
                <i class="bi bi-plus-circle-fill text-xl"></i>
                Create New Order
            </button>
        </div>
    `;
}

// Load order history
async function loadOrderHistory(status = 'all', page = 1) {
    try {
        const response = await fetch(`${API_BASE}/student/get_order_history.php?status=${status}&page=${page}&limit=10`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            orderHistory = result.data.orders;
            displayOrderHistory(orderHistory);
            updatePagination(result.data.pagination);
            
            // Always update recent activity on dashboard with first 3 orders
            displayRecentActivity(orderHistory.slice(0, 3));
        } else {
            displayEmptyOrderHistory();
        }
    } catch (error) {
        console.error('Error loading order history:', error);
        displayEmptyOrderHistory();
    }
}

// Display order history in table
function displayOrderHistory(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const mobileList = document.getElementById('ordersListMobile');
    const mobilePlaceholder = document.getElementById('ordersMobilePlaceholder');

    // Detailed error logging for missing elements
    if (!tbody) {
        console.error('Order display container missing: ordersTableBody');
    }
    if (!mobileList) {
        console.error('Order display container missing: ordersListMobile');
    }
    // mobilePlaceholder is optional - no warning needed
    
    // Allow partial rendering if at least one container exists
    if (!tbody && !mobileList) {
        console.error('Critical: Both desktop and mobile order containers are missing');
        return;
    }

    if (orders.length === 0) {
        const emptyStateHTML = `
            <div class="px-6 py-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
                <i class="bi bi-inbox text-5xl text-gray-300 mb-3 block"></i>
                <p class="text-gray-500">No orders found</p>
                <button onclick="showQuickOrder()" class="mt-4 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-semibold transition-all">
                    Create New Order
                </button>
            </div>
        `;
        if (tbody) tbody.innerHTML = `<tr><td colspan="5">${emptyStateHTML}</td></tr>`;
        if (mobileList) mobileList.innerHTML = emptyStateHTML;
        if (mobilePlaceholder) mobilePlaceholder.classList.add('hidden');
        return;
    }

    if (mobilePlaceholder) mobilePlaceholder.classList.add('hidden');

    // Populate Desktop Table
    if (tbody) {
        tbody.innerHTML = orders.map(order => {
        const statusColors = {
            completed: 'bg-success-100 text-success-800',
            cancelled: 'bg-danger-100 text-danger-800',
            pending: 'bg-warning-100 text-warning-800',
            processing: 'bg-accent-100 text-accent-800',
            ready: 'bg-info-100 text-info-800'
        };
        
        const orderStatus = order.order_status || order.status || 'pending';
        const statusColor = statusColors[orderStatus] || 'bg-gray-100 text-gray-800';
        const orderDate = new Date(order.created_at);
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-mono text-sm font-semibold text-blue-600">${order.queue_number}</td>
                <td class="px-6 py-4">${order.item_name || order.item_ordered}</td>
                <td class="px-6 py-4">
                    <span class="${statusColor} px-3 py-1 rounded-full text-xs font-bold uppercase">
                        ${orderStatus}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    ${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="viewOrderDetails(${order.order_id})" class="text-accent-600 hover:text-accent-800 font-semibold">
                        <i class="bi bi-eye mr-1"></i>View
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    }

    // Populate Mobile Card List
    if (mobileList) {
        mobileList.innerHTML = orders.map(order => {
        const statusColors = {
            completed: { bg: 'bg-success-100', text: 'text-success-800', icon: 'bi-check-circle-fill' },
            cancelled: { bg: 'bg-danger-100', text: 'text-danger-800', icon: 'bi-x-circle-fill' },
            pending: { bg: 'bg-warning-100', text: 'text-warning-800', icon: 'bi-clock-fill' },
            processing: { bg: 'bg-accent-100', text: 'text-accent-800', icon: 'bi-arrow-repeat' },
            ready: { bg: 'bg-info-100', text: 'text-info-800', icon: 'bi-check2-circle' }
        };
        const orderStatus = order.order_status || order.status || 'pending';
        const status = statusColors[orderStatus] || statusColors.pending;
        const orderDate = new Date(order.created_at);

        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4" onclick="viewOrderDetails(${order.order_id})">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-lg text-blue-600 font-mono">#${order.queue_number}</p>
                        <p class="text-sm font-semibold text-gray-800">${order.item_name || order.item_ordered}</p>
                    </div>
                    <span class="${status.bg} ${status.text} px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                        <i class="bi ${status.icon}"></i>
                        ${orderStatus}
                    </span>
                </div>
                <div class="text-xs text-gray-500">
                    ${orderDate.toLocaleDateString()} at ${orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        `;
        }).join('');
    }
}

// Display empty order history
function displayEmptyOrderHistory() {
    const tbody = document.getElementById('ordersTableBody');
    const mobileList = document.getElementById('ordersListMobile');
    const mobilePlaceholder = document.getElementById('ordersMobilePlaceholder');

    const emptyStateHTML = `
        <div class="px-6 py-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
            <i class="bi bi-inbox text-5xl text-gray-300 mb-3 block"></i>
            <p class="text-gray-500 mb-4">No orders found</p>
            <button onclick="showQuickOrder()" class="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-semibold transition-all">
                Create Your First Order
            </button>
        </div>
    `;

    tbody.innerHTML = `<tr><td colspan="5">${emptyStateHTML}</td></tr>`;
    mobileList.innerHTML = emptyStateHTML;
    if (mobilePlaceholder) mobilePlaceholder.classList.add('hidden');
}

// Update pagination
function updatePagination(pagination) {
    // Desktop Pagination
    document.getElementById('ordersShowingStart').textContent = pagination.total_items > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
    document.getElementById('ordersShowingEnd').textContent = Math.min(pagination.current_page * pagination.per_page, pagination.total_items);
    document.getElementById('ordersTotalCount').textContent = pagination.total_items;
    
    document.getElementById('ordersPrevBtn').disabled = !pagination.has_prev;
    document.getElementById('ordersNextBtn').disabled = !pagination.has_next;

    // Mobile Pagination
    const mobilePaginationContainer = document.getElementById('ordersPaginationMobile');
    if (mobilePaginationContainer) {
        if (pagination.total_pages <= 1) {
            mobilePaginationContainer.innerHTML = '';
            return;
        }

        mobilePaginationContainer.innerHTML = `
            <button onclick="loadOrdersPage(${pagination.current_page - 1})" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${!pagination.has_prev ? 'disabled' : ''}>
                <i class="bi bi-arrow-left"></i>
            </button>
            <div class="text-sm text-gray-600">
                Page ${pagination.current_page} of ${pagination.total_pages}
            </div>
            <button onclick="loadOrdersPage(${pagination.current_page + 1})" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${!pagination.has_next ? 'disabled' : ''}>
                <i class="bi bi-arrow-right"></i>
            </button>
        `;
    }
}

// Display recent activity timeline
function displayRecentActivity(recentOrders) {
    const timeline = document.getElementById('recentActivityTimeline');
    
    if (!timeline) {
        console.warn('Recent activity timeline element not found');
        return;
    }
    
    if (!recentOrders || recentOrders.length === 0) {
        timeline.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="bi bi-inbox text-4xl mb-2 block"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    const groupedByDate = {};
    recentOrders.forEach(order => {
        const date = new Date(order.created_at).toDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(order);
    });
    
    timeline.innerHTML = Object.entries(groupedByDate).map(([date, orders]) => `
        <div class="mb-6">
            <div class="text-sm font-bold text-gray-500 mb-3">${formatDateLabel(date)}</div>
            <div class="space-y-3">
                ${orders.map(order => {
                    const statusIcons = {
                        completed: { icon: 'bi-check-circle-fill', color: 'text-success-600' },
                        cancelled: { icon: 'bi-x-circle-fill', color: 'text-danger-600' },
                        pending: { icon: 'bi-clock-fill', color: 'text-warning-600' },
                        processing: { icon: 'bi-hourglass-split', color: 'text-accent-600' },
                        ready: { icon: 'bi-bell-fill', color: 'text-info-600' }
                    };
                    
                    const orderStatus = order.order_status || order.status || 'pending';
                    const status = statusIcons[orderStatus] || statusIcons.pending;
                    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    return `
                        <div class="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-all">
                            <i class="bi ${status.icon} ${status.color} text-xl mt-1"></i>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">${order.queue_number} - ${orderStatus}</div>
                                <div class="text-sm text-gray-600">${order.item_name || order.item_ordered}</div>
                                <div class="text-xs text-gray-500 mt-1">${time}</div>
                            </div>
                            <button onclick="viewOrderDetails(${order.order_id})" class="text-accent-600 hover:text-accent-800 text-sm font-semibold">
                                View
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

// Calculate order statistics
function calculateOrderStats() {
    if (!orderHistory) return;
    
    orderStats.total = orderHistory.length;
    orderStats.completed = orderHistory.filter(o => (o.order_status || o.status || 'pending') === 'completed').length;
    orderStats.pending = orderHistory.filter(o => (o.order_status || o.status || 'pending') === 'pending').length;
    orderStats.cancelled = orderHistory.filter(o => (o.order_status || o.status || 'pending') === 'cancelled').length;
}

// Update dashboard stats cards
function updateDashboardStats() {
    document.getElementById('statTotalOrders').textContent = orderStats.total;
    document.getElementById('statCompletedOrders').textContent = orderStats.completed;
    document.getElementById('statPendingOrders').textContent = orderStats.pending;
    document.getElementById('statCancelledOrders').textContent = orderStats.cancelled;
}

// Fetch inventory status
async function fetchInventoryStatus() {
    try {
        const response = await fetch(`${API_BASE}/inventory_status.php`);
        const result = await response.json();
        
        if (result.success && result.data.items) {
            console.log('Inventory loaded:', result.data.items.length, 'items');
        }
    } catch (error) {
        console.error('Error fetching inventory status:', error);
    }
}

// Phase 7: Global variable to track active orders by service type
let activeOrdersStatus = {
    items: false,
    printing: false
};

// Phase 7: Check active orders and disable buttons if needed
async function checkActiveOrdersAndDisableButtons() {
    try {
        const response = await fetch(`${API_BASE}/student/check_active_order.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.active_orders) {
            // Store active orders status
            activeOrdersStatus = result.active_orders;
            
            // Update UI to disable service type tabs if they have active orders
            updateServiceTypeTabsDisabledState();
        }
    } catch (error) {
        console.error('Error checking active orders:', error);
    }
}

// Phase 7: Update service type tabs disabled state
function updateServiceTypeTabsDisabledState() {
    const itemsTab = document.getElementById('modalOrderTypeItems');
    const printingTab = document.getElementById('modalOrderTypePrinting');
    
    // Disable Items tab if there's an active items order
    if (activeOrdersStatus.items && itemsTab) {
        itemsTab.disabled = true;
        itemsTab.classList.add('opacity-50', 'cursor-not-allowed');
        itemsTab.innerHTML = `
            <i class="bi bi-bag-check-fill mr-2"></i>
            Items
            <span class="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded-full">Pending Order</span>
        `;
    } else if (itemsTab) {
        itemsTab.disabled = false;
        itemsTab.classList.remove('opacity-50', 'cursor-not-allowed');
        itemsTab.innerHTML = `
            <i class="bi bi-bag-check-fill mr-2"></i>
            Items
        `;
    }
    
    // Disable Printing tab if there's an active printing order
    if (activeOrdersStatus.printing && printingTab) {
        printingTab.disabled = true;
        printingTab.classList.add('opacity-50', 'cursor-not-allowed');
        printingTab.innerHTML = `
            <i class="bi bi-printer-fill mr-2"></i>
            Printing
            <span class="ml-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-full">Pending Job</span>
        `;
    } else if (printingTab) {
        printingTab.disabled = false;
        printingTab.classList.remove('opacity-50', 'cursor-not-allowed');
        printingTab.innerHTML = `
            <i class="bi bi-printer-fill mr-2"></i>
            Printing
        `;
    }
}

// Show quick order (for logged-in students)
function showQuickOrder() {
    // Phase 7: Refresh active orders status before showing modal
    checkActiveOrdersAndDisableButtons().then(() => {
        document.getElementById('createOrderModal').classList.remove('hidden');
        
        // Determine which tab to show based on active orders
        if (activeOrdersStatus.items && !activeOrdersStatus.printing) {
            // Items is blocked, show printing
            switchOrderTypeModal('printing');
        } else if (activeOrdersStatus.printing && !activeOrdersStatus.items) {
            // Printing is blocked, show items
            switchOrderTypeModal('items');
        } else if (activeOrdersStatus.items && activeOrdersStatus.printing) {
            // Both are blocked - show error and close modal
            showToast('error', 'Cannot Create Order', 'You have pending orders for both services. Please complete or cancel them first.');
            document.getElementById('createOrderModal').classList.add('hidden');
            return;
        } else {
            // Neither is blocked, default to items
            switchOrderTypeModal('items');
        }
        
        // Add order type toggle listener
        const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
        orderTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const scheduledDateField = document.getElementById('scheduledDateField');
                if (this.value === 'pre-order') {
                    scheduledDateField.classList.remove('hidden');
                    document.getElementById('scheduledDate').required = true;
                } else {
                    scheduledDateField.classList.add('hidden');
                    document.getElementById('scheduledDate').required = false;
                }
            });
        });
    });
}

// Switch order type in modal (items vs printing)
function switchOrderTypeModal(type) {
    // Phase 8: Check if the service is globally disabled
    if (type === 'items' && !servicesStatus['School Items']) {
        showToast('error', 'Service Unavailable', 'School Items service is currently unavailable. Please try again later.');
        return;
    }
    
    if (type === 'printing' && !servicesStatus['Printing Services']) {
        showToast('error', 'Service Unavailable', 'Printing Services is currently unavailable. Please try again later.');
        return;
    }
    
    // Phase 7: Check if the service type is disabled due to active order
    if (type === 'items' && activeOrdersStatus.items) {
        showToast('warning', 'Cannot Order Items', 'You already have a pending Items/Merchandise order. Please complete or cancel it first.');
        return;
    }
    
    if (type === 'printing' && activeOrdersStatus.printing) {
        showToast('warning', 'Cannot Order Printing', 'You already have a pending Printing Services order. Please complete or cancel it first.');
        return;
    }
    
    // Update hidden input
    document.getElementById('modalOrderTypeService').value = type;
    
    // Update tab styling
    const itemsTab = document.getElementById('modalOrderTypeItems');
    const printingTab = document.getElementById('modalOrderTypePrinting');
    
    const itemsSection = document.getElementById('modalItemsFormSection');
    const printingSection = document.getElementById('modalPrintingFormSection');
    
    if (type === 'items') {
        itemsTab.classList.add('active');
        printingTab.classList.remove('active');
        
        // Show items form, hide printing form
        itemsSection.classList.remove('hidden');
        itemsSection.classList.add('active');
        printingSection.classList.add('hidden');
        printingSection.classList.remove('active');
        
        // Disable printing fields to prevent HTML5 validation
        const printingFields = printingSection.querySelectorAll('input, select, textarea');
        printingFields.forEach(field => field.disabled = true);
        
        // Enable item fields
        const itemFields = itemsSection.querySelectorAll('input, select, textarea');
        itemFields.forEach(field => field.disabled = false);
    } else {
        printingTab.classList.add('active');
        itemsTab.classList.remove('active');
        
        // Show printing form, hide items form
        printingSection.classList.remove('hidden');
        printingSection.classList.add('active');
        itemsSection.classList.add('hidden');
        itemsSection.classList.remove('active');
        
        // Disable item fields to prevent HTML5 validation
        const itemFields = itemsSection.querySelectorAll('input, select, textarea');
        itemFields.forEach(field => field.disabled = true);
        
        // Enable printing fields
        const printingFields = printingSection.querySelectorAll('input, select, textarea');
        printingFields.forEach(field => field.disabled = false);
        
        // Initialize printing price listeners if not already done
        if (typeof initializePrintingModalListeners === 'function') {
            initializePrintingModalListeners();
        }
    }
}

// Initialize printing form listeners for modal
function initializePrintingModalListeners() {
    // File input listener with auto page count detection
    const fileInput = document.getElementById('modalPrintFile');
    if (fileInput && !fileInput.dataset.listenerAdded) {
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            const feedbackElement = document.getElementById('modalFileFeedback');
            const pageCountInput = document.getElementById('modalPageCount');
            
            if (!file) {
                if (feedbackElement) {
                    feedbackElement.innerHTML = '';
                    feedbackElement.classList.add('hidden');
                }
                return;
            }
            
            const validation = validatePrintFile(file);
            
            if (!validation.valid) {
                if (feedbackElement) {
                    feedbackElement.innerHTML = `
                        <div class="flex items-center gap-2 text-red-600">
                            <i class="bi bi-exclamation-circle-fill"></i>
                            <span>${validation.message}</span>
                        </div>
                    `;
                    feedbackElement.classList.remove('hidden');
                }
                e.target.value = '';
                return;
            }
            
            // Show loading state while detecting page count
            const fileSizeMB = (file.size / 1048576).toFixed(2);
            if (feedbackElement) {
                feedbackElement.innerHTML = `
                    <div class="flex items-center gap-2 text-blue-600">
                        <i class="bi bi-hourglass-split animate-spin"></i>
                        <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Detecting page count...</span>
                    </div>
                `;
                feedbackElement.classList.remove('hidden');
            }
            
            // Auto-detect page count
            try {
                const pageCount = typeof countFilePages === 'function' ? await countFilePages(file) : null;
                
                if (pageCount !== null && pageCountInput) {
                    pageCountInput.value = pageCount;
                    updateModalPrintingPrice();
                    
                    // Show success with page count info
                    if (feedbackElement) {
                        feedbackElement.innerHTML = `
                            <div class="flex items-center gap-2 text-green-600">
                                <i class="bi bi-check-circle-fill"></i>
                                <span><strong>${file.name}</strong> (${fileSizeMB}MB) - ${pageCount} page${pageCount !== 1 ? 's' : ''} detected</span>
                            </div>
                        `;
                    }
                } else {
                    // Could not detect page count (Word/Excel)
                    if (pageCountInput && !pageCountInput.value) {
                        pageCountInput.value = 1; // Default to 1
                    }
                    
                    if (feedbackElement) {
                        feedbackElement.innerHTML = `
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-2 text-green-600">
                                    <i class="bi bi-check-circle-fill"></i>
                                    <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Ready to upload</span>
                                </div>
                                <div class="flex items-center gap-2 text-amber-600 text-sm">
                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                    <span>Please verify the page count for this document.</span>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Show toast notification
                    if (typeof showToast === 'function') {
                        showToast('Please verify page count for documents.', 'warning');
                    }
                }
            } catch (error) {
                console.error('Error detecting page count:', error);
                // Show success without page count
                if (feedbackElement) {
                    feedbackElement.innerHTML = `
                        <div class="flex items-center gap-2 text-green-600">
                            <i class="bi bi-check-circle-fill"></i>
                            <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Ready to upload</span>
                        </div>
                    `;
                }
            }
        });
        fileInput.dataset.listenerAdded = 'true';
    }
    
    // Price calculation listeners
    const priceInputs = ['modalPageCount', 'modalColorMode', 'modalPaperSize', 'modalCopies', 'modalDoubleSided'];
    priceInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element && !element.dataset.listenerAdded) {
            element.addEventListener('change', updateModalPrintingPrice);
            element.addEventListener('input', updateModalPrintingPrice);
            element.dataset.listenerAdded = 'true';
        }
    });
}

// Update printing price for modal
function updateModalPrintingPrice() {
    const pageCount = parseInt(document.getElementById('modalPageCount')?.value) || 0;
    const colorMode = document.getElementById('modalColorMode')?.value || 'B&W';
    const paperSize = document.getElementById('modalPaperSize')?.value || 'A4';
    const copies = parseInt(document.getElementById('modalCopies')?.value) || 1;
    const doubleSided = document.getElementById('modalDoubleSided')?.checked || false;
    
    if (typeof calculatePrintingPrice === 'function') {
        const price = calculatePrintingPrice(pageCount, colorMode, paperSize, copies, doubleSided);
        const priceElement = document.getElementById('modalEstimatedPrice');
        if (priceElement) {
            priceElement.textContent = `₱${price.toFixed(2)}`;
        }
        return price;
    }
    return 0;
}

// Close create order modal
function closeCreateOrder() {
    const modal = document.getElementById('createOrderModal');
    const form = document.getElementById('createOrderForm');
    const scheduledField = document.getElementById('scheduledDateField');
    
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (scheduledField) scheduledField.classList.add('hidden');
}

// Global variable to store order data for confirmation
let pendingOrderData = null;

// Submit order - Show review first
async function submitOrder(event) {
    event.preventDefault();
    
    const serviceType = document.getElementById('modalOrderTypeService').value;
    
    // Service type specific validation
    if (serviceType === 'printing') {
        const printFile = document.getElementById('modalPrintFile').files[0];
        const pageCount = parseInt(document.getElementById('modalPageCount').value);
        
        if (!printFile) {
            showToast('error', 'Error', 'Please select a file to print');
            return;
        }
        
        if (!pageCount || pageCount <= 0) {
            showToast('error', 'Error', 'Please enter the number of pages');
            return;
        }
        
        // Validate file
        if (typeof validatePrintFile === 'function') {
            const validation = validatePrintFile(printFile);
            if (!validation.valid) {
                showToast('error', 'Error', validation.message);
                return;
            }
        }
    } else {
        // Items validation
        const items = [];
        let itemNum = 1;
        while (document.getElementById(`item${itemNum}`)) {
            const itemSelect = document.getElementById(`item${itemNum}`);
            if (itemSelect && itemSelect.value) {
                items.push(itemSelect.value);
            }
            itemNum++;
        }
        
        if (items.length === 0) {
            showToast('error', 'Error', 'Please select at least one item');
            return;
        }
    }
    
    // Show review modal instead of submitting directly
    showOrderReview();
}

// Show order review modal with summary
function showOrderReview() {
    const serviceType = document.getElementById('modalOrderTypeService').value;
    const reviewContent = document.getElementById('orderReviewContent');
    
    // Alias studentData for easier access
    window.currentStudent = window.studentData;
    
    let summaryHTML = '';
    
    // Student Information (from session)
    if (window.currentStudent) {
        summaryHTML += `
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
                <h5 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <i class="bi bi-person-fill"></i> Student Information
                </h5>
                <div class="space-y-1 text-sm">
                    <p><span class="font-semibold">Student ID:</span> ${window.currentStudent.student_id || 'N/A'}</p>
                    <p><span class="font-semibold">Name:</span> ${window.currentStudent.first_name || ''} ${window.currentStudent.last_name || ''}</p>
                    <p><span class="font-semibold">Email:</span> ${window.currentStudent.email || 'N/A'}</p>
                </div>
            </div>
        `;
    }
    
    if (serviceType === 'items') {
        // Items Order Summary
        const items = [];
        let itemNum = 1;
        while (document.getElementById(`item${itemNum}`)) {
            const itemSelect = document.getElementById(`item${itemNum}`);
            if (itemSelect && itemSelect.value) {
                const itemText = itemSelect.options[itemSelect.selectedIndex].text;
                items.push(itemText);
            }
            itemNum++;
        }
        
        summaryHTML += `
            <div class="bg-orange-50 rounded-lg p-4">
                <h5 class="font-bold text-orange-900 mb-2 flex items-center gap-2">
                    <i class="bi bi-bag-fill"></i> Items Order
                </h5>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold">Quantity:</span> ${items.length} item(s)</p>
                    <div class="mt-2">
                        <p class="font-semibold mb-1">Selected Items:</p>
                        ${items.map(item => `<p class="flex items-center gap-2"><i class="bi bi-check-circle-fill text-orange-600"></i> ${item.split(' -')[0].trim()}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        // Printing Order Summary
        const fileInput = document.getElementById('modalPrintFile');
        const fileName = fileInput.files[0]?.name || 'No file selected';
        const pageCount = document.getElementById('modalPageCount').value;
        const colorMode = document.getElementById('modalColorMode').value;
        const paperSize = document.getElementById('modalPaperSize').value;
        const copies = document.getElementById('modalCopies').value;
        const doubleSided = document.getElementById('modalDoubleSided').checked ? 'Yes' : 'No';
        const instructions = document.getElementById('modalPrintInstructions').value || 'None';
        const estimatedPrice = updateModalPrintingPrice();
        
        summaryHTML += `
            <div class="bg-purple-50 rounded-lg p-4">
                <h5 class="font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <i class="bi bi-printer-fill"></i> Printing Order
                </h5>
                <div class="space-y-1 text-sm">
                    <p><span class="font-semibold">File:</span> ${fileName}</p>
                    <p><span class="font-semibold">Pages:</span> ${pageCount}</p>
                    <p><span class="font-semibold">Color Mode:</span> ${colorMode}</p>
                    <p><span class="font-semibold">Paper Size:</span> ${paperSize}</p>
                    <p><span class="font-semibold">Copies:</span> ${copies}</p>
                    <p><span class="font-semibold">Double-Sided:</span> ${doubleSided}</p>
                    <p><span class="font-semibold">Instructions:</span> ${instructions}</p>
                    <div class="mt-3 pt-3 border-t border-purple-200">
                        <p class="text-lg"><span class="font-semibold">Estimated Price:</span> <span class="text-purple-700 font-bold text-xl">₱${estimatedPrice.toFixed(2)}</span></p>
                    </div>
                </div>
            </div>
        `;
    }
    
    reviewContent.innerHTML = summaryHTML;
    document.getElementById('orderReviewModal').classList.remove('hidden');
}

// Close order review modal
function closeOrderReview() {
    document.getElementById('orderReviewModal').classList.add('hidden');
}

// Confirm order - Send OTP request using existing create_order.php API
async function confirmOrder() {
    const confirmBtn = document.getElementById('confirmOrderBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i> Sending OTP...';
    
    try {
        const serviceType = document.getElementById('modalOrderTypeService').value;
        
        // Get student data from session
        const student = window.studentData;
        if (!student) {
            throw new Error('Student session not found');
        }
        
        let requestOptions = {
            method: 'POST'
        };
        
        // Prepare order data using same format as guest orders (matching create_order.php expectations)
        if (serviceType === 'items') {
            const items = [];
            let itemNum = 1;
            while (document.getElementById(`item${itemNum}`)) {
                const itemSelect = document.getElementById(`item${itemNum}`);
                if (itemSelect && itemSelect.value) {
                    items.push(itemSelect.value);
                }
                itemNum++;
            }
            
            const orderData = {
                studentId: student.student_id,
                fname: student.first_name,
                lname: student.last_name,
                minitial: student.middle_initial || '',
                email: student.email,
                college: student.college || 'UMAK',
                program: student.program || 'N/A',
                year: student.year_level || 'N/A',
                section: student.section || '',
                order_type: 'immediate',
                order_type_service: 'items',
                purchasing: items.join(', ')
            };
            
            pendingOrderData = orderData;
            
            requestOptions.headers = { 'Content-Type': 'application/json' };
            requestOptions.body = JSON.stringify(orderData);
        } else {
            // Printing service - use FormData
            const formData = new FormData();
            formData.append('studentId', student.student_id);
            formData.append('fname', student.first_name);
            formData.append('lname', student.last_name);
            formData.append('minitial', student.middle_initial || '');
            formData.append('email', student.email);
            formData.append('college', student.college || 'UMAK');
            formData.append('program', student.program || 'N/A');
            formData.append('year', student.year_level || 'N/A');
            formData.append('section', student.section || '');
            formData.append('order_type', 'immediate');
            formData.append('order_type_service', 'printing');
            formData.append('file', document.getElementById('modalPrintFile').files[0]);
            formData.append('page_count', document.getElementById('modalPageCount').value);
            formData.append('color_mode', document.getElementById('modalColorMode').value);
            formData.append('paper_size', document.getElementById('modalPaperSize').value);
            formData.append('copies', document.getElementById('modalCopies').value);
            formData.append('double_sided', document.getElementById('modalDoubleSided').checked ? '1' : '0');
            formData.append('instructions', document.getElementById('modalPrintInstructions').value);
            formData.append('estimated_price', updateModalPrintingPrice());
            
            // Store all printing data for verification
            pendingOrderData = {
                studentId: student.student_id,
                fname: student.first_name,
                lname: student.last_name,
                minitial: student.middle_initial || '',
                email: student.email,
                college: student.college || 'UMAK',
                program: student.program || 'N/A',
                year: student.year_level || 'N/A',
                section: student.section || '',
                order_type: 'immediate',
                order_type_service: 'printing',
                page_count: document.getElementById('modalPageCount').value,
                color_mode: document.getElementById('modalColorMode').value,
                paper_size: document.getElementById('modalPaperSize').value,
                copies: document.getElementById('modalCopies').value,
                double_sided: document.getElementById('modalDoubleSided').checked ? '1' : '0',
                instructions: document.getElementById('modalPrintInstructions').value,
                estimated_price: updateModalPrintingPrice(),
                file_name: document.getElementById('modalPrintFile').files[0]?.name || ''
            };
            
            requestOptions.body = formData;
        }
        
        // Use existing create_order.php API
        const response = await fetch(`${API_BASE}/student/create_order.php`, requestOptions);
        const result = await response.json();
        
        if (result.success) {
            // Store stored_file_name for printing
            if (result.data && result.data.stored_file_name) {
                pendingOrderData.stored_file_name = result.data.stored_file_name;
            }
            
            // Debug log OTP code (check console instead)
            if (result.data && result.data.otp_code) {
                console.log('OTP Code:', result.data.otp_code);
            }
            
            closeOrderReview();
            document.getElementById('otpVerificationModal').classList.remove('hidden');
            document.getElementById('otpInput').focus();
            showToast('success', 'OTP Sent', 'Check your email for the verification code');
        } else {
            showToast('error', 'Error', result.message || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Error requesting OTP:', error);
        showToast('error', 'Error', 'Failed to send OTP. Please try again.');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Confirm Order';
    }
}

// Verify OTP and place order using existing verify_otp.php API
async function verifyOTP() {
    const otpInput = document.getElementById('otpInput');
    const otpCode = otpInput.value.trim();
    
    if (otpCode.length !== 6) {
        showToast('error', 'Invalid OTP', 'Please enter a 6-digit code');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyOTPBtn');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i> Verifying...';
    
    try {
        // Use existing verify_otp.php API (same as guest orders)
        const requestData = {
            email: pendingOrderData.email,
            otp_code: otpCode,
            otp_type: 'order',
            order_data: pendingOrderData
        };
        
        const response = await fetch(`${API_BASE}/student/verify_otp.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Success', 'Order placed successfully!');
            closeOTPVerification();
            closeCreateOrder();
            
            // Reload dashboard
            await loadCurrentOrder();
            await loadOrderHistory();
            calculateOrderStats();
            updateDashboardStats();
            // Phase 7: Refresh active orders status
            await checkActiveOrdersAndDisableButtons();
        } else {
            showToast('error', 'Error', result.message || 'Failed to verify OTP');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showToast('error', 'Error', 'Failed to verify OTP. Please try again.');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="bi bi-shield-check mr-2"></i> Verify & Place Order';
    }
}

// Close OTP verification modal
function closeOTPVerification() {
    document.getElementById('otpVerificationModal').classList.add('hidden');
    document.getElementById('otpInput').value = '';
}

// Select quantity and generate item fields
function selectQuantity(qty) {
    // Update button styles
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`qty${i}Btn`);
        if (btn) {
            if (i === qty) {
                btn.className = 'py-3 px-4 border-2 border-blue-900 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-800 transition-all';
            } else {
                btn.className = 'py-3 px-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:border-blue-900 hover:bg-blue-50 transition-all';
            }
        }
    }
    
    // Generate item fields
    const container = document.getElementById('itemFieldsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 1; i <= qty; i++) {
        const div = document.createElement('div');
        div.innerHTML = `
            <label class="block text-sm font-semibold text-gray-700 mb-2">Item ${i} <span class="text-red-500">*</span></label>
            <select id="item${i}" class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required>
                <option value="">Select Item</option>
            </select>
        `;
        container.appendChild(div);
        
        // Populate with real inventory from inventory_helper.js
        if (typeof populateInventorySelect === 'function') {
            populateInventorySelect(`item${i}`, false); // Don't show out of stock items
        }
    }
    
    // Show the order items container
    const orderItemsContainer = document.getElementById('orderItemsContainer');
    if (orderItemsContainer) {
        orderItemsContainer.style.display = 'block';
    }
}

// View order details
async function viewOrderDetails(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    // Show loading state
    content.innerHTML = `
        <div class="text-center py-8">
            <i class="bi bi-hourglass-split text-4xl text-accent-600 animate-pulse mb-3"></i>
            <p class="text-gray-600">Loading order details...</p>
        </div>
    `;
    modal.classList.remove('hidden');
    
    try {
        // Find the order in the current order history
        const order = orderHistory.find(o => o.order_id === orderId);
        
        if (!order) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="bi bi-exclamation-triangle text-4xl text-danger-600 mb-3"></i>
                    <p class="text-danger-600 font-semibold">Order not found</p>
                </div>
            `;
            return;
        }
        
        displayOrderDetailsContent(order);
    } catch (error) {
        console.error('Error loading order details:', error);
        content.innerHTML = `
            <div class="text-center py-8">
                <i class="bi bi-exclamation-triangle text-4xl text-danger-600 mb-3"></i>
                <p class="text-danger-600 font-semibold">Failed to load order details</p>
            </div>
        `;
    }
}

function displayOrderDetailsContent(order) {
    const content = document.getElementById('orderDetailsContent');
    
    const statusColors = {
        completed: { bg: 'bg-success-100', text: 'text-success-800', icon: 'bi-check-circle-fill' },
        cancelled: { bg: 'bg-danger-100', text: 'text-danger-800', icon: 'bi-x-circle-fill' },
        pending: { bg: 'bg-warning-100', text: 'text-warning-800', icon: 'bi-clock-fill' },
        processing: { bg: 'bg-accent-100', text: 'text-accent-800', icon: 'bi-arrow-repeat' },
        ready: { bg: 'bg-info-100', text: 'text-info-800', icon: 'bi-check2-circle' }
    };
    
    const orderStatus = order.order_status || order.status || 'pending';
    const status = statusColors[orderStatus] || statusColors.pending;
    const orderDate = new Date(order.created_at);
    const updatedDate = new Date(order.updated_at);
    const completedDate = order.completed_at ? new Date(order.completed_at) : null;
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- Status Banner -->
            <div class="${status.bg} rounded-lg p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="bi ${status.icon} text-2xl ${status.text}"></i>
                    <div>
                        <p class="text-sm font-semibold ${status.text} uppercase">Order Status</p>
                        <p class="text-lg font-bold ${status.text} capitalize">${orderStatus}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm ${status.text} font-semibold">Queue Number</p>
                    <p class="text-2xl font-bold ${status.text} font-mono text-blue-700">${order.queue_number}</p>
                </div>
            </div>
            
            <!-- Order Information -->
            <div class="bg-gray-50 rounded-lg p-4" style="background-color: #f8fafc;">
                <h4 class="font-bold text-primary-900 mb-3 flex items-center gap-2" style="color: #0f172a;">
                    <i class="bi bi-basket2"></i>
                    Order Information
                </h4>
                <div class="space-y-3">
                    <div class="flex justify-between items-start">
                        <span class="text-gray-600" style="color: #475569;">Item Ordered:</span>
                        <span class="font-semibold text-primary-900 text-right" style="color: #0f172a;">${order.item_ordered}</span>
                    </div>
                    ${order.quantity ? `
                    <div class="flex justify-between items-start">
                        <span class="text-gray-600" style="color: #475569;">Quantity:</span>
                        <span class="font-semibold text-primary-900" style="color: #0f172a;">${order.quantity}</span>
                    </div>
                    ` : ''}
                    ${order.notes ? `
                    <div class="flex justify-between items-start">
                        <span class="text-gray-600" style="color: #475569;">Notes:</span>
                        <span class="font-semibold text-primary-900 text-right max-w-xs" style="color: #0f172a;">${order.notes}</span>
                    </div>
                    ` : ''}
                    ${order.estimated_wait_time ? `
                    <div class="flex justify-between items-start">
                        <span class="text-gray-600" style="color: #475569;">Estimated Wait:</span>
                        <span class="font-semibold text-primary-900" style="color: #0f172a;">${order.estimated_wait_time} minutes</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Timeline -->
            <div class="bg-gray-50 rounded-lg p-4" style="background-color: #f8fafc;">
                <h4 class="font-bold text-primary-900 mb-4 flex items-center gap-2" style="color: #0f172a;">
                    <i class="bi bi-clock-history"></i>
                    Order Timeline
                </h4>
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0" style="background-color: #dbeafe;">
                            <i class="bi bi-plus-circle text-accent-600" style="color: #2563eb;"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-semibold text-primary-900" style="color: #0f172a;">Order Created</p>
                            <p class="text-sm text-gray-600" style="color: #475569;">
                                ${orderDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                at ${orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    
                    ${order.updated_at !== order.created_at ? `
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0" style="background-color: #dbeafe;">
                            <i class="bi bi-arrow-repeat text-accent-600" style="color: #2563eb;"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-semibold text-primary-900" style="color: #0f172a;">Last Updated</p>
                            <p class="text-sm text-gray-600" style="color: #475569;">
                                ${updatedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                at ${updatedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${completedDate ? `
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0" style="background-color: #dcfce7;">
                            <i class="bi bi-check-circle-fill text-success-600" style="color: #16a34a;"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-semibold text-primary-900" style="color: #0f172a;">Order Completed</p>
                            <p class="text-sm text-gray-600" style="color: #475569;">
                                ${completedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                at ${completedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-3">
                ${orderStatus === 'pending' || orderStatus === 'processing' ? `
                <button onclick="viewQRCode('${order.queue_number}')" class="flex-1 bg-accent-600 hover:bg-accent-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2" style="background-color: #2563eb; color: #ffffff;">
                    <i class="bi bi-qr-code"></i>
                    View QR Code
                </button>
                ` : ''}
                <button onclick="closeOrderDetails()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-all" style="background-color: #e2e8f0; color: #334155;">
                    Close
                </button>
            </div>
        </div>
    `;
}

function closeOrderDetails() {
    const modal = document.getElementById('orderDetailsModal');
    modal.classList.add('hidden');
}

// View QR code
function viewQRCode(queueNumber) {
    const modal = document.getElementById('qrCodeModal');
    const qrDisplay = document.getElementById('qrCodeDisplay');
    
    // Clear previous QR code
    qrDisplay.innerHTML = '';
    
    // Generate QR code from queue number using toCanvas method
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        try {
            // Create canvas element
            const canvas = document.createElement('canvas');
            qrDisplay.appendChild(canvas);
            
            // Generate QR code on canvas
            QRCode.toCanvas(canvas, queueNumber.toString(), {
                width: 256,
                height: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, function (error) {
                if (error) {
                    console.error('QR Code generation error:', error);
                    qrDisplay.innerHTML = `
                        <div class="text-center p-6">
                            <i class="bi bi-exclamation-triangle text-danger-600 text-4xl mb-3 block"></i>
                            <p class="text-gray-600">Failed to generate QR code</p>
                            <p class="text-sm text-gray-500 mt-2">Queue Number: <strong>${queueNumber}</strong></p>
                        </div>
                    `;
                }
            });
            
            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error generating QR code:', error);
            qrDisplay.innerHTML = `
                <div class="text-center p-6">
                    <i class="bi bi-exclamation-triangle text-danger-600 text-4xl mb-3 block"></i>
                    <p class="text-gray-600">Error generating QR code</p>
                    <p class="text-sm text-gray-500 mt-2">Queue Number: <strong>${queueNumber}</strong></p>
                </div>
            `;
            modal.classList.remove('hidden');
        }
    } else {
        console.error('QRCode library not loaded');
        qrDisplay.innerHTML = `
            <div class="text-center p-6">
                <i class="bi bi-exclamation-triangle text-warning-500 text-4xl mb-3 block"></i>
                <p class="text-gray-600">QR Code library not loaded.</p>
                <p class="text-sm text-gray-500 mt-2">Queue Number: <strong>${queueNumber}</strong></p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700">Reload Page</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

// Close QR code modal
function closeQRCode() {
    document.getElementById('qrCodeModal').classList.add('hidden');
}

// Download QR code
function downloadQRCode() {
    const qrCanvas = document.querySelector('#qrCodeDisplay canvas');
    if (qrCanvas) {
        const link = document.createElement('a');
        link.download = 'order-qr-code.png';
        link.href = qrCanvas.toDataURL();
        link.click();
    }
}

// Open QR zoom modal for dashboard
function openDashboardQRZoom() {
    const canvas = document.getElementById('activeOrderQRCode');
    const zoomedCanvas = document.getElementById('zoomedQR');
    const modal = document.getElementById('qrZoomModal');
    const queueNumDisplay = document.getElementById('zoomedQueueNum');
    
    if (!canvas || !zoomedCanvas) return;
    
    try {
        // Copy canvas to zoomed version with higher resolution
        const ctx = zoomedCanvas.getContext('2d');
        zoomedCanvas.width = 512;
        zoomedCanvas.height = 512;
        ctx.drawImage(canvas, 0, 0, 512, 512);
        
        // Update queue number display
        if (window.currentActiveOrder && window.currentActiveOrder.queue_number) {
            queueNumDisplay.textContent = window.currentActiveOrder.queue_number;
        }
        
        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Zoom error:', error);
    }
}

function closeQRZoom() {
    const modal = document.getElementById('qrZoomModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Download QR code from active order card
function downloadActiveOrderQR() {
    const qrCanvas = document.getElementById('activeOrderQRCode');
    if (qrCanvas) {
        // Use stored order data for proper filename matching order_result.html format
        const queueNum = currentActiveOrder?.queue_number || 'ORDER';
        const refNum = currentActiveOrder?.reference_number || Date.now();
        
        const link = document.createElement('a');
        link.download = `UMAK-COOP-${queueNum}-${refNum}.png`;
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
        showToast('success', 'Downloaded', 'QR code downloaded successfully');
    } else {
        showToast('error', 'Error', 'QR code not found');
    }
}

// Show notifications
function showNotifications() {
    document.getElementById('notificationsModal').classList.remove('hidden');
    loadNotifications();
}

// Close notifications
function closeNotifications() {
    document.getElementById('notificationsModal').classList.add('hidden');
}

// Load notifications
async function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    
    try {
        const response = await fetch(`${API_BASE}/student/get_notifications.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            notificationsList.innerHTML = result.data.map(notif => `
                <div class="border-b border-gray-200 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center ${
                            notif.type === 'order' ? 'bg-accent-100' :
                            notif.type === 'system' ? 'bg-warning-100' :
                            'bg-success-100'
                        }">
                            <i class="bi ${
                                notif.type === 'order' ? 'bi-receipt-cutoff text-accent-600' :
                                notif.type === 'system' ? 'bi-info-circle-fill text-warning-600' :
                                'bi-check-circle-fill text-success-600'
                            }"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-gray-900 mb-1">${notif.title}</div>
                            <div class="text-sm text-gray-600 mb-2">${notif.message}</div>
                            <div class="text-xs text-gray-400">${formatTimeAgo(notif.created_at)}</div>
                        </div>
                        ${!notif.is_read ? '<span class="w-2 h-2 bg-accent-600 rounded-full"></span>' : ''}
                    </div>
                </div>
            `).join('');
        } else {
            notificationsList.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="bi bi-bell-slash text-4xl mb-3 block"></i>
                    <p class="font-semibold mb-1">No notifications yet</p>
                    <p class="text-sm">You'll be notified when there are updates to your orders</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="bi bi-exclamation-triangle text-4xl mb-3 block"></i>
                <p>Failed to load notifications</p>
            </div>
        `;
    }
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

// Logout function
// Make logout globally accessible
window.logout = async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch(`${API_BASE}/student/student_session.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'logout' })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}

// Utility: Format date label
function formatDateLabel(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Utility: Capitalize words
function capitalizeWords(str) {
    if (!str) return 'N/A';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Profile Management Functions
function editProfile() {
    if (!studentData) {
        showToast('error', 'Error', 'Student data not loaded');
        return;
    }
    
    // Populate form with current data
    document.getElementById('editFirstName').value = studentData.first_name || '';
    document.getElementById('editLastName').value = studentData.last_name || '';
    document.getElementById('editPhone').value = studentData.phone || '';
    document.getElementById('editProgram').value = studentData.program || '';
    document.getElementById('editYearLevel').value = studentData.year_level || '';
    document.getElementById('editCollege').value = studentData.college || '';
    
    // Show modal
    document.getElementById('profileEditModal').classList.remove('hidden');
}

function closeProfileEdit() {
    document.getElementById('profileEditModal').classList.add('hidden');
}

function showChangePassword() {
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePassword() {
    document.getElementById('changePasswordModal').classList.add('hidden');
    // Clear form
    document.getElementById('changePasswordForm').reset();
}

function changeProfilePicture() {
    document.getElementById('profilePictureModal').classList.remove('hidden');
}

function closeProfilePicture() {
    document.getElementById('profilePictureModal').classList.add('hidden');
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash-fill';
    } else {
        input.type = 'password';
        icon.className = 'bi bi-eye-fill';
    }
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewProfilePicture').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function uploadProfilePicture() {
    const fileInput = document.getElementById('profilePictureInput');
    if (!fileInput.files[0]) {
        showToast('warning', 'No Image', 'Please select an image first');
        return;
    }
    
    // Validate file size (max 5MB)
    if (fileInput.files[0].size > 5 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(fileInput.files[0].type)) {
        showToast('error', 'Invalid File', 'Please select a valid image file (JPG, PNG, GIF)');
        return;
    }
    
    showToast('info', 'Uploading', 'Uploading your profile picture...');
    
    try {
        const formData = new FormData();
        formData.append('profile_picture', fileInput.files[0]);
        
        const response = await fetch(`${API_BASE}/student/upload_profile_picture.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get response text first to check if it's empty
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
            throw new Error('Server returned empty response. Please check if you are logged in.');
        }
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response text:', responseText);
            throw new Error('Invalid response from server: ' + responseText.substring(0, 100));
        }
        
        if (result.success) {
            // Update all profile pictures with the new URL
            const newImageUrl = result.data.profile_picture_url + '?t=' + Date.now();
            
            const avatars = [
                'navAvatarImg',
                'dropdownAvatarImg', 
                'profileAvatarLargeImg',
                'previewProfilePicture'
            ];
            
            avatars.forEach(id => {
                const img = document.getElementById(id);
                if (img) {
                    img.src = newImageUrl;
                    img.style.display = 'block';
                }
            });
            
            showToast('success', 'Success', 'Profile picture updated successfully!');
            closeProfilePicture();
        } else {
            showToast('error', 'Upload Failed', result.message || 'Failed to upload profile picture');
        }
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showToast('error', 'Error', 'Failed to upload profile picture. Please try again.');
    }
}

async function resetToDefault() {
    try {
        // Call API to reset profile picture in database
        const response = await fetch(`${API_BASE}/student/reset_profile_picture.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reset to Herons.png
            const defaultImage = '../../images/Herons.png';
            document.getElementById('previewProfilePicture').src = defaultImage;
            
            // Update all profile pictures
            const avatars = [
                'navAvatarImg',
                'dropdownAvatarImg', 
                'profileAvatarLargeImg'
            ];
            
            avatars.forEach(id => {
                const img = document.getElementById(id);
                if (img) img.src = defaultImage;
            });
            
            showToast('success', 'Reset', 'Profile picture reset to default');
            closeProfilePicture();
        } else {
            showToast('error', 'Error', result.message || 'Failed to reset profile picture');
        }
    } catch (error) {
        console.error('Error resetting profile picture:', error);
        showToast('error', 'Error', 'Failed to reset profile picture. Please try again.');
    }
}

// Orders Management Functions
// Variables declared at top of file

function filterOrders() {
    const filterSelect = document.getElementById('orderFilterStatus');
    currentFilter = filterSelect.value;
    currentPage = 1;
    loadOrderHistory(currentFilter, currentPage);
}

function searchOrders() {
    const searchInput = document.getElementById('orderSearchInput');
    currentSearch = searchInput.value;
    currentPage = 1;
    // TODO: Implement search functionality in loadOrderHistory
    loadOrderHistory(currentFilter, currentPage);
}

function loadOrdersPage(page) {
    if (page < 1) return;
    currentPage = page;
    loadOrderHistory(currentFilter, currentPage);
}

// Form Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Profile edit form handler
    const profileEditForm = document.getElementById('profileEditForm');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                first_name: document.getElementById('editFirstName').value,
                last_name: document.getElementById('editLastName').value,
                phone: document.getElementById('editPhone').value,
                program: document.getElementById('editProgram').value,
                year_level: document.getElementById('editYearLevel').value,
                college: document.getElementById('editCollege').value
            };
            
            try {
                const response = await fetch(`${API_BASE}/student/update_profile.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showToast('success', 'Success', 'Profile updated successfully!');
                    closeProfileEdit();
                    // Reload profile data
                    await loadStudentProfile();
                } else {
                    showToast('error', 'Error', result.message || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                showToast('error', 'Error', 'Failed to update profile');
            }
        });
    }
    
    // Change password form handler
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords
            if (newPassword.length < 6) {
                showToast('error', 'Invalid Password', 'Password must be at least 6 characters long');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('error', 'Password Mismatch', 'New passwords do not match');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/student/change_password.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showToast('success', 'Success', 'Password changed successfully!');
                    closeChangePassword();
                } else {
                    showToast('error', 'Error', result.message || 'Failed to change password');
                }
            } catch (error) {
                console.error('Password change error:', error);
                showToast('error', 'Error', 'Failed to change password');
            }
        });
    }
});

// Refresh dashboard data every 30 seconds
setInterval(() => {
    if (currentOrder && currentTab === 'dashboard') {
        loadCurrentOrder();
    }
}, 30000);

// Refresh cutoff warning every 60 seconds
setInterval(() => {
    if (currentTab === 'dashboard') {
        checkDashboardCutoff();
    }
}, 60000);

// Check cutoff warning for dashboard
async function checkDashboardCutoff() {
    try {
        const response = await fetch(`${API_BASE}/student/check_cutoff.php`);
        const data = await response.json();
        
        const banner = document.getElementById('dashboardCutoffBanner');
        if (!banner) return;
        
        if (data.success && data.warning) {
            const warning = data.warning;
            
            if (warning.level === 'error') {
                // COOP is closed
                banner.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 rounded-lg shadow-md">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div class="ml-3 flex-1">
                                <p class="font-bold text-lg">COOP Closed</p>
                                <p class="mt-1">${warning.message}</p>
                                <p class="mt-2 text-sm">Orders placed now will be scheduled for ${warning.next_business_day}.</p>
                            </div>
                        </div>
                    </div>
                `;
            } else if (warning.level === 'warning') {
                // Closing soon
                const minutesLeft = warning.minutes_until_close || 'few';
                banner.innerHTML = `
                    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded-lg shadow-md animate-pulse">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <svg class="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </div>
                            <div class="ml-3 flex-1">
                                <p class="font-bold text-lg">Closing Soon!</p>
                                <p class="mt-1">${warning.message}</p>
                                <p class="mt-2 text-sm font-semibold">You have ${minutesLeft} minutes left to place immediate orders.</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // No warning - clear banner
                banner.innerHTML = '';
            }
        } else {
            // No warning - clear banner
            banner.innerHTML = '';
        }
    } catch (error) {
        console.error('Error checking cutoff warning:', error);
        // Silently fail - don't show error to user
    }
}

// Phase 8: Check services status and update UI accordingly
async function checkServicesStatusAndUpdate() {
    try {
        const response = await fetch(`${API_BASE}/student/get_services.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Update servicesStatus object
            result.data.forEach(service => {
                if (service.service_name === 'School Items') {
                    servicesStatus['School Items'] = (service.is_active == 1);
                } else if (service.service_name === 'Printing Services') {
                    servicesStatus['Printing Services'] = (service.is_active == 1);
                }
            });
            
            // Update UI to reflect service status
            updateServiceStatusUI();
        }
    } catch (error) {
        console.error('Failed to check services status:', error);
        // Default to available if fetch fails
        servicesStatus['School Items'] = true;
        servicesStatus['Printing Services'] = true;
    }
}

// Phase 8: Update UI to show disabled services
function updateServiceStatusUI() {
    // Update Quick Order buttons on dashboard
    const itemsQuickBtn = document.querySelector('[onclick*="showCreateOrderModal"][onclick*="items"]');
    const printingQuickBtn = document.querySelector('[onclick*="showCreateOrderModal"][onclick*="printing"]');
    
    // Handle School Items service
    if (!servicesStatus['School Items']) {
        if (itemsQuickBtn) {
            itemsQuickBtn.disabled = true;
            itemsQuickBtn.classList.add('opacity-50', 'cursor-not-allowed');
            itemsQuickBtn.title = 'School Items service is currently unavailable';
        }
        
        // Add badge to items tab in modal
        const itemsTab = document.getElementById('modalOrderTypeItems');
        if (itemsTab && !itemsTab.querySelector('.service-unavailable-badge')) {
            const badge = document.createElement('span');
            badge.className = 'service-unavailable-badge ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full';
            badge.textContent = 'Unavailable';
            itemsTab.appendChild(badge);
        }
    } else {
        if (itemsQuickBtn) {
            itemsQuickBtn.disabled = false;
            itemsQuickBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            itemsQuickBtn.title = 'Create quick order for School Items';
        }
        
        // Remove badge if exists
        const itemsTab = document.getElementById('modalOrderTypeItems');
        const existingBadge = itemsTab?.querySelector('.service-unavailable-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
    }
    
    // Handle Printing Services
    if (!servicesStatus['Printing Services']) {
        if (printingQuickBtn) {
            printingQuickBtn.disabled = true;
            printingQuickBtn.classList.add('opacity-50', 'cursor-not-allowed');
            printingQuickBtn.title = 'Printing Services is currently unavailable';
        }
        
        // Add badge to printing tab in modal
        const printingTab = document.getElementById('modalOrderTypePrinting');
        if (printingTab && !printingTab.querySelector('.service-unavailable-badge')) {
            const badge = document.createElement('span');
            badge.className = 'service-unavailable-badge ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full';
            badge.textContent = 'Unavailable';
            printingTab.appendChild(badge);
        }
    } else {
        if (printingQuickBtn) {
            printingQuickBtn.disabled = false;
            printingQuickBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            printingQuickBtn.title = 'Create quick order for Printing Services';
        }
        
        // Remove badge if exists
        const printingTab = document.getElementById('modalOrderTypePrinting');
        const existingBadge = printingTab?.querySelector('.service-unavailable-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
    }
}
