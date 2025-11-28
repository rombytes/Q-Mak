/**
 * Status Display Script (Dual View: Scheduled + Active)
 * Q-Mak Queue Management System
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();

// Store current order for actions
window.currentOrder = null;
window.currentEmail = null;

async function loadOrderStatus() {
    const email = sessionStorage.getItem('checkStatusEmail');
    if (!email) {
        window.location.href = '../index.html';
        return;
    }
    
    window.currentEmail = email;
    
    try {
        const response = await fetch(`${API_BASE}/admin/check_status.php?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        // Hide loading view
        document.getElementById('loadingView').classList.add('hidden');
        
        if (result.success && result.data.orders.length > 0) {
            const order = result.data.orders[0];
            updateUI(order, email);
            
            // Auto-refresh every 15s if order is active
            if (['pending', 'processing', 'scheduled'].includes(order.order_status)) {
                setTimeout(loadOrderStatus, 15000);
            }
        } else {
            alert('No active orders found.');
            goHome();
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loadingView').innerHTML = `
            <div class="text-center p-8">
                <i class="bi bi-exclamation-circle text-5xl text-red-400 mb-4"></i>
                <p class="text-red-600 font-medium">Error loading order status</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
                    Try Again
                </button>
            </div>
        `;
    }
}

function updateUI(order, email) {
    // Store order reference for actions
    window.currentOrder = {
        order_id: order.order_id,
        queue_number: order.queue_number,
        reference_number: order.reference_number || 'QMAK-' + order.order_id.toString().padStart(8, '0'),
        status: order.order_status,
        scheduled_date: order.queue_date || order.scheduled_date,
        student_name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Student',
        student_id: order.student_number || order.student_id || 'N/A'
    };
    
    const status = order.order_status || 'pending';
    
    // Get views
    const scheduledView = document.getElementById('scheduledView');
    const activeView = document.getElementById('activeView');
    const pageBody = document.getElementById('pageBody');
    const accentBar = document.getElementById('accentBar');
    const headerTitle = document.getElementById('headerTitle');
    
    if (status === 'scheduled') {
        // ========== SCHEDULED VIEW ==========
        scheduledView.classList.remove('hidden');
        activeView.classList.add('hidden');
        
        // Purple theme for body
        pageBody.className = 'min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-purple-50 to-violet-50';
        accentBar.className = 'h-2 bg-gradient-to-r from-purple-600 to-violet-500 w-full';
        headerTitle.innerHTML = '<i class="bi bi-calendar-check text-purple-600"></i> <span class="text-purple-900">Scheduled Order</span>';
        
        // Student Info
        const initials = getInitials(window.currentOrder.student_name);
        document.getElementById('scheduledStudentAvatar').textContent = initials;
        document.getElementById('scheduledStudentName').textContent = window.currentOrder.student_name;
        document.getElementById('scheduledStudentId').textContent = `ID: ${window.currentOrder.student_id}`;
        
        // Order Details
        document.getElementById('scheduledRefNum').textContent = window.currentOrder.reference_number;
        
        // Format scheduled date
        const scheduledDate = window.currentOrder.scheduled_date;
        if (scheduledDate) {
            const dateObj = new Date(scheduledDate + 'T00:00:00');
            document.getElementById('scheduledDate').textContent = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else {
            document.getElementById('scheduledDate').textContent = 'Not set';
        }
        
        // Items
        const items = (order.item_name || order.item_ordered || '').split(',').map(i => capitalizeWords(i.trim())).join(', ');
        document.getElementById('scheduledItems').textContent = items || 'N/A';
        
        // Check if today matches scheduled date for check-in eligibility
        const today = new Date().toISOString().split('T')[0];
        const checkInBtn = document.getElementById('scheduledCheckInButton');
        const dateWarning = document.getElementById('scheduledDateWarning');
        
        if (scheduledDate && scheduledDate !== today) {
            // Not the scheduled day - disable check-in
            checkInBtn.disabled = true;
            checkInBtn.classList.remove('btn-pulse-purple', 'hover:shadow-2xl');
            checkInBtn.classList.add('opacity-50', 'cursor-not-allowed');
            dateWarning.classList.remove('hidden');
        } else {
            // Today is the day!
            checkInBtn.disabled = false;
            checkInBtn.classList.add('btn-pulse-purple', 'hover:shadow-2xl');
            checkInBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            dateWarning.classList.add('hidden');
        }
        
    } else {
        // ========== ACTIVE VIEW (pending, processing, ready, completed, cancelled) ==========
        scheduledView.classList.add('hidden');
        activeView.classList.remove('hidden');
        
        // Blue theme for body
        pageBody.className = 'min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-blue-50 to-white';
        accentBar.className = 'h-2 bg-gradient-to-r from-blue-600 to-blue-400 w-full';
        headerTitle.innerHTML = '<i class="bi bi-shop text-blue-600"></i> <span class="text-blue-900">Q-Mak Status</span>';
        
        // Student Info in Active View
        const initials = getInitials(window.currentOrder.student_name);
        document.getElementById('activeStudentAvatar').textContent = initials;
        document.getElementById('activeStudentName').textContent = window.currentOrder.student_name;
        document.getElementById('activeStudentId').textContent = `ID: ${window.currentOrder.student_id}`;
        
        // 1. Update Hero Queue Number
        const queueDisplay = document.getElementById('displayQueueNum');
        queueDisplay.textContent = order.queue_number || '--';
        queueDisplay.classList.remove('text-purple-600');
        queueDisplay.classList.add('text-blue-900');
        
        // 2. Update Status Badge
        const badge = document.getElementById('displayStatusBadge');
        const badgeStyles = {
            pending: 'bg-yellow-100 text-yellow-700',
            processing: 'bg-blue-100 text-blue-700',
            ready: 'bg-purple-100 text-purple-700',
            completed: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        badge.className = `inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase ${badgeStyles[status] || badgeStyles.pending}`;
        badge.textContent = status === 'ready' ? 'Ready for Pickup' : status;

        // 3. Update 4-Step Stepper
        updateStepper(status);

        // 4. Update Order Details
        document.getElementById('displayRefNum').textContent = window.currentOrder.reference_number;
        
        // Format items
        const items = (order.item_name || order.item_ordered || '').split(',').map(i => capitalizeWords(i.trim())).join(', ');
        document.getElementById('displayItems').textContent = items || 'N/A';
        
        // Wait time
        const waitTimeEl = document.getElementById('displayWaitTime');
        if (status === 'completed') {
            waitTimeEl.textContent = 'Done ✓';
            waitTimeEl.className = 'font-bold text-green-600 text-sm';
        } else if (status === 'cancelled') {
            waitTimeEl.textContent = 'Cancelled';
            waitTimeEl.className = 'font-bold text-red-600 text-sm';
        } else if (status === 'ready') {
            waitTimeEl.textContent = 'Ready Now!';
            waitTimeEl.className = 'font-bold text-purple-600 text-sm';
        } else {
            waitTimeEl.textContent = `${order.estimated_wait_time || 10} mins`;
            waitTimeEl.className = 'font-bold text-orange-600 text-sm';
        }

        // 5. Show/Hide QR Code
        if (['pending', 'processing', 'ready'].includes(status)) {
            document.getElementById('qrCodeWrapper').classList.remove('hidden');
            generateQR(order, email);
        } else {
            document.getElementById('qrCodeWrapper').classList.add('hidden');
        }
        
        // 6. Show/Hide Cancel Button for pending orders only
        const cancelSection = document.getElementById('cancelSection');
        if (status === 'pending') {
            cancelSection.classList.remove('hidden');
        } else {
            cancelSection.classList.add('hidden');
        }
    }
}

function getInitials(name) {
    if (!name) return '--';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function updateStepper(status) {
    // Define step mapping:
    // Step 0 = Confirmed (always complete for active orders)
    // Step 1 = Waiting (pending)
    // Step 2 = Processing (processing/ready)
    // Step 3 = Completed
    
    let activeIndex = 0;
    let progressWidth = '15%';

    if (status === 'pending') {
        activeIndex = 1; // Waiting
        progressWidth = '38%';
    } else if (status === 'processing') {
        activeIndex = 2; // Processing
        progressWidth = '62%';
    } else if (status === 'ready') {
        activeIndex = 2; // Still Processing step but almost done
        progressWidth = '85%';
    } else if (status === 'completed') {
        activeIndex = 3; // Completed
        progressWidth = '100%';
    } else if (status === 'cancelled') {
        activeIndex = -1; // No active step
        progressWidth = '0%';
    }

    // Update Progress Bar
    document.getElementById('progressBarFill').style.width = progressWidth;

    // Update Step Icons
    for (let i = 0; i < 4; i++) {
        const iconBox = document.getElementById(`step-icon-${i}`);
        if (!iconBox) continue;
        
        // Reset classes (no mb-2, labels now use mt-3)
        iconBox.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 border-white shadow-sm';
        
        if (status === 'cancelled') {
            // All steps gray for cancelled
            iconBox.classList.add('bg-gray-100', 'text-gray-300');
        } else if (i < activeIndex) {
            // Completed Steps (Green)
            iconBox.classList.add('bg-green-500', 'text-white');
        } else if (i === activeIndex) {
            // Current Active Step (Blue + Pulse)
            iconBox.classList.add('bg-blue-600', 'text-white', 'step-active-pulse');
        } else {
            // Future Steps (Gray)
            iconBox.classList.add('bg-gray-100', 'text-gray-300');
        }
    }
}

function generateQR(order, email) {
    if (typeof QRCode === 'undefined') return;
    
    const qrData = JSON.stringify({
        queue_number: order.queue_number,
        reference_number: window.currentOrder.reference_number,
        email: email,
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });
    
    // Clear previous
    const canvas = document.getElementById('qrcode');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    QRCode.toCanvas(canvas, qrData, {
        width: 128,
        margin: 1,
        color: { dark: '#1e3a8a', light: '#ffffff' }
    }, function(error) {
        if (error) console.error('QR Error:', error);
    });
}

function capitalizeWords(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Check-In for Scheduled Orders
async function activateOrderStatus() {
    const btn = document.getElementById('scheduledCheckInButton');
    
    if (!window.currentOrder?.reference_number) {
        alert('Order information not found');
        return;
    }
    
    // Disable button
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('btn-pulse-purple');
        btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin text-2xl"></i> <span>Checking In...</span>';
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/activate_scheduled_order.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reference_number: window.currentOrder.reference_number,
                email: window.currentEmail
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            const checkInSection = document.getElementById('scheduledCheckInSection');
            checkInSection.innerHTML = `
                <div class="bg-green-500 rounded-2xl p-6 shadow-xl text-white text-center">
                    <i class="bi bi-check-circle-fill text-5xl mb-3"></i>
                    <h4 class="font-bold text-xl mb-2">Checked In!</h4>
                    <p class="text-green-100 mb-2">Your queue number is:</p>
                    <p class="text-4xl font-black">${result.data.queue_number}</p>
                    <p class="text-sm text-green-200 mt-2">Wait time: ~${result.data.wait_time} mins</p>
                </div>
            `;
            
            // Reload after 2s to show active view
            setTimeout(() => loadOrderStatus(), 2000);
        } else {
            alert('✗ ' + (result.message || 'Check-in failed'));
            if (btn) {
                btn.disabled = false;
                btn.classList.add('btn-pulse-purple');
                btn.innerHTML = '<i class="bi bi-check-circle-fill text-2xl"></i> <span>I\'M HERE</span>';
            }
        }
    } catch (error) {
        console.error('Check-in error:', error);
        alert('✗ Network error. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.classList.add('btn-pulse-purple');
            btn.innerHTML = '<i class="bi bi-check-circle-fill text-2xl"></i> <span>I\'M HERE</span>';
        }
    }
}

// Cancel Order
async function cancelOrderStatus() {
    const btn = document.getElementById('statusCancelButton') || document.getElementById('scheduledCancelButton');
    
    if (!window.currentOrder?.reference_number) {
        alert('Order information not found');
        return;
    }
    
    const confirmed = confirm(
        '⚠️ Cancel this order?\n\n' +
        '• Your order will be cancelled immediately\n' +
        '• Reserved items will be released\n\n' +
        'This cannot be undone.'
    );
    
    if (!confirmed) return;
    
    // Disable button
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Cancelling...';
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/cancel_order.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference_number: window.currentOrder.reference_number })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✓ Order cancelled successfully.');
            setTimeout(() => goHome(), 1500);
        } else {
            alert('✗ ' + (result.message || 'Cancellation failed'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel Order';
            }
        }
    } catch (error) {
        console.error('Cancel error:', error);
        alert('✗ Network error. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel Order';
        }
    }
}

function goHome() {
    sessionStorage.removeItem('checkStatusEmail');
    window.location.href = '../index.html';
}

// Initialize
loadOrderStatus();
