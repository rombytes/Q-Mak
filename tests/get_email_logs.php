<?php
/**
 * Get Email Logs for Display
 */
header('Content-Type: application/json');

require_once '../php/utils/email_sender.php';

try {
    $logFile = EmailSender::getLogFilePath();
    
    if (!file_exists($logFile)) {
        echo json_encode([
            'success' => false,
            'error' => 'Log file does not exist yet: ' . $logFile,
            'logs' => 'No logs available. Send a test email first.'
        ]);
        exit;
    }
    
    // Read last 200 lines of log file
    $lines = file($logFile);
    $lastLines = array_slice($lines, -200);
    $logs = implode('', $lastLines);
    
    echo json_encode([
        'success' => true,
        'logFile' => $logFile,
        'logs' => $logs,
        'lineCount' => count($lines)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'logs' => 'Error reading logs'
    ]);
}
?>
