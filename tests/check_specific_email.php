<?php
require_once __DIR__ . '/../php/config/database.php';

$email = 'kpaysan.a12345472@umak.edu.ph';

try {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM students WHERE email = ?");
    $stmt->execute([$email]);
    $student = $stmt->fetch();
    
    if ($student) {
        echo "✅ FOUND IN STUDENTS TABLE\n";
        echo "Student ID: " . $student['student_id'] . "\n";
        echo "Name: " . $student['first_name'] . " " . $student['last_name'] . "\n";
        echo "Email: " . $student['email'] . "\n";
        echo "Verified: " . ($student['is_verified'] ? 'Yes' : 'No') . "\n";
    } else {
        echo "❌ NOT FOUND IN STUDENTS TABLE\n";
        echo "This email can be used for guest orders.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
