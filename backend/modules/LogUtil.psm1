# LogUtil.psm1 - Enhanced Enterprise Logging Module
# Provides structured logging, performance monitoring, and security analytics
# Version: 2.0.0

# Enhanced logging configuration
$script:LogConfig = @{
    # Base paths
    LogPath = "logs/backend.log"
    ApiLogPath = "logs/api_access.log"
    SecurityLogPath = "logs/security.log"
    PerformanceLogPath = "logs/performance.log"
    ErrorLogPath = "logs/errors.log"
    AuditLogPath = "logs/audit.log"
    
    # Rotation settings
    MaxFileSizeMB = 100
    MaxBackupFiles = 10
    RotationInterval = "Daily"  # Daily, Weekly, Monthly
    
    # Performance settings
    EnableAsyncLogging = $true
    BufferSize = 1000
    FlushIntervalSeconds = 30
    
    # Security settings
    EnableSecurityLogging = $true
    SecurityEventTypes = @(
        "AUTHENTICATION_FAILURE",
        "AUTHORIZATION_FAILURE", 
        "SUSPICIOUS_ACTIVITY",
        "PRIVILEGE_ESCALATION",
        "DATA_ACCESS_VIOLATION"
    )
    
    # Structured logging
    LogFormat = "JSON"  # JSON, CSV, STRUCTURED, SIMPLE
    IncludeStackTrace = $false
    IncludeEnvironment = $true
    
    # Monitoring thresholds
    PerformanceThresholds = @{
        ResponseTimeWarning = 5000  # ms
        ResponseTimeCritical = 10000  # ms
        ErrorRateWarning = 5  # %
        ErrorRateCritical = 10  # %
    }
}

# Initialize logging system
$script:LogBuffer = [System.Collections.Concurrent.ConcurrentQueue[object]]::new()
$script:LogMetrics = @{
    TotalLogs = 0
    ErrorLogs = 0
    WarningLogs = 0
    SecurityEvents = 0
    LastFlush = Get-Date
    BufferSize = 0
}

# Performance counters
$script:PerformanceCounters = @{
    APIRequests = @{}
    DatabaseQueries = @{}
    SystemMetrics = @{}
    LastReset = Get-Date
}

# Enhanced structured logging function
function Write-LogEntry {
    param(
        [ValidateSet("TRACE", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL", "SECURITY")]
        [string]$Level = "INFO",
        [string]$Message,
        [string]$Category = "SYSTEM",
        [string]$User = "SYSTEM",
        [hashtable]$Properties = @{},
        [string]$RequestId = $null,
        [string]$CorrelationId = $null,
        [System.Exception]$Exception = $null,
        [switch]$IncludeStackTrace
    )
    
    try {
        $timestamp = Get-Date
        $logEntry = Create-StructuredLogEntry -Timestamp $timestamp -Level $Level -Message $Message -Category $Category -User $User -Properties $Properties -RequestId $RequestId -CorrelationId $CorrelationId -Exception $Exception -IncludeStackTrace:$IncludeStackTrace
        
        # Update metrics
        $script:LogMetrics.TotalLogs++
        switch ($Level) {
            "ERROR" { $script:LogMetrics.ErrorLogs++ }
            "CRITICAL" { $script:LogMetrics.ErrorLogs++ }
            "WARNING" { $script:LogMetrics.WarningLogs++ }
            "SECURITY" { $script:LogMetrics.SecurityEvents++ }
        }
        
        # Determine target log file
        $logFile = switch ($Level) {
            "SECURITY" { $script:LogConfig.SecurityLogPath }
            "ERROR" { $script:LogConfig.ErrorLogPath }
            "CRITICAL" { $script:LogConfig.ErrorLogPath }
            default { $script:LogConfig.LogPath }
        }
        
        # Write to appropriate destination
        if ($script:LogConfig.EnableAsyncLogging) {
            Add-ToLogBuffer -LogEntry $logEntry -LogFile $logFile
        } else {
            Write-LogToFile -LogEntry $logEntry -LogFile $logFile
        }
        
        # Console output for important events
        if ($Level -in @("ERROR", "CRITICAL", "WARNING", "SECURITY")) {
            $color = switch ($Level) {
                "ERROR" { "Red" }
                "CRITICAL" { "Magenta" }
                "WARNING" { "Yellow" }
                "SECURITY" { "Cyan" }
            }
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [$Level] $Message" -ForegroundColor $color
        }
        
        # Trigger alerts for critical events
        if ($Level -in @("CRITICAL", "SECURITY")) {
            Send-AlertNotification -Level $Level -Message $Message -Category $Category -User $User
        }
        
    } catch {
        # Fallback logging to prevent log failures from breaking the application
        $fallbackMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [ERROR] [LOGGING] [SYSTEM] Failed to write log entry: $($_.Exception.Message) | Original: $Message"
        try {
            Add-Content -Path $script:LogConfig.ErrorLogPath -Value $fallbackMessage
        } catch {
            Write-Error "Critical logging failure: $($_.Exception.Message)"
        }
    }
}

# Enhanced API logging with performance metrics
function Write-ApiLog {
    param(
        [string]$Method,
        [string]$Endpoint,
        [int]$StatusCode,
        [string]$User = "ANONYMOUS",
        [object]$RequestBody = $null,
        [double]$ResponseTimeMs = 0,
        [string]$RequestId = $null,
        [string]$ClientIP = "Unknown",
        [string]$UserAgent = "Unknown",
        [long]$RequestSize = 0,
        [long]$ResponseSize = 0,
        [hashtable]$Headers = @{},
        [string]$ErrorMessage = $null
    )
    
    try {
        $timestamp = Get-Date
        
        # Create structured API log entry
        $logEntry = @{
            Timestamp = $timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            Level = if ($StatusCode -ge 500) { "ERROR" } elseif ($StatusCode -ge 400) { "WARNING" } else { "INFO" }
            Category = "API"
            Method = $Method
            Endpoint = $Endpoint
            StatusCode = $StatusCode
            User = $User
            ClientIP = $ClientIP
            UserAgent = $UserAgent
            ResponseTimeMs = $ResponseTimeMs
            RequestSize = $RequestSize
            ResponseSize = $ResponseSize
            RequestId = $RequestId
            Success = $StatusCode -lt 400
            ErrorMessage = $ErrorMessage
            Headers = $Headers
        }
        
        # Add sanitized request body (avoid logging sensitive data)
        if ($RequestBody) {
            $sanitizedBody = Sanitize-RequestBody -Body $RequestBody
            $logEntry.RequestBody = $sanitizedBody
        }
        
        # Update performance counters
        Update-ApiPerformanceCounters -Method $Method -Endpoint $Endpoint -ResponseTime $ResponseTimeMs -StatusCode $StatusCode
        
        # Write to API log
        if ($script:LogConfig.EnableAsyncLogging) {
            Add-ToLogBuffer -LogEntry $logEntry -LogFile $script:LogConfig.ApiLogPath
        } else {
            Write-LogToFile -LogEntry $logEntry -LogFile $script:LogConfig.ApiLogPath
        }
        
        # Performance monitoring alerts
        if ($ResponseTimeMs -gt $script:LogConfig.PerformanceThresholds.ResponseTimeWarning) {
            $alertLevel = if ($ResponseTimeMs -gt $script:LogConfig.PerformanceThresholds.ResponseTimeCritical) { "CRITICAL" } else { "WARNING" }
            Write-LogEntry -Level $alertLevel -Message "Slow API response: $Method $Endpoint took ${ResponseTimeMs}ms" -Category "PERFORMANCE" -User $User -RequestId $RequestId
        }
        
        # Security monitoring
        if ($StatusCode -eq 401 -or $StatusCode -eq 403) {
            Write-SecurityLog -EventType "AUTHENTICATION_FAILURE" -User $User -ClientIP $ClientIP -Endpoint $Endpoint -Details "HTTP $StatusCode response"
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to write API log entry: $($_.Exception.Message)" -Category "LOGGING"
    }
}

function Save-AuditLog {
    param(
        [string]$EventType,
        [string]$User,
        [string]$Detail
    )
    
    try {
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        
        $query = "INSERT INTO logs (event_type, event_time, user, detail) VALUES (@event_type, @event_time, @user, @detail)"
        $params = @{
            event_type = $EventType
            event_time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            user = $User
            detail = $Detail
        }
        
        $result = Invoke-SqlNonQuery -Query $query -Parameters $params
        
        if ($result -gt 0) {
            Write-LogEntry -Level "INFO" -Message "Audit log saved: $EventType by $User"
            return $true
        } else {
            Write-LogEntry -Level "ERROR" -Message "Failed to save audit log: $EventType by $User"
            return $false
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Audit log save failed: $($_.Exception.Message)"
        return $false
    }
}

function Get-LogEntries {
    param(
        [string]$Level = "",
        [string]$Category = "",
        [string]$User = "",
        [DateTime]$FromDate = [DateTime]::MinValue,
        [DateTime]$ToDate = [DateTime]::MaxValue,
        [int]$Limit = 100
    )
    
    try {
        if (-not (Test-Path $script:LogPath)) {
            return @()
        }
        
        $logContent = Get-Content $script:LogPath
        $filteredLogs = @()
        
        foreach ($line in $logContent) {
            if ($line -match '^\[(.+?)\] \[(.+?)\] \[(.+?)\] \[(.+?)\] (.+)$') {
                $logDate = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd HH:mm:ss", $null)
                $logLevel = $matches[2]
                $logCategory = $matches[3]
                $logUser = $matches[4]
                $logMessage = $matches[5]
                
                if (($Level -eq "" -or $logLevel -eq $Level) -and
                    ($Category -eq "" -or $logCategory -eq $Category) -and
                    ($User -eq "" -or $logUser -eq $User) -and
                    ($logDate -ge $FromDate) -and ($logDate -le $ToDate)) {
                    
                    $filteredLogs += @{
                        Timestamp = $logDate
                        Level = $logLevel
                        Category = $logCategory
                        User = $logUser
                        Message = $logMessage
                    }
                }
            }
        }
        
        return $filteredLogs | Select-Object -Last $Limit
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get log entries: $($_.Exception.Message)"
        return @()
    }
}

function Clear-OldLogs {
    param(
        [int]$DaysToKeep = 30
    )
    
    try {
        $cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
        
        if (Test-Path $script:LogPath) {
            $logContent = Get-Content $script:LogPath
            $filteredContent = @()
            
            foreach ($line in $logContent) {
                if ($line -match '^\[(.+?)\]') {
                    $logDate = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd HH:mm:ss", $null)
                    if ($logDate -ge $cutoffDate) {
                        $filteredContent += $line
                    }
                }
            }
            
            Set-Content -Path $script:LogPath -Value $filteredContent
            Write-LogEntry -Level "INFO" -Message "Old log entries cleared (kept last $DaysToKeep days)"
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to clear old logs: $($_.Exception.Message)"
    }
}

# Create structured log entry
function Create-StructuredLogEntry {
    param(
        [DateTime]$Timestamp,
        [string]$Level,
        [string]$Message,
        [string]$Category,
        [string]$User,
        [hashtable]$Properties,
        [string]$RequestId,
        [string]$CorrelationId,
        [System.Exception]$Exception,
        [switch]$IncludeStackTrace
    )
    
    $logEntry = @{
        timestamp = $Timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        level = $Level
        message = $Message
        category = $Category
        user = $User
        machine = $env:COMPUTERNAME
        process_id = $PID
        thread_id = [System.Threading.Thread]::CurrentThread.ManagedThreadId
    }
    
    if ($RequestId) { $logEntry.request_id = $RequestId }
    if ($CorrelationId) { $logEntry.correlation_id = $CorrelationId }
    
    # Add custom properties
    if ($Properties -and $Properties.Count -gt 0) {
        $logEntry.properties = $Properties
    }
    
    # Add exception details
    if ($Exception) {
        $logEntry.exception = @{
            type = $Exception.GetType().Name
            message = $Exception.Message
            source = $Exception.Source
        }
        
        if ($IncludeStackTrace -or $script:LogConfig.IncludeStackTrace) {
            $logEntry.exception.stack_trace = $Exception.StackTrace
        }
    }
    
    # Add environment information if enabled
    if ($script:LogConfig.IncludeEnvironment) {
        $logEntry.environment = @{
            os = [System.Environment]::OSVersion.ToString()
            powershell_version = $PSVersionTable.PSVersion.ToString()
            runtime = [System.Environment]::Version.ToString()
        }
    }
    
    return $logEntry
}

# Write log to file with rotation support
function Write-LogToFile {
    param(
        [object]$LogEntry,
        [string]$LogFile
    )
    
    try {
        # Ensure directory exists
        $logDir = Split-Path $LogFile -Parent
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        # Check if rotation is needed
        if (Test-LogRotationNeeded -LogFile $LogFile) {
            Invoke-LogRotation -LogFile $LogFile
        }
        
        # Format log entry
        $formattedEntry = Format-LogEntry -LogEntry $LogEntry
        
        # Write to file
        Add-Content -Path $LogFile -Value $formattedEntry -Encoding UTF8
        
    } catch {
        # Fallback to console if file write fails
        Write-Host "Log write failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Format log entry based on configuration
function Format-LogEntry {
    param([object]$LogEntry)
    
    switch ($script:LogConfig.LogFormat) {
        "JSON" {
            return $LogEntry | ConvertTo-Json -Compress -Depth 10
        }
        "CSV" {
            $values = @(
                $LogEntry.timestamp,
                $LogEntry.level,
                $LogEntry.category,
                $LogEntry.user,
                $LogEntry.message.Replace('"', '""')  # Escape quotes
            )
            return '"' + ($values -join '","') + '"'
        }
        "STRUCTURED" {
            return "timestamp=$($LogEntry.timestamp) level=$($LogEntry.level) category=$($LogEntry.category) user=$($LogEntry.user) message=`"$($LogEntry.message)`""
        }
        default {  # SIMPLE
            return "[$($LogEntry.timestamp)] [$($LogEntry.level)] [$($LogEntry.category)] [$($LogEntry.user)] $($LogEntry.message)"
        }
    }
}

# Add log entry to buffer for async processing
function Add-ToLogBuffer {
    param(
        [object]$LogEntry,
        [string]$LogFile
    )
    
    $bufferItem = @{
        LogEntry = $LogEntry
        LogFile = $LogFile
        BufferedAt = Get-Date
    }
    
    $script:LogBuffer.Enqueue($bufferItem)
    $script:LogMetrics.BufferSize = $script:LogBuffer.Count
    
    # Flush if buffer is full
    if ($script:LogBuffer.Count -ge $script:LogConfig.BufferSize) {
        Flush-LogBuffer
    }
}

# Flush log buffer to files
function Flush-LogBuffer {
    $flushedCount = 0
    $groupedLogs = @{}
    
    # Group logs by file for batch writing
    while ($script:LogBuffer.TryDequeue([ref]$bufferItem)) {
        $logFile = $bufferItem.LogFile
        if (-not $groupedLogs.ContainsKey($logFile)) {
            $groupedLogs[$logFile] = @()
        }
        $groupedLogs[$logFile] += $bufferItem.LogEntry
        $flushedCount++
    }
    
    # Write grouped logs to files
    foreach ($logFile in $groupedLogs.Keys) {
        try {
            $formattedEntries = $groupedLogs[$logFile] | ForEach-Object { Format-LogEntry -LogEntry $_ }
            
            # Ensure directory exists
            $logDir = Split-Path $logFile -Parent
            if (-not (Test-Path $logDir)) {
                New-Item -ItemType Directory -Path $logDir -Force | Out-Null
            }
            
            # Check rotation before writing
            if (Test-LogRotationNeeded -LogFile $logFile) {
                Invoke-LogRotation -LogFile $logFile
            }
            
            # Batch write to file
            Add-Content -Path $logFile -Value $formattedEntries -Encoding UTF8
            
        } catch {
            Write-Host "Batch log write failed for ${logFile}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    $script:LogMetrics.BufferSize = $script:LogBuffer.Count
    $script:LogMetrics.LastFlush = Get-Date
    
    if ($flushedCount -gt 0) {
        Write-Host "Flushed $flushedCount log entries to disk" -ForegroundColor Green
    }
}

# Test if log rotation is needed
function Test-LogRotationNeeded {
    param([string]$LogFile)
    
    if (-not (Test-Path $LogFile)) {
        return $false
    }
    
    $fileInfo = Get-Item $LogFile
    $fileSizeMB = $fileInfo.Length / 1MB
    
    return $fileSizeMB -gt $script:LogConfig.MaxFileSizeMB
}

# Perform log rotation
function Invoke-LogRotation {
    param([string]$LogFile)
    
    try {
        $fileInfo = Get-Item $LogFile -ErrorAction SilentlyContinue
        if (-not $fileInfo) { return }
        
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($LogFile)
        $extension = [System.IO.Path]::GetExtension($LogFile)
        $directory = [System.IO.Path]::GetDirectoryName($LogFile)
        
        # Rotate existing backup files
        for ($i = $script:LogConfig.MaxBackupFiles - 1; $i -gt 0; $i--) {
            $currentBackup = Join-Path $directory "$baseName.$i$extension"
            $nextBackup = Join-Path $directory "$baseName.$($i + 1)$extension"
            
            if (Test-Path $currentBackup) {
                if ($i -eq $script:LogConfig.MaxBackupFiles - 1) {
                    Remove-Item $currentBackup -Force
                } else {
                    Move-Item $currentBackup $nextBackup -Force
                }
            }
        }
        
        # Move current log to .1 backup
        $firstBackup = Join-Path $directory "$baseName.1$extension"
        Move-Item $LogFile $firstBackup -Force
        
        Write-Host "Log rotated: $LogFile -> $firstBackup" -ForegroundColor Yellow
        
    } catch {
        Write-Host "Log rotation failed for ${LogFile}: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Update API performance counters
function Update-ApiPerformanceCounters {
    param(
        [string]$Method,
        [string]$Endpoint,
        [double]$ResponseTime,
        [int]$StatusCode
    )
    
    $key = "$Method $Endpoint"
    
    if (-not $script:PerformanceCounters.APIRequests.ContainsKey($key)) {
        $script:PerformanceCounters.APIRequests[$key] = @{
            TotalRequests = 0
            TotalResponseTime = 0
            MinResponseTime = [double]::MaxValue
            MaxResponseTime = 0
            ErrorCount = 0
            LastAccess = Get-Date
        }
    }
    
    $counter = $script:PerformanceCounters.APIRequests[$key]
    $counter.TotalRequests++
    $counter.TotalResponseTime += $ResponseTime
    $counter.MinResponseTime = [Math]::Min($counter.MinResponseTime, $ResponseTime)
    $counter.MaxResponseTime = [Math]::Max($counter.MaxResponseTime, $ResponseTime)
    $counter.LastAccess = Get-Date
    
    if ($StatusCode -ge 400) {
        $counter.ErrorCount++
    }
}

# Sanitize request body to remove sensitive information
function Sanitize-RequestBody {
    param([object]$Body)
    
    try {
        if ($Body -is [string]) {
            $bodyObj = $Body | ConvertFrom-Json -ErrorAction SilentlyContinue
        } else {
            $bodyObj = $Body
        }
        
        if ($bodyObj) {
            # Remove sensitive fields
            $sensitiveFields = @('password', 'secret', 'token', 'key', 'credential', 'authorization')
            
            foreach ($field in $sensitiveFields) {
                if ($bodyObj.PSObject.Properties[$field]) {
                    $bodyObj.$field = "***REDACTED***"
                }
            }
            
            return $bodyObj | ConvertTo-Json -Compress
        }
        
        return $Body
        
    } catch {
        return "***SANITIZATION_FAILED***"
    }
}

# Write security log entry
function Write-SecurityLog {
    param(
        [ValidateSet("AUTHENTICATION_FAILURE", "AUTHORIZATION_FAILURE", "SUSPICIOUS_ACTIVITY", "PRIVILEGE_ESCALATION", "DATA_ACCESS_VIOLATION")]
        [string]$EventType,
        [string]$User,
        [string]$ClientIP,
        [string]$Endpoint = "",
        [string]$Details = "",
        [hashtable]$AdditionalData = @{}
    )
    
    $securityEvent = @{
        event_type = $EventType
        user = $User
        client_ip = $ClientIP
        endpoint = $Endpoint
        details = $Details
        severity = Get-SecurityEventSeverity -EventType $EventType
        additional_data = $AdditionalData
    }
    
    Write-LogEntry -Level "SECURITY" -Message "Security event: $EventType" -Category "SECURITY" -User $User -Properties $securityEvent
}

# Get security event severity
function Get-SecurityEventSeverity {
    param([string]$EventType)
    
    switch ($EventType) {
        "PRIVILEGE_ESCALATION" { return "CRITICAL" }
        "DATA_ACCESS_VIOLATION" { return "HIGH" }
        "AUTHENTICATION_FAILURE" { return "MEDIUM" }
        "AUTHORIZATION_FAILURE" { return "MEDIUM" }
        "SUSPICIOUS_ACTIVITY" { return "LOW" }
        default { return "MEDIUM" }
    }
}

# Send alert notification for critical events
function Send-AlertNotification {
    param(
        [string]$Level,
        [string]$Message,
        [string]$Category,
        [string]$User
    )
    
    try {
        # For now, just log the alert (can be extended to send emails, webhooks, etc.)
        $alertMessage = "ALERT: [$Level] [$Category] User: $User - $Message"
        Write-Host $alertMessage -ForegroundColor Red -BackgroundColor Yellow
        
        # Could add integrations here:
        # - Send-Email
        # - Send-SlackNotification
        # - Send-TeamsNotification
        # - Write to Windows Event Log
        
    } catch {
        Write-Host "Failed to send alert notification: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Get performance metrics
function Get-PerformanceMetrics {
    return @{
        LogMetrics = $script:LogMetrics
        APIPerformance = $script:PerformanceCounters.APIRequests
        BufferStatus = @{
            CurrentSize = $script:LogBuffer.Count
            MaxSize = $script:LogConfig.BufferSize
            LastFlush = $script:LogMetrics.LastFlush
        }
        LogConfig = $script:LogConfig
    }
}

# Initialize log buffer flush timer
if ($script:LogConfig.EnableAsyncLogging) {
    Register-EngineEvent -SourceIdentifier "LogBufferFlush" -Forward
    $null = New-Object System.Timers.Timer | ForEach-Object {
        $_.Interval = $script:LogConfig.FlushIntervalSeconds * 1000
        $_.AutoReset = $true
        $_.Add_Elapsed({ Flush-LogBuffer })
        $_.Start()
        $script:LogFlushTimer = $_
    }
}

# Clean up on module removal
$MyInvocation.MyCommand.ScriptBlock.Module.OnRemove = {
    if ($script:LogFlushTimer) {
        $script:LogFlushTimer.Stop()
        $script:LogFlushTimer.Dispose()
    }
    Flush-LogBuffer
}

Export-ModuleMember -Function Write-LogEntry, Write-ApiLog, Save-AuditLog, Get-LogEntries, Clear-OldLogs, Write-SecurityLog, Get-PerformanceMetrics, Flush-LogBuffer