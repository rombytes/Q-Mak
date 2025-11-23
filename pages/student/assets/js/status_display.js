/**
 * Status Display Page Script
 * Q-Mak Queue Management System
 * Displays order status with QR code
 */

// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();

const statusConfig = {
    'pending': { 
        text: 'PENDING', 
        desc: 'Your order is currently being processed by the COOP staff.',
        color: 'bg-orange-500 text-white'
    },
    'processing': { 
        text: 'PROCESSING', 
        desc: 'Your items are being picked and prepared.',
        color: 'bg-blue-500 text-white'
    },
    'ready': { 
        text: 'READY FOR PICK-UP', 
        desc: 'Your order is ready! Please proceed to the COOP pickup counter.',
        color: 'bg-indigo-600 text-white'
    },
    'completed': { 
        text: 'COMPLETED', 
        desc: 'Order completed and successfully picked up.',
        color: 'bg-green-600 text-white'
    },
    'cancelled': { 
        text: 'CANCELLED', 
        desc: 'This order has been cancelled. Please contact COOP for details.',
        color: 'bg-red-600 text-white'
    }
};

async function loadOrderStatus() {
    // --- MODIFIED: Get email from sessionStorage at the top ---
    const email = sessionStorage.getItem('checkStatusEmail');
    
    if (!email) {
        await showAlert('Session expired. Please start again.', 'warning');
        window.location.href = '../index.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/check_status.php?email=${encodeURIComponent(email)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data.orders.length > 0) {
            // Display the most recent order
            const order = result.data.orders[0];
            const status = statusConfig[order.order_status] || statusConfig['pending'];
            
            // Format items like admin dashboard - show unique items only
            const items = order.item_ordered ? order.item_ordered.split(',').map(i => i.trim()) : [];
            const itemCount = items.length;
            const uniqueItems = [...new Set(items)];
            const itemText = uniqueItems.map(item => capitalizeWords(item)).join(', ');
            const itemDisplay = itemCount > 1 ? `<strong>${itemCount} items:</strong> ${itemText}` : capitalizeWords(order.item_ordered);
            
            // Calculate estimated wait time
            const waitTime = order.estimated_wait_time || 10;
            const waitTimeRange = `${waitTime} - ${waitTime + 5} mins`;
            
            // Get reference number and queue date
            const refNumber = order.reference_number || 'QMAK-' + order.order_id.toString().padStart(8, '0');
            const queueDate = order.queue_date || new Date(order.created_at).toISOString().split('T')[0];
            const orderType = order.order_type || 'immediate';
            
            // Store for position updates
            window.currentOrder = {
                queue_number: order.queue_number,
                reference_number: refNumber,
                status: order.order_status
            };
            
            document.getElementById('orderId').innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-hashtag text-blue-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Queue Number:</span>
                    <strong class="text-blue-900 text-lg">${order.queue_number}</strong>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-barcode text-purple-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Reference:</span>
                    <strong class="text-purple-900 font-mono text-xs">${refNumber}</strong>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-shopping-bag text-green-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Item:</span>
                    <span class="text-gray-900">${itemDisplay}</span>
                </div>
                <div class="flex items-center gap-2 mb-2" id="waitTimeDisplay">
                    <i class="fas fa-clock text-orange-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Estimated Wait:</span>
                    <strong class="text-orange-900">${waitTimeRange}</strong>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-calendar-day text-indigo-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Queue Date:</span>
                    <strong class="text-indigo-900">${new Date(queueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</strong>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-${orderType === 'pre-order' ? 'moon' : 'bolt'} text-teal-500 text-sm"></i>
                    <span class="text-sm text-gray-600">Order Type:</span>
                    <span class="px-2 py-0.5 rounded text-xs font-semibold ${orderType === 'pre-order' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}">
                        ${orderType === 'pre-order' ? 'Pre-Order' : 'Immediate'}
                    </span>
                </div>
            `;
            
            const statusBadge = document.getElementById('statusBadge');
            statusBadge.textContent = status.text;
            statusBadge.className = status.color + ' px-6 py-3 rounded-xl inline-block font-bold text-lg shadow-md';
            
            document.getElementById('statusDesc').textContent = status.desc;

            // Generate QR code (wrapped in try-catch to not break page load)
            try {
                generateStatusQRCode(order, email);
            } catch (qrError) {
                console.warn('QR generation failed:', qrError);
                // Don't show error to user, data is already loaded
            }
            
            // Update position data if order is active
            if (order.order_status === 'pending' || order.order_status === 'processing') {
                await updatePositionData(order.queue_number, refNumber);
                
                // Poll every 30 seconds for updates
                setInterval(() => {
                    if (window.currentOrder && (window.currentOrder.status === 'pending' || window.currentOrder.status === 'processing')) {
                        updatePositionData(window.currentOrder.queue_number, window.currentOrder.reference_number);
                    }
                }, 30000);
            }
            
            // Show all orders if multiple
            if (result.data.orders.length > 1) {
                const ordersHtml = result.data.orders.map(o => {
                    const oItems = o.item_ordered ? o.item_ordered.split(',').map(i => i.trim()) : [];
                    const oItemCount = oItems.length;
                    const oUniqueItems = [...new Set(oItems)];
                    const oItemText = oUniqueItems.map(item => capitalizeWords(item)).join(', ');
                    const oItemDisplay = oItemCount > 1 ? `${oItemCount} items: ${oItemText}` : capitalizeWords(o.item_ordered);
                    
                    return `
                    <div class="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-receipt text-blue-600 text-sm"></i>
                            </div>
                            <div>
                                <strong class="text-blue-900">${o.queue_number}</strong>
                                <p class="text-sm text-gray-600">${oItemDisplay}</p>
                            </div>
                        </div>
                        <span class="text-xs px-3 py-1 rounded-full ${statusConfig[o.order_status].color}">${statusConfig[o.order_status].text}</span>
                    </div>
                `}).join('');
                
                document.getElementById('statusDesc').innerHTML += `
                    <div class="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                        <div class="flex items-center gap-2 mb-3">
                            <i class="fas fa-list text-blue-600"></i>
                            <strong class="text-blue-900">All Your Orders (${result.data.orders.length})</strong>
                        </div>
                        <div class="space-y-2">
                            ${ordersHtml}
                        </div>
                    </div>
                `;
            }
        } else {
            await showAlert('No orders found for this email.', 'info');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Error loading status:', error);
        if (window.notificationManager) {
            window.notificationManager.error('Failed to load order status: ' + error.message);
        } else {
            await showAlert('Failed to load order status. Please try again.', 'error');
        }
    }
}

function generateStatusQRCode(order, email) {
    // Only show QR code for active orders
    const activeStatus = ['pending', 'processing', 'ready'];
    if (!activeStatus.includes(order.order_status)) {
        return; // Do not show QR for completed or cancelled orders
    }

    const canvas = document.getElementById('qrcode');
    const wrapper = document.getElementById('qrCodeWrapper');
    
    if (!canvas || !wrapper) return; // Safety check
    
    // Check if QRCode library is loaded, try Google Charts fallback if not
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded, using Google Charts fallback');
        useGoogleChartsForStatus(order, email, canvas, wrapper);
        return;
    }

    // Show the QR code section
    wrapper.classList.remove('hidden');

    // Build QR data with new queue system fields
    const refNumber = order.reference_number || 'QMAK-' + order.order_id.toString().padStart(8, '0');
    const queueDate = order.queue_date || new Date(order.created_at).toISOString().split('T')[0];
    const orderType = order.order_type || 'immediate';
    
    const qrData = JSON.stringify({
        queue_number: order.queue_number,
        reference_number: refNumber,
        email: email,
        queue_date: queueDate,
        order_type: orderType,
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });

    QRCode.toCanvas(canvas, qrData, {
        width: 200,
        margin: 2,
        color: {
            dark: '#1e3a8a', // Match order_result.html
            light: '#ffffff'
        }
    }, function (error) {
        if (error) {
            console.error('QR Code generation error:', error);
            // Keep wrapper visible but show message
            wrapper.innerHTML = '<p class="text-sm text-gray-500">QR code unavailable</p>';
        } else {
            console.log('QR code generated successfully for status display');
        }
    });
}

function useGoogleChartsForStatus(order, email, canvas, wrapper) {
    wrapper.classList.remove('hidden');
    const ctx = canvas.getContext('2d');
    
    const refNumber = order.reference_number || 'QMAK-' + order.order_id.toString().padStart(8, '0');
    const queueDate = order.queue_date || new Date(order.created_at).toISOString().split('T')[0];
    const orderType = order.order_type || 'immediate';
    
    const qrData = JSON.stringify({
        queue_number: order.queue_number,
        reference_number: refNumber,
        email: email,
        queue_date: queueDate,
        order_type: orderType,
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });
    
    const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        canvas.width = 200;
        canvas.height = 200;
        ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200);
        console.log('QR code generated using Google Charts fallback');
    };
    img.onerror = function() {
        console.error('Google Charts QR failed');
        wrapper.innerHTML = '<p class="text-sm text-gray-500">QR code unavailable</p>';
    };
    img.src = qrUrl;
}

// Capitalize words like admin dashboard
function capitalizeWords(str) {
    if (!str) return 'N/A';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Update position data in real-time
async function updatePositionData(queueNumber, referenceNumber) {
    try {
        const response = await fetch(`${API_BASE}/student/get_wait_time.php?queue=${queueNumber}&ref=${referenceNumber}`);
        const data = await response.json();
        
        if (data.success) {
            const waitDisplay = document.getElementById('waitTimeDisplay');
            if (waitDisplay) {
                const position = data.queue_position;
                const ahead = data.orders_ahead;
                const minutes = data.estimated_minutes;
                
                let positionText = '';
                if (position === 1 && ahead === 0) {
                    positionText = "You're next in line!";
                } else if (ahead === 1) {
                    positionText = `Position #${position} • ${ahead} order ahead`;
                } else if (ahead > 1) {
                    positionText = `Position #${position} • ${ahead} orders ahead`;
                } else {
                    positionText = `Position #${position}`;
                }
                
                if (data.status === 'processing') {
                    waitDisplay.innerHTML = `
                        <i class="fas fa-bell text-orange-500 text-sm animate-pulse"></i>
                        <span class="text-sm text-gray-600">Status:</span>
                        <strong class="text-orange-600 animate-pulse">Your Turn! Go to counter</strong>
                    `;
                } else {
                    waitDisplay.innerHTML = `
                        <i class="fas fa-clock text-orange-500 text-sm"></i>
                        <span class="text-sm text-gray-600">Wait Time:</span>
                        <strong class="text-orange-900">${minutes} mins</strong>
                        <span class="text-xs text-gray-500 ml-2">(${positionText})</span>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Failed to update position:', error);
    }
}

// Load status on page load
loadOrderStatus();

function goHome() {
    sessionStorage.clear();
    window.location.href = '../index.html';
}
