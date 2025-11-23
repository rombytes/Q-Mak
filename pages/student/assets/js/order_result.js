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
    coopStatus: JSON.parse(sessionStorage.getItem('coopStatus') || '{}'),
    userEmail: sessionStorage.getItem('userEmail')
};

if (!orderData.queueNum || !orderData.waitTime) {
    showAlert('Session expired. Please start again.', 'warning').then(() => {
        window.location.href = '../index.html';
    });
} else {
    // Display enhanced order details
    displayOrderDetails();
    
    // Generate QR Code
    generateQRCode();
    
    // Start real-time wait time updates
    startWaitTimePolling();
    
    // Show success notification
    if (window.notificationManager) {
        window.notificationManager.orderSuccess(orderData.queueNum);
    }
}

function displayOrderDetails() {
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

function downloadQR() {
    const canvas = document.getElementById('qrcode');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `UMAK-COOP-${orderData.queueNum}-${orderData.referenceNum}.png`;
    link.href = url;
    link.click();
    
    if (window.notificationManager) {
        window.notificationManager.showInAppNotification('QR Code downloaded!', 'success');
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
    if (orderData.orderType === 'pre-order') {
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
