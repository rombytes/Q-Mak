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
        color: 'bg-orange-500 text-white',
        icon: 'fas fa-clock'
    },
    'processing': { 
        text: 'PROCESSING', 
        desc: 'Your items are being picked and prepared.',
        color: 'bg-blue-500 text-white',
        icon: 'fas fa-cog fa-spin'
    },
    'scheduled': { 
        text: 'SCHEDULED', 
        desc: 'Your order is scheduled. Please check in when you arrive to receive your queue number.',
        color: 'bg-purple-500 text-white',
        icon: 'fas fa-calendar-check'
    },
    'ready': { 
        text: 'READY FOR PICK-UP', 
        desc: 'Your order is ready! Please proceed to the COOP pickup counter.',
        color: 'bg-indigo-600 text-white',
        icon: 'fas fa-box-open'
    },
    'completed': { 
        text: 'COMPLETED', 
        desc: 'Order completed and successfully picked up.',
        color: 'bg-green-600 text-white',
        icon: 'fas fa-check-circle'
    },
    'cancelled': { 
        text: 'CANCELLED', 
        desc: 'This order has been cancelled. Please contact COOP for details.',
        color: 'bg-red-600 text-white',
        icon: 'fas fa-times-circle'
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
            
            // Phase 3: Check-in button for scheduled orders
            let checkInButtonHTML = '';
            if (order.order_status === 'scheduled') {
                checkInButtonHTML = `
                    <div class="mb-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 shadow-xl">
                        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div class="flex items-center gap-3 text-white">
                                <i class="fas fa-hand-pointer text-3xl"></i>
                                <div>
                                    <h4 class="font-bold text-lg">Ready to Check In?</h4>
                                    <p class="text-sm text-purple-100">Click to join the queue and receive your number</p>
                                </div>
                            </div>
                            <button 
                                onclick="activateOrderStatus()" 
                                id="statusCheckInButton"
                                class="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-bold transition-all hover:shadow-xl flex items-center gap-2">
                                <i class="fas fa-check-circle text-xl"></i>
                                <span>I'M HERE</span>
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Phase 4: Cancel button for cancellable orders (pending/scheduled)
            let cancelButtonHTML = '';
            if (order.order_status === 'pending' || order.order_status === 'scheduled') {
                cancelButtonHTML = `
                    <div class="mb-6 bg-gradient-to-r from-gray-50 to-red-50 rounded-xl p-5 border border-red-200 shadow-md">
                        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-800">Need to Cancel?</h4>
                                    <p class="text-gray-600 text-sm">Your reserved item will be released back to inventory</p>
                                </div>
                            </div>
                            <button 
                                onclick="cancelOrderStatus()" 
                                id="statusCancelButton"
                                class="bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-lg font-bold transition-all hover:shadow-lg flex items-center gap-2">
                                <i class="fas fa-ban text-lg"></i>
                                <span>Cancel Order</span>
                            </button>
                        </div>
                    </div>
                `;
            }
            
            document.getElementById('orderId').innerHTML = checkInButtonHTML + cancelButtonHTML + `
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-hashtag ${order.order_status === 'scheduled' ? 'text-purple-500' : 'text-blue-500'} text-sm"></i>
                    <span class="text-sm text-gray-600">Queue Number:</span>
                    <strong class="${order.order_status === 'scheduled' ? 'text-purple-600' : 'text-blue-900'} text-lg">${order.order_status === 'scheduled' ? 'SCHEDULED' : order.queue_number}</strong>
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
                    ${order.order_status === 'scheduled' ? `
                        <i class="fas fa-calendar-check text-purple-500 text-sm"></i>
                        <span class="text-sm text-gray-600">Status:</span>
                        <strong class="text-purple-600">Check In Required</strong>
                    ` : `
                        <i class="fas fa-clock text-orange-500 text-sm"></i>
                        <span class="text-sm text-gray-600">Estimated Wait:</span>
                        <strong class="text-orange-900">${waitTimeRange}</strong>
                    `}
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
            if (order.status === 'pending' || order.status === 'processing' || order.status === 'scheduled') {
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
                        <span class="text-xs px-3 py-1 rounded-full ${statusConfig[o.status].color}">${statusConfig[o.status].text}</span>
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
    if (!activeStatus.includes(order.status)) {
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

/**
 * Activate a scheduled order from status page - Phase 3: Check-In System
 */
// Phase 4: Cancel Order Function
async function cancelOrderStatus() {
    const cancelButton = document.getElementById('statusCancelButton');
    
    if (!window.currentOrder || !window.currentOrder.reference_number) {
        if (window.notificationManager) {
            window.notificationManager.error('Order information not found');
        } else {
            alert('Error: Order information not found');
        }
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
        cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin text-lg"></i> <span>Cancelling...</span>';
        cancelButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/cancel_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_number: window.currentOrder.reference_number
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success notification
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification(
                    'Order cancelled successfully. Your reserved item has been released.',
                    'success'
                );
            } else {
                alert('✓ Order cancelled successfully!\n\nYour reserved item has been released back to inventory.');
            }
            
            // Redirect to homepage after 2 seconds
            setTimeout(() => {
                sessionStorage.removeItem('checkStatusEmail');
                window.location.href = '../index.html';
            }, 2000);
            
        } else {
            // Handle errors
            const errorMessage = result.message || 'Failed to cancel order. Please try again.';
            if (window.notificationManager) {
                window.notificationManager.error(errorMessage);
            } else {
                alert('✗ Error: ' + errorMessage);
            }
            
            // Re-enable button
            if (cancelButton) {
                cancelButton.disabled = false;
                cancelButton.innerHTML = '<i class="fas fa-ban text-lg"></i> <span>Cancel Order</span>';
                cancelButton.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }
        
    } catch (error) {
        console.error('Cancel order error:', error);
        const errorMsg = 'Network error. Please check your connection and try again.';
        if (window.notificationManager) {
            window.notificationManager.error(errorMsg);
        } else {
            alert('✗ ' + errorMsg);
        }
        
        // Re-enable button
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.innerHTML = '<i class="fas fa-ban text-lg"></i> <span>Cancel Order</span>';
            cancelButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

async function activateOrderStatus() {
    const checkInButton = document.getElementById('statusCheckInButton');
    
    if (!window.currentOrder || !window.currentOrder.reference_number) {
        if (window.notificationManager) {
            window.notificationManager.error('Order information not found');
        } else {
            alert('Error: Order information not found');
        }
        return;
    }
    
    // Disable button and show loading state
    if (checkInButton) {
        checkInButton.disabled = true;
        checkInButton.innerHTML = '<i class="fas fa-spinner fa-spin text-xl"></i> <span>Checking In...</span>';
        checkInButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/activate_scheduled_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_number: window.currentOrder.reference_number
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success notification
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification(
                    `Successfully checked in! Your queue number is ${result.data.queue_number}`,
                    'success'
                );
            } else {
                alert(`✓ Successfully checked in!\n\nYour queue number: ${result.data.queue_number}\nEstimated wait time: ${result.data.wait_time} minutes`);
            }
            
            // Reload order status to show updated information
            setTimeout(() => {
                loadOrderStatus();
            }, 1500);
            
        } else {
            // Handle errors
            const errorMessage = result.message || 'Failed to check in. Please try again.';
            
            if (window.notificationManager) {
                window.notificationManager.error(errorMessage);
            } else {
                alert('✗ ' + errorMessage);
            }
            
            // Re-enable button
            if (checkInButton) {
                checkInButton.disabled = false;
                checkInButton.innerHTML = '<i class="fas fa-check-circle text-xl"></i> <span>I\'M HERE</span>';
                checkInButton.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        
        const errorMessage = 'Network error. Please check your connection and try again.';
        
        if (window.notificationManager) {
            window.notificationManager.error(errorMessage);
        } else {
            alert('✗ ' + errorMessage);
        }
        
        // Re-enable button
        if (checkInButton) {
            checkInButton.disabled = false;
            checkInButton.innerHTML = '<i class="fas fa-check-circle text-xl"></i> <span>I\'M HERE</span>';
            checkInButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

// Load status on page load
loadOrderStatus();

function goHome() {
    sessionStorage.clear();
    window.location.href = '../index.html';
}
