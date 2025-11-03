<?php
/**
 * Test script to check existing student emails
 */

require_once __DIR__ . '/../php/config/database.php';

try {
    $db = getDB();
    
    echo "Existing Student Emails:\n";
    echo str_repeat("=", 60) . "\n\n";
    
    $stmt = $db->query("SELECT email, first_name, last_name, is_verified FROM students LIMIT 5");
    
    while ($row = $stmt->fetch()) {
        echo "Email: " . $row['email'] . "\n";
        echo "Name: " . $row['first_name'] . " " . $row['last_name'] . "\n";
        echo "Verified: " . ($row['is_verified'] ? 'Yes' : 'No') . "\n";
        echo str_repeat("-", 60) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
