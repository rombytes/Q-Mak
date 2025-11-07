/**
 * Notification System
 * Q-Mak Queue Management System
 * Handles bell notifications and notification panel
 */

let notificationsData = [];
let currentFilter = 'all'; // 'all', 'unread', 'read'

async function loadNotifications() {
    try {
        const response = await fetch('/Q-Mak/php/api/admin/get_notifications.php');
        const data = await response.json();
        
        if (data.success) {
            notificationsData = data.notifications;
            const unreadCount = data.unread_count;
            
            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
            
            displayNotifications();
            updateTabCounts();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function filterNotifications(filter) {
    currentFilter = filter;
    
    // Update tab styles
    document.querySelectorAll('.notif-tab').forEach(tab => {
        tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-white');
        tab.classList.add('text-gray-600', 'hover:text-gray-900', 'hover:bg-gray-50');
    });
    
    const activeTab = document.getElementById(`tab-${filter}`);
    activeTab.classList.remove('text-gray-600', 'hover:text-gray-900', 'hover:bg-gray-50');
    activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-white');
    
    displayNotifications();
}

function updateTabCounts() {
    const unreadCount = notificationsData.filter(n => n.is_read == 0 || n.is_read === '0').length;
    const readCount = notificationsData.filter(n => n.is_read == 1 || n.is_read === '1').length;
    
    console.log('Unread count:', unreadCount, 'Read count:', readCount);
    
    document.getElementById('tab-unread').innerHTML = `Unread ${unreadCount > 0 ? `<span class="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">${unreadCount}</span>` : ''}`;
    document.getElementById('tab-read').innerHTML = `Read ${readCount > 0 ? `<span class="ml-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${readCount}</span>` : ''}`;
}

function displayNotifications() {
    const list = document.getElementById('notificationList');
    
    // Filter notifications based on current filter
    let filteredNotifications = notificationsData;
    if (currentFilter === 'unread') {
        filteredNotifications = notificationsData.filter(n => n.is_read == 0 || n.is_read === '0');
    } else if (currentFilter === 'read') {
        filteredNotifications = notificationsData.filter(n => n.is_read == 1 || n.is_read === '1');
    }
    
    console.log('Current filter:', currentFilter);
    console.log('Total notifications:', notificationsData.length);
    console.log('Filtered notifications:', filteredNotifications.length);
    
    if (filteredNotifications.length === 0) {
        let emptyMessage = 'No notifications';
        if (currentFilter === 'unread') emptyMessage = 'No unread notifications';
        if (currentFilter === 'read') emptyMessage = 'No read notifications';
        
        list.innerHTML = `
            <div class="p-8 text-center">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <p class="text-gray-500 text-sm">${emptyMessage}</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filteredNotifications.map(notif => {
        const isUnread = notif.is_read == 0 || notif.is_read === '0';
        const date = new Date(notif.created_at);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="group p-4 hover:bg-blue-50/30 transition-all duration-200 ${isUnread ? 'bg-blue-50/50' : ''} relative cursor-pointer">
                <div class="flex items-start gap-3">
                    ${isUnread ? '<div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>' : '<div class="w-2 h-2 bg-gray-300 rounded-full mt-2 flex-shrink-0"></div>'}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="font-semibold text-sm ${isUnread ? 'text-gray-900' : 'text-gray-600'}">${notif.title}</h4>
                            ${isUnread ? `
                                <button onclick="markAsRead(${notif.notification_id}, event)" 
                                        class="opacity-0 group-hover:opacity-100 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow"
                                        title="Mark as read">
                                    <i class="fas fa-check mr-1"></i>Mark read
                                </button>
                            ` : `
                                <span class="text-xs text-gray-400 flex items-center gap-1">
                                    <i class="fas fa-check-double"></i> Read
                                </span>
                            `}
                        </div>
                        <p class="text-sm text-gray-600 mb-2 line-clamp-2">${notif.message}</p>
                        <div class="flex items-center justify-between">
                            <p class="text-xs text-gray-400 flex items-center gap-1">
                                <i class="far fa-clock"></i> ${timeAgo}
                            </p>
                            ${notif.notification_type ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">${notif.notification_type.replace('_', ' ')}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('hidden');
    
    if (!panel.classList.contains('hidden')) {
        currentFilter = 'all'; // Reset to "All" tab when opening
        filterNotifications('all');
        loadNotifications();
    }
}

async function markAsRead(notificationId, event) {
    try {
        if (event) {
            event.stopPropagation();
        }
        
        console.log('Marking notification as read:', notificationId);
        
        const response = await fetch('/Q-Mak/php/api/admin/get_notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: notificationId, action: 'mark_read' })
        });
        
        const data = await response.json();
        console.log('Mark as read response:', data);
        
        if (data.success) {
            // Reload notifications to update counts and list
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllRead() {
    try {
        // Show confirmation for better UX
        if (currentFilter === 'unread') {
            const unreadCount = notificationsData.filter(n => n.is_read === '0').length;
            if (unreadCount === 0) return;
        }
        
        const response = await fetch('/Q-Mak/php/api/admin/get_notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_all_read' })
        });
        
        const data = await response.json();
        if (data.success) {
            // Smooth transition
            const list = document.getElementById('notificationList');
            list.style.opacity = '0';
            setTimeout(() => {
                loadNotifications();
                list.style.opacity = '1';
            }, 200);
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return date.toLocaleDateString();
}

// Close notification panel when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById('notificationPanel');
    const button = event.target.closest('button[onclick="toggleNotifications()"]');
    
    if (!panel.classList.contains('hidden') && !panel.contains(event.target) && !button) {
        panel.classList.add('hidden');
    }
});

// Load notifications on page load and refresh every 5 minutes
loadNotifications();
setInterval(loadNotifications, 5 * 60 * 1000);
