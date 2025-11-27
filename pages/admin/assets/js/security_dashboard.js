/**
 * Security Dashboard Script
 * Q-Mak Queue Management System
 * Handles security monitoring and brute force protection management
 */

// Dynamic API base path - works on both localhost and production
const getSecurityApiBase = () => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
};

let securityCurrentPage = 1;
let securityTotalPages = 1;
const securityLogsPerPage = 50;

// Chart instance to prevent re-initialization errors
let securityEventsChart = null;

// Initialize Security Dashboard (called when tab is shown)
window.initSecurityDashboard = function() {
    console.log('Initializing Security Dashboard...');
    refreshSecurityDashboard();
};

// Refresh entire dashboard
function refreshSecurityDashboard() {
    loadStatistics();
    loadLockedAccounts();
    loadSecurityLogs();
    loadIPBlacklist();
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?action=get_statistics`);
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
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?action=get_locked_accounts`);
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatSecurityDateTime(account.locked_until)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.ip_address || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="unlockAccount('${account.identifier}', '${account.attempt_type}')" 
                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                            <i class="bi bi-unlock"></i> Unlock
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
        const severityEl = document.getElementById('filter-severity');
        const eventTypeEl = document.getElementById('filter-event-type');
        
        const severity = severityEl ? severityEl.value : '';
        const eventType = eventTypeEl ? eventTypeEl.value : '';
        const offset = (securityCurrentPage - 1) * securityLogsPerPage;
        
        const params = new URLSearchParams({
            action: 'get_security_logs',
            limit: securityLogsPerPage,
            offset: offset
        });
        
        if (severity) params.append('severity', severity);
        if (eventType) params.append('event_type', eventType);
        
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?` + params);
        const result = await response.json();
        
        const table = document.getElementById('security-logs-table');
        
        if (result.success && result.data.length > 0) {
            table.innerHTML = result.data.map(log => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatSecurityDateTime(log.created_at)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatSecurityEventType(log.event_type)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatSecuritySeverity(log.severity)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.user_identifier || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.ip_address || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${log.description}</td>
                </tr>
            `).join('');
            
            // Update pagination
            securityTotalPages = result.pagination.pages;
            document.getElementById('page-info').textContent = `Page ${securityCurrentPage} of ${securityTotalPages}`;
            document.getElementById('btn-prev').disabled = securityCurrentPage === 1;
            document.getElementById('btn-next').disabled = securityCurrentPage === securityTotalPages;
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
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?action=get_ip_blacklist`);
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ip.blocked_until ? formatSecurityDateTime(ip.blocked_until) : 'Permanent'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 ${ip.is_active ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} rounded">
                            ${ip.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        ${ip.is_active ? `
                            <button onclick="unblockIP('${ip.ip_address}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                                <i class="bi bi-check-lg"></i> Unblock
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
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?action=unlock_account`, {
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
        const response = await fetch(`${getSecurityApiBase()}/admin/security_management.php?action=unblock_ip`, {
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

// Show security sub-tab (within security dashboard)
function showSecurityTab(tabName) {
    // Hide all security tab contents
    document.querySelectorAll('.security-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Deactivate all security tab buttons
    document.querySelectorAll('.security-tab').forEach(tab => {
        tab.classList.remove('active', 'border-blue-600', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-gray-600');
    });
    
    // Show selected tab content
    const contentEl = document.getElementById('seccontent-' + tabName);
    if (contentEl) {
        contentEl.classList.remove('hidden');
    }
    
    // Activate selected tab button
    const activeTab = document.getElementById('sectab-' + tabName);
    if (activeTab) {
        activeTab.classList.add('active', 'border-blue-600', 'text-blue-600');
        activeTab.classList.remove('border-transparent', 'text-gray-600');
    }
}

// Pagination
function previousPage() {
    if (securityCurrentPage > 1) {
        securityCurrentPage--;
        loadSecurityLogs();
    }
}

function nextPage() {
    if (securityCurrentPage < securityTotalPages) {
        securityCurrentPage++;
        loadSecurityLogs();
    }
}

// Update event chart with destroy check
function updateEventChart(eventBreakdown) {
    const ctx = document.getElementById('chart-events');
    if (!ctx) return;
    
    // Destroy existing chart to prevent "Canvas is already in use" error
    if (securityEventsChart) {
        securityEventsChart.destroy();
        securityEventsChart = null;
    }
    
    const labels = eventBreakdown ? eventBreakdown.map(e => formatSecurityEventType(e.event_type)) : [];
    const data = eventBreakdown ? eventBreakdown.map(e => e.count) : [];
    
    securityEventsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Event Count',
                data: data,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update top failed IPs
function updateTopFailedIPs(topIPs) {
    const container = document.getElementById('top-failed-ips');
    if (!container) return;
    
    if (topIPs && topIPs.length > 0) {
        container.innerHTML = topIPs.map(ip => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span class="font-mono text-sm text-gray-700">${ip.ip_address}</span>
                <span class="bg-red-100 text-red-800 px-2 py-1 rounded-lg text-xs font-semibold">${ip.count} attempts</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No failed attempts recorded</p>';
    }
}

// Format helpers
function formatSecurityDateTime(dateStr) {
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

function formatSecurityEventType(type) {
    if (!type) return 'Unknown';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatSecuritySeverity(severity) {
    const colors = {
        info: 'bg-blue-100 text-blue-800',
        warning: 'bg-yellow-100 text-yellow-800',
        critical: 'bg-red-100 text-red-800'
    };
    const color = colors[severity] || 'bg-gray-100 text-gray-800';
    return `<span class="px-2 py-1 ${color} rounded">${(severity || 'unknown').toUpperCase()}</span>`;
}
