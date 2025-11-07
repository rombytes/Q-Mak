/**
 * Check Status Page Script
 * Q-Mak Queue Management System
 * Handles OTP request for order status checking
 */

const API_BASE = '../../php/api';

document.getElementById('statusForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('checkStatusEmail').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending OTP...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/check_status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('checkStatusEmail', email);
            sessionStorage.setItem('currentOtp', result.data.otp_code);
            sessionStorage.setItem('otpMode', 'status');
            sessionStorage.setItem('userEmail', email);
            
            // Show push notification
            if (window.notificationManager) {
                window.notificationManager.otpSent(email);
            }
            
            await showAlert('OTP has been sent to your email: ' + email, 'success');
            console.log('Development OTP:', result.data.otp_code);
            
            // Redirect to OTP page
            setTimeout(() => {
                window.location.href = 'otp_verification.html';
            }, 1000);
        } else {
            if (window.notificationManager) {
                window.notificationManager.error(result.message || 'Failed to send OTP');
            }
            await showAlert(result.message || 'Failed to send OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Check status error:', error);
        if (window.notificationManager) {
            window.notificationManager.error('Connection error. Please try again.');
        }
        await showAlert('An error occurred. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
});
