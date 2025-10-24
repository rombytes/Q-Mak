<?php
require 'c:/xampp/htdocs/Q-Mak/vendor/autoload.php';

echo "=== QR Code Generation Test ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "GD Extension Loaded: " . (extension_loaded('gd') ? 'YES' : 'NO') . "\n";

try {
    echo "\n=== Checking Available Classes ===\n";

    if (class_exists('Endroid\QrCode\Builder\Builder')) {
        echo "✓ Builder class found\n";
    } else {
        echo "✗ Builder class not found\n";
    }

    if (class_exists('Endroid\QrCode\Writer\PngWriter')) {
        echo "✓ PngWriter class found\n";
    } else {
        echo "✗ PngWriter class not found\n";
    }

    if (class_exists('Endroid\QrCode\QrCode')) {
        echo "✓ QrCode class found\n";
    } else {
        echo "✗ QrCode class not found\n";
    }

    echo "\n=== Available QR Code Classes ===\n";
    $classes = get_declared_classes();
    foreach ($classes as $class) {
        if (strpos($class, 'QrCode') !== false) {
            echo "  - " . $class . "\n";
        }
    }

    echo "\n=== Testing Simple QR Code Generation ===\n";
    $testData = json_encode(['test' => 'data', 'timestamp' => time()]);
    echo "Test data: " . $testData . "\n";

    // Try the simple approach first
    if (class_exists('Endroid\QrCode\QrCode')) {
        try {
            $qrCode = Endroid\QrCode\QrCode::create($testData)
                ->setSize(200)
                ->setMargin(10);

            $writer = new Endroid\QrCode\Writer\PngWriter();
            $result = $writer->write($qrCode);
            $dataUri = $result->getDataUri();

            if (!empty($dataUri)) {
                echo "✓ Simple QR Code generation SUCCESS\n";
                echo "Data URI length: " . strlen($dataUri) . "\n";
            } else {
                echo "✗ Simple QR Code generation failed - empty data URI\n";
            }
        } catch (Exception $e) {
            echo "✗ Simple QR Code generation failed: " . $e->getMessage() . "\n";
        }
    }

    // Try the Builder approach
    if (class_exists('Endroid\QrCode\Builder\Builder')) {
        try {
            echo "\n=== Testing Builder Approach ===\n";
            $result = Endroid\QrCode\Builder\Builder::create()
                ->writer(new Endroid\QrCode\Writer\PngWriter())
                ->data($testData)
                ->encoding(new Endroid\QrCode\Encoding\Encoding('UTF-8'))
                ->errorCorrectionLevel(Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevel::Low)
                ->size(200)
                ->margin(10)
                ->build();

            $dataUri = $result->getDataUri();
            if (!empty($dataUri)) {
                echo "✓ Builder QR Code generation SUCCESS\n";
                echo "Data URI length: " . strlen($dataUri) . "\n";
            } else {
                echo "✗ Builder QR Code generation failed - empty data URI\n";
            }
        } catch (Exception $e) {
            echo "✗ Builder QR Code generation failed: " . $e->getMessage() . "\n";
        }
    }

} catch (Exception $e) {
    echo "✗ Fatal Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
?>
