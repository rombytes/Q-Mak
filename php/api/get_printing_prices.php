<?php
/**
 * Get Printing Prices API
 * Returns current printing prices from settings
 * 
 * @return JSON {success: bool, prices: object}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../../config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Fetch printing prices from settings
    $query = "SELECT setting_key, setting_value 
              FROM settings 
              WHERE setting_key LIKE 'printing_price_%'";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Parse prices into structured format
    $prices = [
        'B&W' => [
            'Short' => 1.00,
            'Long' => 1.50,
            'A4' => 1.25
        ],
        'Colored' => [
            'Short' => 5.00,
            'Long' => 7.50,
            'A4' => 6.00
        ]
    ];
    
    // Override with database values
    foreach ($settings as $setting) {
        $key = $setting['setting_key'];
        $value = floatval($setting['setting_value']);
        
        // Map setting keys to price structure
        $mapping = [
            'printing_price_bw_short' => ['B&W', 'Short'],
            'printing_price_bw_long' => ['B&W', 'Long'],
            'printing_price_bw_a4' => ['B&W', 'A4'],
            'printing_price_colored_short' => ['Colored', 'Short'],
            'printing_price_colored_long' => ['Colored', 'Long'],
            'printing_price_colored_a4' => ['Colored', 'A4']
        ];
        
        if (isset($mapping[$key])) {
            list($colorMode, $paperSize) = $mapping[$key];
            $prices[$colorMode][$paperSize] = $value;
        }
    }
    
    echo json_encode([
        'success' => true,
        'prices' => $prices
    ]);
    
} catch (PDOException $e) {
    error_log("Get Printing Prices Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'prices' => [
            'B&W' => ['Short' => 1.00, 'Long' => 1.50, 'A4' => 1.25],
            'Colored' => ['Short' => 5.00, 'Long' => 7.50, 'A4' => 6.00]
        ]
    ]);
}
?>
