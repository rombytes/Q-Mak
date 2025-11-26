/**
 * Status Display Script (Dashboard-Matched Stepper)
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

async function loadOrderStatus() {
    const email = sessionStorage.getItem('checkStatusEmail');
    if (!email) {
        window.location.href = '../index.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/check_status.php?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
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
        document.getElementById('displayQueueNum').textContent = 'ERR';
        document.getElementById('displayStatusBadge').textContent = 'Error Loading';
    }
}

function updateUI(order, email) {
    // Store order reference for actions
    window.currentOrder = {
        queue_number: order.queue_number,
        reference_number: order.reference_number || 'QMAK-' + order.order_id.toString().padStart(8, '0'),
        status: order.order_status
    };
    
    const status = order.order_status || 'pending';
    
    // 1. Update Hero Queue Number
    const queueDisplay = document.getElementById('displayQueueNum');
    if (status === 'scheduled') {
        queueDisplay.textContent = 'SCH';
        queueDisplay.classList.add('text-purple-600');
        queueDisplay.classList.remove('text-blue-900');
    } else {
        queueDisplay.textContent = order.queue_number || '--';
        queueDisplay.classList.remove('text-purple-600');
        queueDisplay.classList.add('text-blue-900');
    }
    
    // 2. Update Status Badge
    const badge = document.getElementById('displayStatusBadge');
    const badgeStyles = {
        pending: 'bg-yellow-100 text-yellow-700',
        processing: 'bg-blue-100 text-blue-700',
        ready: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
        scheduled: 'bg-purple-100 text-purple-700'
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
        waitTimeEl.classList.remove('text-orange-600');
        waitTimeEl.classList.add('text-green-600');
    } else if (status === 'cancelled') {
        waitTimeEl.textContent = 'Cancelled';
        waitTimeEl.classList.remove('text-orange-600');
        waitTimeEl.classList.add('text-red-600');
    } else if (status === 'scheduled') {
        waitTimeEl.textContent = 'Check In Required';
        waitTimeEl.classList.remove('text-orange-600');
        waitTimeEl.classList.add('text-purple-600');
    } else {
        waitTimeEl.textContent = `${order.estimated_wait_time || 10} mins`;
    }

    // 5. Show/Hide QR Code
    if (['pending', 'processing', 'ready'].includes(status)) {
        document.getElementById('qrCodeWrapper').classList.remove('hidden');
        generateQR(order, email);
    } else {
        document.getElementById('qrCodeWrapper').classList.add('hidden');
    }
    
    // 6. Show/Hide Check-In Section for Scheduled Orders
    const checkInSection = document.getElementById('checkInSection');
    if (status === 'scheduled') {
        checkInSection.classList.remove('hidden');
    } else {
        checkInSection.classList.add('hidden');
    }
    
    // 7. Show/Hide Cancel Button for Cancellable Orders
    const cancelSection = document.getElementById('cancelSection');
    if (['pending', 'scheduled'].includes(status)) {
        cancelSection.classList.remove('hidden');
    } else {
        cancelSection.classList.add('hidden');
    }
}

function updateStepper(status) {
    // Define step mapping:
    // Step 0 = Confirmed (always complete for active orders)
    // Step 1 = Waiting (pending)
    // Step 2 = Processing (processing/ready)
    // Step 3 = Completed
    
    let activeIndex = 0;
    let progressWidth = '15%';

    if (status === 'scheduled') {
        activeIndex = 0; // Still at confirmed, waiting for check-in
        progressWidth = '8%';
    } else if (status === 'pending') {
        activeIndex = 1; // Waiting
        progressWidth = '38%';
    } else if (status === 'processing' || status === 'ready') {
        activeIndex = 2; // Processing
        progressWidth = status === 'ready' ? '85%' : '62%';
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
        
        // Reset classes
        iconBox.className = 'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 border-2 border-white shadow-sm';
        
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
    const btn = document.getElementById('statusCheckInButton');
    
    if (!window.currentOrder?.reference_number) {
        alert('Order information not found');
        return;
    }
    
    // Disable button
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin text-xl"></i> <span>Checking In...</span>';
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/activate_scheduled_order.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference_number: window.currentOrder.reference_number })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✓ Checked in successfully!\n\nYour queue number: ${result.data.queue_number}\nEstimated wait: ${result.data.wait_time} mins`);
            setTimeout(() => loadOrderStatus(), 1000);
        } else {
            alert('✗ ' + (result.message || 'Check-in failed'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-circle-fill text-xl"></i> <span>I\'M HERE</span>';
            }
        }
    } catch (error) {
        console.error('Check-in error:', error);
        alert('✗ Network error. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle-fill text-xl"></i> <span>I\'M HERE</span>';
        }
    }
}

// Cancel Order
async function cancelOrderStatus() {
    const btn = document.getElementById('statusCancelButton');
    
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
