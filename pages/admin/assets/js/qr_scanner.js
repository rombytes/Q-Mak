/**
 * QR Code Scanner Module
 * Q-Mak Queue Management System
 * Handles QR code scanning for order verification
 */

let html5QrCode = null;
let scannedOrderData = null;

// Open QR Scanner
function openQRScanner() {
    const modal = document.getElementById('qrScannerModal');
    modal.classList.add('active');
    
    // Initialize scanner
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }

    // Start scanning
    html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error("Error starting QR scanner:", err);
        showAlert('Camera Error', 'Unable to access camera. Please check permissions.', 'error');
    });
}

// Close QR Scanner
function closeQRScanner() {
    const modal = document.getElementById('qrScannerModal');
    modal.classList.remove('active');
    
    // Stop scanner
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            console.log("QR Scanner stopped");
        }).catch(err => {
            console.error("Error stopping scanner:", err);
        });
    }

    // Reset result display
    document.getElementById('qr-scan-result').classList.add('hidden');
    scannedOrderData = null;
}

// Handle successful scan
function onScanSuccess(decodedText, decodedResult) {
    console.log("QR Code detected:", decodedText);
    
    // Stop scanning temporarily
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.pause(true);
    }

    try {
        // Parse QR code data
        const qrData = JSON.parse(decodedText);
        scannedOrderData = qrData;

        // Display order details
        displayScannedOrder(qrData);

    } catch (error) {
        console.error("Error parsing QR code:", error);
        showAlert('Invalid QR Code', 'This QR code is not a valid order code.', 'error');
        
        // Resume scanning
        setTimeout(() => {
            if (html5QrCode) {
                html5QrCode.resume();
            }
        }, 2000);
    }
}

// Handle scan errors (silent - too many logs)
function onScanError(errorMessage) {
    // Silent - normal when QR not in frame
}

// Display scanned order details
function displayScannedOrder(qrData) {
    const detailsDiv = document.getElementById('qr-order-details');
    const resultDiv = document.getElementById('qr-scan-result');

    detailsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
            <div>
                <span class="font-semibold">Queue Number:</span>
                <p class="text-lg font-bold text-green-600">${qrData.queue_number || 'N/A'}</p>
            </div>
            <div>
                <span class="font-semibold">Email:</span>
                <p class="text-sm">${qrData.email || 'N/A'}</p>
            </div>
            <div class="col-span-2">
                <span class="font-semibold">Scanned At:</span>
                <p class="text-sm">${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

// Process scanned order
async function processScannedOrder() {
    if (!scannedOrderData) {
        showAlert('Error', 'No order data available', 'error');
        return;
    }

    const queueNumber = scannedOrderData.queue_number;
    
    // Find order in ordersData (the actual data source)
    const foundOrder = ordersData.find(order => order.queue_number === queueNumber);

    if (!foundOrder) {
        showAlert('Order Not Found', `Queue ${queueNumber} was not found. It may have been completed, cancelled, or doesn't exist.`, 'warning');
        closeQRScanner();
        return;
    }

    // Check order status
    if (foundOrder.order_status === 'completed') {
        showAlert('Order Already Completed', `Queue ${queueNumber} has already been completed and claimed.`, 'info');
        closeQRScanner();
        return;
    }

    if (foundOrder.order_status === 'cancelled') {
        showAlert('Order Cancelled', `Queue ${queueNumber} has been cancelled and is no longer active.`, 'warning');
        closeQRScanner();
        return;
    }

    // Check if this is the current queue (first pending/processing order)
    const currentOrder = currentQueueOrder;
    
    if (currentOrder && currentOrder.queue_number === queueNumber) {
        // This is the current queue! Process it automatically
        closeQRScanner();
        showTab('queue-management');
        
        // Scroll to current queue display
        document.getElementById('currentQueueDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the current order card
        const orderCard = document.getElementById('currentOrderCard');
        orderCard.style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.5)';
        orderCard.style.transform = 'scale(1.02)';
        orderCard.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            orderCard.style.boxShadow = '';
            orderCard.style.transform = '';
        }, 2000);
        
        // Automatically start processing if status is pending
        if (foundOrder.order_status === 'pending') {
            await showAlert(
                'QR Code Verified!',
                `Queue ${queueNumber} detected. Starting processing...`,
                'success'
            );
            
            // Wait a moment for visual feedback, then start processing
            setTimeout(async () => {
                await processQueue('processing');
            }, 800);
        } else if (foundOrder.order_status === 'processing') {
            // Already processing, show message
            await showAlert(
                'Order in Progress',
                `Queue ${queueNumber} is already being processed. Mark as ready when complete.`,
                'info'
            );
        }
        
        return;
    }

    // Order exists but is not the current queue
    if (foundOrder.order_status === 'pending' || foundOrder.order_status === 'processing') {
        // Get queue position
        const pendingOrders = ordersData.filter(o => 
            (o.order_status === 'pending' || o.order_status === 'processing') &&
            o.order_id <= foundOrder.order_id
        );
        const queuePosition = pendingOrders.length;
        const totalPending = ordersData.filter(o => 
            o.order_status === 'pending' || o.order_status === 'processing'
        ).length;

        closeQRScanner();
        
        // Show modal with order details instead of just switching tabs
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-6 animate-modal-in">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-qrcode text-blue-600 mr-2"></i>
                        Scanned Order Details
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-yellow-600 mt-1 mr-3"></i>
                        <div>
                            <p class="font-semibold text-yellow-800">Not Current Queue</p>
                            <p class="text-sm text-yellow-700 mt-1">
                                This order is in position <strong>${queuePosition}</strong> of <strong>${totalPending}</strong> in the queue.
                                Please process orders in sequence.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-600">Queue Number</p>
                            <p class="text-lg font-bold text-blue-600">${foundOrder.queue_number}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Status</p>
                            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                foundOrder.order_status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }">
                                ${foundOrder.order_status === 'processing' ? 'Processing' : 'Pending'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="border-t pt-3">
                        <p class="text-sm text-gray-600">Student Information</p>
                        <p class="font-semibold text-gray-800">${foundOrder.first_name} ${foundOrder.last_name}</p>
                        <p class="text-sm text-gray-600">${foundOrder.student_id} | ${foundOrder.email}</p>
                    </div>
                    
                    <div class="border-t pt-3">
                        <p class="text-sm text-gray-600">Items Ordered</p>
                        <p class="font-semibold text-gray-800">${foundOrder.item_ordered}</p>
                    </div>
                    
                    <div class="border-t pt-3">
                        <p class="text-sm text-gray-600">Order Placed</p>
                        <p class="text-sm text-gray-800">${new Date(foundOrder.created_at).toLocaleString()}</p>
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button onclick="this.closest('.fixed').remove(); showTab('queue-management'); setTimeout(() => { const rows = Array.from(document.querySelectorAll('#queueTableBody tr')); const row = rows.find(r => r.querySelector('td')?.textContent.trim() === '${foundOrder.queue_number}'); if(row) { row.scrollIntoView({behavior: 'smooth', block: 'center'}); row.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; setTimeout(() => row.style.backgroundColor = '', 3000); } }, 300);" 
                            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        <i class="fas fa-list mr-2"></i>
                        View in Queue Table
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        return;
    }

    // Shouldn't reach here, but just in case
    showAlert('Unknown Status', `Queue ${queueNumber} has status: ${foundOrder.order_status}`, 'warning');
    closeQRScanner();
}

// Scan again
function scanAgain() {
    document.getElementById('qr-scan-result').classList.add('hidden');
    scannedOrderData = null;
    
    if (html5QrCode) {
        html5QrCode.resume();
    }
}
