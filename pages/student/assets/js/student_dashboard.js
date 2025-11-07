/**
 * Student Dashboard Page Script
 * Q-Mak Queue Management System
 * Main student dashboard with order management, history, and profile
 */

const API_BASE = '/Q-Mak/php/api';
let currentOrder = null;
let studentData = null;
let orderHistory = [];

// Check if student is logged in
if (!sessionStorage.getItem('studentLoggedIn')) {
    window.location.href = 'student_login.html';
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

async function initDashboard() {
    try {
        await loadStudentProfile();
        await loadCurrentOrder();
        await loadOrderHistory();
        fetchInventoryStatus();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        if (window.notificationManager) {
            window.notificationManager.error('Failed to load dashboard data');
        }
    }
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = now.toLocaleString('en-US', options);
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
            studentData = result.data;
            const name = `${studentData.first_name} ${studentData.last_name}`;
            document.getElementById('welcomeText').innerHTML = `
                <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Welcome, ${name}!
            `;
        } else {
            console.error('Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
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

// Display current order
function displayCurrentOrder(order) {
    document.getElementById('currentOrderContent').classList.remove('hidden');
    
    const statusConfig = {
        'pending': { text: 'PENDING', color: 'bg-orange-500 text-white', icon: 'clock' },
        'processing': { text: 'PROCESSING', color: 'bg-blue-500 text-white', icon: 'spinner fa-spin' },
        'ready': { text: 'READY FOR PICKUP', color: 'bg-green-500 text-white', icon: 'check-circle' },
        'completed': { text: 'COMPLETED', color: 'bg-gray-500 text-white', icon: 'check-double' },
        'cancelled': { text: 'CANCELLED', color: 'bg-red-500 text-white', icon: 'times-circle' }
    };
    
    const status = statusConfig[order.order_status] || statusConfig['pending'];
    
    const items = order.item_ordered ? order.item_ordered.split(',').map(i => i.trim()) : [];
    const itemCount = items.length;
    const uniqueItems = [...new Set(items)];
    const itemDisplay = uniqueItems.map(item => capitalizeWords(item)).join(', ');
    
    document.getElementById('currentOrderDetails').innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas fa-hashtag text-blue-500"></i>
            <div>
                <p class="text-xs text-gray-600">Queue Number</p>
                <p class="font-bold text-gray-900">${order.queue_number}</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <i class="fas fa-shopping-bag text-green-500"></i>
            <div>
                <p class="text-xs text-gray-600">Items (${itemCount})</p>
                <p class="font-semibold text-gray-900">${itemDisplay}</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <i class="fas fa-clock text-orange-500"></i>
            <div>
                <p class="text-xs text-gray-600">Estimated Wait</p>
                <p class="font-bold text-gray-900">${order.estimated_wait_time || '10'} mins</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <i class="fas fa-calendar text-purple-500"></i>
            <div>
                <p class="text-xs text-gray-600">Order Date</p>
                <p class="font-semibold text-gray-900">${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `;
    
    document.getElementById('currentOrderStatus').innerHTML = `
        <i class="fas fa-${status.icon} mr-2"></i>${status.text}
    `;
    document.getElementById('currentOrderStatus').className = `inline-block px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${status.color}`;
    
    // Generate QR code if order is active
    if (['pending', 'processing', 'ready'].includes(order.order_status)) {
        generateCurrentOrderQR(order);
    }
}

// Display no current order message
function displayNoCurrentOrder() {
    const section = document.getElementById('currentOrderSection');
    section.innerHTML = `
        <div class="bg-blue-50 rounded-2xl shadow-xl border-2 border-blue-300 p-8 text-center">
            <div class="flex flex-col items-center">
                <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-2xl mb-4">
                    <i class="fas fa-shopping-cart text-white text-3xl"></i>
                </div>
                <h3 class="text-2xl font-bold text-blue-900 mb-2">No Active Orders</h3>
                <p class="text-gray-700 mb-6">Ready to order from UMak COOP?</p>
                <button onclick="window.location.href='create_order.html'" class="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all hover:shadow-xl flex items-center gap-3 transform hover:-translate-y-1">
                    <i class="fas fa-plus-circle text-xl"></i>
                    Place New Order
                </button>
            </div>
        </div>
    `;
}

// Generate QR code for current order
function generateCurrentOrderQR(order) {
    const canvas = document.getElementById('currentOrderQRCode');
    if (!canvas) return;
    
    const qrData = JSON.stringify({
        queue_number: order.queue_number,
        reference_number: order.reference_number || '',
        order_id: order.order_id,
        email: studentData?.email || '',
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });
    
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#1e3a8a',
                light: '#ffffff'
            }
        }, function (error) {
            if (error) {
                console.error('QR Code generation error:', error);
            }
        });
    }
}

// Download current order QR code
function downloadCurrentOrderQR() {
    const canvas = document.getElementById('currentOrderQRCode');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `UMAK-COOP-${currentOrder.queue_number}.png`;
    link.href = url;
    link.click();
    
    if (window.notificationManager) {
        window.notificationManager.success('QR Code downloaded!');
    }
}

// Load order history
async function loadOrderHistory() {
    try {
        const response = await fetch(`${API_BASE}/student/get_order_history.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            orderHistory = result.data;
            displayOrderHistory(orderHistory);
        } else {
            displayNoOrderHistory();
        }
    } catch (error) {
        console.error('Error loading order history:', error);
        displayNoOrderHistory();
    }
}

// Display order history
function displayOrderHistory(orders) {
    const historyContainer = document.getElementById('orderHistoryContent');
    if (!historyContainer) return;
    
    if (orders.length === 0) {
        displayNoOrderHistory();
        return;
    }
    
    const statusConfig = {
        'pending': 'bg-orange-100 text-orange-700',
        'processing': 'bg-blue-100 text-blue-700',
        'ready': 'bg-green-100 text-green-700',
        'completed': 'bg-gray-100 text-gray-700',
        'cancelled': 'bg-red-100 text-red-700'
    };
    
    const html = orders.map(order => {
        const items = order.item_ordered ? order.item_ordered.split(',').map(i => i.trim()) : [];
        const itemCount = items.length;
        const uniqueItems = [...new Set(items)];
        const itemDisplay = uniqueItems.map(item => capitalizeWords(item)).join(', ');
        const statusClass = statusConfig[order.order_status] || statusConfig['pending'];
        
        return `
            <div class="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-2xl font-bold text-blue-900">${order.queue_number}</p>
                        <p class="text-sm text-gray-600">${new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">
                        ${order.order_status.toUpperCase()}
                    </span>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-shopping-bag text-green-500"></i>
                        <span class="text-gray-700">${itemCount} items: ${itemDisplay}</span>
                    </div>
                    ${order.estimated_wait_time ? `
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-clock text-orange-500"></i>
                        <span class="text-gray-700">${order.estimated_wait_time} mins</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    historyContainer.innerHTML = html;
}

// Display no order history message
function displayNoOrderHistory() {
    const historyContainer = document.getElementById('orderHistoryContent');
    if (historyContainer) {
        historyContainer.innerHTML = `
            <div class="bg-gray-50 rounded-xl p-12 text-center">
                <i class="fas fa-history text-gray-400 text-5xl mb-4"></i>
                <p class="text-gray-600 font-semibold">No order history yet</p>
                <p class="text-gray-500 text-sm mt-2">Your past orders will appear here</p>
            </div>
        `;
    }
}

// Fetch inventory status
async function fetchInventoryStatus() {
    try {
        const response = await fetch(`${API_BASE}/inventory_status.php`);
        const result = await response.json();
        
        if (result.success && result.data.items) {
            // Inventory status loaded for future use
            console.log('Inventory loaded:', result.data.items.length, 'items');
        }
    } catch (error) {
        console.error('Error fetching inventory status:', error);
    }
}

// Utility function to capitalize words
function capitalizeWords(str) {
    if (!str) return 'N/A';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'student_login.html';
    }
}

// Refresh dashboard data every 30 seconds
setInterval(() => {
    if (currentOrder) {
        loadCurrentOrder();
    }
}, 30000);
