// Dynamic API base path - works on both localhost and production
const API_BASE = (() => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
})();
let ordersData = [];
let studentsData = [];
let refreshInterval = null;
let currentQueueOrder = null;
let queueIndex = 0;
let ordersChart = null;
let showingArchivedLogs = false;
let selectedLogIds = [];
let inventoryStock = {};
let currentQueueFilter = 'today'; // Track current queue filter (today/upcoming)

// Archive variables
let showingArchivedStudents = false;
let showingArchivedAdmins = false;

// Analytics variables
let analyticsCharts = {};

// Check if admin is logged in
if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = '../login.html';
}

// ============================================================================
// MOBILE MENU FUNCTIONALITY
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle && mobileSidebarOverlay && sidebar) {
        // Toggle mobile menu
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            mobileSidebarOverlay.classList.toggle('active');
            
            // Change icon
            const icon = this.querySelector('i');
            if (sidebar.classList.contains('mobile-open')) {
                icon.classList.remove('bi-list');
                icon.classList.add('bi-x');
            } else {
                icon.classList.remove('bi-x');
                icon.classList.add('bi-list');
            }
        });
        
        // Close menu when clicking overlay
        mobileSidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            mobileSidebarOverlay.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            icon.classList.remove('bi-x');
            icon.classList.add('bi-list');
        });
        
        // Close menu when clicking a menu item
        const menuItems = sidebar.querySelectorAll('nav li');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    mobileSidebarOverlay.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('bi-x');
                    icon.classList.add('bi-list');
                }
            });
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('mobile-open');
                mobileSidebarOverlay.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('bi-x');
                icon.classList.add('bi-list');
            }
        });
    }
    
    // Make charts responsive on resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (analyticsCharts && Object.keys(analyticsCharts).length > 0) {
                Object.values(analyticsCharts).forEach(chart => {
                    if (chart && typeof chart.resize === 'function') {
                        chart.resize();
                    }
                });
            }
            if (ordersChart && typeof ordersChart.resize === 'function') {
                ordersChart.resize();
            }
        }, 250);
    });
});

// Display current date
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDate').textContent = 'Today is: ' + new Date().toLocaleDateString('en-US', options);

// Tab switching
function showTab(tabName) {
    console.log('=== SWITCHING TO TAB:', tabName, '===');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        console.log('Hidden tab:', tab.id);
    });
    
    // Remove active class from all menu items (only target clickable menu items, not nav-groups)
    document.querySelectorAll('nav li[id^="tab-"]').forEach(item => {
        // Remove all orange/active styling
        item.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'bg-gradient-to-r', 'from-orange-500', 'to-orange-600', 'border-orange-300', 'shadow-lg');
        // For submenu items, reset to default submenu styling
        if (item.closest('.nav-submenu')) {
            item.classList.add('hover:bg-blue-700/40');
        } else {
            // For top-level items, add default styling
            item.classList.add('border-transparent', 'hover:bg-blue-700/60', 'hover:shadow-md', 'hover:border-orange-400');
        }
        // Update font weight for inactive tabs
        const span = item.querySelector('.menu-text');
        if (span) {
            span.classList.remove('font-semibold');
            span.classList.add('font-medium');
        }
    });
    
    // Show selected tab
    const contentElement = document.getElementById('content-' + tabName);
    console.log('Found element:', contentElement);
    if (contentElement) {
        contentElement.classList.remove('hidden');
        console.log('Removed hidden class from:', contentElement.id);
        console.log('Element classes after:', contentElement.className);
        console.log('Element display style:', window.getComputedStyle(contentElement).display);
        console.log('Element visibility:', window.getComputedStyle(contentElement).visibility);
        console.log('Element has content:', contentElement.children.length > 0);
    } else {
        console.error('❌ Tab element not found: content-' + tabName);
    }
    
    // Add active class to selected menu item
    const activeItem = document.getElementById('tab-' + tabName);
    if (activeItem) {
        // Remove default styling
        activeItem.classList.remove('border-transparent', 'hover:bg-blue-700/60', 'hover:shadow-md', 'hover:border-orange-400', 'hover:bg-blue-700/40');
        // Add active styling
        activeItem.classList.add('bg-orange-500', 'hover:bg-orange-600', 'shadow-lg');
        // For submenu items, also add border styling
        if (!activeItem.closest('.nav-submenu')) {
            activeItem.classList.add('border-orange-300');
        }
        // Update font weight for active tab
        const span = activeItem.querySelector('.menu-text');
        if (span) {
            span.classList.remove('font-medium');
            span.classList.add('font-semibold');
        }
    }

    // Fetch data for the tab if it's one of the new ones
    if (tabName === 'queue-management') {
        fetchOrders();
        updateAutoRescheduleTimeDisplay();
    } else if (tabName === 'queue-history') {
        fetchHistory();
    } else if (tabName === 'analytics') {
        initAnalyticsCharts();
        generateAnalyticsData();
    } else if (tabName === 'student-records') {
        fetchStudents();
    } else if (tabName === 'email-logs') {
        fetchEmailLogs();
    } else if (tabName === 'service-config') {
        loadInventory();
    } else if (tabName === 'services') {
        // Phase 8: Load services management
        loadServices();
    } else if (tabName === 'admin-management') {
        switchAdminTab('accounts');
        fetchAdminAccounts();
    } else if (tabName === 'settings') {
        // Load all settings when settings tab is opened
        loadAllSettings();
    } else if (tabName === 'security') {
        // Initialize Security Dashboard
        if (typeof initSecurityDashboard === 'function') {
            initSecurityDashboard();
        } else {
            console.error('Security module not loaded');
        }
    }
    
    console.log('=== TAB SWITCH COMPLETE ===');
}

// Logout function
async function logout() {
    sessionStorage.clear();
    window.location.href = '../index.html';
}

// Debug function to check PHP session
async function checkPHPSession() {
    try {
        const response = await fetch(`${API_BASE}/admin/check_session.php`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        console.log('=== PHP SESSION CHECK ===');
        console.log('Session Active:', result.session_active);
        console.log('Session ID:', result.session_id);
        console.log('Session Data:', result.session_data);
        console.log('JavaScript sessionStorage:', JSON.parse(sessionStorage.getItem('adminData')));
        console.log('========================');
        return result;
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Auto-check session on page load
setTimeout(() => {
    console.log('%c⚠️ Checking PHP Session...', 'color: orange; font-weight: bold; font-size: 14px;');
    checkPHPSession();
}, 1000);



// Fetch orders from API
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_orders.php`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            ordersData = result.data.orders;
            displayQueueTable();
            updateCounts(result.data.stats);
            updateCurrentQueue();
            updateConnectionStatus(true);
        } else if (response.status === 401) {
            // Session expired, redirect to login
            sessionStorage.clear();
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        updateConnectionStatus(false);
    }
}



// Fetch students from API
async function fetchStudents() {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_students.php?archived=${showingArchivedStudents}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            studentsData = result.data.students;
            updateStudentTable();
        } else if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Error fetching students:', error);
    }
}

// Update student table display
function updateStudentTable() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';

    if (!studentsData || studentsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No students found</td></tr>';
        return;
    }

    const adminData = JSON.parse(sessionStorage.getItem('adminData'));

    studentsData.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Determine account status
        const hasAccount = student.has_account == 1;
        const accountStatusBadge = hasAccount 
            ? '<span class="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>Registered</span>'
            : '<span class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>Guest Only</span>';
        
        row.innerHTML = `
            <td class="px-6 py-4 student-checkbox-column hidden">
                <input type="checkbox" class="student-checkbox w-4 h-4" data-student-id="${student.student_id}" onchange="handleStudentCheckbox()">
            </td>
            <td class="px-6 py-4 font-mono text-sm">${student.student_id || 'N/A'}</td>
            <td class="px-6 py-4 font-semibold">${student.first_name || ''} ${student.last_name || ''}</td>
            <td class="px-6 py-4">${student.email || 'N/A'}</td>
            <td class="px-6 py-4">${accountStatusBadge}</td>
            <td class="px-6 py-4"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-sm">${student.total_orders || 0}</span></td>
            <td class="px-6 py-4 text-sm">${student.college || 'N/A'}</td>
            <td class="px-6 py-4 text-sm">${student.program || 'N/A'}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="viewStudentDetails('${student.student_id}')" 
                            class="text-blue-600 hover:text-blue-800 font-bold text-sm">
                        <i class="fas fa-eye mr-1"></i>View
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter students based on search
function filterStudents() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    
    if (!searchTerm) {
        updateStudentTable();
        return;
    }

    const filtered = studentsData.filter(student => {
        return (student.student_id && student.student_id.toLowerCase().includes(searchTerm)) ||
               (student.email && student.email.toLowerCase().includes(searchTerm)) ||
               (student.first_name && student.first_name.toLowerCase().includes(searchTerm)) ||
               (student.last_name && student.last_name.toLowerCase().includes(searchTerm));
    });

    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No matching students found</td></tr>';
        return;
    }

    filtered.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Determine account status
        const hasAccount = student.has_account == 1;
        const accountStatusBadge = hasAccount 
            ? '<span class="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>Registered</span>'
            : '<span class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>Guest Only</span>';
        
        row.innerHTML = `
            <td class="px-6 py-4 student-checkbox-column hidden">
                <input type="checkbox" class="student-checkbox w-4 h-4" data-student-id="${student.student_id}" onchange="handleStudentCheckbox()">
            </td>
            <td class="px-6 py-4 font-mono text-sm">${student.student_id || 'N/A'}</td>
            <td class="px-6 py-4 font-semibold">${student.first_name || ''} ${student.last_name || ''}</td>
            <td class="px-6 py-4">${student.email || 'N/A'}</td>
            <td class="px-6 py-4">${accountStatusBadge}</td>
            <td class="px-6 py-4"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-sm">${student.total_orders || 0}</span></td>
            <td class="px-6 py-4 text-sm">${student.college || 'N/A'}</td>
            <td class="px-6 py-4 text-sm">${student.program || 'N/A'}</td>
            <td class="px-6 py-4">
                <button onclick="viewStudentDetails('${student.student_id}')" class="text-blue-600 hover:text-blue-800 font-bold text-sm">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// View student details in modal
async function viewStudentDetails(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        alert('Student not found');
        return;
    }
    
    // Show modal
    document.getElementById('studentDetailsModal').classList.remove('hidden');
    document.getElementById('studentDetailsModal').classList.add('flex');
    document.getElementById('studentModalTitle').textContent = `${student.first_name} ${student.last_name} (${student.student_id})`;
    
    // Switch to current order tab
    switchStudentTab('current');
    
    // Load student data
    await loadStudentCurrentOrder(studentId);
    loadStudentInfo(student);
    await loadStudentOrderBreakdown(studentId);
    await loadStudentOrderHistory(studentId);
}

// Close student modal
function closeStudentModal() {
    document.getElementById('studentDetailsModal').classList.add('hidden');
    document.getElementById('studentDetailsModal').classList.remove('flex');
}

// Switch student modal tabs
function switchStudentTab(tabName) {
    // Update button styles
    ['current', 'info', 'breakdown', 'history'].forEach(tab => {
        const btn = document.getElementById(`student-tab-${tab}`);
        const content = document.getElementById(`student-content-${tab}`);
        if (tab === tabName) {
            btn.className = 'px-4 py-2 rounded font-bold bg-blue-900 text-white';
            content.classList.remove('hidden');
        } else {
            btn.className = 'px-4 py-2 rounded font-bold bg-gray-200 text-gray-700 hover:bg-gray-300';
            content.classList.add('hidden');
        }
    });
}

// Load student current order
async function loadStudentCurrentOrder(studentId) {
    const container = document.getElementById('studentCurrentOrder');
    container.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';
    
    // Find current orders for this student
    const currentOrders = ordersData.filter(o => 
        o.student_id === studentId && 
        (o.order_status === 'pending' || o.order_status === 'processing' || o.order_status === 'ready')
    );
    
    if (currentOrders.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">No current orders in queue</div>';
        return;
    }
    
    container.innerHTML = currentOrders.map(order => {
        const statusColor = getStatusColor(order.order_status);
        const createdTime = new Date(order.created_at).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-lg text-blue-900">Queue #${order.queue_number}</h4>
                        <p class="text-sm text-gray-500">${createdTime}</p>
                    </div>
                    <span class="${statusColor} text-white px-3 py-1 rounded text-xs font-bold uppercase">
                        ${capitalizeWords(order.order_status)}
                    </span>
                </div>
                <div class="space-y-2">
                    <p><span class="font-bold">Item:</span> ${capitalizeWords(order.item_ordered)}</p>
                    <p><span class="font-bold">Wait Time:</span> ${order.estimated_wait_time} minutes</p>
                </div>
            </div>
        `;
    }).join('');
}

// Load student information
function loadStudentInfo(student) {
    const container = document.getElementById('studentInfoContent');
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    const isSuperAdmin = adminData && adminData.is_super_admin == 1;
    const isArchived = student.is_archived == 1;
    
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
                <h4 class="font-bold text-lg text-blue-900 border-b pb-2">Personal Information</h4>
                <div><span class="font-bold">Student ID:</span> ${student.student_id || 'N/A'}</div>
                <div><span class="font-bold">Full Name:</span> ${student.first_name} ${student.last_name}</div>
                <div><span class="font-bold">Email:</span> ${student.email || 'N/A'}</div>
                ${isArchived ? '<div class="text-orange-600 font-bold"><i class="fas fa-archive mr-2"></i>This student is archived</div>' : ''}
            </div>
            <div class="space-y-4">
                <h4 class="font-bold text-lg text-blue-900 border-b pb-2">Academic Information</h4>
                <div><span class="font-bold">College:</span> ${student.college || 'N/A'}</div>
                <div><span class="font-bold">Program:</span> ${student.program || 'N/A'}</div>
                <div><span class="font-bold">Year Level:</span> ${student.year_level || 'N/A'}</div>
                <div><span class="font-bold">Section:</span> ${student.section || 'N/A'}</div>
            </div>
        </div>
        <div class="mt-6 pt-6 border-t flex gap-4">
            ${isSuperAdmin && !isArchived ? `
                <button onclick="editStudentInfo('${student.student_id}')" 
                        class="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold">
                    <i class="fas fa-edit mr-2"></i>Edit Student Information
                </button>
            ` : ''}
            ${!isArchived ? `
                <button onclick="archiveStudentFromModal('${student.student_id}', '${student.first_name} ${student.last_name}')" 
                        class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-bold">
                    <i class="fas fa-archive mr-2"></i>Archive Student
                </button>
            ` : ''}
            ${isArchived && isSuperAdmin ? `
                <button onclick="restoreStudentFromModal('${student.student_id}', '${student.first_name} ${student.last_name}')" 
                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold">
                    <i class="fas fa-undo mr-2"></i>Restore Student
                </button>
            ` : ''}
        </div>
    `;
}

// Edit student information (super admin only)
async function editStudentInfo(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) return;
    
    const container = document.getElementById('studentInfoContent');
    container.innerHTML = `
        <form id="editStudentForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h4 class="font-bold text-lg text-blue-900 border-b pb-2">Personal Information</h4>
                    <div>
                        <label class="block font-bold mb-1">First Name</label>
                        <input type="text" id="edit_first_name" value="${student.first_name || ''}" class="w-full border border-gray-300 rounded p-2" required>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Last Name</label>
                        <input type="text" id="edit_last_name" value="${student.last_name || ''}" class="w-full border border-gray-300 rounded p-2" required>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Email</label>
                        <input type="email" id="edit_email" value="${student.email || ''}" class="w-full border border-gray-300 rounded p-2" required>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="font-bold text-lg text-blue-900 border-b pb-2">Academic Information</h4>
                    <div>
                        <label class="block font-bold mb-1">College</label>
                        <input type="text" id="edit_college" value="${student.college || ''}" class="w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Program</label>
                        <input type="text" id="edit_program" value="${student.program || ''}" class="w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Year Level</label>
                        <input type="text" id="edit_year_level" value="${student.year_level || ''}" class="w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Section</label>
                        <input type="text" id="edit_section" value="${student.section || ''}" class="w-full border border-gray-300 rounded p-2">
                    </div>
                </div>
            </div>
            <div class="flex gap-4 pt-4 border-t">
                <button type="submit" class="flex-1 bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold">
                    Save Changes
                </button>
                <button type="button" onclick="loadStudentInfo(studentsData.find(s => s.student_id === '${studentId}'))" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-bold">
                    Cancel
                </button>
            </div>
        </form>
    `;
    
    // Add form submit handler
    document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveStudentChanges(studentId);
    });
}

// Save student changes (super admin only)
async function saveStudentChanges(studentId) {
    const updatedData = {
        student_id: studentId,
        first_name: document.getElementById('edit_first_name').value,
        last_name: document.getElementById('edit_last_name').value,
        email: document.getElementById('edit_email').value,
        college: document.getElementById('edit_college').value,
        program: document.getElementById('edit_program').value,
        year_level: document.getElementById('edit_year_level').value,
        section: document.getElementById('edit_section').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Student information updated successfully', 'success');
            // Refresh student data
            await fetchStudents();
            // Reload student info
            const updatedStudent = studentsData.find(s => s.student_id === studentId);
            if (updatedStudent) {
                loadStudentInfo(updatedStudent);
            }
        } else {
            alert(result.message || 'Failed to update student information');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        alert('Error updating student information');
    }
}

// Load student order breakdown
async function loadStudentOrderBreakdown(studentId) {
    const container = document.getElementById('studentOrderBreakdown');
    container.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';
    
    try {
        // Fetch all orders for this specific student
        const response = await fetch(`${API_BASE}/admin/admin_orders.php?filter=history&student_id=${studentId}`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (!result.success || !result.data.orders) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">Unable to load order breakdown</div>';
            return;
        }
        
        const studentOrders = result.data.orders;
    
    // Calculate breakdown by status
    const breakdown = {
        completed: studentOrders.filter(o => o.order_status === 'completed').length,
        cancelled: studentOrders.filter(o => o.order_status === 'cancelled').length,
        pending: studentOrders.filter(o => o.order_status === 'pending').length,
        processing: studentOrders.filter(o => o.order_status === 'processing').length,
        ready: studentOrders.filter(o => o.order_status === 'ready').length,
        total: studentOrders.length
    };
    
    // Calculate breakdown by item (split comma-separated items)
    const itemBreakdown = {};
    studentOrders.forEach(order => {
        const itemsString = order.item_ordered || 'Unknown';
        // Split by comma and process each item separately
        const items = itemsString.split(',').map(i => i.trim());
        items.forEach(item => {
            itemBreakdown[item] = (itemBreakdown[item] || 0) + 1;
        });
    });
    
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Total Orders Summary -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h4 class="text-2xl font-bold text-blue-900 mb-2">Total Orders</h4>
                <p class="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">${breakdown.total}</p>
            </div>
            
            <!-- Status Breakdown -->
            <div>
                <h4 class="text-xl font-bold text-blue-900 mb-4">
                    <i class="fas fa-chart-pie mr-2"></i>Order Status Breakdown
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="bg-white rounded-xl p-4 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 font-semibold">Completed</p>
                                <p class="text-3xl font-bold text-green-600">${breakdown.completed}</p>
                            </div>
                            <div class="bg-green-100 p-3 rounded-full">
                                <i class="fas fa-check-circle text-green-600 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 font-semibold">Cancelled</p>
                                <p class="text-3xl font-bold text-red-600">${breakdown.cancelled}</p>
                            </div>
                            <div class="bg-red-100 p-3 rounded-full">
                                <i class="fas fa-times-circle text-red-600 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 font-semibold">Pending</p>
                                <p class="text-3xl font-bold text-orange-600">${breakdown.pending}</p>
                            </div>
                            <div class="bg-orange-100 p-3 rounded-full">
                                <i class="fas fa-clock text-orange-600 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 font-semibold">Processing</p>
                                <p class="text-3xl font-bold text-blue-600">${breakdown.processing}</p>
                            </div>
                            <div class="bg-blue-100 p-3 rounded-full">
                                <i class="fas fa-spinner text-blue-600 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 font-semibold">Ready</p>
                                <p class="text-3xl font-bold text-indigo-600">${breakdown.ready}</p>
                            </div>
                            <div class="bg-indigo-100 p-3 rounded-full">
                                <i class="fas fa-bell text-indigo-600 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Items Breakdown -->
            <div>
                <h4 class="text-xl font-bold text-blue-900 mb-4">
                    <i class="fas fa-box mr-2"></i>Most Ordered Items
                </h4>
                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                                <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Orders</th>
                                <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Percentage</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${Object.entries(itemBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .map(([item, count]) => {
                                    const percentage = ((count / breakdown.total) * 100).toFixed(1);
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 font-semibold text-gray-800">${item}</td>
                                            <td class="px-6 py-4 text-center">
                                                <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">${count}</span>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                <span class="text-gray-600 font-semibold">${percentage}%</span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    if (breakdown.total === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-500"><i class="fas fa-inbox text-5xl mb-3 text-gray-300"></i><p class="text-lg">No orders found for this student</p></div>';
    }
    } catch (error) {
        console.error('Error loading student order breakdown:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">Error loading order breakdown</div>';
    }
}

// Load student order history
async function loadStudentOrderHistory(studentId) {
    const container = document.getElementById('studentOrderHistory');
    container.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';
    
    try {
        // Fetch orders specifically for this student only
        const response = await fetch(`${API_BASE}/admin/admin_orders.php?filter=history&student_id=${encodeURIComponent(studentId)}`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.data.orders) {
            const orders = result.data.orders;
            
            if (orders.length === 0) {
                container.innerHTML = '<div class="text-center py-8 text-gray-500">No order history found</div>';
                return;
            }
            
            container.innerHTML = `
                <table class="w-full">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase">Queue #</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase">Item</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase">Date</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${orders.map(order => {
                            const statusColor = getStatusColor(order.order_status);
                            const createdDate = new Date(order.created_at).toLocaleString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric', 
                                hour: '2-digit', minute: '2-digit'
                            });
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3">${order.queue_number}</td>
                                    <td class="px-4 py-3">${capitalizeWords(order.item_ordered || order.item_name)}</td>
                                    <td class="px-4 py-3">${createdDate}</td>
                                    <td class="px-4 py-3">
                                        <span class="${statusColor} text-white px-2 py-1 rounded text-xs font-bold uppercase">
                                            ${capitalizeWords(order.order_status)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">Error loading order history</div>';
        }
    } catch (error) {
        console.error('Error loading student order history:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">Error loading order history</div>';
    }
}

// --- ADDED: New function to fetch data for the Queue History tab ---
async function fetchHistory() {
    const date = document.getElementById('filterHistoryDate').value;
    const status = document.getElementById('filterHistoryStatus').value;
    const search = document.getElementById('searchHistory').value;

    // We pass ?filter=history to get ALL orders
    let url = `${API_BASE}/admin/admin_orders.php?filter=history`;
    if (date) url += `&date=${date}`;
    if (status !== 'all') url += `&status=${status}`;
    if (search) url += `&search=${search}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayHistoryTable(result.data.orders);
        } else if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Error fetching order history:', error);
    }
}

// --- ADDED: New function to display the history table ---
function displayHistoryTable(orders) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No order history found for these filters.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        const createdDate = new Date(order.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Format items with quantity - show unique items only
        const items = order.item_ordered ? order.item_ordered.split(',').map(i => i.trim()) : [];
        const itemCount = items.length;
        const uniqueItems = [...new Set(items)];
        const itemText = uniqueItems.map(item => capitalizeWords(item)).join(', ');
        
        // Check if this is a printing service order
        const isPrintingOrder = order.order_type_service === 'printing' || order.item_name === 'Printing Services';
        
        // Service type badge for history table
        const serviceTypeBadge = isPrintingOrder
            ? `<span class="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <i class="bi bi-printer-fill"></i> Printing
               </span>`
            : `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <i class="bi bi-bag-fill"></i> Items
               </span>`;
        
        const itemDisplay = isPrintingOrder
            ? `<div class="flex items-center gap-2">
                <span>${capitalizeWords(order.item_name || 'Printing Services')}</span>
                <button onclick="viewOrderDetails(${order.order_id})" 
                        class="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg text-xs font-semibold transition-all" 
                        title="View printing files">
                    <i class="fas fa-file-pdf"></i>
                    <span>Files</span>
                </button>
               </div>`
            : (itemCount > 1 ? `<strong>${itemCount} items:</strong> ${itemText}` : capitalizeWords(order.item_ordered));

        row.innerHTML = `
            <td class="px-6 py-4">${order.queue_number}</td>
            <td class="px-6 py-4">${order.first_name} ${order.last_name} (${order.student_id})</td>
            <td class="px-6 py-4">${serviceTypeBadge}</td>
            <td class="px-6 py-4">${itemDisplay}</td>
            <td class="px-6 py-4">${createdDate}</td>
            <td class="px-6 py-4">
                <span class="${getStatusColor(order.order_status)} text-white px-3 py-1 rounded text-xs font-bold uppercase">
                    ${order.order_status}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- ADDED: New function to reset history filters ---
function resetHistoryFilters() {
    document.getElementById('filterHistoryDate').value = '';
    document.getElementById('filterHistoryStatus').value = 'all';
    document.getElementById('searchHistory').value = '';
    fetchHistory();
}

// Set analytics period and fetch data
function setAnalyticsPeriod(period) {
    currentAnalyticsPeriod = period;
    
    // Update button styles
    ['daily', 'weekly', 'monthly', 'yearly', 'custom'].forEach(p => {
        const btn = document.getElementById(`btn-${p}`);
        if (p === period) {
            btn.className = 'px-4 py-2 rounded font-bold bg-blue-900 text-white';
        } else {
            btn.className = 'px-4 py-2 rounded font-bold bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
    });
    
    // Show/hide custom date range
    const customDateRange = document.getElementById('customDateRange');
    if (period === 'custom') {
        customDateRange.classList.remove('hidden');
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        document.getElementById('customStartDate').value = weekAgo;
        document.getElementById('customEndDate').value = today;
    } else {
        customDateRange.classList.add('hidden');
        fetchAnalyticsByPeriod(period);
    }
}

// Apply custom date range
async function applyCustomDateRange() {
    const startDate = document.getElementById('customStartDate').value;
    const endDate = document.getElementById('customEndDate').value;
    
    if (!startDate || !endDate) {
        await showAlert('Please select both start and end dates.', 'warning');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        await showAlert('Start date must be before end date.', 'warning');
        return;
    }
    
    fetchAnalyticsByDateRange(startDate, endDate);
}

// Fetch analytics based on period
async function fetchAnalyticsByPeriod(period) {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_reports.php?period=${period}`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            displayAnalytics(result.data, period, result.data.date_range);
        } else if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login.html';
        } else {
            const errorMsg = result.error || result.message || 'Unknown error';
            console.error('Analytics API Error:', result);
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

// Fetch analytics by custom date range
async function fetchAnalyticsByDateRange(startDate, endDate) {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_reports.php?start=${startDate}&end=${endDate}`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            displayAnalytics(result.data, 'custom', result.data.date_range);
        } else if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login.html';
        } else {
            const errorMsg = result.error || result.message || 'Unknown error';
            console.error('Analytics API Error:', result);
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

// Helper function to capitalize words properly
function capitalizeWords(str) {
    if (!str) return 'N/A';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Display analytics data with Chart.js
function displayAnalytics(data, period, dateRange) {
    // Update summary cards
    document.getElementById('analyticsTotalOrders').textContent = data.summary.total_orders || 0;
    document.getElementById('analyticsTotalCompleted').textContent = data.summary.completed_orders || 0;
    
    // Fix top item display to handle empty data
    if (data.top_items && data.top_items.length > 0 && data.top_items[0].item_ordered) {
        document.getElementById('analyticsTopItem').textContent = capitalizeWords(data.top_items[0].item_ordered);
    } else {
        document.getElementById('analyticsTopItem').textContent = 'N/A';
    }

    // Update date range displays
    const dateRangeText = dateRange ? `${dateRange.start} to ${dateRange.end}` : 'Loading...';
    document.getElementById('statusDateRange').textContent = dateRangeText;
    document.getElementById('productDateRange').textContent = dateRangeText;

    // Populate order status breakdown table
    const statusBody = document.getElementById('analyticsStatusBody');
    statusBody.innerHTML = '';
    if (data.status_breakdown && data.status_breakdown.length > 0) {
        const totalOrders = data.summary.total_orders || 1;
        data.status_breakdown.forEach(status => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            const percentage = ((status.count / totalOrders) * 100).toFixed(1);
            const statusColor = getStatusColor(status.status);
            row.innerHTML = `
                <td class="px-6 py-4">
                    <span class="${statusColor} text-white px-3 py-1 rounded text-xs font-bold">
                        ${capitalizeWords(status.status)}
                    </span>
                </td>
                <td class="px-6 py-4 font-bold">${status.count}</td>
                <td class="px-6 py-4">${percentage}%</td>
            `;
            statusBody.appendChild(row);
        });
    } else {
        statusBody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No status data found for this period.</td></tr>';
    }

    // Populate product quantities table
    const productQtyBody = document.getElementById('analyticsProductQtyBody');
    productQtyBody.innerHTML = '';
    if (data.product_quantities && data.product_quantities.length > 0) {
        data.product_quantities.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4">${capitalizeWords(product.item_name)}</td>
                <td class="px-6 py-4 font-bold text-blue-600">${product.quantity_sold}</td>
            `;
            productQtyBody.appendChild(row);
        });
    } else {
        productQtyBody.innerHTML = '<tr><td colspan="2" class="px-6 py-8 text-center text-gray-500">No product data found for this period.</td></tr>';
    }

    // Populate top items with enhanced card layout
    const topItemsBody = document.getElementById('analyticsTopItemsBody');
    topItemsBody.innerHTML = '';
    if (!data.top_items || data.top_items.length === 0) {
        topItemsBody.innerHTML = '<div class="text-center py-8 text-gray-500">No item data found for this period.</div>';
    } else {
        // Get max value for calculating bar widths
        const maxTotal = Math.max(...data.top_items.map(item => item.total));
        
        data.top_items.forEach((item, index) => {
            const percentage = (item.total / maxTotal) * 100;
            const rankColors = [
                'bg-gradient-to-r from-yellow-400 to-orange-500',
                'bg-gradient-to-r from-gray-300 to-gray-400',
                'bg-gradient-to-r from-orange-300 to-orange-400',
                'bg-gradient-to-r from-blue-400 to-blue-500'
            ];
            const barColor = index < 3 ? rankColors[index] : rankColors[3];
            const rankBadgeColors = [
                'bg-yellow-500 text-white',
                'bg-gray-400 text-white',
                'bg-orange-400 text-white',
                'bg-blue-500 text-white'
            ];
            const badgeColor = index < 3 ? rankBadgeColors[index] : rankBadgeColors[3];
            
            const card = document.createElement('div');
            card.className = 'bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow';
            card.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <span class="${badgeColor} px-3 py-1 rounded-full text-sm font-bold">
                            #${index + 1}
                        </span>
                        <div>
                            <h4 class="font-bold text-gray-900">${capitalizeWords(item.item_ordered)}</h4>
                            <p class="text-sm text-gray-500">${item.total} orders</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-bold text-blue-900">${item.total}</span>
                    </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="${barColor} h-3 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                </div>
            `;
            topItemsBody.appendChild(card);
        });
    }

    // Render chart
    renderOrdersChart(data.timeline || [], period);
}

// Render Chart.js chart
function renderOrdersChart(timeline, period) {
    const ctx = document.getElementById('ordersChart');
    
    // Destroy existing chart if it exists
    if (ordersChart) {
        ordersChart.destroy();
    }

    // Prepare data
    const labels = timeline.map(t => t.label || t.date);
    const ordersData = timeline.map(t => t.total_orders || 0);
    const completedData = timeline.map(t => t.completed_orders || 0);

    // Get descriptive title
    const periodTitles = {
        'daily': 'Today\'s Orders by Hour',
        'weekly': 'Orders by Week',
        'monthly': 'Orders by Month',
        'yearly': 'Orders by Year',
        'custom': 'Orders Trend'
    };

    // Create chart
    ordersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Orders',
                    data: ordersData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Completed Orders',
                    data: completedData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                title: {
                    display: true,
                    text: periodTitles[period] || 'Orders Trend',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Set queue filter (today or upcoming)
function setQueueFilter(filterType) {
    currentQueueFilter = filterType;
    
    // Update button states
    const todayBtn = document.getElementById('filterTodayBtn');
    const upcomingBtn = document.getElementById('filterUpcomingBtn');
    
    if (todayBtn && upcomingBtn) {
        if (filterType === 'today') {
            todayBtn.classList.add('active');
            upcomingBtn.classList.remove('active');
        } else {
            todayBtn.classList.remove('active');
            upcomingBtn.classList.add('active');
        }
    }
    
    // Show/hide current queue display
    const currentQueueDisplay = document.getElementById('currentQueueDisplay');
    const queueControls = document.querySelector('.glass-effect.rounded-2xl.shadow-md.p-6.mb-8');
    
    if (currentQueueDisplay && queueControls) {
        if (filterType === 'today') {
            currentQueueDisplay.style.display = 'block';
            queueControls.style.display = 'block';
        } else {
            currentQueueDisplay.style.display = 'none';
            queueControls.style.display = 'none';
        }
    }
    
    // Fetch orders with the selected filter
    fetchOrders(filterType);
}

// Update upcoming orders badge
function updateUpcomingBadge(count) {
    const badge = document.getElementById('upcomingBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Initialize queue table
function displayQueueTable(filteredOrders = null) {
    const tbody = document.getElementById('queueTableBody');
    tbody.innerHTML = '';

    const dataToDisplay = filteredOrders || ordersData;

    if (dataToDisplay.length === 0) {
        const emptyMessage = currentQueueFilter === 'upcoming' 
            ? 'No upcoming orders found' 
            : 'No orders found';
        const emptySubtext = currentQueueFilter === 'upcoming'
            ? 'Pre-orders for future dates will appear here'
            : 'Orders will appear here when students place them';
            
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                        </div>
                        <p class="text-gray-500 font-medium">${emptyMessage}</p>
                        <p class="text-gray-400 text-sm">${emptySubtext}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    dataToDisplay.forEach((order, index) => {
        const row = document.createElement('tr');
        row.className = 'group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100 last:border-b-0';
        row.style.animation = `fadeInUp 0.3s ease-out ${index * 0.05}s both`;
        
        const createdTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Format queue date for upcoming orders
        const queueDateDisplay = currentQueueFilter === 'upcoming' && order.queue_date 
            ? `<div class="text-xs text-orange-600 font-semibold mt-1">
                <i class="bi bi-calendar-event"></i> ${new Date(order.queue_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
               </div>`
            : '';
        
        // Use item_name for display (analytics-friendly)
        const displayName = order.item_name || order.item_ordered;
        
        // Format items with quantity - show unique items only
        const items = displayName ? displayName.split(',').map(i => i.trim()) : [];
        const itemCount = items.length;
        const uniqueItems = [...new Set(items)];
        const itemText = uniqueItems.map(item => capitalizeWords(item)).join(', ');
        
        // Check if this is a printing service order
        const isPrintingOrder = order.order_type_service === 'printing' || displayName === 'Printing Services';
        
        // Service type badge
        const serviceTypeBadge = isPrintingOrder
            ? `<span class="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <i class="bi bi-printer-fill"></i> Printing
               </span>`
            : `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <i class="bi bi-bag-fill"></i> Items
               </span>`;
        
        const itemDisplay = isPrintingOrder
            ? `<div class="flex items-center gap-2">
                <span class="text-gray-700">${capitalizeWords(displayName)}</span>
                <button onclick="event.stopPropagation(); viewOrderDetails(${order.order_id})" 
                        class="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow" 
                        title="View printing details">
                    <i class="fas fa-file-pdf"></i>
                    <span>Details</span>
                </button>
               </div>`
            : (itemCount > 1 
                ? `<span class="font-semibold text-blue-900">${itemCount} items:</span> <span class="text-gray-700">${itemText}</span>` 
                : `<span class="text-gray-700">${capitalizeWords(displayName)}</span>`);
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="font-bold text-blue-900 text-base">${order.queue_number}</span>
                    ${order.reference_number ? `<span class="text-xs text-purple-600 font-semibold mt-0.5">Ref: ${order.reference_number}</span>` : ''}
                    ${queueDateDisplay}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="font-medium text-gray-700">${order.student_id}</span>
            </td>
            <td class="px-6 py-4">
                ${serviceTypeBadge}
            </td>
            <td class="px-6 py-4">
                ${itemDisplay}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-medium">${createdTime}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="${getStatusColor(order.order_status)} text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase shadow-sm">
                    ${order.order_status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="viewOrderDetails(${order.order_id})" 
                        class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 text-sm">
                    View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add CSS animation keyframes if not already present
if (!document.querySelector('style[data-queue-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-queue-animations', 'true');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-orange-500',
        'processing': 'bg-blue-500',
        'ready': 'bg-indigo-600',
        'completed': 'bg-green-600',
        'cancelled': 'bg-red-600'
    };
    return colors[status] || 'bg-gray-500';
}

// View order details in modal
async function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.order_id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Check if this is a printing order
    let printingJob = null;
    try {
        const printResponse = await fetch(`${API_BASE}/admin/printing_jobs.php?order_id=${orderId}`, {
            credentials: 'include'
        });
        
        console.log('Printing Job Response Status:', printResponse.status);
        
        const responseText = await printResponse.text();
        console.log('Printing Job Raw Response:', responseText);
        
        let printResult;
        try {
            printResult = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse printing job response:', parseError);
            console.error('Response text:', responseText);
            // Continue without printing job data
            printResult = { success: false };
        }
        
        if (printResult.success && printResult.data && printResult.data.is_printing) {
            printingJob = printResult.data.job;
        }
    } catch (error) {
        console.error('Error fetching printing job:', error);
    }
    
    // Find student info
    const student = studentsData.find(s => s.student_id === order.student_id);
    
    const createdTime = new Date(order.created_at).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Display detailed item information from item_ordered
    const itemOrdered = order.item_ordered || order.item_name || 'N/A';
    const items = itemOrdered.split(',').map(i => i.trim());
    const itemList = items.map(item => `<li class="text-gray-700">• ${capitalizeWords(item)}</li>`).join('');
    
    const statusColor = getStatusColor(order.order_status);
    
    // Create modal HTML
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn" onclick="if(event.target === this) this.remove()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col animate-slideUp" style="animation: slideUp 0.3s ease-out;">
                <!-- Header - Fixed -->
                <div class="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white p-6 rounded-t-3xl flex-shrink-0">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold">Order Details</h3>
                                <p class="text-blue-200 text-sm mt-0.5 flex items-center gap-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/20 font-semibold text-white">
                                        ${order.queue_number}
                                    </span>
                                    <span class="text-blue-300">•</span>
                                    <span>${createdTime}</span>
                                </p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-white hover:bg-white/20 p-2.5 rounded-xl transition-all duration-200 hover:scale-110">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Content - Scrollable with Custom Scrollbar -->
                <div class="overflow-y-auto flex-1 custom-scrollbar" style="scrollbar-width: thin; scrollbar-color: #3b82f6 #e5e7eb;">
                    <div class="p-6 space-y-5">
                    <!-- Order Information -->
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                        <h4 class="font-bold text-xl text-blue-900 mb-5 flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                            <span>Order Information</span>
                        </h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Queue Number</span>
                                <span class="font-bold text-blue-900 text-lg">${order.queue_number}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Reference Number</span>
                                <span class="font-semibold text-purple-600">${order.reference_number || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Time Placed</span>
                                <span class="font-medium text-gray-700">${createdTime}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Wait Time</span>
                                <span class="font-medium text-gray-700">${order.estimated_wait_time} minutes</span>
                            </div>
                            <div class="col-span-2">
                                <span class="text-sm text-gray-600 block mb-2">Current Status</span>
                                <span class="${statusColor} text-white px-4 py-2 rounded-lg text-sm font-bold uppercase inline-block">
                                    ${order.order_status}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Student Information -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-2xl p-6 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                        <h4 class="font-bold text-xl text-green-900 mb-5 flex items-center gap-3">
                            <div class="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </div>
                            <span>Student Information</span>
                        </h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Student ID</span>
                                <span class="font-bold text-gray-900">${order.student_id}</span>
                            </div>
                            ${student ? `
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Name</span>
                                <span class="font-medium text-gray-700">${student.first_name} ${student.last_name}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Email</span>
                                <span class="font-medium text-gray-700">${student.email}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-1">Program</span>
                                <span class="font-medium text-gray-700">${student.program}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Items Ordered / Printing Job -->
                    ${printingJob ? `
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-100/50 rounded-2xl p-6 border-2 border-indigo-300 shadow-md hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between mb-5">
                            <h4 class="font-bold text-xl text-indigo-900 flex items-center gap-3">
                                <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                                    <i class="fas fa-print text-white"></i>
                                </div>
                                <span>Printing Service</span>
                            </h4>
                            <span class="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold uppercase">PRINTING</span>
                        </div>
                        
                        <div class="bg-white/70 rounded-xl p-4 space-y-3 mb-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">File Name</span>
                                    <p class="font-semibold text-gray-900 mt-1 break-all">${printingJob.file_name}</p>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">File Size</span>
                                    <p class="font-semibold text-gray-900 mt-1">${(printingJob.file_size / 1024).toFixed(2)} KB</p>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">Pages</span>
                                    <p class="font-semibold text-indigo-700 mt-1 text-lg">${printingJob.page_count || 'N/A'}</p>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">Copies</span>
                                    <p class="font-semibold text-indigo-700 mt-1 text-lg">${printingJob.copies}</p>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">Color Mode</span>
                                    <p class="font-semibold ${printingJob.color_mode === 'Colored' ? 'text-pink-600' : 'text-gray-700'} mt-1">${printingJob.color_mode}</p>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-600 uppercase font-bold">Paper Size</span>
                                    <p class="font-semibold text-gray-900 mt-1">${printingJob.paper_size}</p>
                                </div>
                            </div>
                            
                            ${printingJob.double_sided ? '<p class="text-sm text-gray-700 mt-2"><i class="fas fa-check-circle text-green-600 mr-1"></i>Double-sided</p>' : ''}
                            ${printingJob.collate ? '<p class="text-sm text-gray-700"><i class="fas fa-check-circle text-green-600 mr-1"></i>Collated</p>' : ''}
                            ${printingJob.instructions ? `<div class="mt-3 pt-3 border-t border-indigo-200"><span class="text-xs text-gray-600 uppercase font-bold">Instructions:</span><p class="text-sm text-gray-700 mt-1">${printingJob.instructions}</p></div>` : ''}
                        </div>
                        
                        <div class="flex gap-3">
                            <a href="../../${printingJob.file_path}" download target="_blank" class="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-3 rounded-xl font-bold text-center shadow-md hover:shadow-lg transition-all">
                                <i class="fas fa-download mr-2"></i>Download File
                            </a>
                        </div>
                        
                        ${printingJob.estimated_price ? `
                        <div class="mt-4 pt-4 border-t-2 border-indigo-200 flex items-center justify-between bg-white/50 rounded-lg px-4 py-3">
                            <span class="text-sm font-semibold text-gray-700">Estimated Cost:</span>
                            <span class="text-2xl font-bold text-indigo-900">₱${parseFloat(printingJob.estimated_price).toFixed(2)}</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : `
                    <div class="bg-gradient-to-br from-orange-50 to-amber-100/50 rounded-2xl p-6 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h4 class="font-bold text-xl text-orange-900 mb-5 flex items-center gap-3">
                            <div class="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-md">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                                </svg>
                            </div>
                            <span>Items Ordered</span>
                        </h4>
                        <div class="bg-white/70 rounded-xl p-4 mb-4">
                            <p class="text-sm text-gray-600 font-semibold mb-2">Order Details:</p>
                            <ul class="space-y-2.5">
                                ${itemList}
                            </ul>
                        </div>
                        <div class="mt-4 pt-4 border-t-2 border-orange-200 flex items-center justify-between bg-white/50 rounded-lg px-4 py-3">
                            <span class="text-sm font-semibold text-gray-700">Total Items:</span>
                            <span class="text-2xl font-bold text-orange-900">${items.length}</span>
                        </div>
                    </div>
                    `}
                    
                    </div>
                </div>
                
                <!-- Footer - Sticky Action Buttons -->
                <div class="bg-gray-50 border-t-2 border-gray-200 p-5 rounded-b-3xl flex-shrink-0 sticky bottom-0">
                    <div class="flex gap-3">
                        <select onchange="if(this.value) { updateOrderStatus(${order.order_id}, this.value); this.closest('.fixed').remove(); }" 
                                class="flex-1 border-2 border-gray-300 rounded-xl px-5 py-3.5 text-sm font-bold bg-white hover:border-blue-600 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all shadow-sm hover:shadow-md cursor-pointer">
                            <option value="">Change Status...</option>
                            <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_orders.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store queue number before fetchOrders clears currentQueueOrder
            const queueNumber = currentQueueOrder ? currentQueueOrder.queue_number : 'N/A';
            
            // Refresh orders to show updated status
            await fetchOrders();
            
            // Show success message
            const statusLabels = {
                'processing': 'started processing',
                'ready': 'marked as ready',
                'completed': 'completed',
                'cancelled': 'cancelled'
            };
            
            showNotification(`Order ${queueNumber} ${statusLabels[newStatus]}!`, 'success');
        } else {
            await showAlert(result.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        await showAlert('An error occurred while updating the order status', 'error');
    }
}

function updateCounts(stats) {
    if (stats) {
        document.getElementById('pendingCount').textContent = stats.pending || 0;
        document.getElementById('readyCount').textContent = stats.ready || 0;
        document.getElementById('doneCount').textContent = stats.completed || 0;
    } else {
        // Fallback to counting from ordersData
        const pending = ordersData.filter(o => o.order_status === 'pending').length;
        const ready = ordersData.filter(o => o.order_status === 'ready').length;
        const completed = ordersData.filter(o => o.order_status === 'completed').length;
        
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('readyCount').textContent = ready;
        document.getElementById('doneCount').textContent = completed;
    }
}

// Connection status indicator
function updateConnectionStatus(isConnected) {
    const statusDot = document.getElementById('connectionStatus');
    if (!statusDot) return; // Element doesn't exist, skip update
    
    if (isConnected) {
        statusDot.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
    } else {
        statusDot.className = 'w-3 h-3 rounded-full bg-red-500';
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh every 5 seconds
    refreshInterval = setInterval(() => {
        fetchOrders();
    }, 5000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Queue Management Functions
function updateCurrentQueue() {
    // Get pending/processing orders - already sorted by created_at ASC (FIFO) from API
    const pendingOrders = ordersData.filter(o => o.order_status === 'pending' || o.order_status === 'processing');
    
    // --- ADDED: Get references to the button containers ---
    const startButtonDiv = document.getElementById('queue-action-start');
    const processButtonsDiv = document.getElementById('queue-action-process');

    if (pendingOrders.length === 0) {
        // No orders in queue
        document.getElementById('currentOrderCard').classList.add('hidden');
        document.getElementById('noQueueMessage').classList.remove('hidden');
        currentQueueOrder = null;

        // --- ADDED: Hide both button containers if no order ---
        startButtonDiv.classList.add('hidden');
        processButtonsDiv.classList.add('hidden');

        document.getElementById('queuePosition').textContent = 'Queue: 0 of 0';
        return;
    }
    
    // Show first pending order
    document.getElementById('currentOrderCard').classList.remove('hidden');
    document.getElementById('noQueueMessage').classList.add('hidden');
    
    currentQueueOrder = pendingOrders[0];

    // ... (all the code that updates text content, from line 536 to 563) ...
    document.getElementById('currentStudentProgram').textContent = `${currentQueueOrder.program} - ${currentQueueOrder.year_level} ${currentQueueOrder.section}` || 'N/A';
    
    // --- ADDED: This block controls which buttons are visible ---
    if (currentQueueOrder.order_status === 'pending') {
        startButtonDiv.classList.remove('hidden');
        processButtonsDiv.classList.add('hidden');
    } else if (currentQueueOrder.order_status === 'processing') {
        startButtonDiv.classList.add('hidden');
        processButtonsDiv.classList.remove('hidden');
    }
    // --- END OF ADDED BLOCK ---
    
    // Update queue position
    document.getElementById('queuePosition').textContent = `Queue: 1 of ${pendingOrders.length}`;
    
    // Update order information
    document.getElementById('currentQueueNumber').textContent = currentQueueOrder.queue_number;
    document.getElementById('currentReferenceNumber').textContent = currentQueueOrder.reference_number || 'N/A';
    document.getElementById('currentItemOrdered').textContent = currentQueueOrder.item_ordered;
    const createdTime = new Date(currentQueueOrder.created_at).toLocaleString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('currentTimePlaced').textContent = createdTime;
    
    // Update student information
    document.getElementById('currentStudentId').textContent = currentQueueOrder.student_id;
    document.getElementById('currentStudentName').textContent = `${currentQueueOrder.first_name} ${currentQueueOrder.last_name}`;
    document.getElementById('currentStudentEmail').textContent = currentQueueOrder.email;
    document.getElementById('currentStudentProgram').textContent = `${currentQueueOrder.program} - ${currentQueueOrder.year_level} ${currentQueueOrder.section}` || 'N/A';
}

async function processQueue(newStatus) {
    if (!currentQueueOrder) {
        await showAlert('No order in queue to process', 'warning');
        return;
    }
    
    const confirmMessages = {
        'processing': 'Start processing this order? The student will be notified to proceed to COOP.',
        'completed': 'Mark this order as completed?',
        'cancelled': 'Cancel this order? You will need to provide a reason.'
    };
    
    const confirmed = await showConfirm(confirmMessages[newStatus]);
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_orders.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: currentQueueOrder.order_id,
                status: newStatus
            })
        });
        
        // Log response details for debugging
        console.log('Process Queue Response Status:', response.status);
        console.log('Process Queue Response OK:', response.ok);
        
        const responseText = await response.text();
        console.log('Process Queue Raw Response:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            console.error('Response text:', responseText);
            await showAlert('Server returned invalid response. Check console for details.', 'error');
            return;
        }
        
        if (result.success) {
            // Store queue number before fetchOrders clears currentQueueOrder
            const queueNumber = currentQueueOrder ? currentQueueOrder.queue_number : 'N/A';
            
            // Refresh orders to show updated status
            await fetchOrders();
            
            // Show success message
            const statusLabels = {
                'processing': 'is now being processed! Student has been notified.',
                'completed': 'has been completed successfully!',
                'cancelled': 'has been cancelled.'
            };
            
            showNotification(`Order ${queueNumber} ${statusLabels[newStatus]}`, 'success');
        } else {
            // Show detailed error information
            console.error('Order update failed:', result);
            let errorMsg = result.message || 'Failed to update order status';
            if (result.error) {
                errorMsg += '\n\nError: ' + result.error;
            }
            if (result.file && result.line) {
                console.error('Error location:', result.file, 'Line:', result.line);
            }
            await showAlert(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        await showAlert('An error occurred while updating the order status: ' + error.message, 'error');
    }
}

async function skipQueue() {
    if (!currentQueueOrder) {
        await showAlert('No order in queue to skip', 'warning');
        return;
    }
    
    const confirmed = await showConfirm('Skip this order? It will remain in the queue but move to the end.');
    if (!confirmed) {
        return;
    }
    
    // Move current order to end of pending orders
    const currentIndex = ordersData.findIndex(o => o.order_id === currentQueueOrder.order_id);
    if (currentIndex !== -1) {
        const skippedOrder = ordersData.splice(currentIndex, 1)[0];
        ordersData.push(skippedOrder);
        updateCurrentQueue();
        showNotification(`Order ${currentQueueOrder.queue_number} skipped`, 'info');
    }
}

function showNotification(message, type = 'success') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

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
        <div class="flex items-center gap-3 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-in" style="pointer-events: auto;">
            ${icons[type]}
            <span class="font-semibold">${message}</span>
            <button onclick="this.closest('.notification-toast').remove()" class="ml-2 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;

    notification.style.cssText = `
        animation: slideIn 0.3s ease-out;
        width: 100%;
    `;

    // Add to container (new notifications appear at the bottom)
    container.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
            // Remove container if no notifications left
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 5000);

    // Limit to max 5 notifications
    while (container.children.length > 5) {
        container.firstChild.remove();
    }
}

// Custom Alert Modal
function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        
        const icons = {
            success: `<svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
            error: `<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`,
            warning: `<svg class="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>`,
            info: `<svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                   </svg>`
        };
        
        modal.innerHTML = `
            <div class="custom-modal-content animate-modal-in">
                <div class="flex flex-col items-center text-center p-6">
                    <div class="mb-4">
                        ${icons[type] || icons.info}
                    </div>
                    <p class="text-gray-700 text-lg mb-6 whitespace-pre-line">${message}</p>
                    <button onclick="this.closest('.custom-modal-overlay').remove()" 
                            class="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                        OK
                    </button>
                </div>
            </div>
        `;
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve();
            }
        };
        
        modal.querySelector('button').onclick = () => {
            modal.remove();
            resolve();
        };
        
        document.body.appendChild(modal);
    });
}

// Custom Confirm Modal
function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const {
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning',
            danger = false
        } = options;
        
        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        
        const icons = {
            warning: `<svg class="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>`,
            danger: `<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                     </svg>`,
            info: `<svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                   </svg>`
        };
        
        const confirmButtonClass = danger 
            ? 'px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl'
            : 'px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl';
        
        modal.innerHTML = `
            <div class="custom-modal-content animate-modal-in">
                <div class="flex flex-col items-center text-center p-6">
                    <div class="mb-4">
                        ${icons[danger ? 'danger' : type]}
                    </div>
                    <p class="text-gray-700 text-lg mb-6 whitespace-pre-line">${message}</p>
                    <div class="flex gap-3">
                        <button class="cancel-btn px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200">
                            ${cancelText}
                        </button>
                        <button class="confirm-btn ${confirmButtonClass}">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
        
        modal.querySelector('.cancel-btn').onclick = () => {
            modal.remove();
            resolve(false);
        };
        
        modal.querySelector('.confirm-btn').onclick = () => {
            modal.remove();
            resolve(true);
        };
        
        document.body.appendChild(modal);
    });
}

// Fetch email logs from API
async function fetchEmailLogs() {
    try {
        const type = document.getElementById('filterEmailType').value;
        const status = document.getElementById('filterEmailStatus').value;
        const search = document.getElementById('searchEmail').value;
        
        const response = await fetch(`${API_BASE}/admin/email_logs.php?type=${type}&status=${status}&search=${search}&archived=${showingArchivedLogs}&limit=100`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayEmailLogs(result.data.logs);
            updateEmailStats(result.data.stats);
        } else if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Error fetching email logs:', error);
    }
    selectedLogIds = [];
    updateSelectedCount();
}

// Display email logs in table
function displayEmailLogs(logs) {
    const tbody = document.getElementById('emailLogsTableBody');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No email logs found</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusColor = log.status === 'sent' ? 'bg-green-500' : 'bg-red-500';
        const sentTime = new Date(log.sent_at).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const typeColors = {
            'otp': 'bg-blue-100 text-blue-800',
            'receipt': 'bg-green-100 text-green-800',
            'status_update': 'bg-purple-100 text-purple-800'
        };
        
        row.innerHTML = `
            <td class="px-6 py-4 email-log-checkbox-column hidden">
                <input type="checkbox" class="log-checkbox w-4 h-4" data-log-id="${log.log_id}" onchange="handleLogCheckbox()">
            </td>
            <td class="px-6 py-4">${log.log_id || 'N/A'}</td>
            <td class="px-6 py-4">${log.recipient_email || 'N/A'}</td>
            <td class="px-6 py-4">
                <span class="${typeColors[log.email_type] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded text-xs font-bold uppercase">
                    ${(log.email_type || '').replace('_', ' ')}
                </span>
            </td>
            <td class="px-6 py-4">${log.subject || 'N/A'}</td>
            <td class="px-6 py-4">${sentTime}</td>
            <td class="px-6 py-4">
                <span class="${statusColor} text-white px-3 py-1 rounded text-xs font-bold uppercase">
                    ${log.status || 'N/A'}
                </span>
            </td>
        `;
        
        // Add error message tooltip if failed
        if (log.status === 'failed' && log.error_message) {
            row.title = `Error: ${log.error_message}`;
            row.style.cursor = 'help';
        }
        
        tbody.appendChild(row);
    });
}

// Update email statistics
function updateEmailStats(stats) {
    document.getElementById('totalEmails').textContent = stats.total || 0;
    document.getElementById('sentEmails').textContent = stats.sent || 0;
    document.getElementById('failedEmails').textContent = stats.failed || 0;
    
    const successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0;
    document.getElementById('successRate').textContent = successRate + '%';
}

// Toggle archived view
function toggleArchivedView() {
    showingArchivedLogs = !showingArchivedLogs;
    const viewArchivedBtn = document.getElementById('viewArchivedBtnMenu');
    const archiveBtn = document.getElementById('archiveEmailLogsBtnMenu');
    const title = document.getElementById('emailLogsTableTitle');
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    const isSuperAdmin = adminData && adminData.is_super_admin == 1;
    
    if (showingArchivedLogs) {
        // Viewing archived logs
        if (viewArchivedBtn) {
            viewArchivedBtn.innerHTML = '<i class="fas fa-eye text-green-600 w-5"></i><span class="font-semibold text-gray-700">View Active</span>';
        }
        if (archiveBtn) {
            archiveBtn.innerHTML = '<i class="fas fa-undo text-green-600 w-5"></i><span class="font-semibold text-gray-700">Restore Logs</span>';
        }
        title.textContent = 'Archived Email Logs';
    } else {
        // Viewing active logs
        if (viewArchivedBtn) {
            viewArchivedBtn.innerHTML = '<i class="fas fa-folder-open text-gray-600 w-5"></i><span class="font-semibold text-gray-700">View Archived</span>';
        }
        if (archiveBtn) {
            archiveBtn.innerHTML = '<i class="fas fa-archive text-blue-900 w-5"></i><span class="font-semibold text-gray-700">Archive Logs</span>';
        }
        title.textContent = 'Email History';
    }
    fetchEmailLogs();
}

// Handle individual checkbox selection
function handleLogCheckbox() {
    selectedLogIds = Array.from(document.querySelectorAll('.log-checkbox:checked'))
        .map(cb => cb.dataset.logId);
    updateSelectedCount();
}

// Toggle select all checkboxes
function toggleSelectAllLogs() {
    const selectAll = document.getElementById('selectAllLogs').checked;
    document.querySelectorAll('.log-checkbox').forEach(cb => {
        cb.checked = selectAll;
    });
    handleLogCheckbox();
}

// Update selected count display
function updateSelectedCount() {
    const count = selectedLogIds.length;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectedCountRestore').textContent = count;
    document.getElementById('selectedCountDelete').textContent = count;
}

/**
 * Enter email archive mode - show checkboxes and action buttons
 */
function enterEmailArchiveMode() {
    // Show checkbox column
    document.querySelectorAll('.email-log-checkbox-column').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Determine which buttons to show based on archive status
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    const isSuperAdmin = adminData && adminData.is_super_admin == 1;
    
    if (showingArchivedLogs) {
        // In archived view - show restore/delete buttons
        document.getElementById('archiveAllBtn').classList.add('hidden');
        document.getElementById('archiveLogsBtn').classList.add('hidden');
        document.getElementById('restoreAllBtn').classList.remove('hidden');
        document.getElementById('restoreLogsBtn').classList.remove('hidden');
        if (isSuperAdmin) {
            document.getElementById('deleteLogsBtn').classList.remove('hidden');
        }
    } else {
        // In active view - show archive buttons
        document.getElementById('archiveAllBtn').classList.remove('hidden');
        document.getElementById('archiveLogsBtn').classList.remove('hidden');
        document.getElementById('restoreAllBtn').classList.add('hidden');
        document.getElementById('restoreLogsBtn').classList.add('hidden');
        document.getElementById('deleteLogsBtn').classList.add('hidden');
    }
    
    // Show action panel, hide kebab menu
    document.getElementById('emailLogActions').classList.remove('hidden');
    document.getElementById('emailKebabMenu').classList.add('hidden');
    
    // Reset selection
    selectedLogIds = [];
    document.getElementById('selectAllLogs').checked = false;
    updateSelectedCount();
}

/**
 * Exit email archive mode - hide checkboxes and action buttons
 */
function exitEmailArchiveMode() {
    // Hide checkbox column
    document.querySelectorAll('.email-log-checkbox-column').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Hide action panel, show kebab menu
    document.getElementById('emailLogActions').classList.add('hidden');
    document.getElementById('emailKebabMenu').classList.remove('hidden');
    
    // Reset selection
    selectedLogIds = [];
    document.getElementById('selectAllLogs').checked = false;
    document.querySelectorAll('.log-checkbox').forEach(cb => cb.checked = false);
    updateSelectedCount();
}

/**
 * Archive all email logs (no selection needed)
 */
async function archiveAllEmailLogs() {
    // Get all visible log IDs
    const allLogIds = Array.from(document.querySelectorAll('.log-checkbox'))
        .map(cb => cb.dataset.logId);
    
    if (allLogIds.length === 0) {
        showNotification('No active logs to archive', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Archive all ${allLogIds.length} visible email logs?`);
    if (!confirmed) {
        return;
    }
    
    try {
        
        const response = await fetch(`${API_BASE}/admin/email_logs.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'archive',
                log_ids: allLogIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Archived ${allLogIds.length} log(s) successfully`, 'success');
            exitEmailArchiveMode();
            fetchEmailLogs();
        } else {
            await showAlert(result.message || 'Failed to archive logs', 'error');
        }
    } catch (error) {
        console.error('Error archiving logs:', error);
        await showAlert('Error archiving logs', 'error');
    }
}

/**
 * Restore all email logs (no selection needed)
 */
async function restoreAllEmailLogs() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        showNotification('Only super admins can restore logs', 'error');
        return;
    }
    
    const allLogIds = Array.from(document.querySelectorAll('.log-checkbox'))
        .map(cb => cb.dataset.logId);
    
    if (allLogIds.length === 0) {
        showNotification('No archived logs to restore', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Restore all ${allLogIds.length} visible email logs?`);
    if (!confirmed) {
        return;
    }
    
    try {
        
        const response = await fetch(`${API_BASE}/admin/email_logs.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore',
                log_ids: allLogIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Restored ${allLogIds.length} log(s) successfully`, 'success');
            exitEmailArchiveMode();
            fetchEmailLogs();
        } else {
            await showAlert(result.message || 'Failed to restore logs', 'error');
        }
    } catch (error) {
        console.error('Error restoring logs:', error);
        await showAlert('Error restoring logs', 'error');
    }
}

// Archive selected logs
async function archiveSelectedLogs() {
    if (selectedLogIds.length === 0) {
        showNotification('Please select logs to archive', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Archive ${selectedLogIds.length} log(s)?`);
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/email_logs.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'archive',
                log_ids: selectedLogIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Archived ${selectedLogIds.length} log(s) successfully`, 'success');
            exitEmailArchiveMode();
            fetchEmailLogs();
        } else {
            await showAlert(result.message || 'Failed to archive logs', 'error');
        }
    } catch (error) {
        console.error('Error archiving logs:', error);
        await showAlert('Error archiving logs', 'error');
    }
}

// Restore selected logs (super admin only)
async function restoreSelectedLogs() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        showNotification('Only super admin can restore archived logs', 'error');
        return;
    }
    
    if (selectedLogIds.length === 0) {
        showNotification('Please select logs to restore', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Restore ${selectedLogIds.length} log(s)?`);
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/email_logs.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore',
                log_ids: selectedLogIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Restored ${selectedLogIds.length} log(s) successfully`, 'success');
            exitEmailArchiveMode();
            fetchEmailLogs();
        } else {
            await showAlert(result.message || 'Failed to restore logs', 'error');
        }
    } catch (error) {
        console.error('Error restoring logs:', error);
        await showAlert('Error restoring logs', 'error');
    }
}

// Delete selected logs permanently (super admin only)
async function deleteSelectedLogs() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin == 0 || !adminData.is_super_admin) {
        showNotification('Only super admin can permanently delete logs', 'error');
        return;
    }
    
    if (selectedLogIds.length === 0) {
        showNotification('Please select logs to delete', 'warning');
        return;
    }
    
    const confirmed1 = await showConfirm(
        `PERMANENTLY DELETE ${selectedLogIds.length} log(s)?\n\nThis action CANNOT be undone!`,
        { danger: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed1) {
        return;
    }
    
    // Second confirmation for deletion
    const confirmed2 = await showConfirm(
        'Are you absolutely sure?\n\nThis will permanently remove these logs from the database.',
        { danger: true, confirmText: 'Yes, Delete Forever', cancelText: 'Cancel' }
    );
    if (!confirmed2) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/email_logs.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                log_ids: selectedLogIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Permanently deleted ${selectedLogIds.length} log(s)`, 'success');
            exitEmailArchiveMode();
            fetchEmailLogs();
        } else {
            showNotification(result.message || 'Failed to delete logs', 'error');
        }
    } catch (error) {
        console.error('Error deleting logs:', error);
        showNotification('Error deleting logs', 'error');
    }
}

// Fetch inventory stock status
async function fetchInventoryStatusAdmin() {
    try {
        const response = await fetch(`${API_BASE}/inventory_status.php`);
        const result = await response.json();
        
        if (result.success && result.data.items) {
            // Convert items array to lookup object for backward compatibility
            inventoryStock = {};
            result.data.items.forEach(item => {
                inventoryStock[item.item_name] = item.is_available && item.stock_quantity > 0;
            });
        }
    } catch (error) {
        console.error('Error fetching inventory status:', error);
    }
}

// Initialize data on page load
async function initializeDashboard() {
    try {
        const adminData = JSON.parse(sessionStorage.getItem('adminData'));
        if (adminData) {
            // Set name in top bar (first name only)
            const fullName = adminData.full_name || adminData.username || 'Admin';
            const firstName = fullName.split(' ')[0];
            document.getElementById('adminName').textContent = firstName;
            // Update admin profile footer (bottom of sidebar)
            updateAdminProfileFooter();
            // Profile picture is now set to Herons.png by default in HTML
        }
        
        await fetchInventoryStatusAdmin();
        await fetchOrders();
        await fetchStudents();
        // Don't load email logs on init - only when tab is clicked
        // await fetchEmailLogs();
        updateCurrentQueue();
        startAutoRefresh();
    } catch (error) {
        console.error('Dashboard init error:', error);
    }
}

// Check if super admin and show management tab
function checkSuperAdminAccess() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData') || '{}');
    if (adminData && adminData.is_super_admin == 1) {
        document.getElementById('tab-admin-management').classList.remove('hidden');
        // Show export admin logs button for super admin
        const exportAdminLogsBtn = document.getElementById('exportAdminLogsBtn');
        if (exportAdminLogsBtn) {
            exportAdminLogsBtn.classList.remove('hidden');
        }
    } else {
        // Hide export admin logs button for regular admin
        const exportAdminLogsBtn = document.getElementById('exportAdminLogsBtn');
        if (exportAdminLogsBtn) {
            exportAdminLogsBtn.classList.add('hidden');
        }
    }
}

// Fetch admin accounts
async function fetchAdminAccounts() {
    try {
        const adminData = JSON.parse(sessionStorage.getItem('adminData'));
        
        // Check if user is super admin before making the request
        if (!adminData || adminData.is_super_admin == 0 || !adminData.is_super_admin) {
            // Silently return if not super admin - this is expected behavior
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/admin_management.php?archived=${showingArchivedAdmins}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayAdminAccounts(result.data.admins);
            updateAdminStats(result.data.admins); // Update stats after loading admins
            populateAdminFilter(result.data.admins); // Populate admin filter dropdown
        } else if (response.status === 403) {
            // Silently handle 403 - user is not authorized
            return;
        } else {
            console.error('Failed to fetch admin accounts:', result.message);
        }
    } catch (error) {
        // Only log error if it's not a network/403 error
        if (!error.message.includes('403')) {
            console.error('Error fetching admin accounts:', error);
        }
    }
}

// Display admin accounts in table
function displayAdminAccounts(admins) {
    const tbody = document.getElementById('adminAccountsTableBody');
    const emptyState = document.getElementById('adminEmptyState');
    tbody.innerHTML = '';
    
    if (admins.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    const currentAdminId = JSON.parse(sessionStorage.getItem('adminData') || '{}').admin_id;
    
    // Avatar color palette
    const avatarColors = [
        'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 
        'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    admins.forEach((admin, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-blue-50 transition-colors duration-150';
        
        const roleColor = admin.is_super_admin == 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-blue-600';
        const roleIcon = admin.is_super_admin == 1 ? 'bi-star-fill' : 'bi-shield-check';
        const roleText = admin.is_super_admin == 1 ? 'Super Admin' : 'Admin';
        
        const isCurrentUser = admin.admin_id == currentAdminId;
        const avatarColor = avatarColors[index % avatarColors.length];
        
        // Get initials from full name
        const getInitials = (name) => {
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        };
        const initials = getInitials(admin.full_name);
        
        // Status display
        const statusColor = showingArchivedAdmins ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700';
        const statusText = showingArchivedAdmins ? 'Archived' : 'Active';
        const statusDotColor = showingArchivedAdmins ? 'text-gray-400' : 'text-green-500';
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="${avatarColor} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        ${initials}
                    </div>
                    <div>
                        <div class="font-bold text-gray-800">${admin.full_name} ${isCurrentUser ? '<span class="text-orange-600">(You)</span>' : ''}</div>
                        <div class="text-sm text-gray-500">@${admin.username}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-gray-700">
                    <i class="bi bi-envelope text-blue-600"></i>
                    <span>${admin.email}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="${roleColor} text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md inline-flex items-center gap-1">
                    <i class="bi ${roleIcon}"></i>
                    ${roleText}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="${statusColor} px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                    <i class="bi bi-circle-fill ${statusDotColor}" style="font-size: 6px;"></i>
                    ${statusText}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2 justify-center">
                    ${!showingArchivedAdmins ? `
                        <button onclick='editAdmin(${JSON.stringify(admin).replace(/'/g, "&#39;")})' 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow hover:shadow-md flex items-center gap-1">
                            <i class="bi bi-pencil-square"></i>
                            <span>Edit</span>
                        </button>
                        ${!isCurrentUser ? `
                            <button onclick="archiveAdmin(${admin.admin_id}, '${admin.full_name.replace(/'/g, "&#39;")}')" 
                                    class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow hover:shadow-md flex items-center gap-1">
                                <i class="bi bi-archive"></i>
                                <span>Archive</span>
                            </button>
                        ` : ''}
                    ` : `
                        <button onclick="restoreAdmin(${admin.admin_id}, '${admin.full_name.replace(/'/g, "&#39;")}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow hover:shadow-md flex items-center gap-1">
                            <i class="bi bi-arrow-counterclockwise"></i>
                            <span>Restore</span>
                        </button>
                        <button onclick="permanentDeleteAdmin(${admin.admin_id}, '${admin.full_name.replace(/'/g, "&#39;")}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow hover:shadow-md flex items-center gap-1">
                            <i class="bi bi-trash3"></i>
                            <span>Delete</span>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Modal functions for Create Admin
function openCreateAdminModal() {
    const modal = document.getElementById('createAdminModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('createAdminForm').reset();
}

function closeCreateAdminModal() {
    const modal = document.getElementById('createAdminModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Search admin accounts
function searchAdmins() {
    const searchTerm = document.getElementById('searchAdmins').value.toLowerCase();
    const tbody = document.getElementById('adminAccountsTableBody');
    const rows = tbody.getElementsByTagName('tr');
    let visibleCount = 0;
    
    for (let row of rows) {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    }
    
    // Show/hide empty state
    const emptyState = document.getElementById('adminEmptyState');
    if (visibleCount === 0) {
        emptyState.classList.remove('hidden');
        emptyState.querySelector('p').textContent = 'No admins match your search';
    } else {
        emptyState.classList.add('hidden');
    }
}

// Create admin form handler
document.getElementById('createAdminForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnContent = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin mr-2"></i>Creating...';
    
    const formData = {
        full_name: document.getElementById('newAdminFullName').value,
        username: document.getElementById('newAdminUsername').value,
        email: document.getElementById('newAdminEmail').value,
        password: document.getElementById('newAdminPassword').value,
        is_super_admin: document.getElementById('newAdminSuperAdmin').checked ? 1 : 0
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin account created successfully!', 'success');
            closeCreateAdminModal();
            e.target.reset();
            await fetchAdminAccounts();
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        showNotification('A connection error occurred.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
});

// Edit admin
function editAdmin(admin) {
    document.getElementById('editAdminId').value = admin.admin_id;
    document.getElementById('editAdminFullName').value = admin.full_name;
    document.getElementById('editAdminUsername').value = admin.username;
    document.getElementById('editAdminEmail').value = admin.email;
    document.getElementById('editAdminPassword').value = '';
    document.getElementById('editAdminSuperAdmin').checked = admin.is_super_admin == 1;
    
    const modal = document.getElementById('editAdminModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditModal() {
    const modal = document.getElementById('editAdminModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('editAdminMessage').textContent = '';
}

// Edit admin form handler
document.getElementById('editAdminForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const messageEl = document.getElementById('editAdminMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    messageEl.textContent = '';
    
    const formData = {
        admin_id: document.getElementById('editAdminId').value,
        full_name: document.getElementById('editAdminFullName').value,
        username: document.getElementById('editAdminUsername').value,
        email: document.getElementById('editAdminEmail').value,
        is_super_admin: document.getElementById('editAdminSuperAdmin').checked ? 1 : 0
    };
    
    const password = document.getElementById('editAdminPassword').value;
    if (password) {
        formData.password = password;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            messageEl.textContent = 'Admin account updated successfully!';
            messageEl.className = 'mt-4 text-sm font-medium text-green-600';
            await fetchAdminAccounts();
            setTimeout(closeEditModal, 1500);
        } else {
            messageEl.textContent = `Error: ${result.message}`;
            messageEl.className = 'mt-4 text-sm font-medium text-red-600';
        }
    } catch (error) {
        console.error('Error updating admin:', error);
        messageEl.textContent = 'A connection error occurred.';
        messageEl.className = 'mt-4 text-sm font-medium text-red-600';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update';
    }
});

// Delete admin
async function deleteAdmin(adminId, fullName) {
    const confirmed = await showConfirm(
        `Are you sure you want to delete admin account: ${fullName}?\n\nThis action cannot be undone.`,
        { danger: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin account deleted successfully', 'success');
            await fetchAdminAccounts();
        } else {
            await showAlert(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        await showAlert('A connection error occurred.', 'error');
    }
}

// ============================================
// ANALYTICS DASHBOARD FUNCTIONS
// ============================================

// Current analytics filter state
let currentAnalyticsPeriod = 'daily';
let analyticsFilters = {
    college: '',
    program: '',
    itemFilter: '',
    studentId: '',
    startDate: '',
    endDate: ''
};

// Initialize analytics charts
function initAnalyticsCharts() {
    // Only initialize if not already done
    if (Object.keys(analyticsCharts).length > 0) {
        return;
    }
    
    // Monochromatic blue color palette
    const blueColors = {
        primary: 'rgba(37, 99, 235, 1)',       // Blue-600
        primaryLight: 'rgba(37, 99, 235, 0.6)',
        primaryBg: 'rgba(37, 99, 235, 0.1)',
        secondary: 'rgba(59, 130, 246, 1)',    // Blue-500
        secondaryLight: 'rgba(59, 130, 246, 0.6)',
        tertiary: 'rgba(96, 165, 250, 1)',     // Blue-400
        tertiaryLight: 'rgba(96, 165, 250, 0.6)'
    };
    
    // Teal accent colors
    const tealColors = {
        primary: 'rgba(15, 118, 110, 1)',      // Teal-700
        primaryLight: 'rgba(15, 118, 110, 0.6)',
        primaryBg: 'rgba(15, 118, 110, 0.1)',
        secondary: 'rgba(20, 184, 166, 1)',    // Teal-500
        secondaryLight: 'rgba(20, 184, 166, 0.6)'
    };
    
    // Orders Over Time (Line Chart)
    const ordersTimeCtx = document.getElementById('analyticsOrdersTimeChart').getContext('2d');
    analyticsCharts.ordersTime = new Chart(ordersTimeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Orders',
                data: [],
                borderColor: blueColors.primary,
                backgroundColor: blueColors.primaryBg,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: blueColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
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

    // Status Pie Chart - Blue/Teal monochromatic
    const statusPieCtx = document.getElementById('analyticsStatusPieChart').getContext('2d');
    analyticsCharts.statusPie = new Chart(statusPieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Processing', 'Ready', 'Completed', 'Cancelled'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(234, 179, 8, 0.85)',   // Yellow for Pending
                    'rgba(37, 99, 235, 0.85)',   // Blue for Processing
                    'rgba(15, 118, 110, 0.85)',  // Teal for Ready
                    'rgba(34, 197, 94, 0.85)',   // Green for Completed
                    'rgba(156, 163, 175, 0.85)'  // Gray for Cancelled
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Items Bar Chart - Blue gradient
    const itemsBarCtx = document.getElementById('analyticsItemsBarChart').getContext('2d');
    analyticsCharts.itemsBar = new Chart(itemsBarCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Number of Orders',
                data: [],
                backgroundColor: [
                    'rgba(30, 58, 138, 0.8)',   // Blue-900
                    'rgba(30, 64, 175, 0.8)',   // Blue-800
                    'rgba(29, 78, 216, 0.8)',   // Blue-700
                    'rgba(37, 99, 235, 0.8)',   // Blue-600
                    'rgba(59, 130, 246, 0.8)',  // Blue-500
                    'rgba(96, 165, 250, 0.8)',  // Blue-400
                    'rgba(147, 197, 253, 0.8)', // Blue-300
                    'rgba(15, 118, 110, 0.8)',  // Teal-700
                    'rgba(20, 184, 166, 0.8)',  // Teal-500
                    'rgba(45, 212, 191, 0.8)'   // Teal-400
                ],
                borderColor: [
                    'rgba(30, 58, 138, 1)',
                    'rgba(30, 64, 175, 1)',
                    'rgba(29, 78, 216, 1)',
                    'rgba(37, 99, 235, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(96, 165, 250, 1)',
                    'rgba(147, 197, 253, 1)',
                    'rgba(15, 118, 110, 1)',
                    'rgba(20, 184, 166, 1)',
                    'rgba(45, 212, 191, 1)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' orders';
                        }
                    }
                }
            }
        }
    });

    // Hourly Activity Chart - Teal gradient
    const hourlyCtx = document.getElementById('analyticsHourlyChart').getContext('2d');
    analyticsCharts.hourly = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Orders per Hour',
                data: Array(24).fill(0),
                backgroundColor: 'rgba(15, 118, 110, 0.6)',
                borderColor: 'rgba(15, 118, 110, 1)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
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

// Fetch analytics data from API
async function generateAnalyticsData() {
    try {
        // Build query string from filters
        const params = new URLSearchParams();
        params.append('period', currentAnalyticsPeriod);
        
        if (analyticsFilters.startDate) params.append('start_date', analyticsFilters.startDate);
        if (analyticsFilters.endDate) params.append('end_date', analyticsFilters.endDate);
        if (analyticsFilters.college) params.append('college', analyticsFilters.college);
        if (analyticsFilters.program) params.append('program', analyticsFilters.program);
        if (analyticsFilters.itemFilter) params.append('item_filter', analyticsFilters.itemFilter);
        if (analyticsFilters.studentId) params.append('student_id', analyticsFilters.studentId);
        
        const response = await fetch(`${API_BASE}/admin/analytics.php?${params.toString()}`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('API Error:', result.error);
            return;
        }
        
        const data = result.data;
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        
        // Update stats cards
        document.getElementById('analyticsTotalOrders').textContent = data.total_orders;
        document.getElementById('analyticsPendingOrders').textContent = data.status_distribution.pending;
        document.getElementById('analyticsCompletedOrders').textContent = data.status_distribution.completed;
        document.getElementById('analyticsAvgWaitTime').textContent = `${data.avg_wait_time}m`;

        // Update status pie chart
        analyticsCharts.statusPie.data.datasets[0].data = [
            data.status_distribution.pending,
            data.status_distribution.processing,
            data.status_distribution.ready,
            data.status_distribution.completed,
            data.status_distribution.cancelled
        ];
        analyticsCharts.statusPie.update();

        // Update hourly activity chart
        analyticsCharts.hourly.data.datasets[0].data = data.orders_over_time;
        analyticsCharts.hourly.update();

        // Update popular items bar chart
        if (data.popular_items && data.popular_items.length > 0) {
            analyticsCharts.itemsBar.data.labels = data.popular_items.map(item => item.item);
            analyticsCharts.itemsBar.data.datasets[0].data = data.popular_items.map(item => item.count);
            analyticsCharts.itemsBar.update();
        }

        // Update orders over time line chart (by day)
        if (data.orders_by_day && data.orders_by_day.length > 0) {
            analyticsCharts.ordersTime.data.labels = data.orders_by_day.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            analyticsCharts.ordersTime.data.datasets[0].data = data.orders_by_day.map(d => d.count);
            analyticsCharts.ordersTime.update();
        }

        // Update activity feed with Bootstrap Icons
        if (data.recent_activity && data.recent_activity.length > 0) {
            const feed = document.getElementById('analyticsActivityFeed');
            feed.innerHTML = ''; // Clear existing
            data.recent_activity.slice(0, 10).forEach(activity => {
                const time = new Date(activity.time);
                const statusColors = {
                    'pending': 'yellow',
                    'processing': 'blue',
                    'ready': 'teal',
                    'completed': 'green',
                    'cancelled': 'gray'
                };
                const statusIcons = {
                    'pending': '<i class="bi bi-hourglass-split text-yellow-600"></i>',
                    'processing': '<i class="bi bi-gear text-blue-600"></i>',
                    'ready': '<i class="bi bi-check2-circle text-teal-600"></i>',
                    'completed': '<i class="bi bi-trophy text-green-600"></i>',
                    'cancelled': '<i class="bi bi-x-circle text-gray-500"></i>'
                };
                const color = statusColors[activity.status] || 'gray';
                addAnalyticsActivityItem(
                    `${statusIcons[activity.status] || '<i class="bi bi-box"></i>'} Order ${activity.queue_number} - ${activity.student_name} - <span class="text-${color}-600 font-semibold">${activity.status}</span>`,
                    time.toLocaleTimeString()
                );
            });
        }
        
        // Populate filter dropdowns if available
        if (result.filters) {
            populateAnalyticsFilterDropdowns(result.filters);
        }

        // Update timestamp
        document.getElementById('analyticsUpdateTime').textContent = `Last updated: ${timeLabel}`;
        
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        addAnalyticsActivityItem('<i class="bi bi-exclamation-triangle text-red-600"></i> Error fetching data from API');
    }
}

// Populate filter dropdowns
function populateAnalyticsFilterDropdowns(filters) {
    const collegeSelect = document.getElementById('analyticsCollege');
    const programSelect = document.getElementById('analyticsProgram');
    
    // Only populate if empty (first load)
    if (collegeSelect && collegeSelect.options.length <= 1) {
        filters.colleges.forEach(college => {
            const option = document.createElement('option');
            option.value = college;
            option.textContent = college;
            collegeSelect.appendChild(option);
        });
    }
    
    if (programSelect && programSelect.options.length <= 1) {
        filters.programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.textContent = program;
            programSelect.appendChild(option);
        });
    }
}

// Add item to analytics activity feed
function addAnalyticsActivityItem(message, time = null) {
    const feed = document.getElementById('analyticsActivityFeed');
    const item = document.createElement('div');
    item.className = 'p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 text-sm animate-fade-in';
    const timestamp = time || new Date().toLocaleTimeString();
    item.innerHTML = `<span class="font-semibold text-gray-700">${timestamp}</span> - ${message}`;
    
    // Limit to 10 items
    if (feed.children.length >= 10) {
        feed.removeChild(feed.lastChild);
    }
    
    // Remove "Loading..." message if it exists
    if (feed.firstChild && feed.firstChild.tagName === 'P') {
        feed.removeChild(feed.firstChild);
    }
    
    // Insert at the top
    feed.insertBefore(item, feed.firstChild);
    
    // Keep scroll position at top
    feed.scrollTop = 0;
}

// Set analytics period (date preset buttons)
function setAnalyticsPeriod(period) {
    currentAnalyticsPeriod = period;
    
    // Update button styles
    document.querySelectorAll('.analytics-period-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-600');
    });
    
    const activeBtn = document.getElementById('period' + period.charAt(0).toUpperCase() + period.slice(1).replace('ly', '').replace('ek', 'eek').replace('nth', 'onth').replace('ar', 'ear'));
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-blue-600', 'text-white', 'border-blue-600');
        activeBtn.classList.remove('border-gray-300', 'text-gray-600');
    }
    
    // Clear custom date inputs when using presets
    document.getElementById('analyticsStartDate').value = '';
    document.getElementById('analyticsEndDate').value = '';
    analyticsFilters.startDate = '';
    analyticsFilters.endDate = '';
    
    generateAnalyticsData();
}

// Apply all analytics filters
function applyAnalyticsFilters() {
    // Collect filter values
    analyticsFilters.college = document.getElementById('analyticsCollege')?.value || '';
    analyticsFilters.program = document.getElementById('analyticsProgram')?.value || '';
    analyticsFilters.itemFilter = document.getElementById('analyticsItemFilter')?.value || '';
    analyticsFilters.studentId = document.getElementById('analyticsStudentId')?.value || '';
    analyticsFilters.startDate = document.getElementById('analyticsStartDate')?.value || '';
    analyticsFilters.endDate = document.getElementById('analyticsEndDate')?.value || '';
    
    // If custom dates are set, switch to custom period
    if (analyticsFilters.startDate && analyticsFilters.endDate) {
        currentAnalyticsPeriod = 'custom';
        // Clear period button highlights
        document.querySelectorAll('.analytics-period-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.add('border-gray-300', 'text-gray-600');
        });
    }
    
    generateAnalyticsData();
    addAnalyticsActivityItem('<i class="bi bi-funnel text-blue-600"></i> Filters applied');
}

// Download Analytics Report as CSV
function downloadAnalyticsReport() {
    // Collect current filter values
    const period = currentAnalyticsPeriod;
    const startDate = document.getElementById('analyticsStartDate')?.value || '';
    const endDate = document.getElementById('analyticsEndDate')?.value || '';
    const college = document.getElementById('analyticsCollege')?.value || '';
    const program = document.getElementById('analyticsProgram')?.value || '';
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('period', period);
    
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (college) params.append('college', college);
    if (program) params.append('program', program);
    
    // Construct download URL
    const url = `${API_BASE}/admin/export_analytics.php?${params.toString()}`;
    
    // Trigger download
    window.open(url, '_blank');
    
    addAnalyticsActivityItem('<i class="bi bi-file-earmark-spreadsheet text-green-600"></i> Report exported to CSV');
}

// Clear all analytics filters
function clearAnalyticsFilters() {
    // Reset filter state
    analyticsFilters = {
        college: '',
        program: '',
        itemFilter: '',
        studentId: '',
        startDate: '',
        endDate: ''
    };
    currentAnalyticsPeriod = 'daily';
    
    // Clear form inputs
    document.getElementById('analyticsCollege').value = '';
    document.getElementById('analyticsProgram').value = '';
    document.getElementById('analyticsItemFilter').value = '';
    document.getElementById('analyticsStudentId').value = '';
    document.getElementById('analyticsStartDate').value = '';
    document.getElementById('analyticsEndDate').value = '';
    
    // Reset period buttons
    setAnalyticsPeriod('daily');
    
    addAnalyticsActivityItem('<i class="bi bi-x-circle text-gray-600"></i> Filters cleared');
}

// ============================================
// END ANALYTICS DASHBOARD FUNCTIONS
// ============================================

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// ============================================
// INVENTORY MANAGEMENT FUNCTIONS
// ============================================

let inventoryData = [];
const INVENTORY_API_URL = `${API_BASE}/inventory.php`; // Use absolute path from same origin

// Load inventory on page load
async function loadInventory() {
    try {
        const response = await fetch(INVENTORY_API_URL, {
            method: 'GET',
            credentials: 'include', // Include session cookies
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.success) {
            inventoryData = result.data.items;
            renderInventory();
            updateInventoryStats();
        } else {
            console.error('Failed to load inventory:', result.message);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function renderInventory(items = inventoryData) {
    const tbody = document.getElementById('inventoryTableBody');
    
    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-2"></i>
                    <p>No items found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const stockBadge = getInventoryStockBadge(item.stock_quantity, item.low_stock_threshold);
        const availableBadge = item.is_available == 1 
            ? '<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">✓ Available</span>'
            : '<span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">✗ Unavailable</span>';
        
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-800">${item.item_name}</div>
                    ${item.description ? `<div class="text-sm text-gray-500">${item.description}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="font-bold text-lg">${item.stock_quantity}</div>
                </td>
                <td class="px-6 py-4 text-center text-gray-600">${item.low_stock_threshold}</td>
                <td class="px-6 py-4 text-center text-gray-600">${item.estimated_time}</td>
                <td class="px-6 py-4 text-center">${stockBadge}</td>
                <td class="px-6 py-4 text-center">${availableBadge}</td>
                <td class="px-6 py-4">
                    <div class="flex justify-center gap-2">
                        <button onclick="showEditItemModal(${item.item_id})" 
                                class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                                title="Edit Item">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="showStockModal(${item.item_id})" 
                                class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                                title="Adjust Stock">
                            <i class="fas fa-boxes"></i>
                        </button>
                        <button onclick="toggleItemAvailability(${item.item_id}, ${item.is_available})" 
                                class="px-3 py-1 ${item.is_available == 1 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded text-sm"
                                title="${item.is_available == 1 ? 'Mark Out of Stock' : 'Mark Available'}">
                            <i class="fas fa-${item.is_available == 1 ? 'ban' : 'check'}"></i>
                        </button>
                        <button onclick="deleteInventoryItem(${item.item_id}, '${item.item_name}')" 
                                class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                                title="Delete Item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getInventoryStockBadge(quantity, threshold) {
    if (quantity === 0) {
        return '<span class="stock-badge stock-out">Out of Stock</span>';
    } else if (quantity <= threshold) {
        return `<span class="stock-badge stock-low">Low Stock</span>`;
    } else {
        return '<span class="stock-badge stock-in">In Stock</span>';
    }
}

function updateInventoryStats() {
    const total = inventoryData.length;
    const inStock = inventoryData.filter(i => i.stock_quantity > i.low_stock_threshold).length;
    const lowStock = inventoryData.filter(i => i.stock_quantity > 0 && i.stock_quantity <= i.low_stock_threshold).length;
    const outOfStock = inventoryData.filter(i => i.stock_quantity === 0).length;

    document.getElementById('totalItems').textContent = total;
    document.getElementById('inStockCount').textContent = inStock;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('outOfStockCount').textContent = outOfStock;
}

function filterInventoryItems() {
    const search = document.getElementById('inventorySearchInput').value.toLowerCase();
    const filtered = inventoryData.filter(item => 
        item.item_name.toLowerCase().includes(search) ||
        (item.description && item.description.toLowerCase().includes(search))
    );
    renderInventory(filtered);
}

// Modal Functions
function showAddItemModal() {
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('isActive').checked = true;
    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemModal').style.display = 'flex';
}

function showEditItemModal(itemId) {
    const item = inventoryData.find(i => i.item_id === itemId);
    if (!item) return;

    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.item_id;
    document.getElementById('itemName').value = item.item_name;
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('stockQuantity').value = item.stock_quantity;
    document.getElementById('lowStockThreshold').value = item.low_stock_threshold;
    document.getElementById('estimatedTime').value = item.estimated_time;
    document.getElementById('isActive').checked = item.is_active == 1;
    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemModal').style.display = 'flex';
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
    document.getElementById('itemModal').style.display = 'none';
}

function showStockModal(itemId) {
    const item = inventoryData.find(i => i.item_id === itemId);
    if (!item) return;

    document.getElementById('stockItemId').value = item.item_id;
    document.getElementById('stockItemName').textContent = item.item_name;
    document.getElementById('currentStock').textContent = item.stock_quantity;
    document.getElementById('newStockQuantity').value = item.stock_quantity;
    document.getElementById('stockReason').value = '';
    document.getElementById('stockModal').classList.add('active');
    document.getElementById('stockModal').style.display = 'flex';
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
    document.getElementById('stockModal').style.display = 'none';
}

// CRUD Operations
async function saveInventoryItem(event) {
    event.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const data = {
        item_name: document.getElementById('itemName').value,
        description: document.getElementById('itemDescription').value,
        stock_quantity: parseInt(document.getElementById('stockQuantity').value),
        low_stock_threshold: parseInt(document.getElementById('lowStockThreshold').value),
        estimated_time: parseInt(document.getElementById('estimatedTime').value),
        is_active: document.getElementById('isActive').checked ? 1 : 0
    };

    try {
        const method = itemId ? 'PUT' : 'POST';
        if (itemId) data.item_id = parseInt(itemId);

        const response = await fetch(INVENTORY_API_URL, {
            method: method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification(itemId ? 'Item updated successfully' : 'Item added successfully', 'success');
            closeItemModal();
            loadInventory();
        } else {
            showNotification(result.message || 'Failed to save item', 'error');
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showNotification('Error saving item. Please try again.', 'error');
    }
}

async function adjustInventoryStock(event) {
    event.preventDefault();
    
    const itemId = parseInt(document.getElementById('stockItemId').value);
    const newQuantity = parseInt(document.getElementById('newStockQuantity').value);
    const reason = document.getElementById('stockReason').value;

    try {
        const response = await fetch(INVENTORY_API_URL, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                stock_quantity: newQuantity,
                stock_reason: reason || 'Manual stock adjustment'
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Stock updated successfully', 'success');
            closeStockModal();
            loadInventory();
        } else {
            showNotification(result.message || 'Failed to update stock', 'error');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Error updating stock. Please try again.', 'error');
    }
}

async function toggleItemAvailability(itemId, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'available' : 'out of stock';
    
    const confirmed = await showConfirm(`Mark this item as ${action}?`);
    if (!confirmed) return;

    try {
        const response = await fetch(INVENTORY_API_URL, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                is_available: newStatus
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification(`Item marked as ${action}`, 'success');
            loadInventory();
        } else {
            showNotification(result.message || 'Failed to update availability', 'error');
        }
    } catch (error) {
        console.error('Error updating availability:', error);
        showNotification('Error updating availability. Please try again.', 'error');
    }
}

async function deleteInventoryItem(itemId, itemName) {
    const confirmed = await showConfirm(
        `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`,
        { danger: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    try {
        const response = await fetch(INVENTORY_API_URL, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Item deleted successfully', 'success');
            loadInventory();
        } else {
            showNotification(result.message || 'Failed to delete item', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Error deleting item. Please try again.', 'error');
    }
}

// ============================================
// END INVENTORY MANAGEMENT FUNCTIONS
// ============================================

// ============================================
// ARCHIVE AND RESTORE FUNCTIONS
// ============================================

/**
 * Toggle between active and archived students view
 */
async function toggleArchivedStudentsView() {
    showingArchivedStudents = !showingArchivedStudents;
    const viewArchivedBtn = document.getElementById('viewArchivedStudentsBtnMenu');
    const archiveBtn = document.getElementById('archiveStudentsBtnMenu');
    const title = document.getElementById('studentsTableTitle');
    
    if (showingArchivedStudents) {
        // Viewing archived students
        if (viewArchivedBtn) {
            viewArchivedBtn.innerHTML = '<i class="fas fa-eye text-green-600 w-5"></i><span class="font-semibold text-gray-700">View Active</span>';
        }
        if (archiveBtn) {
            archiveBtn.innerHTML = '<i class="fas fa-undo text-green-600 w-5"></i><span class="font-semibold text-gray-700">Restore Students</span>';
        }
        title.textContent = 'Archived Students';
    } else {
        // Viewing active students
        if (viewArchivedBtn) {
            viewArchivedBtn.innerHTML = '<i class="fas fa-folder-open text-gray-600 w-5"></i><span class="font-semibold text-gray-700">View Archived</span>';
        }
        if (archiveBtn) {
            archiveBtn.innerHTML = '<i class="fas fa-archive text-blue-900 w-5"></i><span class="font-semibold text-gray-700">Archive Students</span>';
        }
        title.textContent = 'Active Students';
    }
    
    await fetchStudents();
}

/**
 * Archive a student record
 */
async function archiveStudent(studentId, studentName) {
    const confirmed = await showConfirm(
        `Archive student record: ${studentName}?\n\nThis will hide the student from the active list.`
    );
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'archive',
                student_id: studentId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Student archived successfully', 'success');
            await fetchStudents();
        } else {
            await showAlert(result.message || 'Failed to archive student', 'error');
        }
    } catch (error) {
        console.error('Error archiving student:', error);
        await showAlert('Error archiving student', 'error');
    }
}

/**
 * Restore an archived student (Super Admin only)
 */
async function restoreStudent(studentId, studentName) {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        await showAlert('Only super admin can restore archived students', 'error');
        return;
    }
    
    const confirmed = await showConfirm(`Restore student record: ${studentName}?`);
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore',
                student_id: studentId
            })
        });
        
        const result = await response.json();
        
        console.log('Restore response:', result); // Debug log
        
        if (result.success) {
            showNotification('Student restored successfully', 'success');
            await fetchStudents();
        } else {
            console.error('Restore failed:', result);
            await showAlert(result.message || 'Failed to restore student', 'error');
        }
    } catch (error) {
        console.error('Error restoring student:', error);
        await showAlert('Error restoring student: ' + error.message, 'error');
    }
}

/**
 * Archive student from details modal
 */
async function archiveStudentFromModal(studentId, studentName) {
    closeStudentModal();
    await archiveStudent(studentId, studentName);
}

/**
 * Restore student from details modal
 */
async function restoreStudentFromModal(studentId, studentName) {
    closeStudentModal();
    await restoreStudent(studentId, studentName);
}

/**
 * Archive all visible students
 */
async function archiveAllStudents() {
    const visibleStudents = showingArchivedStudents ? [] : studentsData.filter(s => !s.is_archived);
    
    if (visibleStudents.length === 0) {
        showNotification('No active students to archive', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Archive all ${visibleStudents.length} students?`);
    if (!confirmed) {
        return;
    }
    
    let successCount = 0;
    for (const student of visibleStudents) {
        try {
            const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'archive',
                    student_id: student.student_id
                })
            });
            
            const result = await response.json();
            if (result.success) successCount++;
        } catch (error) {
            console.error('Error archiving student:', error);
        }
    }
    
    showNotification(`${successCount} of ${visibleStudents.length} students archived successfully`, 'success');
    exitStudentArchiveMode();
    await fetchStudents();
}

/**
 * Archive selected students
 */
async function archiveSelectedStudents() {
    if (selectedStudentIds.length === 0) {
        showNotification('Please select students to archive', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Archive ${selectedStudentIds.length} selected students?`);
    if (!confirmed) {
        return;
    }
    
    let successCount = 0;
    for (const studentId of selectedStudentIds) {
        try {
            const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'archive',
                    student_id: studentId
                })
            });
            
            const result = await response.json();
            if (result.success) successCount++;
        } catch (error) {
            console.error('Error archiving student:', error);
        }
    }
    
    showNotification(`${successCount} of ${selectedStudentIds.length} students archived successfully`, 'success');
    exitStudentArchiveMode();
    await fetchStudents();
}

/**
 * Restore all visible archived students
 */
async function restoreAllStudents() {
    const archivedStudents = showingArchivedStudents ? studentsData.filter(s => s.is_archived) : [];
    
    if (archivedStudents.length === 0) {
        showNotification('No archived students to restore', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Restore all ${archivedStudents.length} archived students?`);
    if (!confirmed) {
        return;
    }
    
    let successCount = 0;
    let errors = [];
    for (const student of archivedStudents) {
        try {
            const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'restore',
                    student_id: student.student_id
                })
            });
            
            const result = await response.json();
            console.log(`Restore ${student.first_name} ${student.last_name}:`, result); // Debug
            if (result.success) {
                successCount++;
            } else {
                errors.push(`${student.first_name} ${student.last_name}: ${result.message}`);
            }
        } catch (error) {
            console.error('Error restoring student:', student.student_id, error);
            errors.push(`${student.first_name} ${student.last_name}: ${error.message}`);
        }
    }
    
    if (errors.length > 0) {
        console.error('Restore errors:', errors);
    }
    
    showNotification(`${successCount} of ${archivedStudents.length} students restored successfully`, successCount > 0 ? 'success' : 'error');
    exitStudentArchiveMode();
    await fetchStudents();
}

/**
 * Restore selected students
 */
async function restoreSelectedStudents() {
    if (selectedStudentIds.length === 0) {
        showNotification('Please select students to restore', 'warning');
        return;
    }
    
    const confirmed = await showConfirm(`Restore ${selectedStudentIds.length} selected students?`);
    if (!confirmed) {
        return;
    }
    
    let successCount = 0;
    let errors = [];
    for (const studentId of selectedStudentIds) {
        try {
            const response = await fetch(`${API_BASE}/admin/admin_students.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'restore',
                    student_id: studentId
                })
            });
            
            const result = await response.json();
            console.log(`Restore student ${studentId}:`, result); // Debug
            if (result.success) {
                successCount++;
            } else {
                errors.push(`${studentId}: ${result.message}`);
            }
        } catch (error) {
            console.error('Error restoring student:', studentId, error);
            errors.push(`${studentId}: ${error.message}`);
        }
    }
    
    if (errors.length > 0) {
        console.error('Restore errors:', errors);
    }
    
    showNotification(`${successCount} of ${selectedStudentIds.length} students restored successfully`, successCount > 0 ? 'success' : 'error');
    exitStudentArchiveMode();
    await fetchStudents();
}

/**
 * Toggle between active and archived admins view
 */
async function toggleArchivedAdminsView() {
    showingArchivedAdmins = !showingArchivedAdmins;
    const btn = document.getElementById('viewArchivedAdminsBtn');
    const title = document.getElementById('adminAccountsTableTitle');
    
    if (showingArchivedAdmins) {
        if (btn) {
            btn.innerHTML = '<i class="bi bi-person-check"></i><span>View Active</span>';
            btn.className = 'bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold whitespace-nowrap shadow-md hover:shadow-lg transition-all flex items-center gap-2';
        }
        if (title) {
            title.innerHTML = '<i class="bi bi-archive"></i><span>Archived Admins</span>';
        }
    } else {
        if (btn) {
            btn.innerHTML = '<i class="bi bi-archive"></i><span>View Archived</span>';
            btn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-5 py-3 rounded-xl font-bold whitespace-nowrap shadow-md hover:shadow-lg transition-all flex items-center gap-2';
        }
        if (title) {
            title.innerHTML = '<i class="bi bi-person-badge"></i><span>Admin Accounts</span>';
        }
    }
    
    await fetchAdminAccounts();
}

/**
 * Archive an admin account (Super Admin only)
 */
async function archiveAdmin(adminId, fullName) {
    const confirmed = await showConfirm(
        `Archive admin account: ${fullName}?\n\nThis will prevent them from logging in.`
    );
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'archive',
                admin_id: adminId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin account archived successfully', 'success');
            await fetchAdminAccounts();
        } else {
            await showAlert(result.message || 'Failed to archive admin', 'error');
        }
    } catch (error) {
        console.error('Error archiving admin:', error);
        await showAlert('Error archiving admin', 'error');
    }
}

/**
 * Restore an archived admin (Super Admin only)
 */
async function restoreAdmin(adminId, fullName) {
    const confirmed = await showConfirm(`Restore admin account: ${fullName}?`);
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore',
                admin_id: adminId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin account restored successfully', 'success');
            await fetchAdminAccounts();
        } else {
            await showAlert(result.message || 'Failed to restore admin', 'error');
        }
    } catch (error) {
        console.error('Error restoring admin:', error);
        await showAlert('Error restoring admin', 'error');
    }
}

/**
 * Permanently delete an archived admin (Super Admin only)
 */
async function permanentDeleteAdmin(adminId, fullName) {
    const confirmed1 = await showConfirm(
        `PERMANENTLY DELETE admin account: ${fullName}?\n\nThis action CANNOT be undone!`,
        { danger: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed1) {
        return;
    }
    
    const confirmed2 = await showConfirm(
        'Are you absolutely sure?\n\nThis will permanently remove this account from the database.',
        { danger: true, confirmText: 'Yes, Delete Forever', cancelText: 'Cancel' }
    );
    if (!confirmed2) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'permanent_delete',
                admin_id: adminId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin account permanently deleted', 'success');
            await fetchAdminAccounts();
        } else {
            await showAlert(result.message || 'Failed to delete admin', 'error');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        await showAlert('Error deleting admin', 'error');
    }
}

// ============================================
// END ARCHIVE AND RESTORE FUNCTIONS
// ============================================

// ============================================
// ADMIN MANAGEMENT TAB FUNCTIONS
// ============================================

/**
 * Switch between Admin Accounts and Activity Logs sub-tabs
 */
function switchAdminTab(tabName) {
    // Update button styles
    const accountsBtn = document.getElementById('admin-subtab-accounts');
    const logsBtn = document.getElementById('admin-subtab-logs');
    const accountsContent = document.getElementById('admin-content-accounts');
    const logsContent = document.getElementById('admin-content-logs');
    
    if (tabName === 'accounts') {
        accountsBtn.className = 'flex-1 px-6 py-4 font-bold text-blue-900 border-b-4 border-orange-500 bg-orange-50 transition-all duration-200 flex items-center justify-center gap-2';
        logsBtn.className = 'flex-1 px-6 py-4 font-bold text-gray-500 border-b-4 border-transparent hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2';
        accountsContent.classList.remove('hidden');
        logsContent.classList.add('hidden');
        fetchAdminAccounts();
    } else {
        accountsBtn.className = 'flex-1 px-6 py-4 font-bold text-gray-500 border-b-4 border-transparent hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2';
        logsBtn.className = 'flex-1 px-6 py-4 font-bold text-blue-900 border-b-4 border-orange-500 bg-orange-50 transition-all duration-200 flex items-center justify-center gap-2';
        accountsContent.classList.add('hidden');
        logsContent.classList.remove('hidden');
        fetchAdminLogs();
    }
}

/**
 * Filter admin accounts based on search
 */
function filterAdmins() {
    const searchTerm = document.getElementById('searchAdmins')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#adminAccountsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Fetch and display admin logs
 */
async function fetchAdminLogs() {
    try {
        const adminFilter = document.getElementById('filterLogAdmin')?.value || 'all';
        const actionFilter = document.getElementById('filterLogAction')?.value || 'all';
        const dateFilter = document.getElementById('filterLogDate')?.value || '';
        const searchTerm = document.getElementById('searchLogs')?.value || '';
        
        let url = `${API_BASE}/admin/admin_logs.php?`;
        if (adminFilter !== 'all') url += `admin_id=${adminFilter}&`;
        if (actionFilter !== 'all') url += `action_type=${actionFilter}&`;
        if (dateFilter) url += `start_date=${dateFilter}&`;
        if (searchTerm) url += `search=${searchTerm}&`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            displayAdminLogs(result.data.logs || []);
            populateAdminFilter(result.data.admins || []);
            updateLogsStats(result.data.stats || {});
        } else {
            console.error('Failed to fetch admin logs:', result.message);
            displayAdminLogs([]);
        }
    } catch (error) {
        console.error('Error fetching admin logs:', error);
        const tbody = document.getElementById('adminLogsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading logs. Please try again.</td></tr>';
    }
}

/**
 * Display logs in table
 */
function displayAdminLogs(logs) {
    const tbody = document.getElementById('adminLogsTableBody');
    tbody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="bi bi-inbox text-5xl mb-3 text-gray-300"></i>
                    <p class="text-lg font-semibold">No activity logs found</p>
                    <p class="text-sm">Try adjusting your filters or check back later</p>
                </td>
            </tr>
        `;
        return;
    }
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-blue-50 transition-colors';
        
        const time = new Date(log.created_at).toLocaleString('en-US', {
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        const actionBadge = getActionBadge(log.action_type);
        
        row.innerHTML = `
            <td class="px-6 py-4 admin-log-checkbox-column hidden">
                <input type="checkbox" class="admin-log-checkbox w-4 h-4" data-log-id="${log.log_id}" onchange="handleAdminLogCheckbox()">
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                <i class="bi bi-clock text-blue-500 mr-1"></i>${time}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <i class="bi bi-person text-blue-600 text-sm"></i>
                    </div>
                    <span class="font-semibold">${log.admin_name || 'Unknown'}</span>
                </div>
            </td>
            <td class="px-6 py-4">${actionBadge}</td>
            <td class="px-6 py-4 text-sm">${log.description || 'No description'}</td>
            <td class="px-6 py-4 text-sm text-gray-600">
                <i class="bi bi-hdd-network text-gray-400 mr-1"></i>${log.ip_address || 'N/A'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Get action badge with appropriate color
 */
function getActionBadge(actionType) {
    const badges = {
        'admin_login': { color: 'bg-green-100 text-green-800 border-green-300', icon: 'bi-box-arrow-in-right', label: 'Login' },
        'admin_logout': { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: 'bi-box-arrow-right', label: 'Logout' },
        'admin_create': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: 'bi-person-plus', label: 'Admin Created' },
        'admin_update': { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: 'bi-person-gear', label: 'Admin Updated' },
        'admin_archive': { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'bi-archive', label: 'Admin Archived' },
        'admin_restore': { color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: 'bi-arrow-counterclockwise', label: 'Admin Restored' },
        'admin_delete': { color: 'bg-red-100 text-red-800 border-red-300', icon: 'bi-trash3', label: 'Admin Deleted' },
        'student_create': { color: 'bg-green-100 text-green-800 border-green-300', icon: 'bi-mortarboard', label: 'Student Created' },
        'student_update': { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: 'bi-pencil-square', label: 'Student Updated' },
        'student_archive': { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'bi-archive', label: 'Student Archived' },
        'student_restore': { color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: 'bi-arrow-counterclockwise', label: 'Student Restored' },
        'order_status_update': { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: 'bi-arrow-left-right', label: 'Order Updated' },
        'email_archive': { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'bi-envelope-open', label: 'Email Archived' },
        'email_restore': { color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: 'bi-envelope', label: 'Email Restored' },
        'email_delete': { color: 'bg-red-100 text-red-800 border-red-300', icon: 'bi-trash', label: 'Email Deleted' },
        'inventory_create': { color: 'bg-green-100 text-green-800 border-green-300', icon: 'bi-box-seam', label: 'Item Created' },
        'inventory_update': { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: 'bi-boxes', label: 'Inventory Updated' },
        'inventory_delete': { color: 'bg-red-100 text-red-800 border-red-300', icon: 'bi-box', label: 'Item Deleted' },
        'settings_update': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: 'bi-gear', label: 'Settings Changed' }
    };
    
    const badge = badges[actionType] || { 
        color: 'bg-gray-100 text-gray-800 border-gray-300', 
        icon: 'bi-circle', 
        label: actionType ? actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
    };
    
    return `<span class="${badge.color} px-3 py-1 rounded-full text-xs font-bold border">
                <i class="bi ${badge.icon} mr-1"></i>${badge.label}
            </span>`;
}

/**
 * Populate admin filter dropdown
 */
function populateAdminFilter(admins) {
    const select = document.getElementById('filterLogAdmin');
    if (!select || !admins) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="all">All Admins</option>';
    
    admins.forEach(admin => {
        const option = document.createElement('option');
        option.value = admin.admin_id;
        option.textContent = admin.full_name;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

/**
 * Update logs statistics
 */
function updateLogsStats(stats) {
    document.getElementById('totalLogsCount').textContent = stats.total_logs || 0;
    document.getElementById('todayLogsCount').textContent = stats.today_logs || 0;
    document.getElementById('activeAdminsLogsCount').textContent = stats.active_admins || 0;
    document.getElementById('actionTypesCount').textContent = stats.action_types || 0;
}

/**
 * Reset log filters
 */
function resetLogFilters() {
    document.getElementById('filterLogAdmin').value = 'all';
    document.getElementById('filterLogAction').value = 'all';
    document.getElementById('filterLogDate').value = '';
    document.getElementById('searchLogs').value = '';
    fetchAdminLogs();
}

/**
 * Export logs to CSV
 */
async function exportLogsToCSV() {
    try {
        const adminFilter = document.getElementById('filterLogAdmin')?.value || 'all';
        const actionFilter = document.getElementById('filterLogAction')?.value || 'all';
        const dateFilter = document.getElementById('filterLogDate')?.value || '';
        const searchTerm = document.getElementById('searchLogs')?.value || '';
        
        let url = `${API_BASE}/admin/admin_logs.php?`;
        if (adminFilter !== 'all') url += `admin_id=${adminFilter}&`;
        if (actionFilter !== 'all') url += `action_type=${actionFilter}&`;
        if (dateFilter) url += `start_date=${dateFilter}&`;
        if (searchTerm) url += `search=${searchTerm}&`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.logs) {
            const logs = result.data.logs;
            
            // Create CSV content
            const headers = ['Time', 'Admin', 'Action Type', 'Description', 'IP Address'];
            const csvRows = [headers.join(',')];
            
            logs.forEach(log => {
                const time = new Date(log.created_at).toLocaleString();
                const row = [
                    `"${time}"`,
                    `"${log.admin_name || 'Unknown'}"`,
                    `"${log.action_type}"`,
                    `"${(log.description || '').replace(/"/g, '""')}"`,
                    `"${log.ip_address || 'N/A'}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Logs exported successfully', 'success');
        } else {
            alert('No logs to export');
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        alert('Error exporting logs');
    }
}



/**
 * Export email logs to Excel
 */
async function exportEmailLogsToExcel() {
    try {
        const type = document.getElementById('filterEmailType')?.value || 'all';
        const status = document.getElementById('filterEmailStatus')?.value || 'all';
        const search = document.getElementById('searchEmail')?.value || '';
        const isArchived = showingArchivedLogs ? 1 : 0;
        
        let url = `${API_BASE}/admin/export_email_logs.php?`;
        if (type !== 'all') url += `type=${type}&`;
        if (status !== 'all') url += `status=${status}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        url += `is_archived=${isArchived}`;
        
        // Open in new window to trigger download
        window.open(url, '_blank');
        
        showNotification('Email logs export started', 'success');
    } catch (error) {
        console.error('Error exporting email logs:', error);
        alert('Error exporting email logs');
    }
}



// ============================================
// STUDENT SELECTION AND EXPORT FUNCTIONS
// ============================================

let selectedStudentIds = [];

/**
 * Toggle select all students
 */
function toggleSelectAllStudents() {
    const selectAll = document.getElementById('selectAllStudents').checked;
    document.querySelectorAll('.student-checkbox').forEach(cb => {
        cb.checked = selectAll;
    });
    handleStudentCheckbox();
}

/**
 * Handle student checkbox change
 */
function handleStudentCheckbox() {
    selectedStudentIds = [];
    document.querySelectorAll('.student-checkbox:checked').forEach(cb => {
        selectedStudentIds.push(cb.dataset.studentId);
    });
    updateSelectedStudentCount();
}

/**
 * Update selected student count display
 */
function updateSelectedStudentCount() {
    const count = selectedStudentIds.length;
    const countEl = document.getElementById('selectedStudentCount');
    if (countEl) countEl.textContent = count;
    
    // Also update archive counts
    const archiveCountEl = document.getElementById('selectedStudentArchiveCount');
    if (archiveCountEl) archiveCountEl.textContent = count;
    
    const restoreCountEl = document.getElementById('selectedStudentRestoreCount');
    if (restoreCountEl) restoreCountEl.textContent = count;
}

/**
 * Enter student export mode - show checkboxes and action buttons
 */
function enterStudentExportMode() {
    // Show checkbox column
    document.querySelectorAll('.student-checkbox-column').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Show action buttons, hide kebab menu
    document.getElementById('studentActions').classList.remove('hidden');
    document.getElementById('studentKebabMenu').classList.add('hidden');
    
    // Reset selection
    selectedStudentIds = [];
    document.getElementById('selectAllStudents').checked = false;
    updateSelectedStudentCount();
}

/**
 * Exit student export mode - hide checkboxes and action buttons
 */
function exitStudentExportMode() {
    // Hide checkbox column
    document.querySelectorAll('.student-checkbox-column').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Hide action buttons, show kebab menu
    document.getElementById('studentActions').classList.add('hidden');
    document.getElementById('studentKebabMenu').classList.remove('hidden');
    
    // Reset selection
    selectedStudentIds = [];
    document.getElementById('selectAllStudents').checked = false;
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
    updateSelectedStudentCount();
}

/**
 * Enter student archive mode - show checkboxes and archive action buttons
 */
function enterStudentArchiveMode() {
    // Show checkbox column
    document.querySelectorAll('.student-checkbox-column').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Show archive action buttons, hide kebab menu
    document.getElementById('studentArchiveActions').classList.remove('hidden');
    document.getElementById('studentKebabMenu').classList.add('hidden');
    
    // Show/hide buttons based on current view
    if (showingArchivedStudents) {
        // Hide archive buttons, show restore buttons
        document.querySelector('#studentArchiveActions button[onclick="archiveAllStudents()"]').classList.add('hidden');
        document.querySelector('#studentArchiveActions button[onclick="archiveSelectedStudents()"]').classList.add('hidden');
        document.getElementById('restoreAllStudentsBtn').classList.remove('hidden');
        document.getElementById('restoreSelectedStudentsBtn').classList.remove('hidden');
    } else {
        // Show archive buttons, hide restore buttons
        document.querySelector('#studentArchiveActions button[onclick="archiveAllStudents()"]').classList.remove('hidden');
        document.querySelector('#studentArchiveActions button[onclick="archiveSelectedStudents()"]').classList.remove('hidden');
        document.getElementById('restoreAllStudentsBtn').classList.add('hidden');
        document.getElementById('restoreSelectedStudentsBtn').classList.add('hidden');
    }
    
    // Reset selection
    selectedStudentIds = [];
    document.getElementById('selectAllStudents').checked = false;
    updateSelectedStudentCount();
}

/**
 * Exit student archive mode - hide checkboxes and archive action buttons
 */
function exitStudentArchiveMode() {
    // Hide checkbox column
    document.querySelectorAll('.student-checkbox-column').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Hide archive action buttons, show kebab menu
    document.getElementById('studentArchiveActions').classList.add('hidden');
    document.getElementById('studentKebabMenu').classList.remove('hidden');
    
    // Reset selection
    selectedStudentIds = [];
    document.getElementById('selectAllStudents').checked = false;
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
    updateSelectedStudentCount();
}

/**
 * Toggle student kebab menu
 */
function toggleStudentMenu() {
    const dropdown = document.getElementById('studentMenuDropdown');
    dropdown.classList.toggle('hidden');
}

/**
 * Toggle email kebab menu
 */
function toggleEmailMenu() {
    const dropdown = document.getElementById('emailMenuDropdown');
    dropdown.classList.toggle('hidden');
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
    const studentMenu = document.getElementById('studentKebabMenu');
    const emailMenu = document.getElementById('emailKebabMenu');
    
    if (studentMenu && !studentMenu.contains(event.target)) {
        document.getElementById('studentMenuDropdown')?.classList.add('hidden');
    }
    
    if (emailMenu && !emailMenu.contains(event.target)) {
        document.getElementById('emailMenuDropdown')?.classList.add('hidden');
    }
});

/**
 * Export all students (no selection needed)
 */
async function exportAllStudents() {
    try {
        const searchTerm = document.getElementById('searchStudent')?.value || '';
        const archived = showingArchivedStudents ? 'true' : 'false';
        
        let url = `${API_BASE}/admin/export_students.php?archived=${archived}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        
        window.open(url, '_blank');
        showNotification('Exporting all students...', 'success');
        
        // Exit export mode after initiating export
        setTimeout(() => exitStudentExportMode(), 500);
    } catch (error) {
        console.error('Error exporting students:', error);
        alert('Error exporting students');
    }
}

/**
 * Export selected students
 */
async function exportSelectedStudents() {
    if (selectedStudentIds.length === 0) {
        alert('Please select students to export');
        return;
    }

    try {
        // Create a form to POST the selected IDs
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${API_BASE}/admin/export_students.php`;
        form.target = '_blank';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'student_ids';
        input.value = JSON.stringify(selectedStudentIds);
        form.appendChild(input);

        const archivedInput = document.createElement('input');
        archivedInput.type = 'hidden';
        archivedInput.name = 'archived';
        archivedInput.value = showingArchivedStudents ? 'true' : 'false';
        form.appendChild(archivedInput);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        showNotification(`Exporting ${selectedStudentIds.length} student(s)...`, 'success');
        
        // Exit export mode after initiating export
        setTimeout(() => exitStudentExportMode(), 500);
    } catch (error) {
        console.error('Error exporting selected students:', error);
        alert('Error exporting selected students');
    }
}

// ============================================
// ADMIN LOG SELECTION AND EXPORT FUNCTIONS
// ============================================

let selectedAdminLogIds = [];

/**
 * Toggle select all admin logs
 */
function toggleSelectAllAdminLogs() {
    const selectAll = document.getElementById('selectAllAdminLogs').checked;
    document.querySelectorAll('.admin-log-checkbox').forEach(cb => {
        cb.checked = selectAll;
    });
    handleAdminLogCheckbox();
}

/**
 * Handle admin log checkbox change
 */
function handleAdminLogCheckbox() {
    selectedAdminLogIds = [];
    document.querySelectorAll('.admin-log-checkbox:checked').forEach(cb => {
        selectedAdminLogIds.push(cb.dataset.logId);
    });
    updateSelectedAdminLogCount();
}

/**
 * Update selected admin log count display
 */
function updateSelectedAdminLogCount() {
    const count = selectedAdminLogIds.length;
    const countEl = document.getElementById('selectedAdminLogCount');
    countEl.textContent = count;
}

/**
 * Enter admin log export mode - show checkboxes and action buttons
 */
function enterAdminLogExportMode() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        alert('Only super admins can export admin logs');
        return;
    }

    // Show checkbox column
    document.querySelectorAll('.admin-log-checkbox-column').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Show action buttons, hide start export button
    document.getElementById('adminLogActions').classList.remove('hidden');
    document.getElementById('startAdminLogExportBtn').classList.add('hidden');
    
    // Reset selection
    selectedAdminLogIds = [];
    document.getElementById('selectAllAdminLogs').checked = false;
    updateSelectedAdminLogCount();
}

/**
 * Exit admin log export mode - hide checkboxes and action buttons
 */
function exitAdminLogExportMode() {
    // Hide checkbox column
    document.querySelectorAll('.admin-log-checkbox-column').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Hide action buttons, show start export button
    document.getElementById('adminLogActions').classList.add('hidden');
    document.getElementById('startAdminLogExportBtn').classList.remove('hidden');
    
    // Reset selection
    selectedAdminLogIds = [];
    document.getElementById('selectAllAdminLogs').checked = false;
    document.querySelectorAll('.admin-log-checkbox').forEach(cb => cb.checked = false);
    updateSelectedAdminLogCount();
}

/**
 * Export all admin logs (no selection needed)
 */
async function exportAllAdminLogs() {
    try {
        const adminData = JSON.parse(sessionStorage.getItem('adminData'));
        if (!adminData || adminData.is_super_admin != 1) {
            alert('Only super admins can export admin logs');
            return;
        }
        
        const adminFilter = document.getElementById('filterLogAdmin')?.value || 'all';
        const actionFilter = document.getElementById('filterLogAction')?.value || 'all';
        const dateFilter = document.getElementById('filterLogDate')?.value || '';
        const searchTerm = document.getElementById('searchLogs')?.value || '';
        
        let url = `${API_BASE}/admin/export_admin_logs.php?`;
        if (adminFilter !== 'all') url += `admin_id=${adminFilter}&`;
        if (actionFilter !== 'all') url += `action_type=${actionFilter}&`;
        if (dateFilter) {
            url += `start_date=${dateFilter}&`;
            url += `end_date=${dateFilter}&`;
        }
        if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
        
        window.open(url, '_blank');
        showNotification('Exporting all admin logs...', 'success');
        
        // Exit export mode after initiating export
        setTimeout(() => exitAdminLogExportMode(), 500);
    } catch (error) {
        console.error('Error exporting admin logs:', error);
        alert('Error exporting admin logs');
    }
}

/**
 * Export selected admin logs
 */
async function exportSelectedAdminLogs() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        alert('Only super admins can export admin logs');
        return;
    }

    if (selectedAdminLogIds.length === 0) {
        alert('Please select logs to export');
        return;
    }

    try {
        // Create a form to POST the selected IDs
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${API_BASE}/admin/export_admin_logs.php`;
        form.target = '_blank';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'log_ids';
        input.value = JSON.stringify(selectedAdminLogIds);
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        showNotification(`Exporting ${selectedAdminLogIds.length} log(s)...`, 'success');
        
        // Exit export mode after initiating export
        setTimeout(() => exitAdminLogExportMode(), 500);
    } catch (error) {
        console.error('Error exporting selected logs:', error);
        alert('Error exporting selected logs');
    }
}

/**
 * Update admin accounts stats
 */
function updateAdminStats(admins) {
    if (!admins) return;
    
    const total = admins.length;
    const superAdmins = admins.filter(a => a.is_super_admin == 1).length;
    const archived = admins.filter(a => a.is_archived == 1).length;
    
    document.getElementById('totalAdminsCount').textContent = total;
    document.getElementById('superAdminsCount').textContent = superAdmins;
    document.getElementById('archivedAdminsCount').textContent = archived;
}

// ============================================
// END ADMIN MANAGEMENT TAB FUNCTIONS
// ============================================

// ============================================
// WORKING HOURS MANAGEMENT FUNCTIONS
// ============================================

async function loadWorkingHours() {
    try {
        const response = await fetch(`${API_BASE}/admin/get_working_hours.php`);
        const data = await response.json();
        
        if (data.success) {
            displayWorkingHours(data.working_hours);
            displaySpecialHours(data.special_hours);
            loadSystemSettings(data.settings);
        }
    } catch (error) {
        console.error('Error loading working hours:', error);
    }
}

function loadSystemSettings(settings) {
    if (!settings) return;
    
    // Load order cutoff time
    if (settings.closing_warning_minutes) {
        const cutoffInput = document.getElementById('orderCutoffMinutes');
        if (cutoffInput) cutoffInput.value = settings.closing_warning_minutes;
    }
    
    // Load auto-move pending orders setting
    if (settings.auto_move_pending_to_next_day !== undefined) {
        const autoMoveInput = document.getElementById('autoMovePending');
        if (autoMoveInput) autoMoveInput.checked = settings.auto_move_pending_to_next_day === '1';
    }
    
    // Load average processing time
    if (settings.avg_processing_time) {
        const avgTimeInput = document.getElementById('avgProcessTime');
        if (avgTimeInput) avgTimeInput.value = settings.avg_processing_time;
    }
    
    // Load item complexity factor
    if (settings.item_complexity_factor) {
        const complexityInput = document.getElementById('itemComplexity');
        if (complexityInput) complexityInput.value = settings.item_complexity_factor;
    }
}

function displayWorkingHours(hours) {
    const container = document.getElementById('workingHoursForm');
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Generate days HTML if not already done
    if (container.getAttribute('data-days-generated') === 'false') {
        let html = '';
        
        dayNames.forEach((dayName, index) => {
            const dayNum = index + 1;
            const isWeekend = dayNum >= 6;
            const toggleColor = isWeekend ? 'gray' : 'purple';
            
            html += `
            <div class="border border-gray-200 rounded-lg overflow-hidden" id="day-container-${dayNum}">
                <div class="flex items-center justify-between p-4 bg-white">
                    <div class="flex items-center gap-3 flex-1">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="day${dayNum}" class="sr-only peer" onchange="toggleDay(${dayNum})">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${toggleColor}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${toggleColor}-600"></div>
                        </label>
                        <div class="flex-1">
                            <span class="text-sm font-medium text-gray-900">${dayName}</span>
                            <div id="day-summary-${dayNum}" class="text-xs text-gray-500 mt-0.5"></div>
                        </div>
                    </div>
                    <button type="button" onclick="toggleDayExpand(${dayNum})" class="text-purple-600 hover:text-purple-700">
                        <svg id="expand-icon-${dayNum}" class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
                <div id="day-detail-${dayNum}" class="hidden border-t border-gray-200 p-4 bg-gray-50">
                    <div id="time-slots-${dayNum}" class="space-y-3"></div>
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <button type="button" onclick="addTimeSlot(${dayNum})" class="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Add Time Slot
                        </button>
                        <button type="button" onclick="copyToAll(${dayNum})" class="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            Copy to All
                        </button>
                    </div>
                </div>
            </div>
            `;
        });
        
        html += `
            <div class="flex justify-end pt-4">
                <button onclick="saveWorkingHours()" 
                        class="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
                    Save Changes
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        container.setAttribute('data-days-generated', 'true');
    }
    
    // Populate data for each day
    hours.forEach(dayData => {
        const dayNum = dayData.day_of_week;
        const isOpen = dayData.is_open == 1;
        
        // Set checkbox
        const checkbox = document.getElementById(`day${dayNum}`);
        if (checkbox) checkbox.checked = isOpen;
        
        // Create time slots
        const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
        if (slotsContainer) {
            // Determine time slots based on break times
            const slots = [];
            
            if (dayData.break_start && dayData.break_end) {
                // Has lunch break - split into two slots
                slots.push({
                    start: dayData.opening_time || '09:00',
                    end: dayData.break_start,
                    label: 'Morning'
                });
                slots.push({
                    start: dayData.break_end,
                    end: dayData.closing_time || '17:00',
                    label: 'Afternoon'
                });
            } else {
                // No break - single slot
                slots.push({
                    start: dayData.opening_time || '09:00',
                    end: dayData.closing_time || '17:00',
                    label: 'Operating Hours'
                });
            }
            
            // Render time slots
            slotsContainer.innerHTML = slots.map((slot, idx) => `
                <div class="flex items-center gap-2 time-slot-item" data-slot-index="${idx}">
                    <input type="time" value="${slot.start}" 
                           class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                           data-slot="start" data-day="${dayNum}" data-index="${idx}">
                    <span class="text-gray-500">to</span>
                    <input type="time" value="${slot.end}" 
                           class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                           data-slot="end" data-day="${dayNum}" data-index="${idx}">
                    ${slots.length > 1 ? `
                    <button type="button" onclick="removeTimeSlot(${dayNum}, ${idx})" 
                            class="text-red-500 hover:text-red-700 p-2" title="Remove time slot">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            `).join('');
        }
        
        updateDaySummary(dayNum);
    });
}

function toggleDayOpen(dayNum) {
    const checkbox = document.getElementById(`day${dayNum}`);
    const openTime = document.getElementById(`open${dayNum}`);
    const closeTime = document.getElementById(`close${dayNum}`);
    const breakStart = document.getElementById(`breakStart${dayNum}`);
    const breakEnd = document.getElementById(`breakEnd${dayNum}`);
    
    openTime.disabled = !checkbox.checked;
    closeTime.disabled = !checkbox.checked;
    breakStart.disabled = !checkbox.checked;
    breakEnd.disabled = !checkbox.checked;
}

function toggleDay(dayNum) {
    const checkbox = document.getElementById(`day${dayNum}`);
    const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
    
    if (!checkbox.checked && slotsContainer) {
        // Clear all time slots when unchecking
        const inputs = slotsContainer.querySelectorAll('input[type="time"]');
        inputs.forEach(input => input.value = '');
    }
    updateDaySummary(dayNum);
}

function toggleDayExpand(dayNum) {
    const detail = document.getElementById(`day-detail-${dayNum}`);
    const icon = document.getElementById(`expand-icon-${dayNum}`);
    
    if (detail.classList.contains('hidden')) {
        detail.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        detail.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

function updateDaySummary(dayNum) {
    const checkbox = document.getElementById(`day${dayNum}`);
    const summary = document.getElementById(`day-summary-${dayNum}`);
    
    if (!summary) return;
    
    if (checkbox.checked) {
        const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
        if (slotsContainer) {
            const slots = [];
            const timeSlots = slotsContainer.querySelectorAll('.time-slot-item');
            
            timeSlots.forEach(slot => {
                const startInput = slot.querySelector('[data-slot="start"]');
                const endInput = slot.querySelector('[data-slot="end"]');
                if (startInput && endInput && startInput.value && endInput.value) {
                    slots.push(`${startInput.value} - ${endInput.value}`);
                }
            });
            
            summary.textContent = slots.length > 0 ? slots.join(' · ') : '';
        }
    } else {
        summary.textContent = '';
    }
}

function addTimeSlot(dayNum) {
    const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
    if (!slotsContainer) return;
    
    const currentSlots = slotsContainer.querySelectorAll('.time-slot-item');
    const slotIndex = currentSlots.length;
    
    // Get the last slot's end time as the new start time
    let lastEndTime = '13:00';
    if (currentSlots.length > 0) {
        const lastSlot = currentSlots[currentSlots.length - 1];
        const lastEndInput = lastSlot.querySelector('[data-slot="end"]');
        if (lastEndInput && lastEndInput.value) {
            lastEndTime = lastEndInput.value;
        }
    }
    
    const newSlot = document.createElement('div');
    newSlot.className = 'flex items-center gap-2 time-slot-item';
    newSlot.setAttribute('data-slot-index', slotIndex);
    newSlot.innerHTML = `
        <input type="time" value="${lastEndTime}" 
               class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
               data-slot="start" data-day="${dayNum}" data-index="${slotIndex}" onchange="updateDaySummary(${dayNum})">
        <span class="text-gray-500">to</span>
        <input type="time" value="17:00" 
               class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
               data-slot="end" data-day="${dayNum}" data-index="${slotIndex}" onchange="updateDaySummary(${dayNum})">
        <button type="button" onclick="removeTimeSlot(${dayNum}, ${slotIndex})" 
                class="text-red-500 hover:text-red-700 p-2" title="Remove time slot">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;
    
    slotsContainer.appendChild(newSlot);
    updateDaySummary(dayNum);
}

function removeTimeSlot(dayNum, slotIndex) {
    const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
    if (!slotsContainer) return;
    
    const slots = slotsContainer.querySelectorAll('.time-slot-item');
    
    // Don't allow removing if only one slot remains
    if (slots.length <= 1) {
        alert('At least one time slot is required');
        return;
    }
    
    // Remove the specific slot
    slots.forEach(slot => {
        if (parseInt(slot.getAttribute('data-slot-index')) === slotIndex) {
            slot.remove();
        }
    });
    
    // Reindex remaining slots
    const remainingSlots = slotsContainer.querySelectorAll('.time-slot-item');
    remainingSlots.forEach((slot, newIndex) => {
        slot.setAttribute('data-slot-index', newIndex);
        slot.querySelectorAll('[data-index]').forEach(input => {
            input.setAttribute('data-index', newIndex);
        });
        
        // Update delete button
        const deleteBtn = slot.querySelector('button[onclick^="removeTimeSlot"]');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `removeTimeSlot(${dayNum}, ${newIndex})`);
        }
    });
    
    updateDaySummary(dayNum);
}

function copyToAll(sourceDayNum) {
    const sourceSlotsContainer = document.getElementById(`time-slots-${sourceDayNum}`);
    if (!sourceSlotsContainer) return;
    
    const sourceSlots = sourceSlotsContainer.querySelectorAll('.time-slot-item');
    if (sourceSlots.length === 0) {
        alert('Please set time slots first');
        return;
    }
    
    // Collect source time slots
    const timeSlotsData = [];
    sourceSlots.forEach(slot => {
        const startInput = slot.querySelector('[data-slot="start"]');
        const endInput = slot.querySelector('[data-slot="end"]');
        if (startInput && endInput && startInput.value && endInput.value) {
            timeSlotsData.push({
                start: startInput.value,
                end: endInput.value
            });
        }
    });
    
    if (timeSlotsData.length === 0) {
        alert('Please set valid time slots first');
        return;
    }
    
    if (confirm('Copy these time slots to all other days?')) {
        for (let i = 1; i <= 7; i++) {
            if (i !== sourceDayNum) {
                // Enable the day
                document.getElementById(`day${i}`).checked = true;
                
                // Get target slots container
                const targetSlotsContainer = document.getElementById(`time-slots-${i}`);
                if (!targetSlotsContainer) continue;
                
                // Clear existing slots
                targetSlotsContainer.innerHTML = '';
                
                // Add copied slots
                timeSlotsData.forEach((slotData, idx) => {
                    const newSlot = document.createElement('div');
                    newSlot.className = 'flex items-center gap-2 time-slot-item';
                    newSlot.setAttribute('data-slot-index', idx);
                    newSlot.innerHTML = `
                        <input type="time" value="${slotData.start}" 
                               class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                               data-slot="start" data-day="${i}" data-index="${idx}" onchange="updateDaySummary(${i})">
                        <span class="text-gray-500">to</span>
                        <input type="time" value="${slotData.end}" 
                               class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                               data-slot="end" data-day="${i}" data-index="${idx}" onchange="updateDaySummary(${i})">
                        ${timeSlotsData.length > 1 ? `
                        <button type="button" onclick="removeTimeSlot(${i}, ${idx})" 
                                class="text-red-500 hover:text-red-700 p-2" title="Remove time slot">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                        ` : ''}
                    `;
                    targetSlotsContainer.appendChild(newSlot);
                });
                
                updateDaySummary(i);
            }
        }
        showNotification('Time slots copied to all days!', 'success');
    }
}

function switchSettingsTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.settings-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected tab content
    document.getElementById(`settings-content-${tabName}`).classList.remove('hidden');
    
    // Update tab button styling
    document.querySelectorAll('.settings-tab').forEach(btn => {
        btn.classList.remove('text-gray-900', 'border-gray-900');
        btn.classList.add('text-gray-500', 'border-transparent');
    });
    
    const activeTab = document.getElementById(`settings-tab-${tabName}`);
    activeTab.classList.remove('text-gray-500', 'border-transparent');
    activeTab.classList.add('text-gray-900', 'border-gray-900');
}

async function saveWorkingHours() {
    const days = [1, 2, 3, 4, 5, 6, 7];
    const workingHours = [];
    
    days.forEach(dayNum => {
        const isOpen = document.getElementById(`day${dayNum}`).checked;
        const slotsContainer = document.getElementById(`time-slots-${dayNum}`);
        
        if (!slotsContainer) return;
        
        const timeSlots = slotsContainer.querySelectorAll('.time-slot-item');
        let openTime = '';
        let closeTime = '';
        let breakStart = null;
        let breakEnd = null;
        
        if (timeSlots.length > 0) {
            // Get first slot start time as opening time
            const firstSlot = timeSlots[0];
            const firstStart = firstSlot.querySelector('[data-slot="start"]');
            openTime = firstStart ? firstStart.value : '';
            
            // Get last slot end time as closing time
            const lastSlot = timeSlots[timeSlots.length - 1];
            const lastEnd = lastSlot.querySelector('[data-slot="end"]');
            closeTime = lastEnd ? lastEnd.value : '';
            
            // If there are 2 slots, the gap between them is the lunch break
            if (timeSlots.length === 2) {
                const firstEnd = firstSlot.querySelector('[data-slot="end"]');
                const secondSlot = timeSlots[1];
                const secondStart = secondSlot.querySelector('[data-slot="start"]');
                
                if (firstEnd && secondStart) {
                    breakStart = firstEnd.value;
                    breakEnd = secondStart.value;
                }
            }
        }
        
        workingHours.push({
            day_of_week: dayNum,
            is_open: isOpen ? 1 : 0,
            opening_time: openTime || '09:00',
            closing_time: closeTime || '17:00',
            break_start: breakStart,
            break_end: breakEnd
        });
    });
    
    try {
        const response = await fetch(`${API_BASE}/admin/update_working_hours.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'update_weekly',
                schedule: workingHours 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessageInElement('hoursUpdateMessage', 'Operating hours updated successfully!', 'success');
            showNotification('Operating hours updated!', 'success');
            // Update auto-reschedule time display since working hours changed
            updateAutoRescheduleTimeDisplay();
        } else {
            showMessageInElement('hoursUpdateMessage', data.message || 'Failed to update hours', 'error');
        }
    } catch (error) {
        console.error('Error saving working hours:', error);
        showMessageInElement('hoursUpdateMessage', 'Error updating hours', 'error');
    }
}

async function displaySpecialHours(specialHours) {
    const list = document.getElementById('specialHoursList');
    
    if (!specialHours || specialHours.length === 0) {
        list.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No special dates configured</p>';
        return;
    }
    
    let html = '';
    specialHours.forEach(sh => {
        const dateObj = new Date(sh.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        html += `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div class="flex-1">
                    <p class="font-semibold text-gray-900">${formattedDate}</p>
                    <p class="text-xs text-gray-600">${sh.reason}</p>
                    ${sh.is_open == 0 ? '<p class="text-xs text-red-600 font-semibold mt-1">CLOSED</p>' : 
                     `<p class="text-xs text-green-600 mt-1">${sh.opening_time} - ${sh.closing_time}</p>`}
                </div>
                <button onclick="deleteSpecialHour(${sh.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

document.getElementById('specialHourForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const date = document.getElementById('specialDate').value;
    const reason = document.getElementById('specialReason').value;
    const openTime = document.getElementById('specialOpenTime').value;
    const closeTime = document.getElementById('specialCloseTime').value;
    const isClosed = document.getElementById('specialClosed').checked;
    
    try {
        const response = await fetch(`${API_BASE}/admin/update_working_hours.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                special_hours: [{
                    date: date,
                    reason: reason,
                    opening_time: openTime || null,
                    closing_time: closeTime || null,
                    is_open: isClosed ? 0 : 1
                }]
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Special date added successfully!', 'success');
            e.target.reset();
            loadWorkingHours(); // Reload to show new special hour
        } else {
            alert(data.message || 'Failed to add special date');
        }
    } catch (error) {
        console.error('Error adding special hour:', error);
        alert('Error adding special date');
    }
});

async function deleteSpecialHour(id) {
    if (!confirm('Delete this special date?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/update_working_hours.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delete_special_hour: id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Special date deleted', 'success');
            loadWorkingHours();
        } else {
            alert(data.message || 'Failed to delete');
        }
    } catch (error) {
        console.error('Error deleting special hour:', error);
    }
}

async function saveSystemSettings() {
    const orderCutoff = document.getElementById('orderCutoffMinutes').value;
    const autoMove = document.getElementById('autoMovePending').checked;
    const avgTime = document.getElementById('avgProcessTime').value;
    const complexity = document.getElementById('itemComplexity').value;
    
    const settings = {
        closing_warning_minutes: orderCutoff,
        auto_move_pending_to_next_day: autoMove ? '1' : '0',
        avg_processing_time: avgTime,
        item_complexity_factor: complexity
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/update_working_hours.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'update_settings',
                settings: settings
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('System settings saved!', 'success');
        } else {
            showNotification(data.message || 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving system settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

// Reset Daily Queue Function
async function resetDailyQueue() {
    if (!confirm('Are you sure you want to reset the daily queue number?\n\nThis will reset the queue counter back to 1 for today. This action should only be done at the start of a new business day.')) {
        return;
    }
    
    const messageEl = document.getElementById('queueResetMessage');
    messageEl.textContent = 'Resetting queue...';
    messageEl.className = 'mt-3 text-sm font-medium text-center text-blue-600';
    
    try {
        const response = await fetch(`${API_BASE}/admin/reset_daily_queue.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageEl.textContent = data.message;
            messageEl.className = 'mt-3 text-sm font-medium text-center text-green-600';
            showNotification('Daily queue has been reset successfully!', 'success');
            
            // Refresh the queue display
            if (document.getElementById('content-queue-management').classList.contains('active')) {
                await loadCurrentQueue();
            }
        } else {
            messageEl.textContent = data.message || 'Failed to reset queue';
            messageEl.className = 'mt-3 text-sm font-medium text-center text-red-600';
            showNotification(data.message || 'Failed to reset queue', 'error');
        }
    } catch (error) {
        console.error('Reset queue error:', error);
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.className = 'mt-3 text-sm font-medium text-center text-red-600';
        showNotification('Failed to reset queue. Please try again.', 'error');
    }
    
    // Clear message after 10 seconds
    setTimeout(() => {
        messageEl.textContent = '';
    }, 10000);
}

function showMessageInElement(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.className = `mt-4 text-sm font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    element.textContent = message;
    
    setTimeout(() => {
        element.textContent = '';
    }, 5000);
}

// ============================================
// END WORKING HOURS MANAGEMENT
// ============================================

// ============================================
// NEW SETTINGS MANAGEMENT
// ============================================

// Global settings cache
let settingsCache = {};

// Load all settings from API
async function loadAllSettings() {
    try {
        const response = await fetch(`${API_BASE}/admin/settings.php`);
        const data = await response.json();
        
        if (data.success) {
            settingsCache = data.settings;
            populateSettingsFields();
        } else {
            console.error('Failed to load settings:', data.message);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Populate all settings fields with values from cache
function populateSettingsFields() {
    // Queue settings
    setFieldValue('queuePrefix', 'queue_prefix');
    setFieldValue('queueStartNumber', 'queue_start_number');
    setFieldValue('referencePrefix', 'reference_prefix');
    setFieldValue('waitTimeMethod', 'wait_time_method');
    setFieldValue('queueResetTime', 'queue_reset_time');
    
    // Email settings
    setFieldValue('emailFromName', 'email_from_name');
    setFieldValue('emailFromAddress', 'email_from_address');
    setCheckboxValue('autoEmailNotifications', 'auto_email_notifications');
    setCheckboxValue('enableOTP', 'enable_otp');
    setCheckboxValue('enableQR', 'enable_qr');
    
    // Timing settings
    setFieldValue('otpExpiryMinutes', 'otp_expiry_minutes');
    setFieldValue('qrExpiryMinutes', 'qr_expiry_minutes');
    setFieldValue('preorderCutoffHours', 'preorder_cutoff_hours');
    setFieldValue('preorderMaxDays', 'preorder_max_days');
    setCheckboxValue('enablePreorder', 'enable_preorder');
    setCheckboxValue('enableLunchBreak', 'enable_lunch_break');
    setFieldValue('lunchBreakStart', 'lunch_break_start');
    setFieldValue('lunchBreakEnd', 'lunch_break_end');
    
    // Toggle lunch break fields visibility
    toggleLunchBreakFields();
}

// Helper function to set field value from cache
function setFieldValue(fieldId, settingKey) {
    const field = document.getElementById(fieldId);
    if (field && settingsCache[settingKey]) {
        field.value = settingsCache[settingKey].value;
    }
}

// Helper function to set checkbox value from cache
function setCheckboxValue(fieldId, settingKey) {
    const field = document.getElementById(fieldId);
    if (field && settingsCache[settingKey]) {
        field.checked = settingsCache[settingKey].value === '1' || settingsCache[settingKey].value === 'true';
    }
}

// Toggle lunch break time fields
function toggleLunchBreakFields() {
    const enableLunchBreak = document.getElementById('enableLunchBreak');
    const lunchBreakTimes = document.getElementById('lunchBreakTimes');
    
    if (enableLunchBreak && lunchBreakTimes) {
        if (enableLunchBreak.checked) {
            lunchBreakTimes.classList.remove('hidden');
        } else {
            lunchBreakTimes.classList.add('hidden');
        }
    }
}

// Save Queue Settings
async function saveQueueSettings() {
    const settings = {
        queue_prefix: document.getElementById('queuePrefix').value,
        queue_start_number: document.getElementById('queueStartNumber').value,
        reference_prefix: document.getElementById('referencePrefix').value,
        wait_time_method: document.getElementById('waitTimeMethod').value,
        queue_reset_time: document.getElementById('queueResetTime').value
    };
    
    await saveSettings(settings, 'Queue settings saved successfully!');
}

// Save Email Settings
async function saveEmailSettings() {
    const settings = {
        email_from_name: document.getElementById('emailFromName').value,
        email_from_address: document.getElementById('emailFromAddress').value,
        auto_email_notifications: document.getElementById('autoEmailNotifications').checked ? '1' : '0',
        enable_otp: document.getElementById('enableOTP').checked ? '1' : '0',
        enable_qr: document.getElementById('enableQR').checked ? '1' : '0'
    };
    
    await saveSettings(settings, 'Email settings saved successfully!');
}

// Save Timing Settings
async function saveTimingSettings() {
    const settings = {
        otp_expiry_minutes: document.getElementById('otpExpiryMinutes').value,
        qr_expiry_minutes: document.getElementById('qrExpiryMinutes').value,
        preorder_cutoff_hours: document.getElementById('preorderCutoffHours').value,
        preorder_max_days: document.getElementById('preorderMaxDays').value,
        enable_preorder: document.getElementById('enablePreorder').checked ? '1' : '0',
        enable_lunch_break: document.getElementById('enableLunchBreak').checked ? '1' : '0',
        lunch_break_start: document.getElementById('lunchBreakStart').value,
        lunch_break_end: document.getElementById('lunchBreakEnd').value
    };
    
    await saveSettings(settings, 'Timing settings saved successfully!');
}

// Generic save settings function
async function saveSettings(settings, successMessage) {
    try {
        const response = await fetch(`${API_BASE}/admin/settings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: settings })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(successMessage, 'success');
            // Update cache
            await loadAllSettings();
        } else {
            showNotification(data.message || 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

// ============================================
// END NEW SETTINGS MANAGEMENT
// ============================================

// ============================================
// MANUAL RESCHEDULE FUNCTIONALITY
// ============================================

// Manual reschedule orders function
async function manualRescheduleOrders() {
    // Show confirmation dialog
    const confirmed = confirm(
        'Manual Reschedule Confirmation\n\n' +
        'This will move all pending orders from today to the next business day.\n\n' +
        'Are you sure you want to proceed?'
    );

    if (!confirmed) {
        return;
    }

    // Show loading state
    const button = document.querySelector('button[onclick="manualRescheduleOrders()"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
    `;

    try {
        const response = await fetch(`${API_BASE}/admin/manual_reschedule.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Show success notification
            showNotification(result.message, 'success');

            // Show detailed results in a modal or alert
            let detailMessage = `Reschedule Complete!\n\n`;
            detailMessage += `• Orders moved: ${result.moved_count}\n`;
            detailMessage += `• Next business day: ${result.next_business_day}\n`;

            if (result.error_count > 0) {
                detailMessage += `• Errors: ${result.error_count}\n`;
                if (result.errors && result.errors.length > 0) {
                    detailMessage += `\nErrors:\n${result.errors.join('\n')}`;
                }
            }

            alert(detailMessage);

            // Refresh the orders display
            await fetchOrders();

        } else {
            showNotification(result.message || 'Failed to reschedule orders', 'error');
        }

    } catch (error) {
        console.error('Manual reschedule error:', error);
        showNotification('Error occurred during reschedule. Please try again.', 'error');
    } finally {
        // Restore button state
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Update auto-reschedule time display based on CRON status
async function updateAutoRescheduleTimeDisplay() {
    try {
        const response = await fetch(`${API_BASE}/admin/get_cron_status.php`);
        
        // Silently handle errors for optional feature
        if (!response.ok) {
            console.log('Cron status not available (this is optional)');
            return;
        }
        
        // Check if response has content
        const text = await response.text();
        if (!text || text.trim() === '') {
            console.log('Cron status endpoint returned empty response');
            return;
        }
        
        const result = JSON.parse(text);

        if (result.success) {
            const autoRescheduleTimeElement = document.getElementById('autoRescheduleTime');
            if (autoRescheduleTimeElement) {
                if (result.cron_schedule_time) {
                    // Use the actual CRON schedule time
                    const [hours, minutes] = result.cron_schedule_time.split(':');
                    const displayTime = new Date();
                    displayTime.setHours(parseInt(hours), parseInt(minutes));
                    const timeString = displayTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    autoRescheduleTimeElement.textContent = timeString;
                } else {
                    // Fallback calculation
                    const closingTime = result.closing_time || '17:00';
                    const [hours, minutes] = closingTime.split(':');
                    
                    let rescheduleHours = parseInt(hours);
                    let rescheduleMinutes = parseInt(minutes) + 5;
                    
                    if (rescheduleMinutes >= 60) {
                        rescheduleHours += 1;
                        rescheduleMinutes -= 60;
                    }
                    
                    const displayTime = new Date();
                    displayTime.setHours(rescheduleHours, rescheduleMinutes);
                    const timeString = displayTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    autoRescheduleTimeElement.textContent = timeString;
                }
                
                // Update button state based on auto-move setting
                const manualRescheduleBtn = document.querySelector('button[onclick="manualRescheduleOrders()"]');
                if (manualRescheduleBtn) {
                    if (!result.auto_move_enabled) {
                        manualRescheduleBtn.disabled = true;
                        manualRescheduleBtn.title = 'Auto-move feature is disabled. Enable it in settings first.';
                        manualRescheduleBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    } else {
                        manualRescheduleBtn.disabled = false;
                        manualRescheduleBtn.title = 'Manually reschedule pending orders to next business day';
                        manualRescheduleBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating auto-reschedule time:', error);
    }
}

// ============================================
// END MANUAL RESCHEDULE FUNCTIONALITY
// ============================================

// ============================================
// PASSWORD CHANGE FUNCTIONALITY
// ============================================

// Handle password update form submission
document.addEventListener('DOMContentLoaded', function() {
    const passwordForm = document.getElementById('passwordUpdateForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
});

async function handlePasswordUpdate(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('passwordUpdateMessage');
    
    // Clear previous messages
    messageElement.textContent = '';
    messageElement.className = 'mt-4 text-sm font-medium';
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showPasswordMessage('All fields are required', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showPasswordMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showPasswordMessage('New password must be at least 6 characters long', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/change_password.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showPasswordMessage('Password updated successfully!', 'success');
            // Clear the form
            document.getElementById('passwordUpdateForm').reset();
            showNotification('Password updated successfully!', 'success');
        } else {
            showPasswordMessage(result.message || 'Failed to update password', 'error');
        }
        
    } catch (error) {
        console.error('Password update error:', error);
        showPasswordMessage('Error occurred while updating password. Please try again.', 'error');
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

function showPasswordMessage(message, type) {
    const messageElement = document.getElementById('passwordUpdateMessage');
    messageElement.textContent = message;
    messageElement.className = `mt-4 text-sm font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        messageElement.textContent = '';
    }, 5000);
}

// ============================================
// END PASSWORD CHANGE FUNCTIONALITY
// ============================================

// ============================================
// PHASE 8: COLLAPSIBLE NAVIGATION
// ============================================

function toggleNavGroup(groupName) {
    const submenu = document.getElementById(`${groupName}-submenu`);
    const chevron = document.getElementById(`${groupName}-chevron`);
    
    if (submenu && chevron) {
        const isHidden = submenu.classList.contains('hidden') || !submenu.classList.contains('show');
        
        if (isHidden) {
            submenu.classList.remove('hidden');
            submenu.classList.add('show');
        } else {
            submenu.classList.remove('show');
            submenu.classList.add('hidden');
        }
        chevron.classList.toggle('rotate');
    }
}

// ============================================
// ADMIN PROFILE DROPUP MENU
// ============================================

let adminMenuOpen = false;

function toggleAdminMenu() {
    const dropupMenu = document.getElementById('adminDropupMenu');
    const chevron = document.getElementById('adminMenuChevron');
    
    if (dropupMenu && chevron) {
        adminMenuOpen = !adminMenuOpen;
        
        if (adminMenuOpen) {
            dropupMenu.classList.remove('hidden');
            dropupMenu.classList.add('animate-fade-in-up');
            chevron.classList.add('rotate-180');
        } else {
            dropupMenu.classList.add('hidden');
            dropupMenu.classList.remove('animate-fade-in-up');
            chevron.classList.remove('rotate-180');
        }
    }
}

// Close dropup menu when clicking outside
document.addEventListener('click', function(event) {
    const profileFooter = document.getElementById('adminProfileFooter');
    const dropupMenu = document.getElementById('adminDropupMenu');
    
    if (profileFooter && dropupMenu && adminMenuOpen) {
        if (!profileFooter.contains(event.target)) {
            adminMenuOpen = false;
            dropupMenu.classList.add('hidden');
            dropupMenu.classList.remove('animate-fade-in-up');
            const chevron = document.getElementById('adminMenuChevron');
            if (chevron) chevron.classList.remove('rotate-180');
        }
    }
});

// Update admin profile footer with session data
function updateAdminProfileFooter() {
    const adminData = JSON.parse(sessionStorage.getItem('adminData') || '{}');
    const footerName = document.getElementById('footerAdminName');
    const footerRole = document.getElementById('footerAdminRole');
    
    if (footerName) {
        const fullName = adminData.full_name || adminData.username || 'Admin';
        footerName.textContent = fullName;
    }
    if (footerRole) {
        footerRole.textContent = adminData.is_super_admin == 1 ? 'Super Admin' : 'Administrator';
    }
}

// Auto-expand navigation groups on page load
document.addEventListener('DOMContentLoaded', function() {
    // Default: Expand Operations group (since dashboard is default tab)
    toggleNavGroup('operations');
});

// ============================================
// PHASE 8: SERVICES MANAGEMENT
// ============================================

async function loadServices() {
    console.log('Loading services...');
    try {
        const response = await fetch(`${API_BASE}/student/get_services.php`);
        console.log('Services API response status:', response.status);
        const result = await response.json();
        console.log('Services API result:', result);
        
        if (result.success && result.data) {
            console.log('Displaying', result.data.length, 'services');
            displayServices(result.data);
        } else {
            console.error('Services API returned no data:', result);
            throw new Error(result.message || 'Failed to load services');
        }
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesGrid').innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                <p class="text-red-600 font-semibold">Failed to load services</p>
                <p class="text-gray-500 text-sm mt-2">${error.message}</p>
                <button onclick="loadServices()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Retry
                </button>
            </div>
        `;
    }
}

function displayServices(services) {
    const grid = document.getElementById('servicesGrid');
    console.log('displayServices called with:', services);
    console.log('Grid element:', grid);
    
    if (!services || services.length === 0) {
        console.warn('No services to display');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="bi bi-inbox text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No services found</p>
            </div>
        `;
        return;
    }
    
    const html = services.map(service => {
        const isActive = service.is_active == 1;
        const statusColor = isActive ? 'green' : 'red';
        const statusText = isActive ? 'Active' : 'Disabled';
        const iconClass = service.service_name.includes('School Items') 
            ? 'bi-bag-check-fill' 
            : 'bi-printer-fill';
        
        console.log(`Rendering service: ${service.service_name}, isActive: ${isActive}`);
        
        return `
            <div class="bg-white rounded-xl shadow-md border-2 ${isActive ? 'border-green-200' : 'border-red-200'} p-6 hover:shadow-xl transition-all duration-200">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-red-100'}">
                            <i class="bi ${iconClass} text-3xl ${isActive ? 'text-green-600' : 'text-red-600'}"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">${service.service_name}</h3>
                            <p class="text-sm text-gray-600 mt-1">${service.description || 'No description'}</p>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-600">
                        <i class="bi bi-clock-history mr-1"></i>
                        Updated: ${new Date(service.updated_at || service.created_at).toLocaleDateString()}
                    </div>
                    <label class="service-toggle">
                        <input type="checkbox" 
                               ${isActive ? 'checked' : ''} 
                               onchange="toggleService(${service.service_id}, this.checked)"
                               id="toggle-${service.service_id}">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Generated HTML length:', html.length);
    grid.innerHTML = html;
    console.log('Grid innerHTML set, children count:', grid.children.length);
}

async function toggleService(serviceId, isActive) {
    const toggle = document.getElementById(`toggle-${serviceId}`);
    const originalState = toggle.checked;
    
    try {
        // Disable toggle during request
        toggle.disabled = true;
        
        const response = await fetch(`${API_BASE}/admin/toggle_service.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                service_id: serviceId,
                is_active: isActive ? 1 : 0
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(
                `${result.data.service_name} ${isActive ? 'enabled' : 'disabled'} successfully`,
                'success'
            );
            // Reload services to update UI
            await loadServices();
        } else {
            throw new Error(result.message || 'Failed to toggle service');
        }
    } catch (error) {
        console.error('Error toggling service:', error);
        showNotification('Failed to update service status', 'error');
        // Revert toggle state
        toggle.checked = !originalState;
    } finally {
        toggle.disabled = false;
    }
}

// ============================================
// END PHASE 8
// ============================================

// Start the dashboard
checkSuperAdminAccess(); // Show admin management tab for super admin
initializeDashboard();
loadInventory(); // Load inventory management data
loadWorkingHours(); // Load working hours on init
