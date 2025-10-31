<?php
/**
 * Queue Management Functions
 * Handles queue number generation, reference numbers, wait time calculations
 */

/**
 * Generate Next Sequential Queue Number
 * Returns sequential queue number for the day (Q-1, Q-2, Q-3, etc.)
 */
function generateQueueNumber($db, $date = null) {
    $targetDate = $date ?? date('Y-m-d');
    
    // Get the highest queue number for the target date
    $stmt = $db->prepare("
        SELECT queue_number 
        FROM orders 
        WHERE queue_date = ? 
        ORDER BY CAST(SUBSTRING(queue_number, 3) AS UNSIGNED) DESC 
        LIMIT 1
    ");
    $stmt->execute([$targetDate]);
    $lastQueue = $stmt->fetch();
    
    if ($lastQueue) {
        // Extract number from Q-XXX format
        $lastNum = (int)substr($lastQueue['queue_number'], 2);
        $nextNum = $lastNum + 1;
    } else {
        // First queue of the day
        $nextNum = 1;
    }
    
    // Format as Q-1, Q-2, etc.
    return 'Q-' . $nextNum;
}

/**
 * Generate Random Reference Number
 * Returns unique alphanumeric reference for tracking (REF-XXXXXXXX)
 */
function generateReferenceNumber($db) {
    // Get settings
    $prefixStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'reference_prefix'");
    $prefixStmt->execute();
    $prefix = $prefixStmt->fetchColumn() ?? 'REF';
    
    $lengthStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'reference_length'");
    $lengthStmt->execute();
    $length = (int)($lengthStmt->fetchColumn() ?? 8);
    
    $attempts = 0;
    $maxAttempts = 10;
    
    do {
        // Generate random alphanumeric code
        $random = strtoupper(substr(bin2hex(random_bytes(($length + 1) / 2)), 0, $length));
        $referenceNum = $prefix . '-' . $random;
        
        // Check if exists
        $check = $db->prepare("SELECT reference_number FROM orders WHERE reference_number = ?");
        $check->execute([$referenceNum]);
        $exists = $check->fetch();
        
        $attempts++;
    } while ($exists && $attempts < $maxAttempts);
    
    if ($exists) {
        // Fallback: timestamp-based to ensure uniqueness
        $referenceNum = $prefix . '-' . date('YmdHis') . rand(100, 999);
    }
    
    return $referenceNum;
}

/**
 * Calculate Estimated Wait Time
 * Based on queue position, item complexity, and current processing speed
 */
function calculateWaitTime($db, $itemsOrdered) {
    // 1. Get number of pending orders ahead in queue today
    $today = date('Y-m-d');
    $pendingStmt = $db->prepare("
        SELECT COUNT(*) as pending_count 
        FROM orders 
        WHERE queue_date = ? 
        AND status IN ('pending', 'processing')
    ");
    $pendingStmt->execute([$today]);
    $pendingCount = $pendingStmt->fetch()['pending_count'];
    
    // 2. Get estimated time for ordered items
    $items = is_array($itemsOrdered) ? $itemsOrdered : explode(',', $itemsOrdered);
    $totalItemTime = 0;
    
    foreach ($items as $item) {
        $item = trim($item);
        $itemStmt = $db->prepare("
            SELECT estimated_time 
            FROM inventory_items 
            WHERE item_name LIKE ?
        ");
        $itemStmt->execute(["%$item%"]);
        $itemData = $itemStmt->fetch();
        
        if ($itemData && $itemData['estimated_time']) {
            $totalItemTime += $itemData['estimated_time'];
        } else {
            $totalItemTime += 5; // Default 5 minutes per item
        }
    }
    
    // 3. Calculate average processing time from recent completed orders
    $avgStmt = $db->prepare("
        SELECT AVG(actual_completion_time) as avg_time 
        FROM orders 
        WHERE status = 'completed' 
        AND actual_completion_time IS NOT NULL
        AND actual_completion_time > 0
        AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $avgStmt->execute();
    $avgData = $avgStmt->fetch();
    $avgProcessingTime = $avgData['avg_time'] ?? 10; // Default 10 minutes
    
    // 4. Get buffer percentage from settings
    $bufferStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'wait_time_buffer_percent'");
    $bufferStmt->execute();
    $bufferPercent = (int)($bufferStmt->fetchColumn() ?? 20);
    
    // 5. Get min/max wait times from settings
    $minStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'wait_time_min'");
    $minStmt->execute();
    $minWaitTime = (int)($minStmt->fetchColumn() ?? 5);
    
    $maxStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'wait_time_max'");
    $maxStmt->execute();
    $maxWaitTime = (int)($maxStmt->fetchColumn() ?? 60);
    
    // 6. Calculate wait time
    // Base time = (pending orders * average processing time) + current item time
    $baseWaitTime = ($pendingCount * $avgProcessingTime) + $totalItemTime;
    
    // Add buffer for safety
    $estimatedWaitTime = ceil($baseWaitTime * (1 + $bufferPercent / 100));
    
    // Ensure within min/max bounds
    $estimatedWaitTime = max($minWaitTime, min($maxWaitTime, $estimatedWaitTime));
    
    return [
        'estimated_minutes' => $estimatedWaitTime,
        'queue_position' => $pendingCount + 1,
        'items_time' => $totalItemTime,
        'pending_orders' => $pendingCount,
        'avg_processing_time' => round($avgProcessingTime, 1)
    ];
}

/**
 * Update Actual Completion Time
 * Call this when order is marked as completed
 */
function updateCompletionTime($db, $orderId) {
    $stmt = $db->prepare("
        UPDATE orders 
        SET completed_at = NOW(),
            actual_completion_time = TIMESTAMPDIFF(MINUTE, created_at, NOW())
        WHERE order_id = ?
    ");
    return $stmt->execute([$orderId]);
}

/**
 * Mark Order as Processing
 * Call this when staff starts preparing the order
 */
function startProcessingOrder($db, $orderId) {
    $stmt = $db->prepare("
        UPDATE orders 
        SET status = 'processing',
            started_processing_at = NOW()
        WHERE order_id = ?
    ");
    return $stmt->execute([$orderId]);
}

/**
 * Check if COOP is currently open
 */
function isCoopOpen($db) {
    $now = new DateTime();
    $today = $now->format('N'); // 1=Monday, 7=Sunday
    $currentTime = $now->format('H:i:s');
    $currentDate = $now->format('Y-m-d');
    
    // Check for special hours (holidays, etc.)
    $specialStmt = $db->prepare("
        SELECT is_open, opening_time, closing_time, reason
        FROM special_hours 
        WHERE date = ?
    ");
    $specialStmt->execute([$currentDate]);
    $special = $specialStmt->fetch();
    
    if ($special) {
        if (!$special['is_open']) {
            return ['open' => false, 'reason' => $special['reason'] ?? 'Special closure'];
        }
        $openTime = $special['opening_time'];
        $closeTime = $special['closing_time'];
    } else {
        // Check regular working hours
        $hoursStmt = $db->prepare("
            SELECT is_open, opening_time, closing_time, break_start, break_end
            FROM working_hours 
            WHERE day_of_week = ? AND is_active = 1
        ");
        $hoursStmt->execute([$today]);
        $hours = $hoursStmt->fetch();
        
        if (!$hours || !$hours['is_open']) {
            return ['open' => false, 'reason' => 'Closed today'];
        }
        
        $openTime = $hours['opening_time'];
        $closeTime = $hours['closing_time'];
        
        // Check if during lunch break
        if ($hours['break_start'] && $hours['break_end']) {
            if ($currentTime >= $hours['break_start'] && $currentTime < $hours['break_end']) {
                return [
                    'open' => false, 
                    'reason' => 'Lunch break',
                    'reopens_at' => $hours['break_end']
                ];
            }
        }
    }
    
    // Check if within operating hours
    if ($currentTime >= $openTime && $currentTime < $closeTime) {
        $closeTimeObj = DateTime::createFromFormat('H:i:s', $closeTime);
        $currentTimeObj = DateTime::createFromFormat('H:i:s', $currentTime);
        $secondsUntilClosing = $closeTimeObj->getTimestamp() - $currentTimeObj->getTimestamp();
        
        return [
            'open' => true,
            'closes_at' => $closeTime,
            'time_until_closing' => $secondsUntilClosing,
            'minutes_until_closing' => floor($secondsUntilClosing / 60)
        ];
    } elseif ($currentTime < $openTime) {
        return [
            'open' => false,
            'reason' => 'Not yet open',
            'opens_at' => $openTime
        ];
    } else {
        return [
            'open' => false,
            'reason' => 'Closed for the day'
        ];
    }
}

/**
 * Get next business day
 */
function getNextBusinessDay($db, $fromDate = null) {
    $date = $fromDate ? new DateTime($fromDate) : new DateTime();
    $maxAttempts = 14; // Check up to 2 weeks ahead
    $attempts = 0;
    
    while ($attempts < $maxAttempts) {
        $date->modify('+1 day');
        $dayOfWeek = (int)$date->format('N');
        $dateStr = $date->format('Y-m-d');
        
        // Check if special closure
        $specialStmt = $db->prepare("SELECT is_open FROM special_hours WHERE date = ?");
        $specialStmt->execute([$dateStr]);
        $special = $specialStmt->fetch();
        
        if ($special && !$special['is_open']) {
            $attempts++;
            continue; // Skip this day
        }
        
        // Check regular schedule
        $hoursStmt = $db->prepare("
            SELECT is_open FROM working_hours 
            WHERE day_of_week = ? AND is_active = 1
        ");
        $hoursStmt->execute([$dayOfWeek]);
        $hours = $hoursStmt->fetch();
        
        if ($hours && $hours['is_open']) {
            return $dateStr;
        }
        
        $attempts++;
    }
    
    return null; // No business day found in next 2 weeks
}

/**
 * Get operating hours for a specific date
 */
function getOperatingHours($db, $date) {
    // Check special hours first
    $specialStmt = $db->prepare("
        SELECT is_open, opening_time, closing_time, reason
        FROM special_hours 
        WHERE date = ?
    ");
    $specialStmt->execute([$date]);
    $special = $specialStmt->fetch();
    
    if ($special) {
        return [
            'date' => $date,
            'is_open' => (bool)$special['is_open'],
            'opening_time' => $special['opening_time'],
            'closing_time' => $special['closing_time'],
            'reason' => $special['reason'],
            'type' => 'special'
        ];
    }
    
    // Get regular hours
    $dateObj = new DateTime($date);
    $dayOfWeek = (int)$dateObj->format('N');
    
    $hoursStmt = $db->prepare("
        SELECT is_open, opening_time, closing_time, break_start, break_end
        FROM working_hours 
        WHERE day_of_week = ? AND is_active = 1
    ");
    $hoursStmt->execute([$dayOfWeek]);
    $hours = $hoursStmt->fetch();
    
    if ($hours) {
        return [
            'date' => $date,
            'day_name' => $dateObj->format('l'),
            'is_open' => (bool)$hours['is_open'],
            'opening_time' => $hours['opening_time'],
            'closing_time' => $hours['closing_time'],
            'break_start' => $hours['break_start'],
            'break_end' => $hours['break_end'],
            'type' => 'regular'
        ];
    }
    
    return null;
}

/**
 * Get schedule for next N days
 */
function getSchedule($db, $days = 7) {
    $schedule = [];
    $currentDate = new DateTime();
    
    for ($i = 0; $i < $days; $i++) {
        $dateStr = $currentDate->format('Y-m-d');
        $schedule[] = getOperatingHours($db, $dateStr);
        $currentDate->modify('+1 day');
    }
    
    return $schedule;
}

/**
 * Get setting value from settings table
 */
function getSetting($db, $key, $default = null) {
    $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
    $stmt->execute([$key]);
    $result = $stmt->fetchColumn();
    return $result !== false ? $result : $default;
}
?>
