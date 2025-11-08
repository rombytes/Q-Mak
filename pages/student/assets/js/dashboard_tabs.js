/**
 * Dashboard Tab Management & UI Interactions
 * Q-Mak Student Dashboard SPA
 */

// Current active tab
let currentTab = 'dashboard';
// Note: currentPage, currentFilter, currentSearch are declared in student_dashboard.js

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial tab from URL hash or default to dashboard
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'orders', 'profile'].includes(hash)) {
        switchTab(hash);
    } else {
        switchTab('dashboard');
    }
    
    // Handle browser back/forward
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.substring(1);
        if (newHash && ['dashboard', 'orders', 'profile'].includes(newHash)) {
            switchTab(newHash);
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('profileDropdown');
        const dropdownButton = event.target.closest('button[onclick="toggleProfileDropdown()"]');
        
        if (!dropdownButton && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
});

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update URL hash
    window.location.hash = tabName;
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`content-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Update tab buttons (desktop)
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active', 'bg-primary-800', 'border-b-3', 'border-accent-500');
        btn.classList.add('hover:bg-primary-800');
    });
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active', 'bg-primary-800');
        activeTab.classList.remove('hover:bg-primary-800');
    }
    
    // Update tab buttons (mobile)
    document.querySelectorAll('.nav-tab-mobile').forEach(btn => {
        btn.classList.remove('active', 'bg-primary-800', 'text-white');
        btn.classList.add('text-primary-300');
    });
    
    const activeTabMobile = document.getElementById(`tab-${tabName}-mobile`);
    if (activeTabMobile) {
        activeTabMobile.classList.add('active', 'bg-primary-800', 'text-white');
        activeTabMobile.classList.remove('text-primary-300');
    }
    
    // Load tab-specific data
    if (tabName === 'orders') {
        loadOrdersTab();
    } else if (tabName === 'profile') {
        loadProfileTab(); // Now async, will handle studentData check
    } else if (tabName === 'dashboard') {
        refreshDashboardData();
    }
}

/**
 * Toggle profile dropdown menu
 */
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('hidden');
}

/**
 * Load Orders Tab Data
 */
function loadOrdersTab() {
    if (typeof loadOrderHistory === 'function') {
        loadOrderHistory();
    }
}

/**
 * Load Profile Tab Data
 */
async function loadProfileTab() {
    // Access studentData from window if not available locally
    const data = window.studentData || (typeof studentData !== 'undefined' ? studentData : null);
    
    // Wait for studentData to be loaded
    if (!data && typeof checkSession === 'function') {
        await checkSession();
    }
    
    // Check again after potentially loading
    const currentData = window.studentData || (typeof studentData !== 'undefined' ? studentData : null);
    
    if (currentData) {
        populateProfileData();
    } else {
        console.warn('Student data not available yet. Please wait for session to load.');
        // Try again after a short delay
        setTimeout(loadProfileTab, 500);
    }
}

/**
 * Refresh Dashboard Data
 */
function refreshDashboardData() {
    if (typeof loadCurrentOrder === 'function') {
        loadCurrentOrder();
    }
}

/**
 * Populate Profile Tab with Student Data
 */
function populateProfileData() {
    const studentData = window.studentData;
    if (!studentData) return;
    
    // Profile header
    const initials = getInitials(studentData.first_name, studentData.last_name);
    const profilePicture = studentData.profile_picture || '/Q-Mak/images/Herons.png';
    
    // Update large profile picture
    const profileAvatarLargeImg = document.getElementById('profileAvatarLargeImg');
    if (profileAvatarLargeImg) {
        profileAvatarLargeImg.src = profilePicture;
        profileAvatarLargeImg.onerror = function() {
            this.style.display = 'none';
            document.getElementById('profileAvatarLarge').style.display = 'flex';
            document.getElementById('profileAvatarLarge').textContent = initials;
        };
    }
    
    document.getElementById('profileFullName').textContent = `${studentData.first_name} ${studentData.last_name}`;
    document.getElementById('profileStudentId').textContent = `Student ID: ${studentData.student_id}`;
    document.getElementById('profileEmail').textContent = studentData.email;
    
    // Personal Information
    document.getElementById('profileInfoEmail').textContent = studentData.email || 'Not set';
    document.getElementById('profileInfoPhone').textContent = studentData.phone || 'Not set';
    document.getElementById('profileInfoProgram').textContent = studentData.program || 'Not set';
    document.getElementById('profileInfoYear').textContent = studentData.year_level || 'Not set';
    
    // Order Statistics
    document.getElementById('profileStatTotal').textContent = studentData.total_orders || 0;
    document.getElementById('profileStatCompleted').textContent = studentData.completed_orders || 0;
    
    if (studentData.created_at) {
        const memberDate = new Date(studentData.created_at);
        document.getElementById('profileStatMemberSince').textContent = memberDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }
}

/**
 * Change profile picture (placeholder function)
 */
function changeProfilePicture() {
    showToast('info', 'Change Profile Picture', 'Profile picture upload feature coming soon!');
}

/**
 * Filter orders by status
 */
function filterOrders() {
    const status = document.getElementById('orderFilterStatus').value;
    currentPage = 1;
    loadOrderHistory(status);
}

/**
 * Search orders
 */
function searchOrders() {
    const searchTerm = document.getElementById('orderSearchInput').value;
    // TODO: Implement search functionality
    console.log('Searching for:', searchTerm);
}

/**
 * Load orders for specific page
 */
function loadOrdersPage(page) {
    if (page < 1) return;
    currentPage = page;
    const status = document.getElementById('orderFilterStatus').value;
    loadOrderHistory(status, page);
}

/**
 * Edit profile
 */
function editProfile() {
    showToast('info', 'Edit Profile', 'Profile editing feature coming soon!');
}

/**
 * Show change password modal
 */
function showChangePassword() {
    showToast('info', 'Change Password', 'Password change feature coming soon!');
}

/**
 * Show toast notification
 */
function showToast(type, title, message, duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const typeColors = {
        success: { bg: 'bg-success-500', icon: 'bi-check-circle-fill' },
        error: { bg: 'bg-danger-500', icon: 'bi-x-circle-fill' },
        warning: { bg: 'bg-warning-500', icon: 'bi-exclamation-triangle-fill' },
        info: { bg: 'bg-accent-500', icon: 'bi-info-circle-fill' }
    };
    
    const colors = typeColors[type] || typeColors.info;
    
    const toast = document.createElement('div');
    toast.className = `${colors.bg} text-white rounded-xl shadow-2xl p-4 transform transition-all duration-300 animate-slideInRight`;
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="bi ${colors.icon} text-2xl"></i>
            <div class="flex-1">
                <div class="font-bold mb-1">${title}</div>
                <div class="text-sm opacity-90">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 transition-colors">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

/**
 * Get initials from name
 */
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

/**
 * Update navigation profile info
 */
function updateNavProfile(studentData) {
    const initials = getInitials(studentData.first_name, studentData.last_name);
    const fullName = `${studentData.first_name} ${studentData.last_name}`;
    const profilePicture = studentData.profile_picture || '/Q-Mak/images/Herons.png';
    
    // Update nav bar
    document.getElementById('navStudentName').textContent = fullName;
    document.getElementById('navStudentId').textContent = studentData.student_id;
    document.getElementById('navAvatarInitials').textContent = initials;
    
    const navAvatarImg = document.getElementById('navAvatarImg');
    if (navAvatarImg) {
        navAvatarImg.src = profilePicture;
        navAvatarImg.onerror = function() {
            this.style.display = 'none';
            document.getElementById('navAvatarInitials').style.display = 'flex';
        };
    }
    
    // Update dropdown
    document.getElementById('dropdownStudentName').textContent = fullName;
    document.getElementById('dropdownStudentId').textContent = studentData.student_id;
    document.getElementById('dropdownAvatarInitials').textContent = initials;
    
    const dropdownAvatarImg = document.getElementById('dropdownAvatarImg');
    if (dropdownAvatarImg) {
        dropdownAvatarImg.src = profilePicture;
        dropdownAvatarImg.onerror = function() {
            this.style.display = 'none';
            document.getElementById('dropdownAvatarInitials').style.display = 'flex';
        };
    }
}

// Add CSS for slide-in animation (only if not already added)
if (!document.getElementById('dashboard-tab-styles')) {
    const tabStyles = document.createElement('style');
    tabStyles.id = 'dashboard-tab-styles';
    tabStyles.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideInRight { animation: slideInRight 0.3s ease-out; }
        .nav-tab.active { border-bottom: 3px solid var(--accent-500); }
        .nav-tab-mobile.active { border-bottom: 3px solid var(--accent-500); }
    `;
    document.head.appendChild(tabStyles);
}
