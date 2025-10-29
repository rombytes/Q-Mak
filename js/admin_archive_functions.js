/**
 * Archive and Logging Functions for Admin Dashboard
 * Add these functions to your admin_dashboard.html <script> section
 */

// ============================================
// GLOBAL VARIABLES (add to existing globals)
// ============================================
let showingArchivedStudents = false;
let showingArchivedAdmins = false;

// ============================================
// STUDENT ARCHIVE FUNCTIONS
// ============================================

/**
 * Toggle between active and archived students view
 */
async function toggleArchivedStudentsView() {
    showingArchivedStudents = !showingArchivedStudents;
    const btn = document.getElementById('viewArchivedStudentsBtn');
    const title = document.getElementById('studentsTableTitle');
    
    if (showingArchivedStudents) {
        btn.innerHTML = '<i class="fas fa-eye mr-2"></i>View Active';
        btn.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap';
        title.textContent = 'Archived Students';
    } else {
        btn.innerHTML = '<i class="fas fa-archive mr-2"></i>View Archived';
        btn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap';
        title.textContent = 'Active Students';
    }
    
    await fetchStudents();
}

/**
 * Archive a student record
 */
async function archiveStudent(studentId, studentName) {
    if (!confirm(`Archive student record: ${studentName}?\n\nThis will hide the student from the active list.`)) {
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
            alert(result.message || 'Failed to archive student');
        }
    } catch (error) {
        console.error('Error archiving student:', error);
        alert('Error archiving student');
    }
}

/**
 * Restore an archived student (Super Admin only)
 */
async function restoreStudent(studentId, studentName) {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData || adminData.is_super_admin != 1) {
        alert('Only super admin can restore archived students');
        return;
    }
    
    if (!confirm(`Restore student record: ${studentName}?`)) {
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
        
        if (result.success) {
            showNotification('Student restored successfully', 'success');
            await fetchStudents();
        } else {
            alert(result.message || 'Failed to restore student');
        }
    } catch (error) {
        console.error('Error restoring student:', error);
        alert('Error restoring student');
    }
}

/**
 * Archive student from details modal
 */
async function archiveStudentFromModal(studentId, studentName) {
    closeStudentModal();
    await archiveStudent(studentId, studentName);
}

// ============================================
// UPDATE EXISTING STUDENT FUNCTIONS
// ============================================

/**
 * REPLACE the existing fetchStudents function with this updated version
 */
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
            window.location.href = 'admin_login.html';
        }
    } catch (error) {
        console.error('Error fetching students:', error);
    }
}

/**
 * UPDATE the updateStudentTable function
 * Replace the action column (<td class="px-6 py-4">) with this:
 */
function updateStudentTable_ActionColumn(student) {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    
    return `
        <td class="px-6 py-4">
            <div class="flex gap-2">
                <button onclick="viewStudentDetails('${student.student_id}')" 
                        class="text-blue-600 hover:text-blue-800 font-bold text-sm">
                    <i class="fas fa-eye mr-1"></i>View
                </button>
                ${!showingArchivedStudents ? `
                    <button onclick="archiveStudent('${student.student_id}', '${student.first_name} ${student.last_name}')" 
                            class="text-orange-600 hover:text-orange-800 font-bold text-sm">
                        <i class="fas fa-archive mr-1"></i>Archive
                    </button>
                ` : `
                    <button onclick="restoreStudent('${student.student_id}', '${student.first_name} ${student.last_name}')" 
                            class="text-green-600 hover:text-green-800 font-bold text-sm ${adminData && adminData.is_super_admin != 1 ? 'hidden' : ''}">
                        <i class="fas fa-undo mr-1"></i>Restore
                    </button>
                `}
            </div>
        </td>
    `;
}

/**
 * UPDATE the loadStudentInfo function to add archive button
 * Add this to the existing HTML template at the end:
 */
function loadStudentInfo_ArchiveButton(student) {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    const isSuperAdmin = adminData && adminData.is_super_admin == 1;
    
    return `
        <div class="mt-6 pt-6 border-t flex gap-4">
            ${isSuperAdmin ? `
                <button onclick="editStudentInfo('${student.student_id}')" 
                        class="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold">
                    <i class="fas fa-edit mr-2"></i>Edit Student Information
                </button>
            ` : ''}
            <button onclick="archiveStudentFromModal('${student.student_id}', '${student.first_name} ${student.last_name}')" 
                    class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-bold">
                <i class="fas fa-archive mr-2"></i>Archive Student
            </button>
        </div>
    `;
}

// ============================================
// ADMIN ACCOUNT ARCHIVE FUNCTIONS
// ============================================

/**
 * Toggle between active and archived admins view
 */
async function toggleArchivedAdminsView() {
    showingArchivedAdmins = !showingArchivedAdmins;
    const btn = document.getElementById('viewArchivedAdminsBtn');
    const title = document.getElementById('adminAccountsTableTitle');
    
    if (showingArchivedAdmins) {
        btn.innerHTML = '<i class="fas fa-eye mr-2"></i>View Active';
        btn.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap';
        title.textContent = 'Archived Admin Accounts';
    } else {
        btn.innerHTML = '<i class="fas fa-archive mr-2"></i>View Archived';
        btn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap';
        title.textContent = 'Admin Accounts';
    }
    
    await fetchAdminAccounts();
}

/**
 * Archive an admin account (Super Admin only)
 */
async function archiveAdmin(adminId, fullName) {
    if (!confirm(`Archive admin account: ${fullName}?\n\nThis will prevent them from logging in.`)) {
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
            alert(result.message || 'Failed to archive admin');
        }
    } catch (error) {
        console.error('Error archiving admin:', error);
        alert('Error archiving admin');
    }
}

/**
 * Restore an archived admin (Super Admin only)
 */
async function restoreAdmin(adminId, fullName) {
    if (!confirm(`Restore admin account: ${fullName}?`)) {
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
            alert(result.message || 'Failed to restore admin');
        }
    } catch (error) {
        console.error('Error restoring admin:', error);
        alert('Error restoring admin');
    }
}

/**
 * Permanently delete an archived admin (Super Admin only)
 */
async function permanentDeleteAdmin(adminId, fullName) {
    if (!confirm(`PERMANENTLY DELETE admin account: ${fullName}?\n\nThis action CANNOT be undone!`)) {
        return;
    }
    
    if (!confirm('Are you absolutely sure? This will permanently remove this account from the database.')) {
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
            alert(result.message || 'Failed to delete admin');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Error deleting admin');
    }
}

// ============================================
// UPDATE EXISTING ADMIN FUNCTIONS
// ============================================

/**
 * REPLACE the existing fetchAdminAccounts function
 */
async function fetchAdminAccounts() {
    try {
        const response = await fetch(`${API_BASE}/admin/admin_management.php?archived=${showingArchivedAdmins}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayAdminAccounts(result.data.admins);
        } else if (response.status === 403) {
            alert('Access denied. Super admin only.');
        }
    } catch (error) {
        console.error('Error fetching admin accounts:', error);
    }
}

/**
 * UPDATE the displayAdminAccounts function
 * Replace the actions column (<td class="px-6 py-4">) with this:
 */
function displayAdminAccounts_ActionColumn(admin, isCurrentUser) {
    return `
        <td class="px-6 py-4">
            <div class="flex gap-2">
                ${!showingArchivedAdmins ? `
                    <button onclick='editAdmin(${JSON.stringify(admin)})' 
                            class="border-2 border-blue-900 text-blue-900 hover:bg-gray-100 px-4 py-1 rounded text-sm font-bold">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    ${!isCurrentUser ? `
                        <button onclick="archiveAdmin(${admin.admin_id}, '${admin.full_name}')" 
                                class="border-2 border-orange-600 text-orange-600 hover:bg-orange-50 px-4 py-1 rounded text-sm font-bold">
                            <i class="fas fa-archive mr-1"></i>Archive
                        </button>
                    ` : ''}
                ` : `
                    <button onclick="restoreAdmin(${admin.admin_id}, '${admin.full_name}')" 
                            class="border-2 border-green-600 text-green-600 hover:bg-green-50 px-4 py-1 rounded text-sm font-bold">
                        <i class="fas fa-undo mr-1"></i>Restore
                    </button>
                    <button onclick="permanentDeleteAdmin(${admin.admin_id}, '${admin.full_name}')" 
                            class="border-2 border-red-600 text-red-600 hover:bg-red-50 px-4 py-1 rounded text-sm font-bold">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                `}
            </div>
        </td>
    `;
}

// ============================================
// USAGE INSTRUCTIONS
// ============================================

/*
TO INTEGRATE THESE FUNCTIONS:

1. Add global variables at the top of your script section (around line 917):
   let showingArchivedStudents = false;
   let showingArchivedAdmins = false;

2. Add all the new functions above to your script section

3. Update fetchStudents() and fetchAdminAccounts() with the new versions

4. In updateStudentTable(), replace the action column with:
   row.innerHTML = `
       ... other columns ...
       ${updateStudentTable_ActionColumn(student)}
   `;

5. In loadStudentInfo(), add at the end of the container.innerHTML:
   ${loadStudentInfo_ArchiveButton(student)}

6. In displayAdminAccounts(), replace the action column with:
   row.innerHTML = `
       ... other columns ...
       ${displayAdminAccounts_ActionColumn(admin, isCurrentUser)}
   `;

7. Make sure the HTML has the required buttons and elements:
   - viewArchivedStudentsBtn
   - studentsTableTitle
   - viewArchivedAdminsBtn
   - adminAccountsTableTitle
*/
