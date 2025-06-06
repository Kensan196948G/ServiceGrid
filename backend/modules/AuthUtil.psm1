# AuthUtil.psm1 - 認証・認可共通モジュール

Import-Module "$PSScriptRoot/LogUtil.psm1"

$script:SessionTokens = @{}

function New-AuthToken {
    param(
        [string]$Username,
        [int]$ExpiryMinutes = 60
    )
    
    try {
        $token = [System.Guid]::NewGuid().ToString()
        $expiry = (Get-Date).AddMinutes($ExpiryMinutes)
        
        $script:SessionTokens[$token] = @{
            Username = $Username
            Expiry = $expiry
            CreatedAt = Get-Date
        }
        
        Write-LogEntry -Level "INFO" -Message "Auth token created for user: $Username"
        return $token
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to create auth token: $($_.Exception.Message)"
        return $null
    }
}

function Test-AuthToken {
    param(
        [string]$Token
    )
    
    try {
        if (-not $script:SessionTokens.ContainsKey($Token)) {
            return $false
        }
        
        $session = $script:SessionTokens[$Token]
        if ((Get-Date) -gt $session.Expiry) {
            $script:SessionTokens.Remove($Token)
            return $false
        }
        
        return $true
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to validate auth token: $($_.Exception.Message)"
        return $false
    }
}

function Get-TokenUser {
    param(
        [string]$Token
    )
    
    try {
        if (Test-AuthToken -Token $Token) {
            return $script:SessionTokens[$Token].Username
        }
        return $null
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get token user: $($_.Exception.Message)"
        return $null
    }
}

function Remove-AuthToken {
    param(
        [string]$Token
    )
    
    try {
        if ($script:SessionTokens.ContainsKey($Token)) {
            $username = $script:SessionTokens[$Token].Username
            $script:SessionTokens.Remove($Token)
            Write-LogEntry -Level "INFO" -Message "Auth token removed for user: $username"
            return $true
        }
        return $false
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to remove auth token: $($_.Exception.Message)"
        return $false
    }
}

function Test-UserCredentials {
    param(
        [string]$Username,
        [string]$Password
    )
    
    try {
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        Import-Module "$PSScriptRoot/PasswordUtil.psm1"
        
        # まず、従来の平文パスワードをチェック（移行期間用）
        $legacyQuery = "SELECT user_id, username, role, display_name, email FROM users WHERE username = @username AND password = @password"
        $legacyParams = @{
            username = $Username
            password = $Password
        }
        
        $legacyResult = Invoke-SqlQuery -Query $legacyQuery -Parameters $legacyParams
        
        if ($legacyResult -and $legacyResult.Count -gt 0) {
            Write-LogEntry -Level "INFO" -Message "User authentication successful (legacy): $Username"
            return @{
                UserId = $legacyResult[0].user_id
                Username = $legacyResult[0].username
                Role = $legacyResult[0].role
                DisplayName = $legacyResult[0].display_name
                Email = $legacyResult[0].email
            }
        }
        
        # 新しいハッシュ化パスワードをチェック
        $query = "SELECT user_id, username, password_hash, password_salt, role, display_name, email, account_locked, account_locked_until, failed_login_attempts FROM users WHERE username = @username"
        $params = @{ username = $Username }
        $userInfo = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $userInfo -or $userInfo.Count -eq 0) {
            Write-LogEntry -Level "WARN" -Message "Login attempt for non-existent user: $Username"
            return $null
        }
        
        $user = $userInfo[0]
        
        # ハッシュ化パスワードが設定されている場合
        if ($user.password_hash -and $user.password_salt) {
            # アカウントロックチェック
            if ($user.account_locked -and $user.account_locked_until) {
                $lockUntil = [DateTime]::Parse($user.account_locked_until)
                if ([DateTime]::Now -lt $lockUntil) {
                    Write-LogEntry -Level "WARN" -Message "Login attempt for locked account: $Username"
                    return $null
                }
            }
            
            # パスワード検証
            $isValidPassword = Test-Password -PlainPassword $Password -StoredHash $user.password_hash -StoredSalt $user.password_salt
            
            if ($isValidPassword) {
                Write-LogEntry -Level "INFO" -Message "User authentication successful (hashed): $Username"
                return @{
                    UserId = $user.user_id
                    Username = $user.username
                    Role = $user.role
                    DisplayName = $user.display_name
                    Email = $user.email
                }
            }
        }
        
        Write-LogEntry -Level "WARNING" -Message "User authentication failed: $Username"
        return $null
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "User credential test failed: $($_.Exception.Message)"
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

Export-ModuleMember -Function New-AuthToken, Test-AuthToken, Get-TokenUser, Remove-AuthToken, Test-UserCredentials, Test-UserRole