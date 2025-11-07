/**
 * Queue Dashboard Page Script
 * Q-Mak Queue Management System
 * Real-time queue monitoring with auto-refresh
 */

let refreshInterval;
let scheduleData = null;
let queueData = [];

// Initialize dashboard
async function initDashboard() {
    // Set current date
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
    
    // Load all data
    await loadCoopStatus();
    await loadSchedule();
    await loadCurrentQueue();
    await loadWaitTimeStats();
    
    // Start auto-refresh (every 30 seconds)
    refreshInterval = setInterval(refreshAll, 30000);
}

// Load COOP status
async function loadCoopStatus() {
    try {
        const response = await fetch('/Q-Mak/php/api/student/get_schedule.php');
        const data = await response.json();
        
        if (data.success) {
            const status = data.current_status;
            const banner = document.getElementById('statusBanner');
            
            if (status.open) {
                const timeLeft = formatTimeLeft(status.time_until_closing || (status.minutes_until_closing * 60));
                banner.innerHTML = `
                    <div class="bg-green-500 text-white rounded-2xl p-6 shadow-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-3 h-3 bg-white rounded-full pulse-animation"></div>
                                <div>
                                    <h2 class="text-2xl font-bold">COOP is OPEN</h2>
                                    <p class="text-green-100">Accepting orders until ${formatTime(status.closes_at)}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold">${timeLeft.display}</p>
                                <p class="text-sm text-green-100">until closing</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const nextOpen = status.opens_at ? `Opens at ${formatTime(status.opens_at)}` : 
                                status.reopens_at ? `Reopens at ${formatTime(status.reopens_at)}` : 
                                'Check schedule below';
                const bannerColor = status.reason === 'Lunch break' ? 'bg-orange-600' : 'bg-gray-700';
                const iconColor = status.reason === 'Lunch break' ? 'bg-orange-400' : 'bg-gray-400';
                
                banner.innerHTML = `
                    <div class="${bannerColor} text-white rounded-2xl p-6 shadow-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-3 h-3 ${iconColor} rounded-full"></div>
                                <div>
                                    <h2 class="text-2xl font-bold">COOP is ${status.reason === 'Lunch break' ? 'ON LUNCH BREAK' : 'CLOSED'}</h2>
                                    <p class="${status.reason === 'Lunch break' ? 'text-orange-100' : 'text-gray-300'}">${status.reason} • ${nextOpen}</p>
                                </div>
                            </div>
                            <div class="bg-purple-600 px-4 py-2 rounded-lg">
                                <p class="text-sm font-semibold">Pre-orders Available</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Update stats
            document.getElementById('completedCount').textContent = data.today_stats.completed_orders;
            document.getElementById('pendingCount').textContent = data.today_stats.pending_orders;
            
            // Store schedule data
            scheduleData = data;
        }
    } catch (error) {
        console.error('Failed to load COOP status:', error);
    }
}

// Load operating schedule
async function loadSchedule() {
    try {
        const response = await fetch('/Q-Mak/php/api/student/get_schedule.php');
        const data = await response.json();
        
        if (data.success && data.schedule) {
            const scheduleDiv = document.getElementById('scheduleDisplay');
            const today = new Date().toISOString().split('T')[0];
            
            let html = '';
            data.schedule.forEach(day => {
                if (!day) return;
                
                const isToday = day.date === today;
                const dayClass = isToday ? 'border-l-4 border-blue-500 bg-blue-50' : 'bg-gray-50';
                const statusIcon = day.is_open ? 
                    '<i class="fas fa-check-circle text-green-500"></i>' : 
                    '<i class="fas fa-times-circle text-red-500"></i>';
                
                html += `
                    <div class="${dayClass} rounded-lg p-3 transition hover:shadow-md">
                        <div class="flex justify-between items-center">
                            <div>
                                ${isToday ? '<span class="text-xs font-bold text-blue-600">TODAY</span>' : ''}
                                <p class="font-semibold ${isToday ? 'text-blue-900' : 'text-gray-700'}">
                                    ${day.day_name || getDayName(new Date(day.date))}
                                </p>
                                <p class="text-xs text-gray-500">${formatDate(day.date)}</p>
                            </div>
                            <div class="text-right">
                                ${statusIcon}
                                <p class="text-sm ${day.is_open ? 'text-green-600 font-semibold' : 'text-red-600'}">
                                    ${day.is_open ? `${formatTime(day.opening_time)} - ${formatTime(day.closing_time)}` : 'Closed'}
                                </p>
                                ${day.reason ? `<p class="text-xs text-gray-500">${day.reason}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            scheduleDiv.innerHTML = html;
            
            // Update next business day
            updateNextBusinessDay(data.schedule);
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }
}

// Load current queue
async function loadCurrentQueue() {
    try {
        const response = await fetch('/Q-Mak/php/api/student/get_queue_display.php');
        const data = await response.json();
        
        if (data.success) {
            const queueItems = data.queue || [];
            
            // Update current serving
            const currentServing = data.current_serving || 'Q-0';
            document.getElementById('currentServing').textContent = currentServing;
            
            // Update queue list
            const queueList = document.getElementById('queueList');
            let html = '';
            
            if (queueItems.length === 0) {
                html = '<p class="text-center text-gray-500 py-8">No orders in queue today</p>';
            } else {
                queueItems.forEach(item => {
                    const statusColor = {
                        completed: 'bg-green-100 text-green-700',
                        processing: 'bg-blue-100 text-blue-700',
                        pending: 'bg-orange-100 text-orange-700'
                    };
                    
                    const statusIcon = {
                        completed: 'check-circle',
                        processing: 'spinner fa-spin',
                        pending: 'clock'
                    };
                    
                    html += `
                        <div class="queue-card bg-white rounded-lg p-4 border ${item.status === 'processing' ? 'border-blue-300 border-2' : 'border-gray-200'}">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <div class="text-2xl font-bold ${item.status === 'processing' ? 'text-blue-600' : 'text-gray-700'}">
                                        ${item.queue}
                                    </div>
                                    ${item.wait > 0 ? `<div><p class="text-xs text-gray-600">~${item.wait} min wait</p></div>` : ''}
                                </div>
                                <div class="${statusColor[item.status]} px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                                    <i class="fas fa-${statusIcon[item.status]}"></i>
                                    ${item.status.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            queueList.innerHTML = html;
            
            // Store queue data
            queueData = queueItems;
            
            // Update analytics if available
            if (data.analytics) {
                document.getElementById('avgWaitTime').textContent = 
                    data.analytics.avg_wait_time > 0 ? `${data.analytics.avg_wait_time} min` : '--';
                document.getElementById('avgProcessTime').textContent = 
                    data.analytics.avg_process_time > 0 ? `${data.analytics.avg_process_time} min` : '--';
                document.getElementById('queueVelocity').textContent = 
                    data.analytics.orders_per_hour > 0 ? data.analytics.orders_per_hour : '--';
            }
        }
    } catch (error) {
        console.error('Failed to load queue data:', error);
        document.getElementById('queueList').innerHTML = 
            '<p class="text-center text-red-500 py-8">Failed to load queue. Please refresh.</p>';
    }
}

// Load wait time statistics
async function loadWaitTimeStats() {
    // Stats are loaded together with queue data in loadCurrentQueue()
    // This function is kept for consistency with initialization flow
}

// Update next business day
function updateNextBusinessDay(schedule) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    for (let day of schedule) {
        if (!day) continue;
        const dayDate = new Date(day.date);
        if (dayDate > new Date() && day.is_open) {
            document.getElementById('nextBusinessDay').textContent = 
                dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            return;
        }
    }
    
    document.getElementById('nextBusinessDay').textContent = 'Check schedule';
}

// Utility functions
function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatTimeLeft(seconds) {
    if (!seconds || seconds <= 0) {
        return { display: '0 min', hours: 0, minutes: 0 };
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let display = '';
    if (hours > 0) {
        display = `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else {
        display = `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    return { display, hours, minutes };
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Actions
function refreshAll() {
    console.log('Refreshing dashboard...');
    loadCoopStatus();
    loadCurrentQueue();
    loadWaitTimeStats();
}

function placeOrder() {
    window.location.href = 'create_order.html';
}

function goHome() {
    if (refreshInterval) clearInterval(refreshInterval);
    window.location.href = '../index.html';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);

// Clean up on unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});
