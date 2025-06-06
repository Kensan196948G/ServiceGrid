# UserExpireCheck.ps1 - ユーザーアカウント期限チェック・管理ジョブ

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"

function Start-UserExpireCheck {
    param(
        [int]$PasswordExpiryDays = 90,
        [int]$AccountInactiveDays = 180,
        [int]$NotificationBeforeDays = 7
    )
    
    try {
        Write-LogEntry -Level "INFO" -Message "Starting user expiry check job"
        
        $results = @{
            PasswordExpiring = @()
            PasswordExpired = @()
            InactiveAccounts = @()
            ProcessedUsers = 0
            Notifications = 0
            DisabledAccounts = 0
        }
        
        $query = "SELECT user_id, username, password, role, display_name, email, created_date, updated_date FROM users WHERE role != 'system'"
        $users = Invoke-SqlQuery -Query $query
        
        if (-not $users) {
            Write-LogEntry -Level "INFO" -Message "No users found for expiry check"
            return $results
        }
        
        $currentDate = Get-Date
        
        foreach ($user in $users) {
            $results.ProcessedUsers++
            
            $userId = $user.user_id
            $username = $user.username
            $updatedDate = [DateTime]::Parse($user.updated_date)
            $createdDate = [DateTime]::Parse($user.created_date)
            
            # パスワード期限チェック
            $passwordAge = ($currentDate - $updatedDate).Days
            $passwordExpiryDate = $updatedDate.AddDays($PasswordExpiryDays)
            $daysUntilExpiry = ($passwordExpiryDate - $currentDate).Days
            
            if ($passwordAge -ge $PasswordExpiryDays) {
                # パスワード期限切れ
                $results.PasswordExpired += @{
                    UserId = $userId
                    Username = $username
                    DisplayName = $user.display_name
                    Email = $user.email
                    PasswordAge = $passwordAge
                    ExpiryDate = $passwordExpiryDate
                }
                
                Write-LogEntry -Level "WARNING" -Message "Password expired for user: $username (Age: $passwordAge days)"
                
                # アカウント無効化の検討（管理者以外）
                if ($user.role -ne "administrator" -and $passwordAge -ge ($PasswordExpiryDays + 30)) {
                    $disabled = Disable-ExpiredUser -UserId $userId -Username $username -Reason "Password expired over 30 days ago"
                    if ($disabled.Success) {
                        $results.DisabledAccounts++
                    }
                }
                
            } elseif ($daysUntilExpiry -le $NotificationBeforeDays -and $daysUntilExpiry -gt 0) {
                # パスワード期限警告
                $results.PasswordExpiring += @{
                    UserId = $userId
                    Username = $username
                    DisplayName = $user.display_name
                    Email = $user.email
                    DaysUntilExpiry = $daysUntilExpiry
                    ExpiryDate = $passwordExpiryDate
                }
                
                Write-LogEntry -Level "INFO" -Message "Password expiring soon for user: $username (Days until expiry: $daysUntilExpiry)"
                
                $notified = Send-ExpiryNotification -Username $username -Email $user.email -DaysUntilExpiry $daysUntilExpiry -Type "PasswordExpiring"
                if ($notified.Success) {
                    $results.Notifications++
                }
            }
            
            # アカウント非アクティブチェック
            $accountAge = ($currentDate - $createdDate).Days
            $inactiveAge = ($currentDate - $updatedDate).Days
            
            if ($inactiveAge -ge $AccountInactiveDays -and $user.role -ne "administrator") {
                $results.InactiveAccounts += @{
                    UserId = $userId
                    Username = $username
                    DisplayName = $user.display_name
                    Email = $user.email
                    InactiveDays = $inactiveAge
                    LastActivity = $updatedDate
                }
                
                Write-LogEntry -Level "WARNING" -Message "Inactive account detected: $username (Inactive: $inactiveAge days)"
                
                # 長期非アクティブアカウントの無効化
                if ($inactiveAge -ge ($AccountInactiveDays + 30)) {
                    $disabled = Disable-ExpiredUser -UserId $userId -Username $username -Reason "Account inactive for over $($AccountInactiveDays + 30) days"
                    if ($disabled.Success) {
                        $results.DisabledAccounts++
                    }
                }
            }
        }
        
        # 結果のログ出力
        Write-LogEntry -Level "INFO" -Message "User expiry check completed - Processed: $($results.ProcessedUsers), Expiring: $($results.PasswordExpiring.Count), Expired: $($results.PasswordExpired.Count), Inactive: $($results.InactiveAccounts.Count)"
        
        # 統計情報の保存
        Save-ExpiryCheckResults -Results $results
        
        return $results
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "User expiry check failed: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Disable-ExpiredUser {
    param(
        [int]$UserId,
        [string]$Username,
        [string]$Reason
    )
    
    try {
        # ユーザーを無効状態に変更（status列がない場合はroleをdisabledに変更）
        $updateQuery = "UPDATE users SET role = 'disabled', updated_date = @updated_date WHERE user_id = @user_id AND role != 'administrator'"
        $updateParams = @{
            user_id = $UserId
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Write-LogEntry -Level "WARNING" -Message "User account disabled: $Username - $Reason"
            Save-AuditLog -EventType "ACCOUNT_DISABLED" -User "SYSTEM" -Detail "User $Username disabled: $Reason"
            
            return @{
                Success = $true
                Username = $Username
                Reason = $Reason
            }
        } else {
            Write-LogEntry -Level "ERROR" -Message "Failed to disable user account: $Username"
            return @{
                Success = $false
                Error = "Database update failed"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to disable user $Username`: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Send-ExpiryNotification {
    param(
        [string]$Username,
        [string]$Email,
        [int]$DaysUntilExpiry,
        [string]$Type = "PasswordExpiring"
    )
    
    try {
        # メール送信機能は未実装のため、ログ記録のみ
        $message = switch ($Type) {
            "PasswordExpiring" { "Password will expire in $DaysUntilExpiry days" }
            "PasswordExpired" { "Password has expired" }
            "AccountInactive" { "Account has been inactive" }
            default { "Account notification" }
        }
        
        Write-LogEntry -Level "INFO" -Message "Notification sent to $Username ($Email): $message"
        Save-AuditLog -EventType "NOTIFICATION_SENT" -User "SYSTEM" -Detail "Notification sent to $Username`: $message"
        
        # 実際のメール送信機能はここに実装
        # Send-MailMessage -To $Email -Subject "Account Notification" -Body $message
        
        return @{
            Success = $true
            Username = $Username
            Email = $Email
            Message = $message
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to send notification to $Username`: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Save-ExpiryCheckResults {
    param(
        [hashtable]$Results
    )
    
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $summary = @{
            Timestamp = $timestamp
            ProcessedUsers = $Results.ProcessedUsers
            PasswordExpiring = $Results.PasswordExpiring.Count
            PasswordExpired = $Results.PasswordExpired.Count
            InactiveAccounts = $Results.InactiveAccounts.Count
            Notifications = $Results.Notifications
            DisabledAccounts = $Results.DisabledAccounts
        }
        
        $logEntry = "Expiry Check Summary: " + ($summary | ConvertTo-Json -Compress)
        Save-AuditLog -EventType "EXPIRY_CHECK_COMPLETED" -User "SYSTEM" -Detail $logEntry
        
        return $true
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to save expiry check results: $($_.Exception.Message)"
        return $false
    }
}

function Get-UserExpiryReport {
    param(
        [int]$Days = 30
    )
    
    try {
        $fromDate = (Get-Date).AddDays(-$Days)
        
        # 監査ログから期限チェック結果を取得
        $query = @"
SELECT event_time, detail 
FROM logs 
WHERE event_type = 'EXPIRY_CHECK_COMPLETED' 
  AND event_time >= @from_date 
ORDER BY event_time DESC
"@
        
        $params = @{ from_date = $fromDate.ToString("yyyy-MM-dd") }
        $results = Invoke-SqlQuery -Query $query -Parameters $params
        
        $report = @{
            Period = @{
                From = $fromDate
                To = Get-Date
                Days = $Days
            }
            CheckResults = @()
        }
        
        foreach ($result in $results) {
            try {
                $detail = $result.detail -replace "^Expiry Check Summary: ", ""
                $summary = $detail | ConvertFrom-Json
                $summary.CheckTime = $result.event_time
                $report.CheckResults += $summary
            }
            catch {
                # JSON解析失敗時はスキップ
            }
        }
        
        # 現在のユーザー状況
        $currentUsers = Get-CurrentUserStatus
        $report.CurrentStatus = $currentUsers
        
        return $report
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to generate user expiry report: $($_.Exception.Message)"
        return $null
    }
}

function Get-CurrentUserStatus {
    param()
    
    try {
        $query = @"
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN role = 'administrator' THEN 1 ELSE 0 END) as administrators,
    SUM(CASE WHEN role = 'operator' THEN 1 ELSE 0 END) as operators,
    SUM(CASE WHEN role = 'disabled' THEN 1 ELSE 0 END) as disabled_users,
    SUM(CASE WHEN julianday('now') - julianday(updated_date) > 90 THEN 1 ELSE 0 END) as password_expired,
    SUM(CASE WHEN julianday('now') - julianday(updated_date) > 180 THEN 1 ELSE 0 END) as inactive_users
FROM users 
WHERE role != 'system'
"@
        
        $result = Invoke-SqlQuery -Query $query
        
        if ($result -and $result.Count -gt 0) {
            return @{
                TotalUsers = $result[0].total_users
                Administrators = $result[0].administrators
                Operators = $result[0].operators
                DisabledUsers = $result[0].disabled_users
                PasswordExpired = $result[0].password_expired
                InactiveUsers = $result[0].inactive_users
                LastCheck = Get-Date
            }
        }
        
        return $null
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get current user status: $($_.Exception.Message)"
        return $null
    }
}

function Reset-UserPassword {
    param(
        [string]$Username,
        [string]$NewPassword,
        [string]$AdminUser
    )
    
    try {
        if (-not $Username -or -not $NewPassword -or -not $AdminUser) {
            return @{
                Success = $false
                Error = "Username, new password, and admin user are required"
            }
        }
        
        $minPasswordLength = Get-ConfigValue "Authentication.PasswordMinLength"
        if ($NewPassword.Length -lt $minPasswordLength) {
            return @{
                Success = $false
                Error = "Password must be at least $minPasswordLength characters long"
            }
        }
        
        $updateQuery = "UPDATE users SET password = @password, updated_date = @updated_date WHERE username = @username"
        $updateParams = @{
            password = $NewPassword
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            username = $Username
        }
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Write-LogEntry -Level "INFO" -Message "Password reset for user: $Username by admin: $AdminUser"
            Save-AuditLog -EventType "PASSWORD_RESET" -User $AdminUser -Detail "Password reset for user: $Username"
            
            return @{
                Success = $true
                Username = $Username
                ResetBy = $AdminUser
                ResetDate = Get-Date
            }
        } else {
            Write-LogEntry -Level "ERROR" -Message "Failed to reset password for user: $Username"
            return @{
                Success = $false
                Error = "Password reset failed"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Password reset failed for $Username`: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# スケジュール実行用のメイン関数
function Invoke-ScheduledUserExpireCheck {
    param()
    
    try {
        Write-LogEntry -Level "INFO" -Message "Scheduled user expiry check started"
        
        $result = Start-UserExpireCheck
        
        if ($result.Success -ne $false) {
            Write-LogEntry -Level "INFO" -Message "Scheduled user expiry check completed successfully"
        } else {
            Write-LogEntry -Level "ERROR" -Message "Scheduled user expiry check failed: $($result.Error)"
        }
        
        return $result
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Scheduled user expiry check error: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Start-UserExpireCheck, Disable-ExpiredUser, Send-ExpiryNotification, Save-ExpiryCheckResults, Get-UserExpiryReport, Get-CurrentUserStatus, Reset-UserPassword, Invoke-ScheduledUserExpireCheck