/**
 * Q-MAK Real-Time Updates for Student Dashboard
 * Implements automatic polling for order status updates with visual feedback
 * Phase 1: Critical UX Improvements
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        POLLING_INTERVAL: 30000, // 30 seconds
        VISUAL_UPDATE_INDICATOR_DURATION: 2000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 5000
    };

    // State management
    let retryCount = 0;
    let lastUpdateTime = null;
    let isPolling = false;

    /**
     * Initialize real-time updates
     */
    function init() {
        console.log('[RealTime] Initializing real-time updates...');
        
        // Add connection status indicator
        addConnectionStatusIndicator();
        
        // Start polling for active orders
        startOrderStatusPolling();
        
        // Add visibility change listener to pause/resume polling
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Add online/offline listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }

    /**
     * Add connection status indicator to UI
     */
    function addConnectionStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'fixed bottom-20 md:bottom-6 left-6 z-40 hidden';
        indicator.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-3">
                <div class="status-dot status-dot--online status-dot--pulse" id="status-dot"></div>
                <span class="text-sm font-medium text-gray-700" id="status-text">Connected</span>
            </div>
        `;
        document.body.appendChild(indicator);
    }

    /**
     * Show connection status
     */
    function showConnectionStatus(isOnline, message = null) {
        const statusEl = document.getElementById('connection-status');
        const dotEl = document.getElementById('status-dot');
        const textEl = document.getElementById('status-text');
        
        if (!statusEl) return;

        // Update status
        if (isOnline) {
            dotEl.className = 'status-dot status-dot--online status-dot--pulse';
            textEl.textContent = message || 'Connected';
            textEl.style.color = 'var(--success-600)';
        } else {
            dotEl.className = 'status-dot status-dot--offline';
            textEl.textContent = message || 'Disconnected';
            textEl.style.color = 'var(--danger-600)';
        }

        // Show indicator
        statusEl.classList.remove('hidden');
        
        // Auto-hide after 3 seconds if online
        if (isOnline) {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Start polling for order status updates
     */
    function startOrderStatusPolling() {
        if (isPolling) return;
        
        isPolling = true;
        console.log('[RealTime] Starting order status polling...');
        
        // Use RealTimeUpdater from ui-utilities.js
        if (typeof RealTimeUpdater !== 'undefined') {
            RealTimeUpdater.start('orderStatus', checkOrderUpdates, CONFIG.POLLING_INTERVAL);
        } else {
            console.error('[RealTime] RealTimeUpdater not available');
        }
    }

    /**
     * Stop polling
     */
    function stopOrderStatusPolling() {
        isPolling = false;
        console.log('[RealTime] Stopping order status polling...');
        
        if (typeof RealTimeUpdater !== 'undefined') {
            RealTimeUpdater.stop('orderStatus');
        }
    }

    /**
     * Check for order updates
     */
    async function checkOrderUpdates() {
        try {
            // Show subtle update indicator
            showUpdateIndicator();

            // Fetch latest orders (assuming there's a function to get orders)
            // This should be replaced with actual API call
            if (typeof window.loadOrders === 'function') {
                await window.loadOrders(true); // Silent refresh
                retryCount = 0; // Reset retry count on success
                lastUpdateTime = new Date();
                showConnectionStatus(true, 'Updated just now');
            }

        } catch (error) {
            console.error('[RealTime] Error checking updates:', error);
            handlePollingError();
        }
    }

    /**
     * Show subtle update indicator
     */
    function showUpdateIndicator() {
        // Add a subtle pulse animation to the page
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-20 right-6 z-50 animate-fadeIn';
        indicator.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 border border-gray-200">
                <div class="loader-spinner loader-spinner--sm"></div>
                <span class="text-xs font-medium text-gray-600">Checking for updates...</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Remove after short duration
        setTimeout(() => {
            indicator.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => indicator.remove(), 300);
        }, CONFIG.VISUAL_UPDATE_INDICATOR_DURATION);
    }

    /**
     * Handle polling errors with retry logic
     */
    function handlePollingError() {
        retryCount++;
        
        if (retryCount >= CONFIG.MAX_RETRIES) {
            showConnectionStatus(false, 'Connection lost');
            stopOrderStatusPolling();
            
            // Show toast notification
            if (typeof Toast !== 'undefined') {
                Toast.warning('Real-time updates paused. Click refresh to reconnect.', 5000);
            }
            
            // Add retry button
            addRetryButton();
        } else {
            console.log(`[RealTime] Retry ${retryCount}/${CONFIG.MAX_RETRIES}`);
            setTimeout(checkOrderUpdates, CONFIG.RETRY_DELAY);
        }
    }

    /**
     * Add retry button to UI
     */
    function addRetryButton() {
        const existingButton = document.getElementById('retry-connection-btn');
        if (existingButton) return;

        const button = document.createElement('button');
        button.id = 'retry-connection-btn';
        button.className = 'fixed bottom-20 md:bottom-6 left-6 z-50 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover-lift';
        button.innerHTML = `
            <i class="bi bi-arrow-clockwise"></i>
            <span class="font-medium">Reconnect</span>
        `;
        
        button.addEventListener('click', () => {
            retryCount = 0;
            button.remove();
            startOrderStatusPolling();
            showConnectionStatus(true, 'Reconnecting...');
        });
        
        document.body.appendChild(button);
    }

    /**
     * Handle visibility change (pause when tab is hidden)
     */
    function handleVisibilityChange() {
        if (document.hidden) {
            console.log('[RealTime] Tab hidden, pausing polling...');
            stopOrderStatusPolling();
        } else {
            console.log('[RealTime] Tab visible, resuming polling...');
            startOrderStatusPolling();
            checkOrderUpdates(); // Immediate update when returning
        }
    }

    /**
     * Handle online event
     */
    function handleOnline() {
        console.log('[RealTime] Connection restored');
        showConnectionStatus(true, 'Back online');
        retryCount = 0;
        
        // Remove retry button if exists
        const retryBtn = document.getElementById('retry-connection-btn');
        if (retryBtn) retryBtn.remove();
        
        // Resume polling
        startOrderStatusPolling();
        checkOrderUpdates();
    }

    /**
     * Handle offline event
     */
    function handleOffline() {
        console.log('[RealTime] Connection lost');
        showConnectionStatus(false, 'You are offline');
        stopOrderStatusPolling();
        
        if (typeof Toast !== 'undefined') {
            Toast.warning('No internet connection. Updates will resume when connection is restored.');
        }
    }

    /**
     * Enhance order status badges with real-time indicators
     */
    function enhanceOrderStatusBadges() {
        const statusBadges = document.querySelectorAll('[data-order-status]');
        
        statusBadges.forEach(badge => {
            const status = badge.dataset.orderStatus;
            
            // Add pulse animation for active statuses
            if (status === 'pending' || status === 'preparing' || status === 'ready') {
                badge.classList.add('badge--pulse');
            }
        });
    }

    /**
     * Add "time ago" indicators to orders
     */
    function updateTimeAgoIndicators() {
        const timeElements = document.querySelectorAll('[data-timestamp]');
        
        timeElements.forEach(el => {
            const timestamp = parseInt(el.dataset.timestamp);
            if (!timestamp) return;
            
            const timeAgo = getTimeAgo(timestamp);
            el.textContent = timeAgo;
        });
    }

    /**
     * Get human-readable time ago
     */
    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    /**
     * Show order status change notification
     */
    function notifyOrderStatusChange(orderId, oldStatus, newStatus) {
        if (!Toast) return;

        const statusMessages = {
            pending: '⏳ Your order is pending approval',
            approved: '✅ Your order has been approved',
            preparing: '👨‍🍳 Your order is being prepared',
            ready: '🎉 Your order is ready for pickup!',
            completed: '✔️ Order completed',
            cancelled: '❌ Order cancelled'
        };

        const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
        
        // Show toast based on status
        if (newStatus === 'ready') {
            Toast.success(message, 10000); // Longer duration for ready status
            
            // Add sound notification if available
            playNotificationSound();
            
            // Show browser notification if permitted
            showBrowserNotification('Order Ready!', message);
        } else if (newStatus === 'cancelled') {
            Toast.error(message);
        } else {
            Toast.info(message);
        }
    }

    /**
     * Play notification sound
     */
    function playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,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');
            audio.play().catch(e => console.log('Could not play sound:', e));
        } catch (e) {
            console.log('Sound notification not available');
        }
    }

    /**
     * Show browser notification
     */
    function showBrowserNotification(title, message) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/Q-Mak/images/UMAK COOP.png',
                badge: '/Q-Mak/images/UMAK COOP.png',
                tag: 'q-mak-order-update',
                renotify: true
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showBrowserNotification(title, message);
                }
            });
        }
    }

    /**
     * Public API
     */
    window.RealtimeUpdates = {
        init,
        startPolling: startOrderStatusPolling,
        stopPolling: stopOrderStatusPolling,
        checkNow: checkOrderUpdates,
        notifyStatusChange: notifyOrderStatusChange
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
