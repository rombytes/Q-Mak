/**
 * Security Dashboard Script
 * Q-Mak Queue Management System
 * Handles security monitoring and brute force protection management
 */

let currentPage = 1;
let totalPages = 1;
const logsPerPage = 50;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    refreshDashboard();
});

// Check admin authentication
function checkAdminAuth() {
    // You may want to verify session here
}

// Refresh entire dashboard
function refreshDashboard() {
    loadStatistics();
    loadLockedAccounts();
    loadSecurityLogs();
    loadIPBlacklist();
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('../../php/api/admin/security_management.php?action=get_statistics');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('stat-locked-accounts').textContent = stats.locked_accounts || 0;
            document.getElementById('stat-blacklisted-ips').textContent = stats.blacklisted_ips || 0;
            document.getElementById('stat-failed-today').textContent = stats.failed_logins_today || 0;
            document.getElementById('stat-critical-events').textContent = stats.critical_events_24h || 0;
            
            // Update analytics charts
            updateEventChart(stats.event_breakdown);
            updateTopFailedIPs(stats.top_failed_ips);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load locked accounts
async function loadLockedAccounts() {
    try {
        const response = await fetch('../../php/api/admin/security_management.php?action=get_locked_accounts');
        const result = await response.json();
        
        const table = document.getElementById('locked-accounts-table');
        const empty = document.getElementById('locked-accounts-empty');
        
        if (result.success && result.data.length > 0) {
            table.innerHTML = result.data.map(account => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${account.identifier}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">${account.attempt_type}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.failed_attempts}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDateTime(account.locked_until)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.ip_address || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="unlockAccount('${account.identifier}', '${account.attempt_type}')" 
                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                            <i class="fas fa-unlock"></i> Unlock
                        </button>
                    </td>
                </tr>
            `).join('');
            empty.classList.add('hidden');
        } else {
            table.innerHTML = '';
            empty.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading locked accounts:', error);
    }
}

// Load security logs
async function loadSecurityLogs() {
    try {
        const severity = document.getElementById('filter-severity').value;
        const eventType = document.getElementById('filter-event-type').value;
        const offset = (currentPage - 1) * logsPerPage;
        
        const params = new URLSearchParams({
            action: 'get_security_logs',
            limit: logsPerPage,
            offset: offset
        });
        
        if (severity) params.append('severity', severity);
        if (eventType) params.append('event_type', eventType);
        
        const response = await fetch('../../php/api/admin/security_management.php?' + params);
        const result = await response.json();
        
        const table = document.getElementById('security-logs-table');
        
        if (result.success && result.data.length > 0) {
            table.innerHTML = result.data.map(log => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDateTime(log.created_at)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatEventType(log.event_type)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatSeverity(log.severity)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.user_identifier || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.ip_address || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${log.description}</td>
                </tr>
            `).join('');
            
            // Update pagination
            totalPages = result.pagination.pages;
            document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('btn-prev').disabled = currentPage === 1;
            document.getElementById('btn-next').disabled = currentPage === totalPages;
        } else {
            table.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No logs found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading security logs:', error);
    }
}

// Load IP blacklist
async function loadIPBlacklist() {
    try {
        const response = await fetch('../../php/api/admin/security_management.php?action=get_ip_blacklist');
        const result = await response.json();
        
        const table = document.getElementById('ip-blacklist-table');
        const empty = document.getElementById('ip-blacklist-empty');
        
        if (result.success && result.data.length > 0) {
            table.innerHTML = result.data.map(ip => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${ip.ip_address}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${ip.reason}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 ${ip.block_type === 'automatic' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'} rounded">
                            ${ip.block_type}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ip.blocked_until ? formatDateTime(ip.blocked_until) : 'Permanent'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 ${ip.is_active ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} rounded">
                            ${ip.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        ${ip.is_active ? `
                            <button onclick="unblockIP('${ip.ip_address}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                                <i class="fas fa-check"></i> Unblock
                            </button>
                        ` : '<span class="text-gray-400">Unblocked</span>'}
                    </td>
                </tr>
            `).join('');
            empty.classList.add('hidden');
        } else {
            table.innerHTML = '';
            empty.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading IP blacklist:', error);
    }
}

// Unlock account
async function unlockAccount(identifier, attemptType) {
    if (!confirm(`Are you sure you want to unlock this account?\n\nIdentifier: ${identifier}\nType: ${attemptType}`)) {
        return;
    }
    
    try {
        const response = await fetch('../../php/api/admin/security_management.php?action=unlock_account', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ identifier, attempt_type: attemptType })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Account unlocked successfully!');
            loadLockedAccounts();
            loadStatistics();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error unlocking account:', error);
        alert('Failed to unlock account');
    }
}

// Unblock IP
async function unblockIP(ipAddress) {
    if (!confirm(`Are you sure you want to unblock this IP?\n\n${ipAddress}`)) {
        return;
    }
    
    try {
        const response = await fetch('../../php/api/admin/security_management.php?action=unblock_ip', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ip_address: ipAddress })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('IP unblocked successfully!');
            loadIPBlacklist();
            loadStatistics();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error unblocking IP:', error);
        alert('Failed to unblock IP');
    }
}

// Show security tab
function showSecurityTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.security-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.security-tab').forEach(tab => {
        tab.classList.remove('active', 'border-gray-900', 'text-gray-900');
        tab.classList.add('border-transparent', 'text-gray-600');
    });
    
    // Show selected tab
    document.getElementById('content-' + tabName).classList.remove('hidden');
    const activeTab = document.getElementById('tab-' + tabName);
    activeTab.classList.add('active', 'border-gray-900', 'text-gray-900');
    activeTab.classList.remove('border-transparent', 'text-gray-600');
}

// Pagination
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadSecurityLogs();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadSecurityLogs();
    }
}

// Update event chart
function updateEventChart(eventBreakdown) {
    const ctx = document.getElementById('chart-events');
    if (!ctx) return;
    
    const labels = eventBreakdown.map(e => formatEventType(e.event_type));
    const data = eventBreakdown.map(e => e.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Event Count',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update top failed IPs
function updateTopFailedIPs(topIPs) {
    const container = document.getElementById('top-failed-ips');
    if (!container) return;
    
    if (topIPs.length > 0) {
        container.innerHTML = topIPs.map(ip => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="font-mono text-sm">${ip.ip_address}</span>
                <span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">${ip.count} attempts</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-gray-500 text-center">No failed attempts recorded</p>';
    }
}

// Format helpers
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatEventType(type) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatSeverity(severity) {
    const colors = {
        info: 'bg-blue-100 text-blue-800',
        warning: 'bg-yellow-100 text-yellow-800',
        critical: 'bg-red-100 text-red-800'
    };
    return `<span class="px-2 py-1 ${colors[severity]} rounded">${severity.toUpperCase()}</span>`;
}
