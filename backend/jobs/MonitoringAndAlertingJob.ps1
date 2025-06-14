# Monitoring and Alerting Job for ITSM Platform
# Provides real-time monitoring and alerting capabilities
# Version: 2025.6.7

param(
    [int]$IntervalSeconds = 300,  # 5 minutes default
    [switch]$RunOnce = $false,
    [switch]$Verbose = $false,
    [string]$LogPath = "../logs/monitoring.log"
)

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force
Import-Module "../modules/Config.psm1" -Force

# Monitoring configuration
$global:MonitoringConfig = @{
    # Performance thresholds
    CPUThreshold = 85
    MemoryThreshold = 90
    DiskThreshold = 90
    ResponseTimeThreshold = 5000  # milliseconds
    
    # Database thresholds
    DatabaseSizeThreshold = 1000  # MB
    ConnectionTimeoutThreshold = 10  # seconds
    QueryTimeoutThreshold = 30  # seconds
    
    # Security thresholds
    FailedLoginThreshold = 10  # per hour
    LockedAccountThreshold = 5
    SecurityEventThreshold = 20  # per hour
    
    # Application thresholds
    ErrorRateThreshold = 5  # errors per hour
    IncidentBacklogThreshold = 50
    ServiceRequestBacklogThreshold = 100
    
    # Integration thresholds
    M365ConnectionTimeout = 30
    ADConnectionTimeout = 30
    ExternalAPITimeout = 15
    
    # Alert settings
    AlertRetentionDays = 30
    AlertCooldownMinutes = 30
    EmailEnabled = $true
    SMTPServer = $env:SMTP_SERVER
    SMTPPort = $env:SMTP_PORT
    SMTPUsername = $env:SMTP_USERNAME
    SMTPPassword = $env:SMTP_PASSWORD
    AlertRecipients = @($env:ALERT_RECIPIENTS -split ",")
}

# Alert severity levels
$AlertSeverity = @{
    INFO = "INFO"
    WARNING = "WARNING" 
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
}

# Main monitoring function
function Start-MonitoringService {
    param(
        [int]$IntervalSeconds,
        [switch]$RunOnce,
        [switch]$Verbose
    )
    
    try {
        Write-MonitoringLog "Starting monitoring service..." -Level "INFO"
        Write-MonitoringLog "Monitoring interval: $IntervalSeconds seconds" -Level "INFO"
        
        do {
            $monitoringResults = @{
                Timestamp = Get-Date
                Checks = @{}
                Alerts = @()
                Success = $true
            }
            
            try {
                # Performance monitoring
                $monitoringResults.Checks.Performance = Invoke-PerformanceMonitoring
                
                # Database monitoring
                $monitoringResults.Checks.Database = Invoke-DatabaseMonitoring
                
                # Security monitoring
                $monitoringResults.Checks.Security = Invoke-SecurityMonitoring
                
                # Application monitoring
                $monitoringResults.Checks.Application = Invoke-ApplicationMonitoring
                
                # Integration monitoring
                $monitoringResults.Checks.Integration = Invoke-IntegrationMonitoring
                
                # Service health monitoring
                $monitoringResults.Checks.ServiceHealth = Invoke-ServiceHealthMonitoring
                
                # Process alerts
                Process-MonitoringAlerts -Results $monitoringResults
                
                # Log monitoring summary
                Write-MonitoringLog "Monitoring cycle completed successfully" -Level "INFO"
                
            } catch {
                $monitoringResults.Success = $false
                Write-MonitoringLog "Monitoring cycle failed: $($_.Exception.Message)" -Level "ERROR"
                
                # Create critical alert for monitoring failure
                $alert = Create-Alert -Type "MONITORING_FAILURE" -Severity $AlertSeverity.CRITICAL -Message "Monitoring system failure: $($_.Exception.Message)"
                Send-Alert -Alert $alert
            }
            
            # Sleep if not running once
            if (-not $RunOnce) {
                Start-Sleep -Seconds $IntervalSeconds
            }
            
        } while (-not $RunOnce)
        
    } catch {
        Write-MonitoringLog "Monitoring service failed to start: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Performance monitoring
function Invoke-PerformanceMonitoring {
    try {
        $result = @{
            CPU = @{}
            Memory = @{}
            Disk = @{}
            Network = @{}
            Alerts = @()
        }
        
        # CPU monitoring
        try {
            $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
            $result.CPU.Usage = $cpu.Average
            $result.CPU.Threshold = $global:MonitoringConfig.CPUThreshold
            $result.CPU.Status = if ($cpu.Average -gt $global:MonitoringConfig.CPUThreshold) { "CRITICAL" } else { "OK" }
            
            if ($result.CPU.Status -eq "CRITICAL") {
                $alert = Create-Alert -Type "HIGH_CPU_USAGE" -Severity $AlertSeverity.ERROR -Message "High CPU usage detected: $($cpu.Average)%"
                $result.Alerts += $alert
            }
        } catch {
            $result.CPU.Error = $_.Exception.Message
        }
        
        # Memory monitoring
        try {
            $memory = Get-WmiObject -Class Win32_OperatingSystem
            $totalMemory = $memory.TotalVisibleMemorySize
            $freeMemory = $memory.FreePhysicalMemory
            $usedMemoryPercent = [math]::Round((($totalMemory - $freeMemory) / $totalMemory) * 100, 2)
            
            $result.Memory.Usage = $usedMemoryPercent
            $result.Memory.TotalMB = [math]::Round($totalMemory / 1024, 2)
            $result.Memory.FreeMB = [math]::Round($freeMemory / 1024, 2)
            $result.Memory.Threshold = $global:MonitoringConfig.MemoryThreshold
            $result.Memory.Status = if ($usedMemoryPercent -gt $global:MonitoringConfig.MemoryThreshold) { "CRITICAL" } else { "OK" }
            
            if ($result.Memory.Status -eq "CRITICAL") {
                $alert = Create-Alert -Type "HIGH_MEMORY_USAGE" -Severity $AlertSeverity.ERROR -Message "High memory usage detected: $usedMemoryPercent%"
                $result.Alerts += $alert
            }
        } catch {
            $result.Memory.Error = $_.Exception.Message
        }
        
        # Disk monitoring
        try {
            $disks = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3"
            $result.Disk.Drives = @()
            
            foreach ($disk in $disks) {
                $usedSpacePercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
                $diskInfo = @{
                    Drive = $disk.DeviceID
                    UsagePercent = $usedSpacePercent
                    FreeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
                    TotalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
                    Status = if ($usedSpacePercent -gt $global:MonitoringConfig.DiskThreshold) { "CRITICAL" } else { "OK" }
                }
                
                $result.Disk.Drives += $diskInfo
                
                if ($diskInfo.Status -eq "CRITICAL") {
                    $alert = Create-Alert -Type "HIGH_DISK_USAGE" -Severity $AlertSeverity.ERROR -Message "High disk usage on drive $($disk.DeviceID): $usedSpacePercent%"
                    $result.Alerts += $alert
                }
            }
        } catch {
            $result.Disk.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Performance monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Database monitoring
function Invoke-DatabaseMonitoring {
    try {
        $result = @{
            Connectivity = @{}
            Size = @{}
            Performance = @{}
            Integrity = @{}
            Alerts = @()
        }
        
        # Connection test
        try {
            $startTime = Get-Date
            $connectionTest = Test-DatabaseConnection
            $connectionTime = ((Get-Date) - $startTime).TotalMilliseconds
            
            $result.Connectivity.Status = if ($connectionTest) { "OK" } else { "FAILED" }
            $result.Connectivity.ResponseTime = $connectionTime
            $result.Connectivity.Threshold = $global:MonitoringConfig.ConnectionTimeoutThreshold * 1000
            
            if (-not $connectionTest) {
                $alert = Create-Alert -Type "DATABASE_CONNECTION_FAILED" -Severity $AlertSeverity.CRITICAL -Message "Database connection failed"
                $result.Alerts += $alert
            } elseif ($connectionTime -gt ($global:MonitoringConfig.ConnectionTimeoutThreshold * 1000)) {
                $alert = Create-Alert -Type "DATABASE_SLOW_CONNECTION" -Severity $AlertSeverity.WARNING -Message "Slow database connection: $connectionTime ms"
                $result.Alerts += $alert
            }
        } catch {
            $result.Connectivity.Error = $_.Exception.Message
            $alert = Create-Alert -Type "DATABASE_CONNECTION_ERROR" -Severity $AlertSeverity.CRITICAL -Message "Database connection error: $($_.Exception.Message)"
            $result.Alerts += $alert
        }
        
        # Database size monitoring
        try {
            $dbFile = Join-Path $PSScriptRoot "../db/itsm.sqlite"
            if (Test-Path $dbFile) {
                $dbSize = [math]::Round((Get-Item $dbFile).Length / 1MB, 2)
                $result.Size.SizeMB = $dbSize
                $result.Size.Threshold = $global:MonitoringConfig.DatabaseSizeThreshold
                $result.Size.Status = if ($dbSize -gt $global:MonitoringConfig.DatabaseSizeThreshold) { "WARNING" } else { "OK" }
                
                if ($result.Size.Status -eq "WARNING") {
                    $alert = Create-Alert -Type "DATABASE_SIZE_WARNING" -Severity $AlertSeverity.WARNING -Message "Database size growing large: $dbSize MB"
                    $result.Alerts += $alert
                }
            }
        } catch {
            $result.Size.Error = $_.Exception.Message
        }
        
        # Performance test
        try {
            $startTime = Get-Date
            $testQuery = "SELECT COUNT(*) FROM users"
            $queryResult = Invoke-DatabaseQuery -Query $testQuery
            $queryTime = ((Get-Date) - $startTime).TotalMilliseconds
            
            $result.Performance.QueryTime = $queryTime
            $result.Performance.Threshold = $global:MonitoringConfig.QueryTimeoutThreshold * 1000
            $result.Performance.Status = if ($queryTime -gt ($global:MonitoringConfig.QueryTimeoutThreshold * 1000)) { "WARNING" } else { "OK" }
            
            if ($result.Performance.Status -eq "WARNING") {
                $alert = Create-Alert -Type "DATABASE_SLOW_QUERY" -Severity $AlertSeverity.WARNING -Message "Slow database query detected: $queryTime ms"
                $result.Alerts += $alert
            }
        } catch {
            $result.Performance.Error = $_.Exception.Message
        }
        
        # Quick integrity check
        try {
            $integrityResult = Invoke-DatabaseQuery -Query "PRAGMA quick_check(1)"
            $result.Integrity.Status = if ($integrityResult -eq "ok") { "OK" } else { "FAILED" }
            $result.Integrity.Result = $integrityResult
            
            if ($result.Integrity.Status -eq "FAILED") {
                $alert = Create-Alert -Type "DATABASE_INTEGRITY_ERROR" -Severity $AlertSeverity.CRITICAL -Message "Database integrity check failed: $integrityResult"
                $result.Alerts += $alert
            }
        } catch {
            $result.Integrity.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Database monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Security monitoring
function Invoke-SecurityMonitoring {
    try {
        $result = @{
            FailedLogins = @{}
            LockedAccounts = @{}
            SecurityEvents = @{}
            Alerts = @()
        }
        
        # Failed login monitoring
        try {
            $oneHourAgo = (Get-Date).AddHours(-1).ToString("yyyy-MM-dd HH:mm:ss")
            $failedLoginsQuery = @"
                SELECT COUNT(*) as count FROM logs 
                WHERE event_type = 'FAILED_LOGIN' 
                AND event_time > '$oneHourAgo'
"@
            
            $failedLogins = Invoke-DatabaseQuery -Query $failedLoginsQuery
            $result.FailedLogins.Count = $failedLogins.count
            $result.FailedLogins.Threshold = $global:MonitoringConfig.FailedLoginThreshold
            $result.FailedLogins.Status = if ($failedLogins.count -gt $global:MonitoringConfig.FailedLoginThreshold) { "WARNING" } else { "OK" }
            
            if ($result.FailedLogins.Status -eq "WARNING") {
                $alert = Create-Alert -Type "HIGH_FAILED_LOGINS" -Severity $AlertSeverity.WARNING -Message "High number of failed logins in last hour: $($failedLogins.count)"
                $result.Alerts += $alert
            }
        } catch {
            $result.FailedLogins.Error = $_.Exception.Message
        }
        
        # Locked accounts monitoring
        try {
            $lockedAccountsQuery = @"
                SELECT COUNT(*) as count FROM users 
                WHERE account_locked = 1
"@
            
            $lockedAccounts = Invoke-DatabaseQuery -Query $lockedAccountsQuery
            $result.LockedAccounts.Count = $lockedAccounts.count
            $result.LockedAccounts.Threshold = $global:MonitoringConfig.LockedAccountThreshold
            $result.LockedAccounts.Status = if ($lockedAccounts.count -gt $global:MonitoringConfig.LockedAccountThreshold) { "WARNING" } else { "OK" }
            
            if ($result.LockedAccounts.Status -eq "WARNING") {
                $alert = Create-Alert -Type "HIGH_LOCKED_ACCOUNTS" -Severity $AlertSeverity.WARNING -Message "High number of locked accounts: $($lockedAccounts.count)"
                $result.Alerts += $alert
            }
        } catch {
            $result.LockedAccounts.Error = $_.Exception.Message
        }
        
        # Security events monitoring
        try {
            $oneHourAgo = (Get-Date).AddHours(-1).ToString("yyyy-MM-dd HH:mm:ss")
            $securityEventsQuery = @"
                SELECT COUNT(*) as count FROM logs 
                WHERE event_type IN ('SECURITY_ALERT', 'UNAUTHORIZED_ACCESS', 'PRIVILEGE_ESCALATION') 
                AND event_time > '$oneHourAgo'
"@
            
            $securityEvents = Invoke-DatabaseQuery -Query $securityEventsQuery
            $result.SecurityEvents.Count = $securityEvents.count
            $result.SecurityEvents.Threshold = $global:MonitoringConfig.SecurityEventThreshold
            $result.SecurityEvents.Status = if ($securityEvents.count -gt $global:MonitoringConfig.SecurityEventThreshold) { "CRITICAL" } else { "OK" }
            
            if ($result.SecurityEvents.Status -eq "CRITICAL") {
                $alert = Create-Alert -Type "HIGH_SECURITY_EVENTS" -Severity $AlertSeverity.CRITICAL -Message "High number of security events in last hour: $($securityEvents.count)"
                $result.Alerts += $alert
            }
        } catch {
            $result.SecurityEvents.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Security monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Application monitoring
function Invoke-ApplicationMonitoring {
    try {
        $result = @{
            ErrorRate = @{}
            IncidentBacklog = @{}
            ServiceRequestBacklog = @{}
            ResponseTime = @{}
            Alerts = @()
        }
        
        # Error rate monitoring
        try {
            $oneHourAgo = (Get-Date).AddHours(-1).ToString("yyyy-MM-dd HH:mm:ss")
            $errorRateQuery = @"
                SELECT COUNT(*) as count FROM logs 
                WHERE event_type LIKE '%ERROR%' 
                AND event_time > '$oneHourAgo'
"@
            
            $errors = Invoke-DatabaseQuery -Query $errorRateQuery
            $result.ErrorRate.Count = $errors.count
            $result.ErrorRate.Threshold = $global:MonitoringConfig.ErrorRateThreshold
            $result.ErrorRate.Status = if ($errors.count -gt $global:MonitoringConfig.ErrorRateThreshold) { "WARNING" } else { "OK" }
            
            if ($result.ErrorRate.Status -eq "WARNING") {
                $alert = Create-Alert -Type "HIGH_ERROR_RATE" -Severity $AlertSeverity.WARNING -Message "High error rate in last hour: $($errors.count) errors"
                $result.Alerts += $alert
            }
        } catch {
            $result.ErrorRate.Error = $_.Exception.Message
        }
        
        # Incident backlog monitoring
        try {
            $incidentBacklogQuery = @"
                SELECT COUNT(*) as count FROM incidents 
                WHERE status IN ('Open', 'In Progress')
"@
            
            $incidents = Invoke-DatabaseQuery -Query $incidentBacklogQuery
            $result.IncidentBacklog.Count = $incidents.count
            $result.IncidentBacklog.Threshold = $global:MonitoringConfig.IncidentBacklogThreshold
            $result.IncidentBacklog.Status = if ($incidents.count -gt $global:MonitoringConfig.IncidentBacklogThreshold) { "WARNING" } else { "OK" }
            
            if ($result.IncidentBacklog.Status -eq "WARNING") {
                $alert = Create-Alert -Type "HIGH_INCIDENT_BACKLOG" -Severity $AlertSeverity.WARNING -Message "High incident backlog: $($incidents.count) open incidents"
                $result.Alerts += $alert
            }
        } catch {
            $result.IncidentBacklog.Error = $_.Exception.Message
        }
        
        # Service request backlog monitoring
        try {
            $serviceRequestBacklogQuery = @"
                SELECT COUNT(*) as count FROM service_requests 
                WHERE status IN ('Pending', 'Under Review')
"@
            
            $serviceRequests = Invoke-DatabaseQuery -Query $serviceRequestBacklogQuery
            $result.ServiceRequestBacklog.Count = $serviceRequests.count
            $result.ServiceRequestBacklog.Threshold = $global:MonitoringConfig.ServiceRequestBacklogThreshold
            $result.ServiceRequestBacklog.Status = if ($serviceRequests.count -gt $global:MonitoringConfig.ServiceRequestBacklogThreshold) { "WARNING" } else { "OK" }
            
            if ($result.ServiceRequestBacklog.Status -eq "WARNING") {
                $alert = Create-Alert -Type "HIGH_SERVICE_REQUEST_BACKLOG" -Severity $AlertSeverity.WARNING -Message "High service request backlog: $($serviceRequests.count) pending requests"
                $result.Alerts += $alert
            }
        } catch {
            $result.ServiceRequestBacklog.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Application monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Integration monitoring
function Invoke-IntegrationMonitoring {
    try {
        $result = @{
            Microsoft365 = @{}
            ActiveDirectory = @{}
            ExternalAPIs = @{}
            Alerts = @()
        }
        
        # Microsoft 365 connectivity
        try {
            $startTime = Get-Date
            # Test M365 connectivity (simplified)
            $m365Test = Test-NetConnection -ComputerName "graph.microsoft.com" -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
            $m365Time = ((Get-Date) - $startTime).TotalMilliseconds
            
            $result.Microsoft365.Status = if ($m365Test) { "OK" } else { "FAILED" }
            $result.Microsoft365.ResponseTime = $m365Time
            $result.Microsoft365.Threshold = $global:MonitoringConfig.M365ConnectionTimeout * 1000
            
            if (-not $m365Test) {
                $alert = Create-Alert -Type "M365_CONNECTION_FAILED" -Severity $AlertSeverity.ERROR -Message "Microsoft 365 connectivity failed"
                $result.Alerts += $alert
            } elseif ($m365Time -gt ($global:MonitoringConfig.M365ConnectionTimeout * 1000)) {
                $alert = Create-Alert -Type "M365_SLOW_CONNECTION" -Severity $AlertSeverity.WARNING -Message "Slow Microsoft 365 connection: $m365Time ms"
                $result.Alerts += $alert
            }
        } catch {
            $result.Microsoft365.Error = $_.Exception.Message
        }
        
        # Active Directory connectivity
        try {
            if ($global:ADModuleAvailable) {
                $startTime = Get-Date
                $adTest = Test-ComputerSecureChannel -ErrorAction SilentlyContinue
                $adTime = ((Get-Date) - $startTime).TotalMilliseconds
                
                $result.ActiveDirectory.Status = if ($adTest) { "OK" } else { "FAILED" }
                $result.ActiveDirectory.ResponseTime = $adTime
                $result.ActiveDirectory.Threshold = $global:MonitoringConfig.ADConnectionTimeout * 1000
                
                if (-not $adTest) {
                    $alert = Create-Alert -Type "AD_CONNECTION_FAILED" -Severity $AlertSeverity.ERROR -Message "Active Directory connectivity failed"
                    $result.Alerts += $alert
                }
            } else {
                $result.ActiveDirectory.Status = "NOT_AVAILABLE"
            }
        } catch {
            $result.ActiveDirectory.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Integration monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Service health monitoring
function Invoke-ServiceHealthMonitoring {
    try {
        $result = @{
            WebServer = @{}
            APIServer = @{}
            DatabaseServer = @{}
            Alerts = @()
        }
        
        # Web server health (if running)
        try {
            $webServerProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*ITSM*" }
            $result.WebServer.ProcessCount = $webServerProcesses.Count
            $result.WebServer.Status = if ($webServerProcesses.Count -gt 0) { "RUNNING" } else { "STOPPED" }
            
            if ($result.WebServer.Status -eq "STOPPED") {
                $alert = Create-Alert -Type "WEB_SERVER_DOWN" -Severity $AlertSeverity.CRITICAL -Message "Web server is not running"
                $result.Alerts += $alert
            }
        } catch {
            $result.WebServer.Error = $_.Exception.Message
        }
        
        # API server health (test endpoint)
        try {
            $apiUrl = "http://localhost:8082/api/health"
            $response = Invoke-RestMethod -Uri $apiUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
            $result.APIServer.Status = "RUNNING"
            $result.APIServer.Response = $response
        } catch {
            $result.APIServer.Status = "FAILED"
            $result.APIServer.Error = $_.Exception.Message
            
            $alert = Create-Alert -Type "API_SERVER_DOWN" -Severity $AlertSeverity.CRITICAL -Message "API server health check failed: $($_.Exception.Message)"
            $result.Alerts += $alert
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "Service health monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Create alert object
function Create-Alert {
    param(
        [string]$Type,
        [string]$Severity,
        [string]$Message,
        [hashtable]$Details = @{}
    )
    
    return @{
        Id = [System.Guid]::NewGuid().ToString()
        Type = $Type
        Severity = $Severity
        Message = $Message
        Details = $Details
        Timestamp = Get-Date
        Acknowledged = $false
        Resolved = $false
    }
}

# Process and send alerts
function Process-MonitoringAlerts {
    param([hashtable]$Results)
    
    try {
        # Collect all alerts from monitoring results
        $allAlerts = @()
        foreach ($check in $Results.Checks.Values) {
            if ($check.Alerts) {
                $allAlerts += $check.Alerts
            }
        }
        
        # Process each alert
        foreach ($alert in $allAlerts) {
            try {
                # Check if this alert type has been sent recently (cooldown)
                if (-not (Test-AlertCooldown -AlertType $alert.Type)) {
                    # Send the alert
                    Send-Alert -Alert $alert
                    
                    # Record alert in database
                    Record-Alert -Alert $alert
                    
                    # Update cooldown
                    Set-AlertCooldown -AlertType $alert.Type
                }
            } catch {
                Write-MonitoringLog "Failed to process alert $($alert.Type): $($_.Exception.Message)" -Level "ERROR"
            }
        }
        
    } catch {
        Write-MonitoringLog "Failed to process monitoring alerts: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Send alert (email, notification, etc.)
function Send-Alert {
    param([hashtable]$Alert)
    
    try {
        Write-MonitoringLog "ALERT [$($Alert.Severity)]: $($Alert.Message)" -Level "ERROR"
        
        # Send email if configured
        if ($global:MonitoringConfig.EmailEnabled -and $global:MonitoringConfig.AlertRecipients.Count -gt 0) {
            Send-AlertEmail -Alert $Alert
        }
        
        # Log to system event log
        Write-EventLog -LogName "Application" -Source "ITSM Platform" -EventId 1001 -EntryType Warning -Message "ITSM Alert: $($Alert.Message)" -ErrorAction SilentlyContinue
        
        # Add to audit log
        Add-AuditLog -EventType "MONITORING_ALERT" -UserId 0 -Details ($Alert | ConvertTo-Json -Compress)
        
    } catch {
        Write-MonitoringLog "Failed to send alert: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Send alert email
function Send-AlertEmail {
    param([hashtable]$Alert)
    
    try {
        if (-not $global:MonitoringConfig.SMTPServer) {
            return
        }
        
        $subject = "ITSM Platform Alert [$($Alert.Severity)]: $($Alert.Type)"
        $body = @"
ITSM Platform Monitoring Alert

Alert Type: $($Alert.Type)
Severity: $($Alert.Severity)
Message: $($Alert.Message)
Timestamp: $($Alert.Timestamp)

Alert Details:
$($Alert.Details | ConvertTo-Json -Depth 3)

Please investigate this issue promptly.

ITSM Platform Monitoring System
"@
        
        $mailParams = @{
            To = $global:MonitoringConfig.AlertRecipients
            From = "itsm-monitoring@company.com"
            Subject = $subject
            Body = $body
            SmtpServer = $global:MonitoringConfig.SMTPServer
            Port = $global:MonitoringConfig.SMTPPort
        }
        
        if ($global:MonitoringConfig.SMTPUsername) {
            $credential = New-Object System.Management.Automation.PSCredential(
                $global:MonitoringConfig.SMTPUsername,
                (ConvertTo-SecureString $global:MonitoringConfig.SMTPPassword -AsPlainText -Force)
            )
            $mailParams.Credential = $credential
        }
        
        Send-MailMessage @mailParams
        Write-MonitoringLog "Alert email sent successfully for $($Alert.Type)" -Level "INFO"
        
    } catch {
        Write-MonitoringLog "Failed to send alert email: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Record alert in database
function Record-Alert {
    param([hashtable]$Alert)
    
    try {
        $query = @"
            INSERT INTO monitoring_alerts (
                alert_id, alert_type, severity, message, details, 
                timestamp, acknowledged, resolved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"@
        
        Invoke-DatabaseQuery -Query $query -Parameters @(
            $Alert.Id,
            $Alert.Type,
            $Alert.Severity,
            $Alert.Message,
            ($Alert.Details | ConvertTo-Json -Compress),
            $Alert.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
            $Alert.Acknowledged,
            $Alert.Resolved
        )
        
    } catch {
        Write-MonitoringLog "Failed to record alert in database: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Test alert cooldown
function Test-AlertCooldown {
    param([string]$AlertType)
    
    try {
        $cooldownMinutes = $global:MonitoringConfig.AlertCooldownMinutes
        $cutoffTime = (Get-Date).AddMinutes(-$cooldownMinutes).ToString("yyyy-MM-dd HH:mm:ss")
        
        $query = @"
            SELECT COUNT(*) as count FROM monitoring_alerts 
            WHERE alert_type = '$AlertType' 
            AND timestamp > '$cutoffTime'
"@
        
        $result = Invoke-DatabaseQuery -Query $query
        return $result.count -gt 0
        
    } catch {
        return $false
    }
}

# Set alert cooldown
function Set-AlertCooldown {
    param([string]$AlertType)
    
    # Cooldown is automatically handled by the timestamp in the database
    # No additional action needed
}

# Monitoring logging function
function Write-MonitoringLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console
    if ($Verbose -or $Level -eq "ERROR") {
        Write-Host $logMessage
    }
    
    # Write to log file
    try {
        $logPath = Join-Path $PSScriptRoot $LogPath
        $logMessage | Out-File -FilePath $logPath -Append -Encoding UTF8
    } catch {
        Write-Warning "Failed to write to monitoring log: $($_.Exception.Message)"
    }
}

# Initialize monitoring tables
function Initialize-MonitoringTables {
    try {
        $createAlertsTable = @"
            CREATE TABLE IF NOT EXISTS monitoring_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id TEXT UNIQUE NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                timestamp DATETIME NOT NULL,
                acknowledged BOOLEAN DEFAULT FALSE,
                resolved BOOLEAN DEFAULT FALSE,
                acknowledged_by INTEGER,
                resolved_by INTEGER,
                acknowledged_at DATETIME,
                resolved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (acknowledged_by) REFERENCES users (user_id),
                FOREIGN KEY (resolved_by) REFERENCES users (user_id)
            )
"@
        
        Invoke-DatabaseQuery -Query $createAlertsTable
        Write-MonitoringLog "Monitoring tables initialized" -Level "INFO"
        
    } catch {
        Write-MonitoringLog "Failed to initialize monitoring tables: $($_.Exception.Message)" -Level "ERROR"
    }
}

# SLA monitoring functions (強化版)
function Invoke-SLAMonitoring {
    try {
        $result = @{
            SLAViolations = @{}
            ResponseTimes = @{}
            ResolutionTimes = @{}
            Availability = @{}
            Alerts = @()
        }
        
        # Response time SLA monitoring
        try {
            $responseTimeQuery = @"
                SELECT 
                    priority,
                    AVG(CASE 
                        WHEN responded_date IS NOT NULL 
                        THEN JULIANDAY(responded_date) - JULIANDAY(created_date)
                        ELSE NULL 
                    END) * 24 * 60 as avg_response_minutes
                FROM incidents 
                WHERE created_date >= DATE('now', '-24 hours')
                AND status != 'Draft'
                GROUP BY priority
"@
            
            $responseResults = Invoke-DatabaseQuery -Query $responseTimeQuery
            $slaLimits = @{
                'Critical' = 15  # 15 minutes
                'High' = 60      # 1 hour
                'Medium' = 240   # 4 hours
                'Low' = 480      # 8 hours
            }
            
            foreach ($item in $responseResults) {
                $priority = $item.priority
                $avgTime = [math]::Round($item.avg_response_minutes, 2)
                $slaLimit = $slaLimits[$priority]
                
                $result.ResponseTimes[$priority] = @{
                    AverageMinutes = $avgTime
                    SLALimit = $slaLimit
                    Status = if ($avgTime -gt $slaLimit) { "VIOLATION" } else { "OK" }
                    Violation = $avgTime -gt $slaLimit
                }
                
                if ($avgTime -gt $slaLimit) {
                    $alert = Create-Alert -Type "SLA_RESPONSE_VIOLATION" -Severity $AlertSeverity.WARNING -Message "Response time SLA violation for $priority priority: $avgTime minutes (limit: $slaLimit)"
                    $result.Alerts += $alert
                }
            }
        } catch {
            $result.ResponseTimes.Error = $_.Exception.Message
        }
        
        # Resolution time SLA monitoring
        try {
            $resolutionTimeQuery = @"
                SELECT 
                    priority,
                    AVG(CASE 
                        WHEN resolved_date IS NOT NULL 
                        THEN JULIANDAY(resolved_date) - JULIANDAY(created_date)
                        ELSE NULL 
                    END) * 24 as avg_resolution_hours
                FROM incidents 
                WHERE created_date >= DATE('now', '-7 days')
                AND status = 'Resolved'
                GROUP BY priority
"@
            
            $resolutionResults = Invoke-DatabaseQuery -Query $resolutionTimeQuery
            $resolutionSLALimits = @{
                'Critical' = 4   # 4 hours
                'High' = 24      # 24 hours
                'Medium' = 72    # 3 days
                'Low' = 168      # 7 days
            }
            
            foreach ($item in $resolutionResults) {
                $priority = $item.priority
                $avgHours = [math]::Round($item.avg_resolution_hours, 2)
                $slaLimit = $resolutionSLALimits[$priority]
                
                $result.ResolutionTimes[$priority] = @{
                    AverageHours = $avgHours
                    SLALimit = $slaLimit
                    Status = if ($avgHours -gt $slaLimit) { "VIOLATION" } else { "OK" }
                    Violation = $avgHours -gt $slaLimit
                }
                
                if ($avgHours -gt $slaLimit) {
                    $alert = Create-Alert -Type "SLA_RESOLUTION_VIOLATION" -Severity $AlertSeverity.ERROR -Message "Resolution time SLA violation for $priority priority: $avgHours hours (limit: $slaLimit)"
                    $result.Alerts += $alert
                }
            }
        } catch {
            $result.ResolutionTimes.Error = $_.Exception.Message
        }
        
        # Service availability monitoring
        try {
            $uptimeQuery = @"
                SELECT 
                    COUNT(*) as total_incidents,
                    SUM(CASE WHEN priority IN ('Critical', 'High') THEN 1 ELSE 0 END) as critical_incidents,
                    AVG(CASE 
                        WHEN resolved_date IS NOT NULL 
                        THEN JULIANDAY(resolved_date) - JULIANDAY(created_date)
                        ELSE NULL 
                    END) * 24 * 60 as avg_downtime_minutes
                FROM incidents 
                WHERE created_date >= DATE('now', '-30 days')
                AND category = 'Service Outage'
"@
            
            $uptimeResult = Invoke-DatabaseQuery -Query $uptimeQuery
            $targetAvailability = 99.9  # 99.9% SLA target
            $monthlyMinutes = 30 * 24 * 60  # 30 days in minutes
            $downtimeMinutes = $uptimeResult.avg_downtime_minutes * $uptimeResult.total_incidents
            $actualAvailability = [math]::Round((($monthlyMinutes - $downtimeMinutes) / $monthlyMinutes) * 100, 3)
            
            $result.Availability = @{
                TargetPercent = $targetAvailability
                ActualPercent = $actualAvailability
                DowntimeMinutes = [math]::Round($downtimeMinutes, 2)
                Status = if ($actualAvailability -lt $targetAvailability) { "VIOLATION" } else { "OK" }
                Violation = $actualAvailability -lt $targetAvailability
            }
            
            if ($actualAvailability -lt $targetAvailability) {
                $alert = Create-Alert -Type "SLA_AVAILABILITY_VIOLATION" -Severity $AlertSeverity.CRITICAL -Message "Service availability SLA violation: $actualAvailability% (target: $targetAvailability%)"
                $result.Alerts += $alert
            }
        } catch {
            $result.Availability.Error = $_.Exception.Message
        }
        
        return $result
        
    } catch {
        Write-MonitoringLog "SLA monitoring failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Real-time dashboard data collection
function Get-RealTimeDashboardData {
    try {
        $dashboardData = @{
            SystemHealth = @{}
            ActiveIncidents = @{}
            ServiceRequests = @{}
            SLAStatus = @{}
            AlertSummary = @{}
            Timestamp = Get-Date
        }
        
        # System health summary
        $perfResults = Invoke-PerformanceMonitoring
        $dbResults = Invoke-DatabaseMonitoring
        
        $dashboardData.SystemHealth = @{
            CPUUsage = $perfResults.CPU.Usage
            MemoryUsage = $perfResults.Memory.Usage
            DiskUsage = ($perfResults.Disk.Drives | Measure-Object -Property UsagePercent -Maximum).Maximum
            DatabaseConnectivity = $dbResults.Connectivity.Status
            OverallStatus = if ($perfResults.CPU.Status -eq "OK" -and $perfResults.Memory.Status -eq "OK" -and $dbResults.Connectivity.Status -eq "OK") { "Healthy" } else { "Warning" }
        }
        
        # Active incidents summary
        $incidentQuery = @"
            SELECT 
                status,
                priority,
                COUNT(*) as count
            FROM incidents 
            WHERE status IN ('Open', 'In Progress')
            GROUP BY status, priority
"@
        $activeIncidents = Invoke-DatabaseQuery -Query $incidentQuery
        $dashboardData.ActiveIncidents = $activeIncidents
        
        # Service requests summary
        $srQuery = @"
            SELECT 
                status,
                COUNT(*) as count
            FROM service_requests 
            WHERE status IN ('Pending', 'Under Review', 'In Progress')
            GROUP BY status
"@
        $activeServiceRequests = Invoke-DatabaseQuery -Query $srQuery
        $dashboardData.ServiceRequests = $activeServiceRequests
        
        # SLA status
        $slaResults = Invoke-SLAMonitoring
        $dashboardData.SLAStatus = @{
            ResponseTimeViolations = ($slaResults.ResponseTimes.Values | Where-Object { $_.Violation }).Count
            ResolutionTimeViolations = ($slaResults.ResolutionTimes.Values | Where-Object { $_.Violation }).Count
            AvailabilityStatus = $slaResults.Availability.Status
        }
        
        # Alert summary
        $alertQuery = @"
            SELECT 
                severity,
                COUNT(*) as count
            FROM monitoring_alerts 
            WHERE timestamp >= DATE('now', '-24 hours')
            AND resolved = 0
            GROUP BY severity
"@
        $activeAlerts = Invoke-DatabaseQuery -Query $alertQuery
        $dashboardData.AlertSummary = $activeAlerts
        
        return $dashboardData
        
    } catch {
        Write-MonitoringLog "Failed to collect dashboard data: $($_.Exception.Message)" -Level "ERROR"
        return $null
    }
}

# Export dashboard data to JSON file
function Export-DashboardData {
    param([string]$OutputPath = "../logs/dashboard-data.json")
    
    try {
        $dashboardData = Get-RealTimeDashboardData
        if ($dashboardData) {
            $jsonData = $dashboardData | ConvertTo-Json -Depth 5
            $fullPath = Join-Path $PSScriptRoot $OutputPath
            $jsonData | Out-File -FilePath $fullPath -Encoding UTF8
            Write-MonitoringLog "Dashboard data exported to $fullPath" -Level "INFO"
        }
    } catch {
        Write-MonitoringLog "Failed to export dashboard data: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Main execution
if ($MyInvocation.InvocationName -ne '.') {
    try {
        # Initialize monitoring tables
        Initialize-MonitoringTables
        
        # Export dashboard data for real-time monitoring
        Export-DashboardData
        
        # Start monitoring service with enhanced SLA monitoring
        Start-MonitoringService -IntervalSeconds $IntervalSeconds -RunOnce:$RunOnce -Verbose:$Verbose
        
    } catch {
        Write-Error "Monitoring service failed: $($_.Exception.Message)"
        exit 1
    }
}