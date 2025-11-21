<?php
/**
 * Brute Force Protection Class
 * Comprehensive security layer for Q-Mak System
 * Created: November 6, 2025
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/security_config.php';

class BruteForceProtection {
    private $db;
    private $clientIP;
    private $userAgent;
    
    public function __construct() {
        $this->db = getDB();
        $this->clientIP = getClientIP();
        $this->userAgent = getClientUserAgent();
    }
    
    /**
     * Check if identifier (email/IP) is currently locked
     */
    public function isLocked($identifier, $attemptType) {
        // Skip security checks if in debug mode
        if (SECURITY_DEBUG_MODE) {
            return false;
        }
        
        // Check if IP is whitelisted
        if (isIPWhitelisted($this->clientIP)) {
            return false;
        }
        
        // Check IP blacklist first
        if ($this->isIPBlacklisted($this->clientIP)) {
            $this->logSecurityEvent('ip_blocked', 'critical', 'guest', $identifier, 
                'Attempt from blacklisted IP: ' . $this->clientIP);
            return true;
        }
        
        // Clean up expired locks
        $this->cleanupExpiredLocks();
        
        // Check email-based lock
        $stmt = $this->db->prepare("
            SELECT attempt_id, failed_attempts, locked_until, is_locked, lockout_count
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = 'email'
            AND attempt_type = ?
            AND is_locked = 1
            AND locked_until > NOW()
        ");
        $stmt->execute([$identifier, $attemptType]);
        $emailLock = $stmt->fetch();
        
        if ($emailLock) {
            $this->logSecurityEvent('account_locked', 'warning', 
                $this->getUserType($attemptType), $identifier,
                "Account locked until " . $emailLock['locked_until']);
            return true;
        }
        
        // Check IP-based lock
        $stmt = $this->db->prepare("
            SELECT attempt_id, failed_attempts, locked_until, is_locked
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = 'ip'
            AND attempt_type = ?
            AND is_locked = 1
            AND locked_until > NOW()
        ");
        $stmt->execute([$this->clientIP, $attemptType]);
        $ipLock = $stmt->fetch();
        
        if ($ipLock) {
            $this->logSecurityEvent('ip_blocked', 'warning', 'guest', $this->clientIP,
                "IP temporarily locked until " . $ipLock['locked_until']);
            return true;
        }
        
        return false;
    }
    
    /**
     * Record a failed login attempt
     */
    public function recordFailedAttempt($identifier, $attemptType, $metadata = []) {
        if (SECURITY_DEBUG_MODE) {
            return ['locked' => false, 'attempts' => 0];
        }
        
        $this->db->beginTransaction();
        
        try {
            // Record attempt for email
            $emailAttempt = $this->recordAttemptByType($identifier, 'email', $attemptType);
            
            // Record attempt for IP
            $ipAttempt = $this->recordAttemptByType($this->clientIP, 'ip', $attemptType);
            
            // Check if we should lock the account
            $shouldLock = $emailAttempt['failed_attempts'] >= MAX_LOGIN_ATTEMPTS;
            
            if ($shouldLock) {
                $lockoutDuration = $this->calculateLockoutDuration($emailAttempt['lockout_count']);
                $lockedUntil = date('Y-m-d H:i:s', strtotime("+{$lockoutDuration} minutes"));
                
                // Lock email-based attempts
                $stmt = $this->db->prepare("
                    UPDATE security_attempts 
                    SET is_locked = 1, 
                        locked_until = ?,
                        lockout_count = lockout_count + 1
                    WHERE attempt_id = ?
                ");
                $stmt->execute([$lockedUntil, $emailAttempt['attempt_id']]);
                
                // Log the lockout
                $this->logSecurityEvent('account_locked', 'warning',
                    $this->getUserType($attemptType), $identifier,
                    "Account locked after " . MAX_LOGIN_ATTEMPTS . " failed attempts. Locked until: {$lockedUntil}",
                    $metadata);
                
                // Check if IP should be blacklisted
                $this->checkIPBlacklist($this->clientIP, $attemptType);
                
                // Send admin notification
                if (ENABLE_SECURITY_NOTIFICATIONS && NOTIFY_ON_ACCOUNT_LOCKED) {
                    $this->sendSecurityNotification('account_locked', $identifier, [
                        'attempts' => $emailAttempt['failed_attempts'],
                        'locked_until' => $lockedUntil,
                        'ip' => $this->clientIP
                    ]);
                }
            } else {
                // Log failed attempt
                $this->logSecurityEvent('login_failed', 'info',
                    $this->getUserType($attemptType), $identifier,
                    "Failed login attempt " . $emailAttempt['failed_attempts'] . "/" . MAX_LOGIN_ATTEMPTS,
                    $metadata);
            }
            
            $this->db->commit();
            
            return [
                'locked' => $shouldLock,
                'attempts' => $emailAttempt['failed_attempts'],
                'max_attempts' => MAX_LOGIN_ATTEMPTS,
                'remaining' => MAX_LOGIN_ATTEMPTS - $emailAttempt['failed_attempts'],
                'locked_until' => $shouldLock ? $lockedUntil : null
            ];
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Brute Force Protection Error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Record a successful login (resets attempts)
     */
    public function recordSuccessfulAttempt($identifier, $attemptType) {
        if (SECURITY_DEBUG_MODE) {
            return;
        }
        
        // Reset attempts for this identifier (email)
        $stmt = $this->db->prepare("
            DELETE FROM security_attempts
            WHERE identifier = ? 
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $attemptType]);
        
        // Also reset attempts for this IP address for same attempt type
        $stmt = $this->db->prepare("
            DELETE FROM security_attempts
            WHERE identifier = ?
            AND identifier_type = 'ip'
            AND attempt_type = ?
        ");
        $stmt->execute([$this->clientIP, $attemptType]);
        
        // Log successful login
        $this->logSecurityEvent('login_success', 'info',
            $this->getUserType($attemptType), $identifier,
            "Successful login from IP: " . $this->clientIP);
    }
    
    /**
     * Apply progressive delay based on failed attempts
     */
    public function applyProgressiveDelay($identifier, $attemptType) {
        if (!ENABLE_PROGRESSIVE_DELAY || SECURITY_DEBUG_MODE) {
            return 0;
        }
        
        $stmt = $this->db->prepare("
            SELECT failed_attempts 
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = 'email'
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $attemptType]);
        $attempt = $stmt->fetch();
        
        if ($attempt && $attempt['failed_attempts'] > 0) {
            $delay = calculateProgressiveDelay($attempt['failed_attempts']);
            sleep($delay);
            return $delay;
        }
        
        return 0;
    }
    
    /**
     * Check if CAPTCHA is required
     */
    public function requiresCaptcha($identifier, $attemptType) {
        if (!ENABLE_CAPTCHA || SECURITY_DEBUG_MODE) {
            return false;
        }
        
        $stmt = $this->db->prepare("
            SELECT failed_attempts 
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = 'email'
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $attemptType]);
        $attempt = $stmt->fetch();
        
        return $attempt && $attempt['failed_attempts'] >= CAPTCHA_THRESHOLD;
    }
    
    /**
     * Generate CAPTCHA challenge
     */
    public function generateCaptcha($identifier) {
        if (!ENABLE_CAPTCHA) {
            return null;
        }
        
        // For Google reCAPTCHA, we don't need to generate server-side challenges
        if (CAPTCHA_TYPE === 'recaptcha' || CAPTCHA_TYPE === 'recaptcha_v3') {
            return [
                'type' => CAPTCHA_TYPE,
                'site_key' => RECAPTCHA_SITE_KEY,
                'requires_captcha' => true
            ];
        }
        
        // For custom CAPTCHA types (math, text)
        $token = bin2hex(random_bytes(32));
        
        if (CAPTCHA_TYPE === 'math') {
            $num1 = rand(1, 10);
            $num2 = rand(1, 10);
            $answer = $num1 + $num2;
            $question = "{$num1} + {$num2} = ?";
        } else {
            // Simple text CAPTCHA
            $answer = substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6);
            $question = $answer;
        }
        
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . CAPTCHA_EXPIRY_MINUTES . ' minutes'));
        
        $stmt = $this->db->prepare("
            INSERT INTO captcha_challenges 
            (identifier, challenge_token, challenge_answer, expires_at)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$identifier, $token, $answer, $expiresAt]);
        
        return [
            'token' => $token,
            'question' => $question,
            'type' => CAPTCHA_TYPE,
            'expires_at' => $expiresAt
        ];
    }
    
    /**
     * Verify CAPTCHA response
     */
    public function verifyCaptcha($token, $answer, $identifier = null) {
        if (!ENABLE_CAPTCHA) {
            return true;
        }
        
        // Google reCAPTCHA verification
        if (CAPTCHA_TYPE === 'recaptcha' || CAPTCHA_TYPE === 'recaptcha_v3') {
            return $this->verifyGoogleRecaptcha($token, $identifier);
        }
        
        // Custom CAPTCHA verification (math, text)
        $stmt = $this->db->prepare("
            SELECT challenge_id, challenge_answer, identifier, expires_at, attempts
            FROM captcha_challenges
            WHERE challenge_token = ?
            AND is_solved = 0
            AND expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $challenge = $stmt->fetch();
        
        if (!$challenge) {
            return false;
        }
        
        // Increment attempts
        $stmt = $this->db->prepare("
            UPDATE captcha_challenges 
            SET attempts = attempts + 1
            WHERE challenge_id = ?
        ");
        $stmt->execute([$challenge['challenge_id']]);
        
        // Check answer
        if (strtolower(trim($answer)) === strtolower(trim($challenge['challenge_answer']))) {
            // Mark as solved
            $stmt = $this->db->prepare("
                UPDATE captcha_challenges 
                SET is_solved = 1
                WHERE challenge_id = ?
            ");
            $stmt->execute([$challenge['challenge_id']]);
            
            $this->logSecurityEvent('captcha_success', 'info', 'guest', 
                $challenge['identifier'], 'CAPTCHA solved successfully');
            
            return true;
        }
        
        $this->logSecurityEvent('captcha_failed', 'info', 'guest',
            $challenge['identifier'], 'CAPTCHA verification failed');
        
        return false;
    }
    
    /**
     * Verify Google reCAPTCHA
     */
    private function verifyGoogleRecaptcha($recaptchaResponse, $identifier = null) {
        if (empty($recaptchaResponse)) {
            return false;
        }
        
        // Verify with Google
        $url = 'https://www.google.com/recaptcha/api/siteverify';
        $data = [
            'secret' => RECAPTCHA_SECRET_KEY,
            'response' => $recaptchaResponse,
            'remoteip' => $this->clientIP
        ];
        
        $options = [
            'http' => [
                'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                'method' => 'POST',
                'content' => http_build_query($data)
            ]
        ];
        
        $context = stream_context_create($options);
        $result = @file_get_contents($url, false, $context);
        
        if ($result === false) {
            error_log("reCAPTCHA verification failed: Unable to contact Google");
            return false;
        }
        
        $resultJson = json_decode($result, true);
        
        if (isset($resultJson['success']) && $resultJson['success'] === true) {
            $this->logSecurityEvent('captcha_success', 'info', 'guest',
                $identifier ?? $this->clientIP, 'Google reCAPTCHA verified successfully');
            return true;
        }
        
        $errorCodes = isset($resultJson['error-codes']) ? implode(', ', $resultJson['error-codes']) : 'unknown';
        $this->logSecurityEvent('captcha_failed', 'info', 'guest',
            $identifier ?? $this->clientIP, "Google reCAPTCHA verification failed: {$errorCodes}");
        
        return false;
    }
    
    /**
     * Check if IP is blacklisted
     */
    public function isIPBlacklisted($ip) {
        if (!ENABLE_IP_BLACKLIST) {
            return false;
        }
        
        $stmt = $this->db->prepare("
            SELECT blacklist_id 
            FROM ip_blacklist
            WHERE ip_address = ?
            AND is_active = 1
            AND (blocked_until IS NULL OR blocked_until > NOW())
        ");
        $stmt->execute([$ip]);
        
        return $stmt->fetch() !== false;
    }
    
    /**
     * Get account status information
     */
    public function getAccountStatus($identifier, $attemptType) {
        $stmt = $this->db->prepare("
            SELECT failed_attempts, locked_until, is_locked, lockout_count
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = 'email'
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $attemptType]);
        $attempt = $stmt->fetch();
        
        if (!$attempt) {
            return [
                'is_locked' => false,
                'failed_attempts' => 0,
                'requires_captcha' => false
            ];
        }
        
        return [
            'is_locked' => $attempt['is_locked'] && strtotime($attempt['locked_until']) > time(),
            'failed_attempts' => $attempt['failed_attempts'],
            'locked_until' => $attempt['locked_until'],
            'lockout_count' => $attempt['lockout_count'],
            'requires_captcha' => $attempt['failed_attempts'] >= CAPTCHA_THRESHOLD,
            'remaining_attempts' => max(0, MAX_LOGIN_ATTEMPTS - $attempt['failed_attempts'])
        ];
    }
    
    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================
    
    /**
     * Record attempt by identifier type (email or IP)
     */
    private function recordAttemptByType($identifier, $identifierType, $attemptType) {
        $cutoffTime = date('Y-m-d H:i:s', strtotime('-' . ATTEMPT_WINDOW_MINUTES . ' minutes'));
        
        // Check if record exists
        $stmt = $this->db->prepare("
            SELECT attempt_id, failed_attempts, lockout_count, first_attempt_at
            FROM security_attempts
            WHERE identifier = ? 
            AND identifier_type = ?
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $identifierType, $attemptType]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Check if attempts are within the time window
            if (strtotime($existing['first_attempt_at']) < strtotime($cutoffTime)) {
                // Reset counter - attempts are outside window
                $stmt = $this->db->prepare("
                    UPDATE security_attempts
                    SET failed_attempts = 1,
                        first_attempt_at = NOW(),
                        last_attempt_at = NOW(),
                        is_locked = 0,
                        locked_until = NULL,
                        ip_address = ?,
                        user_agent = ?
                    WHERE attempt_id = ?
                ");
                $stmt->execute([$this->clientIP, $this->userAgent, $existing['attempt_id']]);
                
                return [
                    'attempt_id' => $existing['attempt_id'],
                    'failed_attempts' => 1,
                    'lockout_count' => $existing['lockout_count']
                ];
            } else {
                // Increment counter
                $stmt = $this->db->prepare("
                    UPDATE security_attempts
                    SET failed_attempts = failed_attempts + 1,
                        last_attempt_at = NOW(),
                        ip_address = ?,
                        user_agent = ?
                    WHERE attempt_id = ?
                ");
                $stmt->execute([$this->clientIP, $this->userAgent, $existing['attempt_id']]);
                
                return [
                    'attempt_id' => $existing['attempt_id'],
                    'failed_attempts' => $existing['failed_attempts'] + 1,
                    'lockout_count' => $existing['lockout_count']
                ];
            }
        } else {
            // Create new record
            // Debug: Log what we're inserting
            error_log("Inserting security_attempt: identifier=$identifier, identifierType=$identifierType, attemptType=$attemptType");
            
            $stmt = $this->db->prepare("
                INSERT INTO security_attempts
                (identifier, identifier_type, attempt_type, failed_attempts, 
                 first_attempt_at, last_attempt_at, ip_address, user_agent)
                VALUES (?, ?, ?, 1, NOW(), NOW(), ?, ?)
            ");
            $stmt->execute([$identifier, $identifierType, $attemptType, 
                           $this->clientIP, $this->userAgent]);
            
            return [
                'attempt_id' => $this->db->lastInsertId(),
                'failed_attempts' => 1,
                'lockout_count' => 0
            ];
        }
    }
    
    /**
     * Calculate lockout duration based on violation history
     */
    private function calculateLockoutDuration($lockoutCount) {
        if ($lockoutCount >= LOCKOUT_THRESHOLD_FOR_EXTENDED) {
            return EXTENDED_LOCKOUT_MINUTES;
        }
        return LOCKOUT_DURATION_MINUTES;
    }
    
    /**
     * Check if IP should be blacklisted
     */
    private function checkIPBlacklist($ip, $attemptType) {
        if (!ENABLE_IP_BLACKLIST || isIPWhitelisted($ip)) {
            return;
        }
        
        // Count lockouts from this IP
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as lockout_count
            FROM security_attempts
            WHERE ip_address = ?
            AND is_locked = 1
            AND last_attempt_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute([$ip]);
        $result = $stmt->fetch();
        
        if ($result['lockout_count'] >= IP_BAN_THRESHOLD) {
            // Add to blacklist
            $blockedUntil = IP_BAN_DURATION_HOURS ? 
                date('Y-m-d H:i:s', strtotime('+' . IP_BAN_DURATION_HOURS . ' hours')) : null;
            
            $stmt = $this->db->prepare("
                INSERT INTO ip_blacklist (ip_address, reason, block_type, blocked_until)
                VALUES (?, ?, 'automatic', ?)
                ON DUPLICATE KEY UPDATE 
                    blocked_until = VALUES(blocked_until),
                    is_active = 1
            ");
            $stmt->execute([
                $ip,
                "Automatic ban after {$result['lockout_count']} lockouts",
                $blockedUntil
            ]);
            
            $this->logSecurityEvent('ip_blocked', 'critical', 'system', $ip,
                "IP automatically blacklisted after multiple lockouts");
            
            if (ENABLE_SECURITY_NOTIFICATIONS && NOTIFY_ON_IP_BLOCKED) {
                $this->sendSecurityNotification('ip_blocked', $ip, [
                    'lockout_count' => $result['lockout_count'],
                    'blocked_until' => $blockedUntil
                ]);
            }
        }
    }
    
    /**
     * Clean up expired locks
     */
    private function cleanupExpiredLocks() {
        if (AUTO_UNLOCK_ACCOUNTS) {
            $stmt = $this->db->prepare("
                UPDATE security_attempts
                SET is_locked = 0
                WHERE is_locked = 1
                AND locked_until < NOW()
            ");
            $stmt->execute();
        }
    }
    
    /**
     * Log security event
     */
    private function logSecurityEvent($eventType, $severity, $userType, $userIdentifier, $description, $metadata = []) {
        if (!ENABLE_SECURITY_LOGGING) {
            return;
        }
        
        // Check if we should log this severity level
        if (LOG_SEVERITY_LEVEL !== 'all') {
            $severityLevels = ['info' => 1, 'warning' => 2, 'critical' => 3];
            $configLevel = $severityLevels[LOG_SEVERITY_LEVEL] ?? 1;
            $eventLevel = $severityLevels[$severity] ?? 1;
            
            if ($eventLevel < $configLevel) {
                return;
            }
        }
        
        $metadata['ip'] = $this->clientIP;
        $metadata['user_agent'] = $this->userAgent;
        
        $stmt = $this->db->prepare("
            INSERT INTO security_logs
            (event_type, severity, user_type, user_identifier, ip_address, user_agent, description, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $eventType,
            $severity,
            $userType,
            $userIdentifier,
            $this->clientIP,
            $this->userAgent,
            $description,
            json_encode($metadata)
        ]);
    }
    
    /**
     * Send security notification to admins
     */
    private function sendSecurityNotification($eventType, $identifier, $data) {
        if (!ENABLE_SECURITY_NOTIFICATIONS) {
            return;
        }
        
        try {
            require_once __DIR__ . '/email.php';
            
            $emails = getSecurityNotificationEmails();
            $subject = "Security Alert: " . ucwords(str_replace('_', ' ', $eventType));
            
            $message = "<h2>Security Alert - Q-Mak System</h2>";
            $message .= "<p><strong>Event:</strong> " . ucwords(str_replace('_', ' ', $eventType)) . "</p>";
            $message .= "<p><strong>Identifier:</strong> {$identifier}</p>";
            $message .= "<p><strong>IP Address:</strong> {$this->clientIP}</p>";
            $message .= "<p><strong>Time:</strong> " . date('Y-m-d H:i:s') . "</p>";
            $message .= "<p><strong>Details:</strong></p><pre>" . print_r($data, true) . "</pre>";
            
            foreach ($emails as $email) {
                EmailService::sendEmail($email, $subject, $message);
            }
        } catch (Exception $e) {
            error_log("Failed to send security notification: " . $e->getMessage());
        }
    }
    
    /**
     * Get user type based on attempt type
     */
    private function getUserType($attemptType) {
        if (strpos($attemptType, 'admin') !== false) {
            return 'admin';
        } elseif (strpos($attemptType, 'student') !== false) {
            return 'student';
        }
        return 'guest';
    }
    
    /**
     * Unlock account manually (for admin use)
     */
    public function unlockAccount($identifier, $attemptType) {
        $stmt = $this->db->prepare("
            UPDATE security_attempts
            SET is_locked = 0,
                locked_until = NULL,
                failed_attempts = 0
            WHERE identifier = ?
            AND attempt_type = ?
        ");
        $stmt->execute([$identifier, $attemptType]);
        
        $this->logSecurityEvent('account_unlocked', 'info',
            $this->getUserType($attemptType), $identifier,
            "Account manually unlocked");
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Remove IP from blacklist
     */
    public function unblockIP($ip) {
        $stmt = $this->db->prepare("
            UPDATE ip_blacklist
            SET is_active = 0
            WHERE ip_address = ?
        ");
        $stmt->execute([$ip]);
        
        $this->logSecurityEvent('ip_unblocked', 'info', 'system', $ip,
            "IP manually unblocked");
        
        return $stmt->rowCount() > 0;
    }
}

?>
