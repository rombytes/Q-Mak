/**
 * Order Result Page Script
 * Q-Mak Queue Management System
 * Displays order confirmation with QR code and real-time wait time updates
 */

// Dynamic API base path - works on both localhost and production
const getApiBase = () => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
};

// Declare pollInterval at the top level
let pollInterval;

// Get all order data from sessionStorage
const orderData = {
    queueNum: sessionStorage.getItem('queueNum'),
    referenceNum: sessionStorage.getItem('referenceNum'),
    waitTime: sessionStorage.getItem('waitTime'),
    waitTimeDetails: JSON.parse(sessionStorage.getItem('waitTimeDetails') || '{}'),
    queuePosition: sessionStorage.getItem('queuePosition'),
    queueDate: sessionStorage.getItem('queueDate'),
    orderType: sessionStorage.getItem('orderType'),
    orderStatus: sessionStorage.getItem('orderStatus') || 'pending',
    coopStatus: JSON.parse(sessionStorage.getItem('coopStatus') || '{}'),
    userEmail: sessionStorage.getItem('userEmail')
};

// Allow proceeding if status is 'scheduled' even if queueNum is null
if (orderData.orderStatus !== 'scheduled' && (!orderData.queueNum || !orderData.waitTime)) {
    showAlert('Session expired. Please start again.', 'warning').then(() => {
        window.location.href = '../index.html';
    });
} else {
    // Display enhanced order details
    displayOrderDetails();
    
    // Generate QR Code
    generateQRCode();
    
    // Start real-time wait time updates (skip for scheduled orders)
    if (orderData.orderStatus !== 'scheduled') {
        startWaitTimePolling();
    }
    
    // Show success notification
    if (window.notificationManager) {
        if (orderData.orderStatus === 'scheduled') {
            window.notificationManager.showInAppNotification('Order scheduled successfully!', 'success');
        } else {
            window.notificationManager.orderSuccess(orderData.queueNum);
        }
    }
}

function displayOrderDetails() {
    // Phase 4: Inject cancel button for cancellable orders
    const cancelContainer = document.getElementById('cancel-container');
    if (cancelContainer && (orderData.orderStatus === 'pending' || orderData.orderStatus === 'scheduled')) {
        cancelContainer.innerHTML = `
            <div class="bg-gradient-to-r from-gray-50 to-red-50 rounded-xl p-5 border border-red-200 shadow-sm">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <i class="fas fa-times-circle text-red-600 text-2xl"></i>
                        </div>
                        <div class="text-left">
                            <h4 class="font-bold text-gray-900 mb-1">Need to Cancel?</h4>
                            <p class="text-sm text-gray-600">Your reserved item will be released back to inventory</p>
                        </div>
                    </div>
                    <button 
                        onclick="cancelOrder()" 
                        id="cancelOrderButton"
                        class="bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center gap-2 min-w-[180px] justify-center">
                        <i class="fas fa-ban text-lg"></i>
                        <span>Cancel Order</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Check if this is a scheduled order
    if (orderData.orderStatus === 'scheduled') {
        // Inject "I'm Here" Check-In Button
        const actionContainer = document.getElementById('scheduled-action-container');
        if (actionContainer) {
            actionContainer.innerHTML = `
                <div class="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-2xl text-white">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-hand-pointer text-white text-3xl"></i>
                            </div>
                            <div class="text-left">
                                <h3 class="text-2xl font-bold mb-1">Ready to Check In?</h3>
                                <p class="text-purple-100 text-sm">Click the button to join the queue and receive your number</p>
                            </div>
                        </div>
                        <button 
                            onclick="activateOrder()" 
                            id="checkInButton"
                            class="bg-white text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-2xl hover:scale-105 flex items-center gap-3 min-w-[200px] justify-center group">
                            <i class="fas fa-check-circle text-2xl group-hover:scale-110 transition-transform"></i>
                            <span>I'M HERE</span>
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Queue Number Box - Show "SCHEDULED" instead of queue number
        const queueNumDiv = document.getElementById('queueNum');
        queueNumDiv.innerHTML = '<i class="fas fa-calendar-check text-purple-600"></i> SCHEDULED';
        queueNumDiv.className = 'text-2xl font-extrabold text-purple-600 flex items-center gap-2';
        
        // Wait Time Box - Show "Check In Required" instead of wait time
        const waitDiv = document.getElementById('waitTime');
        waitDiv.innerHTML = `
            <span class="text-lg font-bold text-purple-600">Check In Required</span>
            <span class="text-sm block text-gray-600 mt-1">
                <i class="fas fa-info-circle"></i> No queue number yet
            </span>
        `;
        
        // Change color theme for scheduled orders
        const queueCard = document.getElementById('queueNum').closest('.bg-white');
        if (queueCard) {
            queueCard.classList.remove('border-blue-100');
            queueCard.classList.add('border-purple-100');
            queueCard.querySelector('.bg-blue-100')?.classList.replace('bg-blue-100', 'bg-purple-100');
            queueCard.querySelector('.text-blue-600')?.classList.replace('text-blue-600', 'text-purple-600');
        }
        
        const waitCard = document.getElementById('waitTime').closest('.bg-white');
        if (waitCard) {
            waitCard.classList.remove('border-orange-100');
            waitCard.classList.add('border-purple-100');
            waitCard.querySelector('.bg-orange-100')?.classList.replace('bg-orange-100', 'bg-purple-100');
            waitCard.querySelector('.text-orange-600')?.classList.replace('text-orange-600', 'text-purple-600');
        }
        
        // Show scheduled instructions div and hide regular instructions
        const scheduledInstructions = document.getElementById('scheduledInstructions');
        const regularInstructions = document.getElementById('regularInstructions');
        if (scheduledInstructions) {
            scheduledInstructions.classList.remove('hidden');
        }
        if (regularInstructions) {
            regularInstructions.classList.add('hidden');
        }
        
        return;
    }
    
    // Normal order display (existing logic)
    // Queue number (sequential format)
    document.getElementById('queueNum').textContent = orderData.queueNum;
    
    // Wait time with dynamic info
    const waitDiv = document.getElementById('waitTime');
    if (orderData.waitTimeDetails.queue_position) {
        const position = orderData.waitTimeDetails.queue_position;
        const ahead = orderData.waitTimeDetails.pending_orders;
        
        // Smart position display
        let positionText = '';
        if (position === 1 && ahead === 0) {
            positionText = "You're next in line!";
        } else if (ahead === 1) {
            positionText = `Position #${position} • ${ahead} order ahead`;
        } else {
            positionText = `Position #${position} • ${ahead} orders ahead`;
        }
        
        waitDiv.innerHTML = `
            <span class="text-3xl font-bold">${orderData.waitTime} mins</span>
            <span class="text-sm block text-gray-600 mt-1">
                ${positionText}
            </span>
        `;
    } else {
        waitDiv.textContent = orderData.waitTime + ' mins';
    }
}

// Check if QRCode library is loaded
function checkQRLibrary() {
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded, will try fallback...');
        return false;
    }
    console.log('QRCode library available');
    return true;
}

// Generate QR Code using API response data or fallback to local generation, then Google Charts
function generateQRCode() {
    const canvas = document.getElementById('qrcode');

    // Try to use QR code from API response first
    const qrCodeData = sessionStorage.getItem('qrCode');
    
    if (qrCodeData && qrCodeData.startsWith('data:image/')) {
        // If we have QR code data from API, display it as image
        const img = new Image();
        img.onload = function() {
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 200;
            ctx.clearRect(0, 0, 200, 200);
            ctx.drawImage(img, 0, 0, 200, 200);
            console.log('QR code loaded from API');
        };
        img.onerror = function() {
            console.warn('QR code from API failed, generating locally');
            if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                generateClientQRCode();
            } else {
                console.warn('QR library missing, attempting Google Charts');
                useGoogleChartsQR();
            }
        };
        img.src = qrCodeData;
        return;
    }

    // Prefer client-side generation if library is available
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        console.log('No QR code from API, generating locally');
        generateClientQRCode();
        return;
    }

    // Last resort: Use Google Charts API (may be blocked by CORS)
    console.warn('No QR code from API and no QR library, attempting Google Charts');
    useGoogleChartsQR();
}

function useGoogleChartsQR() {
    const canvas = document.getElementById('qrcode');
    const ctx = canvas.getContext('2d');
    
    // Create QR data with new queue system fields
    const qrData = JSON.stringify({
        queue_number: orderData.queueNum,
        reference_number: orderData.referenceNum,
        email: orderData.userEmail,
        queue_date: orderData.queueDate,
        order_type: orderData.orderType,
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });
    
    // Use Google Charts API
    const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        canvas.width = 200;
        canvas.height = 200;
        ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200);
        console.log('QR code generated using Google Charts');
    };
    img.onerror = function() {
        console.error('Google Charts QR failed, showing placeholder');
        showFallbackQR();
    };
    img.src = qrUrl;
}

function showFallbackQR() {
    const canvas = document.getElementById('qrcode');
    const ctx = canvas.getContext('2d');

    // Create a simple QR-like pattern
    canvas.width = 200;
    canvas.height = 200;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);

    // Border
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 180, 180);

    // Corner markers (typical QR pattern)
    ctx.fillStyle = '#1e3a8a';
    const markerSize = 25;
    const positions = [
        [15, 15], [15, 165], [165, 15]
    ];

    positions.forEach(pos => {
        ctx.fillRect(pos[0], pos[1], markerSize, markerSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pos[0] + 5, pos[1] + 5, markerSize - 10, markerSize - 10);
        ctx.fillStyle = '#1e3a8a';
    });

    // Data pattern (simple grid)
    ctx.fillStyle = '#1e3a8a';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(35 + i * 12, 35 + j * 12, 8, 8);
            }
        }
    }

    console.log('Fallback QR pattern displayed');
}

function generateClientQRCode() {
    const canvas = document.getElementById('qrcode');
    const qrData = JSON.stringify({
        queue_number: orderData.queueNum,
        reference_number: orderData.referenceNum,
        email: orderData.userEmail,
        queue_date: orderData.queueDate,
        order_type: orderData.orderType,
        timestamp: new Date().toISOString(),
        type: 'umak_coop_order'
    });

    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded');
        showQRError('QR Code library not available - please refresh page');
        return;
    }

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
            showQRError('Failed to generate QR code: ' + error.message);
        } else {
            console.log('QR code generated successfully via client-side');
        }
    });
}

function showQRError(message) {
    const canvas = document.getElementById('qrcode');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Error', 100, 90);
    ctx.font = '10px Arial';
    ctx.fillText(message, 100, 110);

    if (window.notificationManager) {
        window.notificationManager.error('Failed to generate QR code');
    }
}

function openQRZoom() {
    const canvas = document.getElementById('qrcode');
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
        if (orderData && orderData.queueNum) {
            queueNumDisplay.textContent = orderData.queueNum;
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
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function downloadQR() {
    const canvas = document.getElementById('qrcode');
    if (!canvas) return;
    
    try {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `UMAK-COOP-${orderData.queueNum}-${orderData.referenceNum}.png`;
        link.href = url;
        link.style.display = 'none';
        
        // Mobile-friendly approach
        document.body.appendChild(link);
        setTimeout(() => {
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
        }, 0);
        
        if (window.notificationManager) {
            window.notificationManager.showInAppNotification('QR Code downloaded!', 'success');
        }
    } catch (error) {
        console.error('Download error:', error);
    }
}

// Add reference number display
if (orderData.referenceNum) {
    document.getElementById('refNum').textContent = orderData.referenceNum;
} else {
    // If no reference number from database, show placeholder
    document.getElementById('refNum').textContent = 'N/A';
    console.warn('Reference number not found in session storage');
}

// Display order type information
function updateOrderInfo() {
    const orderInfo = document.getElementById('orderInfo');
    
    if (orderData.orderStatus === 'scheduled') {
        // Scheduled order display
        orderInfo.innerHTML = `<strong>Scheduled Order</strong> for ${new Date(orderData.queueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
        document.getElementById('orderTypeInfo').className = 'bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 shadow-md text-white';
    } else if (orderData.orderType === 'pre-order') {
        orderInfo.innerHTML = `<strong>Pre-Order</strong> scheduled for ${new Date(orderData.queueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
        document.getElementById('orderTypeInfo').className = 'bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 shadow-md text-white';
    } else {
        const expiryTime = new Date(Date.now() + 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        orderInfo.innerHTML = `<strong>Immediate Order</strong> • Valid until ${expiryTime}`;
    }
}
updateOrderInfo();

// Real-time wait time polling
function startWaitTimePolling() {
    // Initial update
    updateWaitTime();
    
    // Poll every 30 seconds
    pollInterval = setInterval(updateWaitTime, 30000);
}

async function updateWaitTime() {
    try {
        const response = await fetch(`${getApiBase()}/student/get_wait_time.php?queue=${orderData.queueNum}&ref=${orderData.referenceNum}`);
        const data = await response.json();
        
        if (data.success) {
            const waitDiv = document.getElementById('waitTime');
            
            if (data.status === 'completed') {
                waitDiv.innerHTML = `
                    <span class="text-3xl font-bold text-green-600">Completed!</span>
                    <span class="text-sm block text-green-600 mt-1">
                        <i class="fas fa-check-circle"></i> Order successfully claimed
                    </span>
                `;
                clearInterval(pollInterval);
                
                // Show notification
                if (window.notificationManager) {
                    window.notificationManager.showInAppNotification('Order completed successfully!', 'success');
                }
            } else if (data.status === 'processing') {
                waitDiv.innerHTML = `
                    <span class="text-3xl font-bold text-orange-600 animate-pulse">Your Turn!</span>
                    <span class="text-sm block text-orange-600 mt-1 font-semibold">
                        <i class="fas fa-bell animate-pulse"></i> Please go to the COOP counter now
                    </span>
                `;
            } else {
                // Smart position display for pending orders
                const position = data.queue_position;
                const ahead = data.orders_ahead;
                
                let positionText = '';
                if (position === 1 && ahead === 0) {
                    positionText = "You're next in line!";
                } else if (ahead === 1) {
                    positionText = `Position #${position} • ${ahead} order ahead`;
                } else {
                    positionText = `Position #${position} • ${ahead} orders ahead`;
                }
                
                waitDiv.innerHTML = `
                    <span class="text-3xl font-bold text-orange-500">${data.estimated_minutes} mins</span>
                    <span class="text-sm block text-gray-600 mt-1">
                        ${positionText}
                    </span>
                `;
            }
            
            // Update elapsed time indicator
            if (data.minutes_elapsed > 0) {
                const elapsedSpan = document.createElement('span');
                elapsedSpan.className = 'text-xs text-gray-500 mt-1 block';
                elapsedSpan.textContent = `${data.minutes_elapsed} minutes elapsed`;
                waitDiv.appendChild(elapsedSpan);
            }
        }
    } catch (error) {
        console.error('Failed to update wait time:', error);
    }
}

/**
 * Cancel an order and restock inventory - Phase 4
 */
async function cancelOrder() {
    // Confirmation dialog
    const confirmed = confirm(
        '⚠️ Are you sure you want to cancel this order?\n\n' +
        'This action will:\n' +
        '• Cancel your order immediately\n' +
        '• Release your reserved item back to inventory\n' +
        '• Remove you from the queue (if applicable)\n\n' +
        'This cannot be undone.'
    );
    
    if (!confirmed) {
        return; // User cancelled the cancellation
    }
    
    const cancelButton = document.getElementById('cancelOrderButton');
    
    // Disable button and show loading state
    if (cancelButton) {
        cancelButton.disabled = true;
        cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin text-lg"></i> <span>Cancelling...</span>';
        cancelButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${getApiBase()}/student/cancel_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_number: orderData.referenceNum
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification(
                    'Order cancelled successfully. Your reserved item has been released.',
                    'success'
                );
            } else {
                alert('✓ Order cancelled successfully!\n\nYour reserved item has been released back to inventory.');
            }
            
            // Clear session data
            sessionStorage.clear();
            
            // Redirect to homepage after short delay
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            
        } else {
            // Handle errors
            const errorMessage = result.message || 'Failed to cancel order. Please try again.';
            
            if (window.notificationManager) {
                window.notificationManager.error(errorMessage);
            } else {
                alert('✗ ' + errorMessage);
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
        
        const errorMessage = 'Network error. Please check your connection and try again.';
        
        if (window.notificationManager) {
            window.notificationManager.error(errorMessage);
        } else {
            alert('✗ ' + errorMessage);
        }
        
        // Re-enable button
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.innerHTML = '<i class="fas fa-ban text-lg"></i> <span>Cancel Order</span>';
            cancelButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

/**
 * Activate a scheduled order - Convert to active queue order
 * Phase 3: Check-In System
 */
async function activateOrder() {
    const checkInButton = document.getElementById('checkInButton');
    
    // Disable button and show loading state
    if (checkInButton) {
        checkInButton.disabled = true;
        checkInButton.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i> <span>Checking In...</span>';
        checkInButton.classList.add('opacity-75', 'cursor-not-allowed');
    }
    
    try {
        const response = await fetch(`${getApiBase()}/student/activate_scheduled_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_number: orderData.referenceNum
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update sessionStorage with new active order data
            sessionStorage.setItem('queueNum', result.data.queue_number);
            sessionStorage.setItem('orderStatus', result.data.status);
            sessionStorage.setItem('waitTime', result.data.wait_time);
            sessionStorage.setItem('queueDate', result.data.queue_date);
            
            if (result.data.wait_time_details) {
                sessionStorage.setItem('waitTimeDetails', JSON.stringify(result.data.wait_time_details));
                sessionStorage.setItem('queuePosition', result.data.queue_position || '1');
            }
            
            // Show success notification
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification(
                    `Successfully checked in! Your queue number is ${result.data.queue_number}`,
                    'success'
                );
            } else {
                alert(`✓ Successfully checked in!\n\nYour queue number: ${result.data.queue_number}\nEstimated wait time: ${result.data.wait_time} minutes`);
            }
            
            // Reload the page to show active order UI
            setTimeout(() => {
                window.location.reload();
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
                checkInButton.innerHTML = '<i class="fas fa-check-circle text-2xl"></i> <span>I\'M HERE</span>';
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
            checkInButton.innerHTML = '<i class="fas fa-check-circle text-2xl"></i> <span>I\'M HERE</span>';
            checkInButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

function goHome() {
    if (pollInterval) clearInterval(pollInterval);
    sessionStorage.clear();
    window.location.href = '../index.html';
}

// Request notification permission on load
window.addEventListener('load', () => {
    if (window.notificationManager && Notification.permission === 'default') {
        setTimeout(() => {
            window.notificationManager.requestPermission();
        }, 2000);
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
});
