<?php
/**
 * Add Notifications Table
 * Run this script once to add the notifications table to the database
 */

require_once __DIR__ . '/../php/config/database.php';

try {
    $db = getDB();
    
    echo "Creating notifications table...\n";
    
    // Create notifications table
    $sql = "
    CREATE TABLE IF NOT EXISTS `notifications` (
        `notification_id` INT(11) NOT NULL AUTO_INCREMENT,
        `student_id` VARCHAR(50) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `message` TEXT NOT NULL,
        `type` ENUM('order', 'system', 'promotion', 'announcement') NOT NULL DEFAULT 'system',
        `related_order_id` INT(11) NULL COMMENT 'Related order ID if notification is order-related',
        `is_read` TINYINT(1) NOT NULL DEFAULT 0,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `read_at` DATETIME NULL,
        PRIMARY KEY (`notification_id`),
        INDEX `idx_student_id` (`student_id`),
        INDEX `idx_type` (`type`),
        INDEX `idx_is_read` (`is_read`),
        INDEX `idx_created_at` (`created_at`),
        FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $db->exec($sql);
    
    echo "✓ Notifications table created successfully!\n";
    
    // Insert some sample notifications for testing
    echo "\nCreating sample notifications for testing...\n";
    
    $sampleNotifs = [
        [
            'student_id' => '2021-00001-MN-0', // Update this with an actual student ID from your database
            'title' => 'Welcome to Q-Mak!',
            'message' => 'Thank you for registering. You can now start placing orders at the UMak COOP.',
            'type' => 'system'
        ],
        [
            'student_id' => '2021-00001-MN-0',
            'title' => 'Order Status Update',
            'message' => 'Your order #Q-20251108-001 is now being processed. Estimated wait time: 10 minutes.',
            'type' => 'order',
            'related_order_id' => 1 // Update this with an actual order ID
        ],
        [
            'student_id' => '2021-00001-MN-0',
            'title' => 'Special Offer!',
            'message' => 'Get 10% off on all drinks this week! Visit the COOP to avail this limited-time offer.',
            'type' => 'promotion'
        ]
    ];
    
    // Get first student from database for sample notifications
    $stmt = $db->query("SELECT student_id FROM students LIMIT 1");
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($student) {
        $studentId = $student['student_id'];
        
        // Insert sample notifications
        $insertStmt = $db->prepare("
            INSERT INTO notifications (student_id, title, message, type, related_order_id)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        foreach ($sampleNotifs as $notif) {
            $insertStmt->execute([
                $studentId,
                $notif['title'],
                $notif['message'],
                $notif['type'],
                $notif['related_order_id'] ?? null
            ]);
        }
        
        echo "✓ Sample notifications created for student: $studentId\n";
    } else {
        echo "⚠ No students found in database. Sample notifications not created.\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
