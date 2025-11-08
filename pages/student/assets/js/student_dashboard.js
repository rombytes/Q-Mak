/**
 * Student Dashboard - Main Script
 * Q-Mak Queue Management System - SPA Version
 */

const API_BASE = '/Q-Mak/php/api';
let currentOrder = null;
let orderHistory = [];
let orderStats = { total: 0, completed: 0, pending: 0, cancelled: 0 };
let currentPage = 1;
let currentFilter = 'all';
let currentSearch = '';

// Make studentData globally accessible
window.studentData = null;

// Check session on page load
async function checkSession() {
    if (!sessionStorage.getItem('studentLoggedIn')) {
        window.location.href = 'student_login.html';
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
            window.location.href = 'student_login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Session check error:', error);
        sessionStorage.clear();
        window.location.href = 'student_login.html';
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
        
        const result = await response.json();
        
        if (result.success && result.data) {
            window.studentData = result.data;
            // Update nav profile (function may be in dashboard_tabs.js)
            if (typeof updateNavProfile === 'function') {
                updateNavProfile(window.studentData);
            } else {
                // Fallback: update directly
                updateProfileDisplay(window.studentData);
            }
            return true;
        } else {
            console.error('Failed to load profile');
            return false;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
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
        navAvatar.src = data.profile_picture || '../../../images/Herons.png';
        navAvatar.onerror = function() {
            this.src = '../../../images/Herons.png';
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
        dropdownAvatar.src = data.profile_picture || '../../../images/Herons.png';
        dropdownAvatar.onerror = function() {
            this.src = '../../../images/Herons.png';
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
        profileAvatarLargeImg.src = data.profile_picture || '../../../images/Herons.png';
        profileAvatarLargeImg.onerror = function() {
            this.src = '../../../images/Herons.png';
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
function displayCurrentOrder(order) {
    const heroSection = document.getElementById('heroSection');
    
    const statusColors = {
        pending: 'bg-warning-100 text-warning-800 border-warning-300',
        processing: 'bg-accent-100 text-accent-800 border-accent-300',
        ready: 'bg-success-100 text-success-800 border-success-300'
    };
    
    const statusColor = statusColors[order.order_status] || 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Progress steps
    const steps = [
        { name: 'Confirmed', status: 'completed', icon: 'bi-check-circle-fill' },
        { name: 'Preparing', status: order.order_status === 'pending' ? 'pending' : 'active', icon: 'bi-hourglass-split' },
        { name: 'Ready', status: order.order_status === 'ready' ? 'active' : 'pending', icon: 'bi-bell-fill' },
        { name: 'Claimed', status: 'pending', icon: 'bi-hand-thumbs-up-fill' }
    ];
    
    heroSection.innerHTML = `
        <div class="bg-gradient-to-r from-accent-600 to-accent-500 rounded-2xl p-8 shadow-2xl text-white" style="background: linear-gradient(to right, #2563eb, #3b82f6); color: #ffffff !important;">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 class="text-3xl font-bold mb-2" style="color: #ffffff !important; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Active Order #${order.queue_number}</h2>
                    <p class="text-accent-100" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">Placed at ${new Date(order.created_at).toLocaleTimeString()}</p>
                </div>
                <span class="px-6 py-3 ${statusColor} rounded-xl font-bold text-sm border-2 shadow-lg">
                    ${order.order_status.toUpperCase()}
                </span>
            </div>
            
            <!-- Progress Bar -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                    ${steps.map(step => `
                        <div class="flex flex-col items-center flex-1">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                                step.status === 'completed' ? 'bg-success-500' :
                                step.status === 'active' ? 'bg-warning-500 animate-pulse' :
                                'bg-white bg-opacity-30'
                            }" style="${
                                step.status === 'completed' ? 'background-color: #22c55e; color: #ffffff;' :
                                step.status === 'active' ? 'background-color: #eab308; color: #ffffff;' :
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
                        order.order_status === 'pending' ? '25%' :
                        order.order_status === 'processing' ? '50%' :
                        order.order_status === 'ready' ? '75%' : '100%'
                    }; background-color: #22c55e;"></div>
                </div>
            </div>
            
            <!-- Order Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white bg-opacity-10 rounded-xl p-4" style="background-color: rgba(255,255,255,0.15);">
                    <div class="text-accent-100 text-sm mb-2" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">Items Ordered</div>
                    <div class="font-bold text-lg" style="color: #ffffff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${order.item_ordered}</div>
                </div>
                <div class="bg-white bg-opacity-10 rounded-xl p-4" style="background-color: rgba(255,255,255,0.15);">
                    <div class="text-accent-100 text-sm mb-2" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">Estimated Wait Time</div>
                    <div class="font-bold text-lg" style="color: #ffffff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${order.estimated_wait_time} minutes</div>
                </div>
                ${order.queue_position ? `
                <div class="bg-white bg-opacity-10 rounded-xl p-4" style="background-color: rgba(255,255,255,0.15);">
                    <div class="text-accent-100 text-sm mb-2" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">Queue Position</div>
                    <div class="font-bold text-lg" style="color: #ffffff !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">#${order.queue_position}</div>
                </div>
                ` : ''}
                <div class="bg-white bg-opacity-10 rounded-xl p-4" style="background-color: rgba(255,255,255,0.15);">
                    <div class="text-accent-100 text-sm mb-2" style="color: #dbeafe !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">QR Code</div>
                    <button onclick="viewQRCode('${order.queue_number}')" class="px-4 py-2 bg-white text-accent-600 rounded-lg font-semibold hover:bg-accent-50 transition-all" style="background-color: #ffffff; color: #2563eb !important;">
                        <i class="bi bi-qr-code mr-2"></i>View QR
                    </button>
                </div>
            </div>
        </div>
    `;
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
            <p class="text-gray-600 mb-8 max-w-md mx-auto">You don't have any orders in progress. Ready to order something delicious?</p>
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
            
            // Update recent activity on dashboard (check if currentTab is defined)
            const activeTab = typeof currentTab !== 'undefined' ? currentTab : 'dashboard';
            if (activeTab === 'dashboard') {
                displayRecentActivity(orderHistory.slice(0, 5));
            }
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
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <i class="bi bi-inbox text-5xl text-gray-300 mb-3 block"></i>
                    <p class="text-gray-500">No orders found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        const statusColors = {
            completed: 'bg-success-100 text-success-800',
            cancelled: 'bg-danger-100 text-danger-800',
            pending: 'bg-warning-100 text-warning-800',
            processing: 'bg-accent-100 text-accent-800',
            ready: 'bg-info-100 text-info-800'
        };
        
        const statusColor = statusColors[order.order_status] || 'bg-gray-100 text-gray-800';
        const orderDate = new Date(order.created_at);
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-mono text-sm font-semibold">${order.queue_number}</td>
                <td class="px-6 py-4">${order.item_ordered}</td>
                <td class="px-6 py-4">
                    <span class="${statusColor} px-3 py-1 rounded-full text-xs font-bold uppercase">
                        ${order.order_status}
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

// Display empty order history
function displayEmptyOrderHistory() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-12 text-center">
                <i class="bi bi-inbox text-5xl text-gray-300 mb-3 block"></i>
                <p class="text-gray-500 mb-4">No orders found</p>
                <button onclick="showQuickOrder()" class="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-semibold transition-all">
                    Create Your First Order
                </button>
            </td>
        </tr>
    `;
}

// Update pagination
function updatePagination(pagination) {
    document.getElementById('ordersShowingStart').textContent = pagination.total_items > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
    document.getElementById('ordersShowingEnd').textContent = Math.min(pagination.current_page * pagination.per_page, pagination.total_items);
    document.getElementById('ordersTotalCount').textContent = pagination.total_items;
    
    document.getElementById('ordersPrevBtn').disabled = !pagination.has_prev;
    document.getElementById('ordersNextBtn').disabled = !pagination.has_next;
}

// Display recent activity timeline
function displayRecentActivity(recentOrders) {
    const timeline = document.getElementById('recentActivityTimeline');
    
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
                    
                    const status = statusIcons[order.order_status] || statusIcons.pending;
                    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    return `
                        <div class="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-all">
                            <i class="bi ${status.icon} ${status.color} text-xl mt-1"></i>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">Order ${order.queue_number} - ${order.order_status}</div>
                                <div class="text-sm text-gray-600">${order.item_ordered}</div>
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
    orderStats.completed = orderHistory.filter(o => o.order_status === 'completed').length;
    orderStats.pending = orderHistory.filter(o => o.order_status === 'pending').length;
    orderStats.cancelled = orderHistory.filter(o => o.order_status === 'cancelled').length;
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

// Show quick order (for logged-in students)
function showQuickOrder() {
    document.getElementById('createOrderModal').classList.remove('hidden');
    
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
}

// Close create order modal
function closeCreateOrder() {
    document.getElementById('createOrderModal').classList.add('hidden');
    document.getElementById('createOrderForm').reset();
    document.getElementById('scheduledDateField').classList.add('hidden');
}

// Submit order
async function submitOrder(event) {
    event.preventDefault();
    
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    const items = document.getElementById('orderItems').value;
    const notes = document.getElementById('orderNotes').value;
    const scheduledDate = orderType === 'pre-order' ? document.getElementById('scheduledDate').value : null;
    
    try {
        const response = await fetch(`${API_BASE}/student/create_logged_order.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                order_type: orderType,
                items: items,
                notes: notes,
                scheduled_date: scheduledDate
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Order Created', result.message || 'Your order has been placed successfully!');
            closeCreateOrder();
            
            // Reload current order and order history
            loadCurrentOrder();
            loadOrderHistory();
        } else {
            showToast('error', 'Order Failed', result.message || 'Failed to create order');
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showToast('error', 'Error', 'Failed to create order. Please try again.');
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
    
    const status = statusColors[order.order_status] || statusColors.pending;
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
                        <p class="text-lg font-bold ${status.text} capitalize">${order.order_status}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm ${status.text} font-semibold">Queue Number</p>
                    <p class="text-2xl font-bold ${status.text} font-mono">${order.queue_number}</p>
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
                ${order.order_status === 'pending' || order.order_status === 'processing' || order.order_status === 'ready' ? `
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
    
    // Generate QR code from queue number
    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(qrDisplay, {
                text: queueNumber,
                width: 256,
                height: 256,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error generating QR code:', error);
            qrDisplay.innerHTML = `<div class="text-danger-600 p-4">Error generating QR code</div>`;
            modal.classList.remove('hidden');
        }
    } else {
        console.error('QRCode library not loaded');
        qrDisplay.innerHTML = `
            <div class="text-center p-6">
                <i class="bi bi-exclamation-triangle text-warning-500 text-4xl mb-3 block"></i>
                <p class="text-gray-600">QR Code library not loaded.</p>
                <p class="text-sm text-gray-500 mt-2">Queue Number: <strong>${queueNumber}</strong></p>
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
        link.download = 'qr-code.png';
        link.href = qrCanvas.toDataURL();
        link.click();
        showToast('success', 'Downloaded', 'QR code saved to your downloads');
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
        window.location.href = 'student_login.html';
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

function uploadProfilePicture() {
    const fileInput = document.getElementById('profilePictureInput');
    if (!fileInput.files[0]) {
        showToast('warning', 'No Image', 'Please select an image first');
        return;
    }
    
    // TODO: Implement actual upload to server
    showToast('success', 'Success', 'Profile picture updated successfully!');
    closeProfilePicture();
}

function resetToDefault() {
    // Reset to Herons.png
    const defaultImage = '../../../images/Herons.png';
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
