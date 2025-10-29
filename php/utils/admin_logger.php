<?php
/**
 * Admin Activity Logger Utility
 * Helper functions to log admin actions across the system
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Log an admin action to the admin_logs table
 * 
 * @param int $adminId Admin ID performing the action
 * @param string $actionType Type of action (create, update, delete, archive, restore, etc.)
 * @param string $description Human-readable description
 * @param string|null $targetType Type of target entity (student, admin, order, etc.)
 * @param string|null $targetId ID of the target entity
 * @param array|null $details Additional details as associative array
 * @return bool Success status
 */
function logAdminAction($adminId, $actionType, $description, $targetType = null, $targetId = null, $details = null) {
    try {
        $db = getDB();
        
        // Get IP address
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ipAddress = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        }
        
        // Get user agent
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        $stmt = $db->prepare("
            INSERT INTO admin_logs 
            (admin_id, action_type, target_type, target_id, description, details, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $result = $stmt->execute([
            $adminId,
            $actionType,
            $targetType,
            $targetId,
            $description,
            $details ? json_encode($details) : null,
            $ipAddress,
            $userAgent
        ]);
        
        return $result;
        
    } catch (Exception $e) {
        error_log("Admin Activity Logging Error: " . $e->getMessage());
        return false;
    }
}

/**
 * Log admin authentication events
 */
function logAdminLogin($adminId, $fullName, $email, $success = true) {
    $description = $success 
        ? "Admin logged in: $fullName ($email)" 
        : "Failed login attempt for: $email";
    
    return logAdminAction(
        $adminId,
        $success ? 'login' : 'login_failed',
        $description,
        'admin',
        $adminId,
        ['email' => $email, 'success' => $success]
    );
}

/**
 * Log admin logout events
 */
function logAdminLogout($adminId, $fullName) {
    return logAdminAction(
        $adminId,
        'logout',
        "Admin logged out: $fullName",
        'admin',
        $adminId
    );
}

/**
 * Log student record modifications
 */
function logStudentAction($adminId, $actionType, $studentId, $studentName, $details = null) {
    $actions = [
        'create' => 'Created student record',
        'update' => 'Updated student information',
        'archive' => 'Archived student record',
        'restore' => 'Restored student record',
        'delete' => 'Permanently deleted student record'
    ];
    
    $description = ($actions[$actionType] ?? 'Modified student record') . ": $studentName ($studentId)";
    
    return logAdminAction(
        $adminId,
        $actionType . '_student',
        $description,
        'student',
        $studentId,
        $details
    );
}

/**
 * Log admin account modifications
 */
function logAdminAccountAction($performerId, $actionType, $targetAdminId, $targetAdminName, $details = null) {
    $actions = [
        'create' => 'Created admin account',
        'update' => 'Updated admin account',
        'archive' => 'Archived admin account',
        'restore' => 'Restored admin account',
        'delete' => 'Permanently deleted admin account',
        'promote' => 'Promoted to super admin',
        'demote' => 'Demoted from super admin'
    ];
    
    $description = ($actions[$actionType] ?? 'Modified admin account') . ": $targetAdminName";
    
    return logAdminAction(
        $performerId,
        $actionType . '_admin',
        $description,
        'admin',
        $targetAdminId,
        $details
    );
}

/**
 * Log order modifications
 */
function logOrderAction($adminId, $actionType, $orderId, $queueNumber, $details = null) {
    $actions = [
        'create' => 'Created order',
        'update' => 'Updated order status',
        'archive' => 'Archived order',
        'restore' => 'Restored order',
        'delete' => 'Deleted order',
        'cancel' => 'Cancelled order',
        'complete' => 'Completed order'
    ];
    
    $description = ($actions[$actionType] ?? 'Modified order') . ": Queue #$queueNumber";
    
    return logAdminAction(
        $adminId,
        $actionType . '_order',
        $description,
        'order',
        $orderId,
        $details
    );
}

/**
 * Log email log actions
 */
function logEmailLogAction($adminId, $actionType, $logIds, $count = null) {
    $count = $count ?? (is_array($logIds) ? count($logIds) : 1);
    $actions = [
        'archive' => "Archived $count email log(s)",
        'restore' => "Restored $count email log(s)",
        'delete' => "Permanently deleted $count email log(s)"
    ];
    
    $description = $actions[$actionType] ?? "Modified email logs";
    
    return logAdminAction(
        $adminId,
        $actionType . '_email_logs',
        $description,
        'email_logs',
        is_array($logIds) ? implode(',', $logIds) : $logIds,
        ['count' => $count]
    );
}

/**
 * Log inventory modifications
 */
function logInventoryAction($adminId, $actionType, $itemId, $itemName, $details = null) {
    $actions = [
        'create' => 'Created inventory item',
        'update' => 'Updated inventory item',
        'delete' => 'Deleted inventory item',
        'stock_adjust' => 'Adjusted stock quantity',
        'stock_restock' => 'Restocked item',
        'toggle_availability' => 'Toggled item availability'
    ];
    
    $description = ($actions[$actionType] ?? 'Modified inventory item') . ": $itemName";
    
    return logAdminAction(
        $adminId,
        $actionType . '_inventory',
        $description,
        'inventory',
        $itemId,
        $details
    );
}

/**
 * Log settings changes
 */
function logSettingsChange($adminId, $settingKey, $oldValue, $newValue) {
    return logAdminAction(
        $adminId,
        'update_settings',
        "Updated setting: $settingKey",
        'settings',
        $settingKey,
        [
            'old_value' => $oldValue,
            'new_value' => $newValue
        ]
    );
}

/**
 * Log system configuration changes
 */
function logSystemAction($adminId, $actionType, $description, $details = null) {
    return logAdminAction(
        $adminId,
        $actionType,
        $description,
        'system',
        null,
        $details
    );
}
?>
