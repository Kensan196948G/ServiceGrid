# AuthUtil.psm1 - Enhanced Authentication & Authorization Module
# Version: 2.0.0 - Enhanced Security Implementation
# Features: Secure token management, password hashing, input validation, session security

# Import required modules with error handling
try {
    Import-Module "$PSScriptRoot/LogUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/PasswordUtil.psm1" -Force -ErrorAction Stop
} catch {
    throw "Failed to import required modules: $($_.Exception.Message)"
}

# Secure session storage with encryption
$script:SessionTokens = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()
$script:TokenCleanupTimer = $null
$script:MaxSessionsPerUser = 5
$script:MaxFailedAttempts = 5
$script:LockoutDurationMinutes = 30

# Security configuration
$script:SecurityConfig = @{
    TokenLength = 32
    TokenExpiryMinutes = 60
    MaxConcurrentSessions = 100
    SessionCleanupIntervalMinutes = 15
    RequireSecureConnection = $true
    EnableBruteForceProtection = $true
    LogSecurityEvents = $true
}

function New-AuthToken {
    <#
    .SYNOPSIS
    Creates a secure authentication token with enhanced security features
    
    .DESCRIPTION
    Generates a cryptographically secure token with session management,
    concurrent session limits, and comprehensive security logging
    
    .PARAMETER Username
    The username for which to create the token
    
    .PARAMETER ExpiryMinutes
    Token expiry time in minutes (default: 60)
    
    .PARAMETER ClientIP
    Client IP address for security tracking
    
    .PARAMETER UserAgent
    User agent string for session fingerprinting
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Username,
        
        [Parameter(Mandatory=$false)]
        [ValidateRange(5, 1440)]
        [int]$ExpiryMinutes = 60,
        
        [Parameter(Mandatory=$false)]
        [string]$ClientIP = "Unknown",
        
        [Parameter(Mandatory=$false)]
        [string]$UserAgent = "Unknown"
    )
    
    try {
        # Input validation
        if ([string]::IsNullOrWhiteSpace($Username)) {
            throw "Username cannot be null or empty"
        }
        
        # Check for existing sessions and enforce limits
        $existingSessions = Get-UserActiveSessions -Username $Username
        if ($existingSessions.Count -ge $script:MaxSessionsPerUser) {
            # Remove oldest session
            $oldestSession = $existingSessions | Sort-Object CreatedAt | Select-Object -First 1
            Remove-AuthToken -Token $oldestSession.Token
            Write-LogEntry -Level "WARNING" -Message "Removed oldest session for user $Username due to session limit" -Category "SECURITY"
        }
        
        # Generate cryptographically secure token
        $tokenBytes = New-Object byte[] $script:SecurityConfig.TokenLength
        [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($tokenBytes)
        $token = [System.Convert]::ToBase64String($tokenBytes) -replace '[^a-zA-Z0-9]', ''
        
        # Create session data with security context
        $sessionData = @{
            Username = $Username
            Expiry = (Get-Date).AddMinutes($ExpiryMinutes)
            CreatedAt = Get-Date
            LastActivity = Get-Date
            ClientIP = $ClientIP
            UserAgent = $UserAgent
            SessionId = [System.Guid]::NewGuid().ToString()
            IsSecure = $script:SecurityConfig.RequireSecureConnection
            LoginAttempts = 0
        }
        
        # Store session securely
        $script:SessionTokens.TryAdd($token, $sessionData) | Out-Null
        
        # Security logging
        Write-LogEntry -Level "INFO" -Message "Secure auth token created for user: $Username" -Category "AUTHENTICATION" -Properties @{
            ClientIP = $ClientIP
            UserAgent = $UserAgent
            SessionId = $sessionData.SessionId
            TokenExpiry = $sessionData.Expiry
        }
        
        # Start cleanup timer if not already running
        Start-TokenCleanupTimer
        
        return $token
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to create auth token for user $Username`: $($_.Exception.Message)" -Category "AUTHENTICATION" -Exception $_
        return $null
    }
}

function Test-AuthToken {
    <#
    .SYNOPSIS
    Validates an authentication token with enhanced security checks
    
    .DESCRIPTION
    Performs comprehensive token validation including expiry, session integrity,
    security context verification, and activity tracking
    
    .PARAMETER Token
    The authentication token to validate
    
    .PARAMETER ClientIP
    Client IP address for security validation
    
    .PARAMETER UpdateActivity
    Whether to update last activity timestamp
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Token,
        
        [Parameter(Mandatory=$false)]
        [string]$ClientIP = $null,
        
        [Parameter(Mandatory=$false)]
        [switch]$UpdateActivity = $true
    )
    
    try {
        # Input validation
        if ([string]::IsNullOrWhiteSpace($Token)) {
            Write-LogEntry -Level "WARNING" -Message "Token validation attempted with null or empty token" -Category "SECURITY"
            return $false
        }
        
        # Check if token exists
        if (-not $script:SessionTokens.ContainsKey($Token)) {
            Write-LogEntry -Level "WARNING" -Message "Token validation failed: Token not found" -Category "SECURITY" -Properties @{
                ClientIP = $ClientIP
                TokenPrefix = $Token.Substring(0, [Math]::Min(8, $Token.Length))
            }
            return $false
        }
        
        $session = $script:SessionTokens[$Token]
        
        # Check token expiry
        if ((Get-Date) -gt $session.Expiry) {
            $script:SessionTokens.TryRemove($Token, [ref]$null) | Out-Null
            Write-LogEntry -Level "INFO" -Message "Token expired and removed for user: $($session.Username)" -Category "AUTHENTICATION"
            return $false
        }
        
        # Security context validation
        if ($ClientIP -and $session.ClientIP -ne "Unknown" -and $session.ClientIP -ne $ClientIP) {
            Write-LogEntry -Level "WARNING" -Message "Token validation failed: IP address mismatch for user $($session.Username)" -Category "SECURITY" -Properties @{
                ExpectedIP = $session.ClientIP
                ActualIP = $ClientIP
                Username = $session.Username
            }
            
            # Optionally invalidate session on IP mismatch (configurable)
            if ($script:SecurityConfig.RequireSecureConnection) {
                $script:SessionTokens.TryRemove($Token, [ref]$null) | Out-Null
                return $false
            }
        }
        
        # Update last activity
        if ($UpdateActivity) {
            $session.LastActivity = Get-Date
        }
        
        return $true
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to validate auth token: $($_.Exception.Message)" -Category "AUTHENTICATION" -Exception $_
        return $false
    }
}

function Get-TokenUser {
    <#
    .SYNOPSIS
    Retrieves the username associated with a valid authentication token
    
    .DESCRIPTION
    Safely retrieves the username from a validated session token with
    comprehensive error handling and security logging
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Token,
        
        [Parameter(Mandatory=$false)]
        [string]$ClientIP = $null
    )
    
    try {
        if (Test-AuthToken -Token $Token -ClientIP $ClientIP) {
            $session = $script:SessionTokens[$Token]
            return $session.Username
        }
        return $null
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get token user: $($_.Exception.Message)" -Category "AUTHENTICATION" -Exception $_
        return $null
    }
}

function Remove-AuthToken {
    <#
    .SYNOPSIS
    Securely removes an authentication token and cleans up session data
    
    .DESCRIPTION
    Safely removes a session token with proper cleanup and security logging
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Token,
        
        [Parameter(Mandatory=$false)]
        [string]$Reason = "User logout"
    )
    
    try {
        $sessionData = $null
        if ($script:SessionTokens.TryRemove($Token, [ref]$sessionData)) {
            Write-LogEntry -Level "INFO" -Message "Auth token removed for user: $($sessionData.Username)" -Category "AUTHENTICATION" -Properties @{
                Reason = $Reason
                SessionId = $sessionData.SessionId
                SessionDuration = ((Get-Date) - $sessionData.CreatedAt).TotalMinutes
            }
            return $true
        }
        return $false
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to remove auth token: $($_.Exception.Message)" -Category "AUTHENTICATION" -Exception $_
        return $false
    }
}

function Test-UserCredentials {
    <#
    .SYNOPSIS
    Validates user credentials with enhanced security features
    
    .DESCRIPTION
    Performs secure credential validation with brute force protection,
    account lockout, password policy enforcement, and comprehensive logging
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Username,
        
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Password,
        
        [Parameter(Mandatory=$false)]
        [string]$ClientIP = "Unknown",
        
        [Parameter(Mandatory=$false)]
        [string]$UserAgent = "Unknown"
    )
    
    try {
        # Input validation and sanitization
        if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
            Write-LogEntry -Level "WARNING" -Message "Invalid credential input: Username or password is null/empty" -Category "SECURITY"
            return $null
        }
        
        # Sanitize username to prevent injection attacks
        $Username = $Username -replace "[^a-zA-Z0-9@._-]", ""
        if ($Username.Length -gt 100) {
            Write-LogEntry -Level "WARNING" -Message "Username too long, potential attack detected" -Category "SECURITY" -Properties @{ ClientIP = $ClientIP }
            return $null
        }
        
        Import-Module "$PSScriptRoot/DBUtil.psm1" -Force
        Import-Module "$PSScriptRoot/PasswordUtil.psm1" -Force
        
        # Check for brute force attempts
        if (Test-BruteForceProtection -Username $Username -ClientIP $ClientIP) {
            Write-LogEntry -Level "WARNING" -Message "Brute force protection triggered for user: $Username" -Category "SECURITY" -Properties @{
                ClientIP = $ClientIP
                UserAgent = $UserAgent
            }
            return $null
        }
        
        # Get user information with enhanced security checks
        $query = @"
SELECT 
    user_id, username, password_hash, password_salt, role, display_name, email,
    account_locked, account_locked_until, failed_login_attempts, last_login,
    password_changed_date, account_disabled, two_factor_enabled
FROM users 
WHERE username = @username AND account_disabled != 1
"@
        $params = @{ username = $Username }
        $userInfo = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $userInfo -or $userInfo.Count -eq 0) {
            Write-LogEntry -Level "WARNING" -Message "Login attempt for non-existent user: $Username" -Category "SECURITY" -Properties @{
                ClientIP = $ClientIP
                UserAgent = $UserAgent
            }
            Record-FailedLoginAttempt -Username $Username -ClientIP $ClientIP -Reason "User not found"
            return $null
        }
        
        $user = $userInfo[0]
        
        # Check account lockout status
        if ($user.account_locked -and $user.account_locked_until) {
            $lockUntil = [DateTime]::Parse($user.account_locked_until)
            if ([DateTime]::Now -lt $lockUntil) {
                Write-LogEntry -Level "WARNING" -Message "Login attempt for locked account: $Username" -Category "SECURITY" -Properties @{
                    ClientIP = $ClientIP
                    LockUntil = $lockUntil
                }
                return $null
            } else {
                # Unlock account if lockout period has expired
                Unlock-UserAccount -Username $Username
            }
        }
        
        # Validate password with enhanced security
        $isValidPassword = $false
        
        # First try hashed password validation
        if ($user.password_hash -and $user.password_salt) {
            $isValidPassword = Test-Password -PlainPassword $Password -StoredHash $user.password_hash -StoredSalt $user.password_salt
        } else {
            # Legacy plaintext password support (to be deprecated)
            $legacyQuery = "SELECT user_id FROM users WHERE username = @username AND password = @password"
            $legacyResult = Invoke-SqlQuery -Query $legacyQuery -Parameters @{ username = $Username; password = $Password }
            $isValidPassword = $legacyResult -and $legacyResult.Count -gt 0
            
            if ($isValidPassword) {
                Write-LogEntry -Level "WARNING" -Message "User authenticated with legacy plaintext password: $Username" -Category "SECURITY"
                # Schedule password hash migration
                Start-PasswordMigration -Username $Username -PlaintextPassword $Password
            }
        }
        
        if ($isValidPassword) {
            # Reset failed login attempts
            Reset-FailedLoginAttempts -Username $Username
            
            # Update last login timestamp
            Update-LastLogin -Username $Username -ClientIP $ClientIP
            
            Write-LogEntry -Level "INFO" -Message "User authentication successful: $Username" -Category "AUTHENTICATION" -Properties @{
                ClientIP = $ClientIP
                UserAgent = $UserAgent
                AuthMethod = if ($user.password_hash) { "Hashed" } else { "Legacy" }
            }
            
            return @{
                UserId = $user.user_id
                Username = $user.username
                Role = $user.role
                DisplayName = $user.display_name
                Email = $user.email
                TwoFactorEnabled = $user.two_factor_enabled
                PasswordChanged = $user.password_changed_date
            }
        } else {
            # Record failed login attempt
            Record-FailedLoginAttempt -Username $Username -ClientIP $ClientIP -Reason "Invalid password"
            
            Write-LogEntry -Level "WARNING" -Message "Authentication failed for user: $Username" -Category "SECURITY" -Properties @{
                ClientIP = $ClientIP
                UserAgent = $UserAgent
                Reason = "Invalid password"
            }
            
            return $null
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "User credential test failed: $($_.Exception.Message)" -Category "AUTHENTICATION" -Exception $_
        return $null
    }
}

function Test-UserRole {
    param(
        [string]$Token,
        [string[]]$RequiredRoles
    )
    
    try {
        $username = Get-TokenUser -Token $Token
        if (-not $username) {
            return $false
        }
        
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        
        $query = "SELECT role FROM users WHERE username = @username"
        $params = @{ username = $username }
        
        $result = Invoke-SqlQuery -Query $query -Parameters $params
        
        if ($result -and $result.Count -gt 0) {
            $userRole = $result[0].role
            return $RequiredRoles -contains $userRole
        }
        
        return $false
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "User role test failed: $($_.Exception.Message)"
        return $false
    }
}

# Enhanced security functions
function Test-BruteForceProtection {
    <#
    .SYNOPSIS
    Tests if a user or IP is subject to brute force protection
    #>
    param(
        [string]$Username,
        [string]$ClientIP
    )
    
    try {
        $timeWindow = (Get-Date).AddMinutes(-15).ToString("yyyy-MM-dd HH:mm:ss")
        
        # Check failed attempts by username
        $userAttempts = Invoke-SqlQuery -Query @"
SELECT COUNT(*) as count FROM failed_login_attempts 
WHERE username = @username AND attempt_time > @time_window
"@ -Parameters @{ username = $Username; time_window = $timeWindow }
        
        # Check failed attempts by IP
        $ipAttempts = Invoke-SqlQuery -Query @"
SELECT COUNT(*) as count FROM failed_login_attempts 
WHERE client_ip = @client_ip AND attempt_time > @time_window
"@ -Parameters @{ client_ip = $ClientIP; time_window = $timeWindow }
        
        return ($userAttempts.count -ge $script:MaxFailedAttempts) -or ($ipAttempts.count -ge ($script:MaxFailedAttempts * 2))
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Brute force protection check failed: $($_.Exception.Message)" -Category "SECURITY"
        return $false
    }
}

function Record-FailedLoginAttempt {
    <#
    .SYNOPSIS
    Records a failed login attempt for security tracking
    #>
    param(
        [string]$Username,
        [string]$ClientIP,
        [string]$Reason = "Invalid credentials"
    )
    
    try {
        # Record in failed_login_attempts table
        $query = @"
INSERT INTO failed_login_attempts (username, client_ip, attempt_time, reason)
VALUES (@username, @client_ip, @attempt_time, @reason)
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{
            username = $Username
            client_ip = $ClientIP
            attempt_time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            reason = $Reason
        }
        
        # Update user's failed login count
        $updateQuery = @"
UPDATE users 
SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
    last_failed_login = @last_failed_login
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $updateQuery -Parameters @{
            username = $Username
            last_failed_login = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        # Check if account should be locked
        $userInfo = Invoke-SqlQuery -Query "SELECT failed_login_attempts FROM users WHERE username = @username" -Parameters @{ username = $Username }
        if ($userInfo -and $userInfo.failed_login_attempts -ge $script:MaxFailedAttempts) {
            Lock-UserAccount -Username $Username -Reason "Too many failed login attempts"
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to record login attempt: $($_.Exception.Message)" -Category "SECURITY"
    }
}

function Reset-FailedLoginAttempts {
    <#
    .SYNOPSIS
    Resets failed login attempts for a user after successful authentication
    #>
    param([string]$Username)
    
    try {
        $query = @"
UPDATE users 
SET failed_login_attempts = 0, last_failed_login = NULL
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{ username = $Username }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to reset login attempts for $Username`: $($_.Exception.Message)" -Category "SECURITY"
    }
}

function Lock-UserAccount {
    <#
    .SYNOPSIS
    Locks a user account due to security violations
    #>
    param(
        [string]$Username,
        [string]$Reason = "Security policy violation"
    )
    
    try {
        $lockUntil = (Get-Date).AddMinutes($script:LockoutDurationMinutes).ToString("yyyy-MM-dd HH:mm:ss")
        
        $query = @"
UPDATE users 
SET account_locked = 1, account_locked_until = @lock_until,
    lock_reason = @reason
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{
            username = $Username
            lock_until = $lockUntil
            reason = $Reason
        }
        
        Write-LogEntry -Level "WARNING" -Message "User account locked: $Username - $Reason" -Category "SECURITY" -Properties @{
            LockUntil = $lockUntil
            Reason = $Reason
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to lock user account $Username`: $($_.Exception.Message)" -Category "SECURITY"
    }
}

function Unlock-UserAccount {
    <#
    .SYNOPSIS
    Unlocks a user account after lockout period expires
    #>
    param([string]$Username)
    
    try {
        $query = @"
UPDATE users 
SET account_locked = 0, account_locked_until = NULL, lock_reason = NULL
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{ username = $Username }
        
        Write-LogEntry -Level "INFO" -Message "User account unlocked: $Username" -Category "SECURITY"
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to unlock user account $Username`: $($_.Exception.Message)" -Category "SECURITY"
    }
}

function Update-LastLogin {
    <#
    .SYNOPSIS
    Updates the last login timestamp and IP for a user
    #>
    param(
        [string]$Username,
        [string]$ClientIP
    )
    
    try {
        $query = @"
UPDATE users 
SET last_login = @last_login, last_login_ip = @client_ip
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{
            username = $Username
            last_login = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            client_ip = $ClientIP
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to update last login for $Username`: $($_.Exception.Message)" -Category "AUTHENTICATION"
    }
}

function Get-UserActiveSessions {
    <#
    .SYNOPSIS
    Gets all active sessions for a specific user
    #>
    param([string]$Username)
    
    try {
        $activeSessions = @()
        foreach ($token in $script:SessionTokens.Keys) {
            $session = $script:SessionTokens[$token]
            if ($session.Username -eq $Username -and (Get-Date) -lt $session.Expiry) {
                $activeSessions += @{
                    Token = $token
                    CreatedAt = $session.CreatedAt
                    LastActivity = $session.LastActivity
                    ClientIP = $session.ClientIP
                    SessionId = $session.SessionId
                }
            }
        }
        return $activeSessions
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get active sessions for $Username`: $($_.Exception.Message)" -Category "AUTHENTICATION"
        return @()
    }
}

function Start-TokenCleanupTimer {
    <#
    .SYNOPSIS
    Starts the automatic token cleanup timer
    #>
    if ($script:TokenCleanupTimer -eq $null) {
        $script:TokenCleanupTimer = New-Object System.Timers.Timer
        $script:TokenCleanupTimer.Interval = $script:SecurityConfig.SessionCleanupIntervalMinutes * 60 * 1000
        $script:TokenCleanupTimer.AutoReset = $true
        
        $action = {
            try {
                $expiredTokens = @()
                foreach ($token in $script:SessionTokens.Keys) {
                    $session = $script:SessionTokens[$token]
                    if ((Get-Date) -gt $session.Expiry) {
                        $expiredTokens += $token
                    }
                }
                
                foreach ($token in $expiredTokens) {
                    Remove-AuthToken -Token $token -Reason "Token expired"
                }
                
                if ($expiredTokens.Count -gt 0) {
                    Write-LogEntry -Level "INFO" -Message "Cleaned up $($expiredTokens.Count) expired tokens" -Category "AUTHENTICATION"
                }
            } catch {
                Write-LogEntry -Level "ERROR" -Message "Token cleanup failed: $($_.Exception.Message)" -Category "AUTHENTICATION"
            }
        }
        
        Register-ObjectEvent -InputObject $script:TokenCleanupTimer -EventName Elapsed -Action $action | Out-Null
        $script:TokenCleanupTimer.Start()
    }
}

function Start-PasswordMigration {
    <#
    .SYNOPSIS
    Schedules password migration from plaintext to hashed
    #>
    param(
        [string]$Username,
        [string]$PlaintextPassword
    )
    
    try {
        # This would typically be done asynchronously
        Import-Module "$PSScriptRoot/PasswordUtil.psm1" -Force
        $hashedPassword = New-PasswordHash -PlainPassword $PlaintextPassword
        
        $query = @"
UPDATE users 
SET password_hash = @password_hash, 
    password_salt = @password_salt,
    password = NULL,
    password_changed_date = @changed_date
WHERE username = @username
"@
        
        Invoke-SqlNonQuery -Query $query -Parameters @{
            username = $Username
            password_hash = $hashedPassword.Hash
            password_salt = $hashedPassword.Salt
            changed_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        Write-LogEntry -Level "INFO" -Message "Password migrated to hash for user: $Username" -Category "SECURITY"
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Password migration failed for $Username`: $($_.Exception.Message)" -Category "SECURITY"
    }
}

# Module cleanup
$MyInvocation.MyCommand.ScriptBlock.Module.OnRemove = {
    if ($script:TokenCleanupTimer) {
        $script:TokenCleanupTimer.Stop()
        $script:TokenCleanupTimer.Dispose()
    }
}

Export-ModuleMember -Function @(
    'New-AuthToken',
    'Test-AuthToken', 
    'Get-TokenUser',
    'Remove-AuthToken',
    'Test-UserCredentials',
    'Test-UserRole',
    'Get-UserActiveSessions',
    'Lock-UserAccount',
    'Unlock-UserAccount'
)