/**
 * OTP Verification Page Script
 * Q-Mak Queue Management System
 * Handles OTP verification for both order creation and status checking
 */

const API_BASE = '../../php/api';
let otpTries = 3;
const currentOtp = sessionStorage.getItem('currentOtp');
const otpMode = sessionStorage.getItem('otpMode');
const userEmail = sessionStorage.getItem('userEmail');

if (!currentOtp || !otpMode || !userEmail) {
    showAlert('Session expired. Please start again.', 'warning').then(() => {
        window.location.href = '../index.html';
    });
}

document.getElementById('otpForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('otpCode').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
    
    try {
        const requestData = {
            email: userEmail,
            otp_code: otpCode,
            otp_type: otpMode
        };
        
        // Include order data if it's an order verification
        if (otpMode === 'order') {
            const orderFormData = JSON.parse(sessionStorage.getItem('orderFormData'));
            requestData.order_data = orderFormData;
        }
        
        const response = await fetch(`${API_BASE}/student/verify_otp.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success notification
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification('Verification successful!', 'success');
            }
            
            if (otpMode === 'order') {
                if (result.data && result.data.order_id) {
                    // Store all enhanced queue system data
                    sessionStorage.setItem('orderId', result.data.order_id);
                    sessionStorage.setItem('queueNum', result.data.queue_number);
                    sessionStorage.setItem('referenceNum', result.data.reference_number || '');
                    sessionStorage.setItem('waitTime', result.data.wait_time);
                    sessionStorage.setItem('waitTimeDetails', JSON.stringify(result.data.wait_time_details || {}));
                    sessionStorage.setItem('queuePosition', result.data.queue_position || '1');
                    sessionStorage.setItem('queueDate', result.data.queue_date || new Date().toISOString().split('T')[0]);
                    sessionStorage.setItem('orderType', result.data.order_type || 'immediate');
                    sessionStorage.setItem('coopStatus', JSON.stringify(result.data.coop_status || {}));
                    sessionStorage.setItem('qrCode', result.data.qr_code || '');
                    sessionStorage.setItem('qrCodeData', result.data.qr_code_data || '');
                    
                    // Show appropriate message based on order type
                    let message = 'Order created successfully!';
                    if (result.data.order_type === 'pre-order') {
                        const date = new Date(result.data.queue_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                        message = `Pre-order scheduled for ${date}. Redirecting to your order details...`;
                    } else {
                        message = `Order created successfully! Queue #${result.data.queue_number}. Redirecting...`;
                    }
                    
                    // Show success notification
                    if (window.notificationManager) {
                        window.notificationManager.success(message);
                    }
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'order_result.html';
                    }, 1500);
                }
            } else if (otpMode === 'status') {
                setTimeout(() => {
                    window.location.href = 'status_display.html';
                }, 500);
            }
        } else {
            otpTries = result.remaining_attempts || (otpTries - 1);
            document.getElementById('triesLeft').textContent = otpTries;
            
            if (otpTries <= 0) {
                if (window.notificationManager) {
                    window.notificationManager.error('Verification failed. No attempts remaining.');
                }
                await showAlert('Verification failed. You have run out of tries.', 'error');
                sessionStorage.clear();
                window.location.href = '../index.html';
            } else {
                if (window.notificationManager) {
                    window.notificationManager.showInAppNotification('Incorrect code. ' + otpTries + ' attempts left', 'warning');
                }
                await showAlert(result.message || 'Incorrect code. Tries left: ' + otpTries, 'warning');
                document.getElementById('otpCode').value = '';
            }
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        if (window.notificationManager) {
            window.notificationManager.error('Verification error. Please try again.');
        }
        await showAlert('An error occurred. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify';
    }
});
