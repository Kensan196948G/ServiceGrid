# Windows File System Monitoring API for ITSM Platform
# Real-time file system monitoring and security alerts
# Version: 2025.6.14

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force
Import-Module "../modules/Config.psm1" -Force
Import-Module "../modules/WindowsSecurityUtil.psm1" -Force

# File system monitoring configuration
$global:FSMonitorConfig = @{
    MonitoredPaths = @(
        "C:\Windows\System32",
        "C:\Program Files",
        "C:\Program Files (x86)",
        "C:\Users\Public",
        "C:\Temp",
        "C:\Windows\Temp"
    )
    SuspiciousExtensions = @(".exe", ".bat", ".cmd", ".ps1", ".vbs", ".scr", ".dll", ".sys")
    CriticalDirectories = @("System32", "SysWOW64", "Drivers")
    AlertThresholds = @{
        FilesPerMinute = 100
        SuspiciousFileCount = 10
        LargeDeletionCount = 50
    }
    ExcludedProcesses = @("explorer.exe", "svchost.exe", "winlogon.exe", "csrss.exe")
}

# Global file system watchers
$global:FileSystemWatchers = @{}
$global:MonitoringSessions = @{}

# Start file system monitoring
function Invoke-StartFileSystemMonitoring {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if ($authResult.User.role -ne "administrator") {
            return Format-ErrorResponse -Message "管理者権限が必要です" -StatusCode 403
        }
        
        # Parse request parameters
        $requestData = if ($Request.Body) { $Request.Body | ConvertFrom-Json } else { @{} }
        $monitoringPaths = if ($requestData.paths) { $requestData.paths } else { $global:FSMonitorConfig.MonitoredPaths }
        $sessionId = if ($requestData.sessionId) { $requestData.sessionId } else { [System.Guid]::NewGuid().ToString() }
        
        Write-APILog "🔍 Starting file system monitoring session: $sessionId" -Level "INFO"
        
        $monitoringSession = @{
            sessionId = $sessionId
            startTime = Get-Date
            userId = $authResult.User.user_id
            userName = $authResult.User.username
            monitoredPaths = $monitoringPaths
            events = @()
            alerts = @()
            statistics = @{
                totalEvents = 0
                suspiciousEvents = 0
                alertsTriggered = 0
            }
            status = "Active"
        }
        
        # Create file system watchers for each path
        foreach ($path in $monitoringPaths) {
            if (Test-Path $path) {
                try {
                    $watcher = New-Object System.IO.FileSystemWatcher
                    $watcher.Path = $path
                    $watcher.Filter = "*.*"
                    $watcher.IncludeSubdirectories = $true
                    $watcher.EnableRaisingEvents = $true
                    
                    # Register event handlers
                    $action = {
                        param($source, $e)
                        
                        $eventInfo = @{
                            sessionId = $sessionId
                            timestamp = Get-Date
                            eventType = $e.ChangeType.ToString()
                            fullPath = $e.FullPath
                            name = $e.Name
                            directory = Split-Path $e.FullPath -Parent
                            extension = [System.IO.Path]::GetExtension($e.Name)
                            size = if (Test-Path $e.FullPath -PathType Leaf) { (Get-Item $e.FullPath -ErrorAction SilentlyContinue).Length } else { 0 }
                        }
                        
                        # Add to monitoring session
                        if ($global:MonitoringSessions.ContainsKey($sessionId)) {
                            $global:MonitoringSessions[$sessionId].events += $eventInfo
                            $global:MonitoringSessions[$sessionId].statistics.totalEvents++
                            
                            # Check for suspicious activity
                            $suspiciousActivity = Test-SuspiciousFileActivity -EventInfo $eventInfo
                            if ($suspiciousActivity.IsSuspicious) {
                                $global:MonitoringSessions[$sessionId].alerts += $suspiciousActivity.Alert
                                $global:MonitoringSessions[$sessionId].statistics.suspiciousEvents++
                                $global:MonitoringSessions[$sessionId].statistics.alertsTriggered++
                                
                                # Log critical alerts
                                if ($suspiciousActivity.Alert.severity -eq "CRITICAL") {
                                    Write-APILog "🚨 CRITICAL FILE SYSTEM ALERT: $($suspiciousActivity.Alert.description)" -Level "ERROR"
                                    Save-AuditLog -EventType "FILESYSTEM_CRITICAL_ALERT" -User $authResult.User.username -Detail $suspiciousActivity.Alert.description
                                }
                            }
                        }
                    }
                    
                    # Register events
                    Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action
                    Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action
                    Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action
                    Register-ObjectEvent -InputObject $watcher -EventName "Renamed" -Action $action
                    
                    # Store watcher
                    $watcherKey = "$sessionId-$([System.Uri]::EscapeDataString($path))"
                    $global:FileSystemWatchers[$watcherKey] = $watcher
                    
                    Write-APILog "📂 File system watcher started for: $path" -Level "DEBUG"
                    
                } catch {
                    Write-APILog "⚠️ Failed to create watcher for $path : $($_.Exception.Message)" -Level "WARNING"
                }
            } else {
                Write-APILog "⚠️ Path does not exist: $path" -Level "WARNING"
            }
        }
        
        # Store monitoring session
        $global:MonitoringSessions[$sessionId] = $monitoringSession
        
        Add-AuditLog -EventType "FILESYSTEM_MONITORING_STARTED" -UserId $authResult.User.user_id -Details "Started file system monitoring for $($monitoringPaths.Count) paths"
        
        return @{
            Status = "Success"
            Message = "File system monitoring started successfully"
            Data = @{
                sessionId = $sessionId
                monitoredPaths = $monitoringPaths
                watchersCreated = $global:FileSystemWatchers.Keys.Count
                startTime = $monitoringSession.startTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "❌ Error starting file system monitoring: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to start file system monitoring: $($_.Exception.Message)"
    }
}

# Stop file system monitoring
function Invoke-StopFileSystemMonitoring {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse request parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $sessionId = $queryParams.sessionId
        
        if (-not $sessionId) {
            return Format-ErrorResponse -Message "Session ID is required" -StatusCode 400
        }
        
        if (-not $global:MonitoringSessions.ContainsKey($sessionId)) {
            return Format-ErrorResponse -Message "Monitoring session not found" -StatusCode 404
        }
        
        Write-APILog "🛑 Stopping file system monitoring session: $sessionId" -Level "INFO"
        
        # Stop and dispose file system watchers
        $watchersRemoved = 0
        $watcherKeys = $global:FileSystemWatchers.Keys | Where-Object { $_ -like "$sessionId-*" }
        
        foreach ($key in $watcherKeys) {
            try {
                $watcher = $global:FileSystemWatchers[$key]
                $watcher.EnableRaisingEvents = $false
                $watcher.Dispose()
                $global:FileSystemWatchers.Remove($key)
                $watchersRemoved++
            } catch {
                Write-APILog "⚠️ Error disposing watcher $key : $($_.Exception.Message)" -Level "WARNING"
            }
        }
        
        # Update monitoring session
        $monitoringSession = $global:MonitoringSessions[$sessionId]
        $monitoringSession.status = "Stopped"
        $monitoringSession.endTime = Get-Date
        $monitoringSession.duration = ($monitoringSession.endTime - $monitoringSession.startTime).TotalSeconds
        
        # Create final report
        $finalReport = @{
            sessionId = $sessionId
            duration = $monitoringSession.duration
            statistics = $monitoringSession.statistics
            totalAlerts = $monitoringSession.alerts.Count
            criticalAlerts = ($monitoringSession.alerts | Where-Object { $_.severity -eq "CRITICAL" }).Count
            monitoredPaths = $monitoringSession.monitoredPaths
            watchersRemoved = $watchersRemoved
        }
        
        Add-AuditLog -EventType "FILESYSTEM_MONITORING_STOPPED" -UserId $authResult.User.user_id -Details "Stopped file system monitoring session $sessionId - Duration: $($monitoringSession.duration)s, Events: $($monitoringSession.statistics.totalEvents), Alerts: $($monitoringSession.alerts.Count)"
        
        return @{
            Status = "Success"
            Message = "File system monitoring stopped successfully"
            Data = $finalReport
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "❌ Error stopping file system monitoring: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to stop file system monitoring: $($_.Exception.Message)"
    }
}

# Get file system monitoring status
function Invoke-GetFileSystemMonitoringStatus {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $sessionId = $queryParams.sessionId
        
        if ($sessionId) {
            # Get specific session
            if (-not $global:MonitoringSessions.ContainsKey($sessionId)) {
                return Format-ErrorResponse -Message "Monitoring session not found" -StatusCode 404
            }
            
            $session = $global:MonitoringSessions[$sessionId]
            
            # Get recent events (last 100)
            $recentEvents = $session.events | Sort-Object timestamp -Descending | Select-Object -First 100
            
            # Get recent alerts (last 50)
            $recentAlerts = $session.alerts | Sort-Object timestamp -Descending | Select-Object -First 50
            
            return @{
                Status = "Success"
                Message = "File system monitoring status retrieved"
                Data = @{
                    sessionId = $sessionId
                    status = $session.status
                    startTime = $session.startTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    endTime = if ($session.endTime) { $session.endTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                    duration = if ($session.endTime) { $session.duration } else { ((Get-Date) - $session.startTime).TotalSeconds }
                    monitoredPaths = $session.monitoredPaths
                    statistics = $session.statistics
                    recentEvents = $recentEvents
                    recentAlerts = $recentAlerts
                    totalEvents = $session.events.Count
                    totalAlerts = $session.alerts.Count
                }
                Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
            
        } else {
            # Get all active sessions
            $activeSessions = @()
            
            foreach ($session in $global:MonitoringSessions.Values) {
                $activeSessions += @{
                    sessionId = $session.sessionId
                    status = $session.status
                    startTime = $session.startTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    userName = $session.userName
                    monitoredPathsCount = $session.monitoredPaths.Count
                    totalEvents = $session.statistics.totalEvents
                    totalAlerts = $session.alerts.Count
                    duration = if ($session.endTime) { $session.duration } else { ((Get-Date) - $session.startTime).TotalSeconds }
                }
            }
            
            return @{
                Status = "Success"
                Message = "File system monitoring overview retrieved"
                Data = @{
                    activeSessions = $activeSessions
                    totalSessions = $global:MonitoringSessions.Count
                    activeWatchers = $global:FileSystemWatchers.Count
                }
                Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
    } catch {
        Write-APILog "❌ Error getting file system monitoring status: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to get file system monitoring status: $($_.Exception.Message)"
    }
}

# Test for suspicious file activity
function Test-SuspiciousFileActivity {
    param($EventInfo)
    
    $alerts = @()
    $isSuspicious = $false
    
    # Check for suspicious file extensions
    if ($EventInfo.extension -in $global:FSMonitorConfig.SuspiciousExtensions) {
        $isSuspicious = $true
        $alerts += @{
            type = "SUSPICIOUS_FILE"
            severity = "MEDIUM"
            description = "疑わしいファイル拡張子を検出: $($EventInfo.name) ($($EventInfo.extension))"
            timestamp = $EventInfo.timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            details = $EventInfo
        }
    }
    
    # Check for critical directory modifications
    $parentDir = Split-Path $EventInfo.directory -Leaf
    if ($parentDir -in $global:FSMonitorConfig.CriticalDirectories) {
        $isSuspicious = $true
        $alerts += @{
            type = "CRITICAL_DIRECTORY"
            severity = "HIGH"
            description = "重要なシステムディレクトリでの変更を検出: $($EventInfo.fullPath)"
            timestamp = $EventInfo.timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            details = $EventInfo
        }
    }
    
    # Check for large file operations
    if ($EventInfo.size -gt 100MB) {
        $isSuspicious = $true
        $alerts += @{
            type = "LARGE_FILE"
            severity = "MEDIUM"
            description = "大きなファイル操作を検出: $($EventInfo.name) ($([math]::Round($EventInfo.size / 1MB, 2)) MB)"
            timestamp = $EventInfo.timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            details = $EventInfo
        }
    }
    
    # Check for system file modifications
    if ($EventInfo.fullPath -match "\\Windows\\System32\\|\\Windows\\SysWOW64\\") {
        $isSuspicious = $true
        $alerts += @{
            type = "SYSTEM_FILE"
            severity = "CRITICAL"
            description = "システムファイルの変更を検出: $($EventInfo.fullPath)"
            timestamp = $EventInfo.timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            details = $EventInfo
        }
    }
    
    # Check for temp directory suspicious activity
    if ($EventInfo.fullPath -match "\\Temp\\|\\Windows\\Temp\\") {
        if ($EventInfo.extension -in @(".exe", ".bat", ".cmd", ".ps1", ".vbs")) {
            $isSuspicious = $true
            $alerts += @{
                type = "TEMP_EXECUTABLE"
                severity = "HIGH"
                description = "一時ディレクトリに実行可能ファイルを検出: $($EventInfo.fullPath)"
                timestamp = $EventInfo.timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                details = $EventInfo
            }
        }
    }
    
    return @{
        IsSuspicious = $isSuspicious
        Alert = if ($alerts.Count -gt 0) { $alerts[0] } else { $null }
        AllAlerts = $alerts
    }
}

# Get file system security report
function Invoke-GetFileSystemSecurityReport {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        Write-APILog "📊 Generating file system security report" -Level "INFO"
        
        # Get all monitoring sessions
        $allSessions = $global:MonitoringSessions.Values
        
        # Calculate overall statistics
        $totalEvents = ($allSessions | Measure-Object -Property { $_.statistics.totalEvents } -Sum).Sum
        $totalAlerts = ($allSessions | ForEach-Object { $_.alerts.Count } | Measure-Object -Sum).Sum
        $criticalAlerts = ($allSessions | ForEach-Object { ($_.alerts | Where-Object { $_.severity -eq "CRITICAL" }).Count } | Measure-Object -Sum).Sum
        
        # Get top suspicious file types
        $suspiciousFiles = @{}
        foreach ($session in $allSessions) {
            foreach ($alert in $session.alerts) {
                if ($alert.details -and $alert.details.extension) {
                    $ext = $alert.details.extension
                    if ($suspiciousFiles.ContainsKey($ext)) {
                        $suspiciousFiles[$ext]++
                    } else {
                        $suspiciousFiles[$ext] = 1
                    }
                }
            }
        }
        
        # Get most targeted directories
        $targetedDirectories = @{}
        foreach ($session in $allSessions) {
            foreach ($alert in $session.alerts) {
                if ($alert.details -and $alert.details.directory) {
                    $dir = $alert.details.directory
                    if ($targetedDirectories.ContainsKey($dir)) {
                        $targetedDirectories[$dir]++
                    } else {
                        $targetedDirectories[$dir] = 1
                    }
                }
            }
        }
        
        # Recent critical alerts (last 50)
        $allAlerts = @()
        foreach ($session in $allSessions) {
            foreach ($alert in $session.alerts) {
                $allAlerts += $alert
            }
        }
        $recentCriticalAlerts = $allAlerts | Where-Object { $_.severity -eq "CRITICAL" } | Sort-Object timestamp -Descending | Select-Object -First 50
        
        $report = @{
            summary = @{
                totalMonitoringSessions = $allSessions.Count
                totalEvents = $totalEvents
                totalAlerts = $totalAlerts
                criticalAlerts = $criticalAlerts
                activeSessions = ($allSessions | Where-Object { $_.status -eq "Active" }).Count
                riskLevel = if ($criticalAlerts -gt 10) { "Critical" } elseif ($criticalAlerts -gt 5) { "High" } elseif ($totalAlerts -gt 50) { "Medium" } else { "Low" }
            }
            topSuspiciousFileTypes = $suspiciousFiles.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10
            mostTargetedDirectories = $targetedDirectories.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10
            recentCriticalAlerts = $recentCriticalAlerts
            recommendations = @()
            generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
        # Generate recommendations based on findings
        if ($report.summary.criticalAlerts -gt 0) {
            $report.recommendations += "🚨 重要: $($report.summary.criticalAlerts)件の重大なファイルシステムアラートが検出されました。即座に調査してください。"
        }
        
        if ($report.summary.riskLevel -eq "Critical" -or $report.summary.riskLevel -eq "High") {
            $report.recommendations += "🔒 セキュリティ対策: アンチウイルスソフトウェアのフルスキャンを実行してください。"
            $report.recommendations += "🛡️ システム保護: 重要なシステムファイルの整合性チェックを実行してください。"
        }
        
        if ($report.topSuspiciousFileTypes.Count -gt 0) {
            $topExt = $report.topSuspiciousFileTypes[0].Name
            $report.recommendations += "⚠️ 注意: '$topExt' ファイルの活動が多数検出されています。詳細な調査を推奨します。"
        }
        
        $report.recommendations += "📝 定期的なファイルシステム監視を継続してください。"
        $report.recommendations += "💾 重要なファイルの定期的なバックアップを確認してください。"
        
        Add-AuditLog -EventType "FILESYSTEM_SECURITY_REPORT" -UserId $authResult.User.user_id -Details "Generated file system security report - Risk Level: $($report.summary.riskLevel), Alerts: $($report.summary.totalAlerts)"
        
        return @{
            Status = "Success"
            Message = "File system security report generated successfully"
            Data = $report
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "❌ Error generating file system security report: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to generate file system security report: $($_.Exception.Message)"
    }
}

Write-APILog "✅ Windows File System Monitoring module loaded successfully" -Level "INFO"