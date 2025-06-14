# Windows Security Analysis API for ITSM Platform
# Advanced security log analysis and threat detection
# Version: 2025.6.14 - Emergency Security Investigation

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force
Import-Module "../modules/Config.psm1" -Force
Import-Module "../modules/WindowsSecurityUtil.psm1" -Force

# Security analysis configuration
$global:SecurityConfig = @{
    CriticalEventIds = @(4625, 4740, 4771, 4648, 4768, 4769, 4776, 4778, 4779)
    FailedLogonThreshold = 5
    TimeWindowMinutes = 15
    SuspiciousAccountPatterns = @("admin", "administrator", "sa", "root", "test")
    MonitoredGroups = @("Domain Admins", "Enterprise Admins", "Schema Admins", "Administrators")
    MaxEventsPerQuery = 5000
}

# Analyze Windows security logs for threats
function Invoke-SecurityLogAnalysis {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $startDate = if ($queryParams.startDate) { [DateTime]$queryParams.startDate } else { (Get-Date).AddHours(-24) }
        $endDate = if ($queryParams.endDate) { [DateTime]$queryParams.endDate } else { Get-Date }
        $analysisType = $queryParams.analysisType -or "comprehensive"
        
        Write-APILog "🔍 Starting security log analysis from $startDate to $endDate" -Level "INFO"
        
        $analysisResults = @{
            summary = @{
                totalEvents = 0
                criticalEvents = 0
                failedLogons = 0
                suspiciousActivities = 0
                compromisedAccounts = @()
                riskLevel = "Low"
            }
            findings = @()
            recommendations = @()
            timeline = @()
            startTime = Get-Date
        }
        
        # Get security events
        $filterXPath = @"
        *[System[
            (EventID=4624 or EventID=4625 or EventID=4634 or EventID=4647 or EventID=4648 or 
             EventID=4740 or EventID=4771 or EventID=4768 or EventID=4769 or EventID=4776 or
             EventID=4778 or EventID=4779 or EventID=4720 or EventID=4722 or EventID=4724 or 
             EventID=4725 or EventID=4726 or EventID=4728 or EventID=4732 or EventID=4756) and 
            TimeCreated[@SystemTime>='$($startDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z"))'] and 
            TimeCreated[@SystemTime<='$($endDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z"))']
        ]]
"@
        
        try {
            $events = Get-WinEvent -FilterXPath $filterXPath -LogName "Security" -MaxEvents $global:SecurityConfig.MaxEventsPerQuery -ErrorAction Stop
            $analysisResults.summary.totalEvents = $events.Count
            
            Write-APILog "📊 Retrieved $($events.Count) security events for analysis" -Level "INFO"
            
        } catch {
            Write-APILog "⚠️ Unable to retrieve security events: $($_.Exception.Message)" -Level "WARNING"
            $events = @()
        }
        
        # Analyze failed logon attempts
        $failedLogons = $events | Where-Object { $_.Id -eq 4625 }
        $analysisResults.summary.failedLogons = $failedLogons.Count
        
        if ($failedLogons.Count -gt 0) {
            $failedLogonAnalysis = Analyze-FailedLogons -Events $failedLogons
            $analysisResults.findings += $failedLogonAnalysis.findings
            $analysisResults.summary.compromisedAccounts += $failedLogonAnalysis.suspiciousAccounts
        }
        
        # Analyze privilege escalation
        $privilegeEvents = $events | Where-Object { $_.Id -in @(4728, 4732, 4756) }
        if ($privilegeEvents.Count -gt 0) {
            $privilegeAnalysis = Analyze-PrivilegeEscalation -Events $privilegeEvents
            $analysisResults.findings += $privilegeAnalysis.findings
        }
        
        # Analyze account lockouts
        $lockoutEvents = $events | Where-Object { $_.Id -eq 4740 }
        if ($lockoutEvents.Count -gt 0) {
            $lockoutAnalysis = Analyze-AccountLockouts -Events $lockoutEvents
            $analysisResults.findings += $lockoutAnalysis.findings
        }
        
        # Analyze administrator account usage
        $adminLogons = $events | Where-Object { 
            $_.Id -eq 4624 -and 
            ($_.Properties[5].Value -match "admin" -or $_.Properties[5].Value -match "administrator")
        }
        
        if ($adminLogons.Count -gt 0) {
            $adminAnalysis = Analyze-AdminAccountUsage -Events $adminLogons
            $analysisResults.findings += $adminAnalysis.findings
            
            # Check for suspicious admin activity
            foreach ($logon in $adminLogons) {
                $userName = $logon.Properties[5].Value
                $workstation = $logon.Properties[11].Value
                $ipAddress = $logon.Properties[18].Value
                
                # Flag suspicious admin logons
                if ($ipAddress -and $ipAddress -ne "-" -and $ipAddress -ne "127.0.0.1") {
                    $analysisResults.findings += @{
                        type = "CRITICAL"
                        category = "Suspicious Admin Access"
                        description = "管理者アカウント '$userName' が外部IP '$ipAddress' からアクセス"
                        timestamp = $logon.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        recommendation = "このアクセスが正当かどうか確認し、必要に応じてアカウントを無効化してください"
                        severity = "HIGH"
                    }
                    
                    if ($analysisResults.summary.compromisedAccounts -notcontains $userName) {
                        $analysisResults.summary.compromisedAccounts += $userName
                    }
                }
            }
        }
        
        # Calculate risk level
        $criticalFindings = ($analysisResults.findings | Where-Object { $_.severity -eq "HIGH" -or $_.severity -eq "CRITICAL" }).Count
        $analysisResults.summary.criticalEvents = $criticalFindings
        
        if ($criticalFindings -gt 10 -or $analysisResults.summary.compromisedAccounts.Count -gt 2) {
            $analysisResults.summary.riskLevel = "Critical"
        } elseif ($criticalFindings -gt 5 -or $analysisResults.summary.compromisedAccounts.Count -gt 0) {
            $analysisResults.summary.riskLevel = "High"
        } elseif ($criticalFindings -gt 0 -or $analysisResults.summary.failedLogons -gt 50) {
            $analysisResults.summary.riskLevel = "Medium"
        }
        
        # Generate recommendations
        $analysisResults.recommendations = Generate-SecurityRecommendations -Analysis $analysisResults
        
        # Create timeline
        $analysisResults.timeline = Create-SecurityTimeline -Events $events
        
        $analysisResults.endTime = Get-Date
        $analysisResults.duration = ($analysisResults.endTime - $analysisResults.startTime).TotalSeconds
        
        # Log critical findings
        if ($analysisResults.summary.riskLevel -eq "Critical" -or $analysisResults.summary.riskLevel -eq "High") {
            Write-APILog "🚨 CRITICAL SECURITY ALERT: Risk Level $($analysisResults.summary.riskLevel) - $($analysisResults.summary.compromisedAccounts.Count) potentially compromised accounts" -Level "ERROR"
            
            # Save critical findings to database
            foreach ($account in $analysisResults.summary.compromisedAccounts) {
                Save-AuditLog -EventType "SECURITY_THREAT_DETECTED" -User $authResult.User.username -Detail "Potentially compromised account detected: $account"
            }
        }
        
        Add-AuditLog -EventType "SECURITY_ANALYSIS" -UserId $authResult.User.user_id -Details "Security analysis completed - Risk Level: $($analysisResults.summary.riskLevel), Events: $($analysisResults.summary.totalEvents)"
        
        return @{
            Status = "Success"
            Message = "Security log analysis completed"
            Data = $analysisResults
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "❌ Error in security log analysis: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to analyze security logs: $($_.Exception.Message)"
    }
}

# Analyze failed logon attempts
function Analyze-FailedLogons {
    param($Events)
    
    $findings = @()
    $suspiciousAccounts = @()
    
    # Group failed logons by account
    $failedLogonsByAccount = $Events | Group-Object { $_.Properties[5].Value }
    
    foreach ($group in $failedLogonsByAccount) {
        $accountName = $group.Name
        $attempts = $group.Group
        
        if ($attempts.Count -ge $global:SecurityConfig.FailedLogonThreshold) {
            $findings += @{
                type = "WARNING"
                category = "Brute Force Attack"
                description = "アカウント '$accountName' に対する連続ログオン試行失敗 ($($attempts.Count)回)"
                timestamp = $attempts[0].TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                recommendation = "このアカウントをロックし、攻撃元IPをブロックしてください"
                severity = "HIGH"
                details = @{
                    account = $accountName
                    attemptCount = $attempts.Count
                    timeSpan = ($attempts[-1].TimeCreated - $attempts[0].TimeCreated).TotalMinutes
                }
            }
            
            $suspiciousAccounts += $accountName
        }
    }
    
    return @{
        findings = $findings
        suspiciousAccounts = $suspiciousAccounts
    }
}

# Analyze privilege escalation events
function Analyze-PrivilegeEscalation {
    param($Events)
    
    $findings = @()
    
    foreach ($event in $Events) {
        $eventType = switch ($event.Id) {
            4728 { "ユーザーがセキュリティ グループに追加されました" }
            4732 { "ユーザーがセキュリティ グループに追加されました" }
            4756 { "ユーザーがユニバーサル セキュリティ グループに追加されました" }
        }
        
        $targetAccount = if ($event.Properties.Count -gt 0) { $event.Properties[0].Value } else { "Unknown" }
        $groupName = if ($event.Properties.Count -gt 2) { $event.Properties[2].Value } else { "Unknown" }
        
        # Check if it's a privileged group
        $isPrivilegedGroup = $global:SecurityConfig.MonitoredGroups | Where-Object { $groupName -like "*$_*" }
        
        if ($isPrivilegedGroup) {
            $findings += @{
                type = "ALERT"
                category = "Privilege Escalation"
                description = "ユーザー '$targetAccount' が特権グループ '$groupName' に追加されました"
                timestamp = $event.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                recommendation = "この権限変更が正当かどうか確認してください"
                severity = "MEDIUM"
                details = @{
                    targetAccount = $targetAccount
                    groupName = $groupName
                    eventId = $event.Id
                }
            }
        }
    }
    
    return @{
        findings = $findings
    }
}

# Analyze account lockout events
function Analyze-AccountLockouts {
    param($Events)
    
    $findings = @()
    
    foreach ($event in $Events) {
        $accountName = if ($event.Properties.Count -gt 0) { $event.Properties[0].Value } else { "Unknown" }
        $callerComputer = if ($event.Properties.Count -gt 1) { $event.Properties[1].Value } else { "Unknown" }
        
        $findings += @{
            type = "INFO"
            category = "Account Lockout"
            description = "アカウント '$accountName' がロックアウトされました (発生元: $callerComputer)"
            timestamp = $event.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            recommendation = "ロックアウトの原因を調査し、必要に応じてアカウントのロックを解除してください"
            severity = "MEDIUM"
            details = @{
                accountName = $accountName
                callerComputer = $callerComputer
            }
        }
    }
    
    return @{
        findings = $findings
    }
}

# Analyze administrator account usage
function Analyze-AdminAccountUsage {
    param($Events)
    
    $findings = @()
    
    # Group by time windows to detect suspicious patterns
    $timeWindows = $Events | Group-Object { $_.TimeCreated.ToString("yyyy-MM-dd HH:00") }
    
    foreach ($window in $timeWindows) {
        if ($window.Group.Count -gt 10) {  # More than 10 admin logons per hour
            $findings += @{
                type = "WARNING"
                category = "Excessive Admin Activity"
                description = "1時間以内に管理者アカウントの異常なログオン数を検出 ($($window.Group.Count)回)"
                timestamp = $window.Group[0].TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                recommendation = "管理者アカウントの使用状況を詳細に調査してください"
                severity = "MEDIUM"
                details = @{
                    timeWindow = $window.Name
                    logonCount = $window.Group.Count
                }
            }
        }
    }
    
    return @{
        findings = $findings
    }
}

# Generate security recommendations
function Generate-SecurityRecommendations {
    param($Analysis)
    
    $recommendations = @()
    
    if ($Analysis.summary.riskLevel -eq "Critical") {
        $recommendations += "🚨 緊急対応: すべての管理者アカウントのパスワードを即座に変更してください"
        $recommendations += "🔒 疑わしいアカウントを一時的に無効化してください"
        $recommendations += "🛡️ ファイアウォール設定を確認し、不要なアクセスをブロックしてください"
    }
    
    if ($Analysis.summary.compromisedAccounts.Count -gt 0) {
        $recommendations += "⚠️ 以下のアカウントの活動を詳細に調査してください: $($Analysis.summary.compromisedAccounts -join ', ')"
        $recommendations += "🔐 該当アカウントの多要素認証を強制有効化してください"
    }
    
    if ($Analysis.summary.failedLogons -gt 100) {
        $recommendations += "🚫 ブルートフォース攻撃の可能性があります。IP制限を強化してください"
        $recommendations += "⏰ アカウントロックアウト設定を見直してください"
    }
    
    # Always include general recommendations
    $recommendations += "📊 定期的なセキュリティログ監視の実装を推奨します"
    $recommendations += "📝 インシデント対応手順書の確認と更新を行ってください"
    $recommendations += "👥 セキュリティ意識向上のための従業員研修を実施してください"
    
    return $recommendations
}

# Create security timeline
function Create-SecurityTimeline {
    param($Events)
    
    $timeline = @()
    
    # Take the most recent 100 events for timeline
    $recentEvents = $Events | Sort-Object TimeCreated -Descending | Select-Object -First 100
    
    foreach ($event in $recentEvents) {
        $eventDescription = switch ($event.Id) {
            4624 { "成功ログオン" }
            4625 { "失敗ログオン" }
            4634 { "ログオフ" }
            4648 { "明示的な資格情報でのログオン" }
            4740 { "アカウントロックアウト" }
            4728 { "グループメンバー追加" }
            4732 { "グループメンバー追加" }
            default { "イベントID: $($event.Id)" }
        }
        
        $timeline += @{
            timestamp = $event.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            eventId = $event.Id
            description = $eventDescription
            severity = if ($event.Id -in @(4625, 4740, 4648)) { "HIGH" } else { "LOW" }
        }
    }
    
    return $timeline | Sort-Object timestamp -Descending
}

# Disable suspicious user account (Emergency response)
function Invoke-DisableSuspiciousAccount {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if ($authResult.User.role -ne "administrator") {
            return Format-ErrorResponse -Message "管理者権限が必要です" -StatusCode 403
        }
        
        # Parse request body
        $requestData = $Request.Body | ConvertFrom-Json
        $accountName = $requestData.accountName
        $reason = $requestData.reason -or "セキュリティ調査のため"
        
        if (-not $accountName) {
            return Format-ErrorResponse -Message "アカウント名が指定されていません" -StatusCode 400
        }
        
        Write-APILog "🔒 Attempting to disable account: $accountName (Reason: $reason)" -Level "WARNING"
        
        # Try to disable the account using Active Directory
        try {
            if ($global:ADModuleAvailable) {
                Disable-ADAccount -Identity $accountName -Confirm:$false
                
                # Log the action
                Write-APILog "✅ Account disabled successfully: $accountName" -Level "INFO"
                Save-AuditLog -EventType "ACCOUNT_DISABLED" -User $authResult.User.username -Detail "Disabled account '$accountName' for security reasons: $reason"
                
                return @{
                    Status = "Success"
                    Message = "アカウント '$accountName' を無効化しました"
                    Data = @{
                        accountName = $accountName
                        reason = $reason
                        disabledBy = $authResult.User.username
                        disabledAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    }
                    Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                }
                
            } else {
                throw "Active Directory module is not available"
            }
            
        } catch {
            Write-APILog "❌ Failed to disable account '$accountName': $($_.Exception.Message)" -Level "ERROR"
            return Format-ErrorResponse -Message "アカウントの無効化に失敗: $($_.Exception.Message)"
        }
        
    } catch {
        Write-APILog "❌ Error in disable account operation: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "アカウント無効化処理でエラーが発生: $($_.Exception.Message)"
    }
}

# Get system information for dashboard
function Invoke-GetSystemInfo {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        Write-APILog "📊 Collecting system information for dashboard" -Level "INFO"
        
        $systemInfo = @{
            computer = @{
                name = $env:COMPUTERNAME
                domain = $env:USERDOMAIN
                logonServer = $env:LOGONSERVER
                os = (Get-CimInstance -ClassName Win32_OperatingSystem).Caption
                version = (Get-CimInstance -ClassName Win32_OperatingSystem).Version
                architecture = $env:PROCESSOR_ARCHITECTURE
                lastBootTime = (Get-CimInstance -ClassName Win32_OperatingSystem).LastBootUpTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
            performance = @{
                cpuUsage = (Get-Counter -Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1).CounterSamples[0].CookedValue
                memoryUsage = @{
                    total = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory
                    available = (Get-CimInstance -ClassName Win32_OperatingSystem).FreePhysicalMemory * 1024
                    used = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory - ((Get-CimInstance -ClassName Win32_OperatingSystem).FreePhysicalMemory * 1024)
                }
                diskUsage = @()
            }
            services = @{
                total = (Get-Service).Count
                running = (Get-Service | Where-Object { $_.Status -eq "Running" }).Count
                stopped = (Get-Service | Where-Object { $_.Status -eq "Stopped" }).Count
            }
            security = @{
                lastLogonEvents = 0
                failedLogonEvents = 0
                accountLockouts = 0
                lastUpdate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        # Get disk usage information
        $disks = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        foreach ($disk in $disks) {
            $systemInfo.performance.diskUsage += @{
                drive = $disk.DeviceID
                size = $disk.Size
                freeSpace = $disk.FreeSpace
                usedSpace = $disk.Size - $disk.FreeSpace
                usedPercentage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
            }
        }
        
        # Get recent security events count
        try {
            $last24Hours = (Get-Date).AddHours(-24)
            $securityEvents = Get-WinEvent -FilterHashtable @{LogName="Security"; StartTime=$last24Hours; ID=4624,4625,4740} -MaxEvents 1000 -ErrorAction SilentlyContinue
            
            if ($securityEvents) {
                $systemInfo.security.lastLogonEvents = ($securityEvents | Where-Object { $_.Id -eq 4624 }).Count
                $systemInfo.security.failedLogonEvents = ($securityEvents | Where-Object { $_.Id -eq 4625 }).Count
                $systemInfo.security.accountLockouts = ($securityEvents | Where-Object { $_.Id -eq 4740 }).Count
            }
        } catch {
            Write-APILog "⚠️ Unable to retrieve security event counts: $($_.Exception.Message)" -Level "WARNING"
        }
        
        return @{
            Status = "Success"
            Message = "System information retrieved successfully"
            Data = $systemInfo
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "❌ Error getting system information: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to get system information: $($_.Exception.Message)"
    }
}

Write-APILog "✅ Windows Security Analysis module loaded successfully" -Level "INFO"