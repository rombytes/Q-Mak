// Push Notification Utility for Q-Mak System

class NotificationManager {
    constructor() {
        this.checkPermission();
    }

    // Check and request notification permission
    async checkPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support notifications");
            return false;
        }

        if (Notification.permission === "granted") {
            return true;
        }

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }

        return false;
    }

    // Request permission explicitly
    async requestPermission() {
        if (!("Notification" in window)) {
            this.showInAppNotification("Your browser doesn't support notifications", "warning");
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                this.showInAppNotification("Notifications enabled!", "success");
                return true;
            } else {
                this.showInAppNotification("Notification permission denied", "warning");
                return false;
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    }

    // Show browser push notification
    async showPushNotification(title, options = {}) {
        const hasPermission = await this.checkPermission();
        
        if (!hasPermission) {
            // Fallback to in-app notification
            this.showInAppNotification(title, options.type || "info");
            return;
        }

        const defaultOptions = {
            icon: 'images/UMAK COOP.png',
            badge: 'images/UMAK COOP.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            notification.onclick = function(event) {
                event.preventDefault();
                window.focus();
                notification.close();
                if (options.onClick) {
                    options.onClick();
                }
            };

            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);
            
            // Also show in-app notification
            this.showInAppNotification(title, options.type || "info");
        } catch (error) {
            console.error("Error showing notification:", error);
            this.showInAppNotification(title, options.type || "info");
        }
    }

    // Show in-app notification (toast)
    showInAppNotification(message, type = "info") {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification-toast');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-orange-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>`,
            error: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>`,
            warning: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>`,
            info: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                   </svg>`
        };

        notification.innerHTML = `
            <div class="flex items-center gap-3 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-in">
                ${icons[type]}
                <span class="font-semibold">${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // OTP Sent Notification
    otpSent(email) {
        this.showPushNotification('OTP Code Sent', {
            body: `A verification code has been sent to ${email}`,
            type: 'success',
            tag: 'otp-sent'
        });
    }

    // Order Success Notification
    orderSuccess(queueNumber) {
        this.showPushNotification('Order Confirmed!', {
            body: `Your queue number is ${queueNumber}`,
            type: 'success',
            tag: 'order-success'
        });
    }

    // Order Status Update
    statusUpdate(status) {
        this.showPushNotification('Order Status Updated', {
            body: `Your order is now ${status}`,
            type: 'info',
            tag: 'status-update'
        });
    }

    // Error Notification
    error(message) {
        this.showPushNotification('Error', {
            body: message,
            type: 'error',
            tag: 'error'
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .animate-slide-in {
        animation: slideIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);

// Create global instance
window.notificationManager = new NotificationManager();
