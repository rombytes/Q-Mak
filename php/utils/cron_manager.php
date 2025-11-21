<?php
/**
 * CRON Job Management Utility
 * Handles automatic updating of CRON jobs when working hours change
 */

class CronManager {
    private $db;
    private $cronFilePath;
    
    public function __construct($database) {
        $this->db = $database;
        // Path where CRON jobs are stored (adjust based on your system)
        $this->cronFilePath = '/tmp/qmak_cron.txt';
    }
    
    /**
     * Update the auto-reschedule CRON job based on working hours
     */
    public function updateAutoRescheduleCron() {
        try {
            // Get the default closing time from settings
            $stmt = $this->db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'default_closing_time'");
            $stmt->execute();
            $closingTimeResult = $stmt->fetch();
            
            // Default to 17:00 (5:00 PM) if not set
            $closingTime = $closingTimeResult ? $closingTimeResult['setting_value'] : '17:00';
            
            // Parse the closing time
            list($hours, $minutes) = explode(':', $closingTime);
            
            // Add 5 minutes for the auto-reschedule
            $cronMinutes = intval($minutes) + 5;
            $cronHours = intval($hours);
            
            if ($cronMinutes >= 60) {
                $cronHours += 1;
                $cronMinutes -= 60;
            }
            
            // Ensure we don't go past 23:59
            if ($cronHours >= 24) {
                $cronHours = 23;
                $cronMinutes = 59;
            }
            
            // Generate the CRON expression
            // Format: minute hour * * day-of-week command
            $cronExpression = sprintf(
                "%d %d * * 1-5 php %s/scripts/handle_closing_time.php >> %s/logs/cron.log 2>&1",
                $cronMinutes,
                $cronHours,
                dirname(__DIR__, 2), // Go up 2 directories to reach project root
                dirname(__DIR__, 2)
            );
            
            // Store the CRON job information in database for reference
            $this->storeCronJobInfo($cronExpression, $cronHours, $cronMinutes);
            
            // Write CRON job to file (for manual installation)
            $this->writeCronToFile($cronExpression);
            
            // Try to update system CRON (if permissions allow)
            $this->updateSystemCron($cronExpression);
            
            return [
                'success' => true,
                'cron_expression' => $cronExpression,
                'schedule_time' => sprintf('%02d:%02d', $cronHours, $cronMinutes),
                'message' => 'CRON job updated successfully'
            ];
            
        } catch (Exception $e) {
            error_log("CRON Manager Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update CRON job: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Store CRON job information in database
     */
    private function storeCronJobInfo($cronExpression, $hours, $minutes) {
        // Check if record exists
        $checkStmt = $this->db->prepare("SELECT setting_key FROM settings WHERE setting_key = 'auto_reschedule_cron'");
        $checkStmt->execute();
        $exists = $checkStmt->fetch();
        
        if ($exists) {
            // Update existing
            $stmt = $this->db->prepare("
                UPDATE settings 
                SET setting_value = ?, updated_at = NOW() 
                WHERE setting_key = 'auto_reschedule_cron'
            ");
            $stmt->execute([$cronExpression]);
        } else {
            // Insert new
            $stmt = $this->db->prepare("
                INSERT INTO settings (setting_key, setting_value, created_at) 
                VALUES ('auto_reschedule_cron', ?, NOW())
            ");
            $stmt->execute([$cronExpression]);
        }
        
        // Also store the schedule time for easy reference
        $scheduleTime = sprintf('%02d:%02d', $hours, $minutes);
        
        $checkStmt = $this->db->prepare("SELECT setting_key FROM settings WHERE setting_key = 'auto_reschedule_time'");
        $checkStmt->execute();
        $exists = $checkStmt->fetch();
        
        if ($exists) {
            $stmt = $this->db->prepare("
                UPDATE settings 
                SET setting_value = ?, updated_at = NOW() 
                WHERE setting_key = 'auto_reschedule_time'
            ");
            $stmt->execute([$scheduleTime]);
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO settings (setting_key, setting_value, created_at) 
                VALUES ('auto_reschedule_time', ?, NOW())
            ");
            $stmt->execute([$scheduleTime]);
        }
    }
    
    /**
     * Write CRON job to file for manual installation
     */
    private function writeCronToFile($cronExpression) {
        $cronContent = "# Q-Mak Auto-Reschedule CRON Job\n";
        $cronContent .= "# This job automatically reschedules pending orders at closing time\n";
        $cronContent .= "# Generated on: " . date('Y-m-d H:i:s') . "\n";
        $cronContent .= $cronExpression . "\n\n";
        $cronContent .= "# To install this CRON job, run:\n";
        $cronContent .= "# crontab -e\n";
        $cronContent .= "# Then add the above line to your crontab\n";
        
        file_put_contents($this->cronFilePath, $cronContent);
    }
    
    /**
     * Attempt to update system CRON (requires appropriate permissions)
     */
    private function updateSystemCron($cronExpression) {
        // This is a basic implementation
        // In production, you might need more sophisticated CRON management
        
        try {
            // Get current crontab
            $currentCron = shell_exec('crontab -l 2>/dev/null') ?: '';
            
            // Remove any existing Q-Mak auto-reschedule entries
            $lines = explode("\n", $currentCron);
            $filteredLines = array_filter($lines, function($line) {
                return !strpos($line, 'handle_closing_time.php');
            });
            
            // Add the new CRON job
            $filteredLines[] = $cronExpression;
            
            // Write back to crontab
            $newCron = implode("\n", $filteredLines);
            $tempFile = tempnam(sys_get_temp_dir(), 'qmak_cron');
            file_put_contents($tempFile, $newCron);
            
            // Install the new crontab
            $result = shell_exec("crontab $tempFile 2>&1");
            unlink($tempFile);
            
            return true;
            
        } catch (Exception $e) {
            // If we can't update system CRON, that's okay
            // The admin can manually install from the file
            error_log("Could not update system CRON: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get current CRON job information
     */
    public function getCurrentCronInfo() {
        try {
            $stmt = $this->db->prepare("
                SELECT setting_key, setting_value 
                FROM settings 
                WHERE setting_key IN ('auto_reschedule_cron', 'auto_reschedule_time')
            ");
            $stmt->execute();
            $results = $stmt->fetchAll();
            
            $info = [];
            foreach ($results as $row) {
                $info[$row['setting_key']] = $row['setting_value'];
            }
            
            return $info;
            
        } catch (Exception $e) {
            error_log("Error getting CRON info: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Check if CRON job is properly configured
     */
    public function verifyCronJob() {
        try {
            // Check if the CRON job exists in system crontab
            $currentCron = shell_exec('crontab -l 2>/dev/null') ?: '';
            $hasQmakCron = strpos($currentCron, 'handle_closing_time.php') !== false;
            
            // Get stored CRON info
            $cronInfo = $this->getCurrentCronInfo();
            
            return [
                'system_cron_exists' => $hasQmakCron,
                'stored_cron' => $cronInfo['auto_reschedule_cron'] ?? null,
                'schedule_time' => $cronInfo['auto_reschedule_time'] ?? null,
                'cron_file_path' => $this->cronFilePath,
                'file_exists' => file_exists($this->cronFilePath)
            ];
            
        } catch (Exception $e) {
            return [
                'error' => $e->getMessage(),
                'system_cron_exists' => false,
                'stored_cron' => null
            ];
        }
    }
}
?>
