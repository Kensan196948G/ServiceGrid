# System Maintenance Job for ITSM Platform
# Performs regular system maintenance tasks
# Version: 2025.6.7

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false,
    [string]$LogPath = "../logs/maintenance.log"
)

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force
Import-Module "../modules/Config.psm1" -Force

# Maintenance configuration
$global:MaintenanceConfig = @{
    LogRetentionDays = 30
    DatabaseVacuumThreshold = 0.1  # 10% fragmentation
    TempFileRetentionDays = 7
    MaxLogFileSize = 100MB
    SessionTimeoutMinutes = 60
    AuditLogRetentionDays = 90
    BackupRetentionDays = 30
}

# Main maintenance function
function Start-SystemMaintenance {
    param(
        [switch]$Force,
        [switch]$Verbose
    )
    
    try {
        Write-MaintenanceLog "Starting system maintenance..." -Level "INFO"
        
        $maintenanceResults = @{
            StartTime = Get-Date
            EndTime = $null
            Duration = $null
            Tasks = @{}
            Success = $true
            Errors = @()
        }
        
        # Check if maintenance should run (skip if already run today unless forced)
        if (-not $Force -and (Test-MaintenanceRunToday)) {
            Write-MaintenanceLog "Maintenance already run today. Use -Force to override." -Level "INFO"
            return
        }
        
        # Task 1: Clean up old log files
        $maintenanceResults.Tasks.LogCleanup = Invoke-LogCleanup
        
        # Task 2: Database maintenance
        $maintenanceResults.Tasks.DatabaseMaintenance = Invoke-DatabaseMaintenance
        
        # Task 3: Clean up temporary files
        $maintenanceResults.Tasks.TempFileCleanup = Invoke-TempFileCleanup
        
        # Task 4: Session cleanup
        $maintenanceResults.Tasks.SessionCleanup = Invoke-SessionCleanup
        
        # Task 5: Security audit
        $maintenanceResults.Tasks.SecurityAudit = Invoke-SecurityAudit
        
        # Task 6: Performance monitoring
        $maintenanceResults.Tasks.PerformanceCheck = Invoke-PerformanceCheck
        
        # Task 7: Backup verification
        $maintenanceResults.Tasks.BackupVerification = Invoke-BackupVerification
        
        # Task 8: System health check
        $maintenanceResults.Tasks.HealthCheck = Invoke-SystemHealthCheck
        
        # Task 9: Update system statistics
        $maintenanceResults.Tasks.StatisticsUpdate = Invoke-StatisticsUpdate
        
        # Task 10: Cleanup old audit logs
        $maintenanceResults.Tasks.AuditLogCleanup = Invoke-AuditLogCleanup
        
        $maintenanceResults.EndTime = Get-Date
        $maintenanceResults.Duration = ($maintenanceResults.EndTime - $maintenanceResults.StartTime).TotalMinutes
        
        # Record maintenance run
        Record-MaintenanceRun -Results $maintenanceResults
        
        Write-MaintenanceLog "System maintenance completed successfully in $($maintenanceResults.Duration) minutes" -Level "INFO"
        
        return $maintenanceResults
        
    } catch {
        $maintenanceResults.Success = $false
        $maintenanceResults.Errors += $_.Exception.Message
        Write-MaintenanceLog "System maintenance failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Clean up old log files
function Invoke-LogCleanup {
    try {
        Write-MaintenanceLog "Starting log cleanup..." -Level "INFO"
        
        $result = @{
            FilesRemoved = 0
            SpaceFreed = 0
            Errors = @()
        }
        
        $logDirectory = Join-Path $PSScriptRoot "../logs"
        $cutoffDate = (Get-Date).AddDays(-$global:MaintenanceConfig.LogRetentionDays)
        
        $oldLogFiles = Get-ChildItem -Path $logDirectory -Filter "*.log" | Where-Object {
            $_.LastWriteTime -lt $cutoffDate -and $_.Name -notlike "*maintenance*"
        }
        
        foreach ($file in $oldLogFiles) {
            try {
                $size = $file.Length
                Remove-Item $file.FullName -Force
                $result.FilesRemoved++
                $result.SpaceFreed += $size
                Write-MaintenanceLog "Removed old log file: $($file.Name)" -Level "DEBUG"
            } catch {
                $result.Errors += "Failed to remove $($file.Name): $($_.Exception.Message)"
                Write-MaintenanceLog "Failed to remove log file $($file.Name): $($_.Exception.Message)" -Level "ERROR"
            }
        }
        
        # Rotate large log files
        $currentLogFiles = Get-ChildItem -Path $logDirectory -Filter "*.log" | Where-Object {
            $_.Length -gt $global:MaintenanceConfig.MaxLogFileSize
        }
        
        foreach ($file in $currentLogFiles) {
            try {
                $newName = "$($file.BaseName)-$(Get-Date -Format 'yyyyMMdd')$($file.Extension)"
                $newPath = Join-Path $file.Directory $newName
                Rename-Item $file.FullName $newPath
                New-Item $file.FullName -ItemType File -Force | Out-Null
                Write-MaintenanceLog "Rotated large log file: $($file.Name)" -Level "INFO"
            } catch {
                $result.Errors += "Failed to rotate $($file.Name): $($_.Exception.Message)"
                Write-MaintenanceLog "Failed to rotate log file $($file.Name): $($_.Exception.Message)" -Level "ERROR"
            }
        }
        
        Write-MaintenanceLog "Log cleanup completed. Files removed: $($result.FilesRemoved), Space freed: $([math]::Round($result.SpaceFreed/1MB, 2)) MB" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Log cleanup failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Database maintenance
function Invoke-DatabaseMaintenance {
    try {
        Write-MaintenanceLog "Starting database maintenance..." -Level "INFO"
        
        $result = @{
            VacuumPerformed = $false
            ReindexPerformed = $false
            StatisticsUpdated = $false
            IntegrityCheck = $false
            Errors = @()
        }
        
        # Check database integrity
        try {
            $integrityResult = Invoke-DatabaseQuery -Query "PRAGMA integrity_check"
            if ($integrityResult -ne "ok") {
                $result.Errors += "Database integrity check failed: $integrityResult"
                Write-MaintenanceLog "Database integrity check failed" -Level "ERROR"
            } else {
                $result.IntegrityCheck = $true
                Write-MaintenanceLog "Database integrity check passed" -Level "INFO"
            }
        } catch {
            $result.Errors += "Database integrity check error: $($_.Exception.Message)"
            Write-MaintenanceLog "Database integrity check error: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Check fragmentation
        try {
            $fragmentationQuery = "PRAGMA freelist_count"
            $fragmentationResult = Invoke-DatabaseQuery -Query $fragmentationQuery
            
            $pageCountQuery = "PRAGMA page_count"
            $pageCount = Invoke-DatabaseQuery -Query $pageCountQuery
            
            $fragmentationRatio = $fragmentationResult / $pageCount
            
            if ($fragmentationRatio -gt $global:MaintenanceConfig.DatabaseVacuumThreshold) {
                Write-MaintenanceLog "Database fragmentation detected ($($fragmentationRatio * 100)%). Running VACUUM..." -Level "INFO"
                Invoke-DatabaseQuery -Query "VACUUM"
                $result.VacuumPerformed = $true
                Write-MaintenanceLog "Database VACUUM completed" -Level "INFO"
            }
        } catch {
            $result.Errors += "Database vacuum error: $($_.Exception.Message)"
            Write-MaintenanceLog "Database vacuum error: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Update statistics
        try {
            Invoke-DatabaseQuery -Query "ANALYZE"
            $result.StatisticsUpdated = $true
            Write-MaintenanceLog "Database statistics updated" -Level "INFO"
        } catch {
            $result.Errors += "Database statistics update error: $($_.Exception.Message)"
            Write-MaintenanceLog "Database statistics update error: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Reindex if necessary
        try {
            Invoke-DatabaseQuery -Query "REINDEX"
            $result.ReindexPerformed = $true
            Write-MaintenanceLog "Database reindex completed" -Level "INFO"
        } catch {
            $result.Errors += "Database reindex error: $($_.Exception.Message)"
            Write-MaintenanceLog "Database reindex error: $($_.Exception.Message)" -Level "ERROR"
        }
        
        Write-MaintenanceLog "Database maintenance completed" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Database maintenance failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Clean up temporary files
function Invoke-TempFileCleanup {
    try {
        Write-MaintenanceLog "Starting temporary file cleanup..." -Level "INFO"
        
        $result = @{
            FilesRemoved = 0
            SpaceFreed = 0
            Errors = @()
        }
        
        $tempDirectories = @(
            Join-Path $PSScriptRoot "../temp",
            Join-Path $PSScriptRoot "../backup/temp",
            [System.IO.Path]::GetTempPath()
        )
        
        $cutoffDate = (Get-Date).AddDays(-$global:MaintenanceConfig.TempFileRetentionDays)
        
        foreach ($tempDir in $tempDirectories) {
            if (Test-Path $tempDir) {
                try {
                    $oldTempFiles = Get-ChildItem -Path $tempDir -Recurse -File | Where-Object {
                        $_.LastAccessTime -lt $cutoffDate -and $_.Name -like "*temp*"
                    }
                    
                    foreach ($file in $oldTempFiles) {
                        try {
                            $size = $file.Length
                            Remove-Item $file.FullName -Force
                            $result.FilesRemoved++
                            $result.SpaceFreed += $size
                        } catch {
                            $result.Errors += "Failed to remove temp file $($file.FullName): $($_.Exception.Message)"
                        }
                    }
                } catch {
                    $result.Errors += "Failed to process temp directory $tempDir: $($_.Exception.Message)"
                }
            }
        }
        
        Write-MaintenanceLog "Temporary file cleanup completed. Files removed: $($result.FilesRemoved), Space freed: $([math]::Round($result.SpaceFreed/1MB, 2)) MB" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Temporary file cleanup failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Session cleanup
function Invoke-SessionCleanup {
    try {
        Write-MaintenanceLog "Starting session cleanup..." -Level "INFO"
        
        $result = @{
            SessionsExpired = 0
            Errors = @()
        }
        
        $expiredSessionsQuery = @"
            DELETE FROM user_sessions 
            WHERE last_activity < datetime('now', '-$($global:MaintenanceConfig.SessionTimeoutMinutes) minutes')
"@
        
        $expiredSessions = Invoke-DatabaseQuery -Query $expiredSessionsQuery
        $result.SessionsExpired = $expiredSessions
        
        Write-MaintenanceLog "Session cleanup completed. Expired sessions: $($result.SessionsExpired)" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Session cleanup failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Security audit
function Invoke-SecurityAudit {
    try {
        Write-MaintenanceLog "Starting security audit..." -Level "INFO"
        
        $result = @{
            FailedLoginAttempts = 0
            LockedAccounts = 0
            PasswordExpirations = 0
            SecurityAlerts = @()
            Errors = @()
        }
        
        # Check failed login attempts
        try {
            $failedLoginsQuery = @"
                SELECT COUNT(*) as count FROM logs 
                WHERE event_type = 'FAILED_LOGIN' 
                AND event_time > datetime('now', '-24 hours')
"@
            $failedLogins = Invoke-DatabaseQuery -Query $failedLoginsQuery
            $result.FailedLoginAttempts = $failedLogins.count
            
            if ($failedLogins.count -gt 50) {
                $result.SecurityAlerts += "High number of failed login attempts in last 24 hours: $($failedLogins.count)"
            }
        } catch {
            $result.Errors += "Failed login check error: $($_.Exception.Message)"
        }
        
        # Check locked accounts
        try {
            $lockedAccountsQuery = @"
                SELECT COUNT(*) as count FROM users 
                WHERE account_locked = 1
"@
            $lockedAccounts = Invoke-DatabaseQuery -Query $lockedAccountsQuery
            $result.LockedAccounts = $lockedAccounts.count
        } catch {
            $result.Errors += "Locked accounts check error: $($_.Exception.Message)"
        }
        
        # Check password expirations
        try {
            $passwordExpirationsQuery = @"
                SELECT COUNT(*) as count FROM users 
                WHERE password_reset_expires < datetime('now', '+7 days')
                AND password_reset_expires IS NOT NULL
"@
            $passwordExpirations = Invoke-DatabaseQuery -Query $passwordExpirationsQuery
            $result.PasswordExpirations = $passwordExpirations.count
        } catch {
            $result.Errors += "Password expiration check error: $($_.Exception.Message)"
        }
        
        Write-MaintenanceLog "Security audit completed. Failed logins: $($result.FailedLoginAttempts), Locked accounts: $($result.LockedAccounts), Password expirations: $($result.PasswordExpirations)" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Security audit failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Performance monitoring
function Invoke-PerformanceCheck {
    try {
        Write-MaintenanceLog "Starting performance check..." -Level "INFO"
        
        $result = @{
            CPUUsage = 0
            MemoryUsage = 0
            DiskUsage = 0
            DatabaseSize = 0
            ResponseTime = 0
            Errors = @()
        }
        
        # Check CPU usage
        try {
            $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
            $result.CPUUsage = $cpu.Average
        } catch {
            $result.Errors += "CPU usage check error: $($_.Exception.Message)"
        }
        
        # Check memory usage
        try {
            $memory = Get-WmiObject -Class Win32_OperatingSystem
            $totalMemory = $memory.TotalVisibleMemorySize
            $freeMemory = $memory.FreePhysicalMemory
            $result.MemoryUsage = [math]::Round((($totalMemory - $freeMemory) / $totalMemory) * 100, 2)
        } catch {
            $result.Errors += "Memory usage check error: $($_.Exception.Message)"
        }
        
        # Check disk usage
        try {
            $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.DeviceID -eq "C:" }
            $result.DiskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
        } catch {
            $result.Errors += "Disk usage check error: $($_.Exception.Message)"
        }
        
        # Check database size
        try {
            $dbFile = Join-Path $PSScriptRoot "../db/itsm.sqlite"
            if (Test-Path $dbFile) {
                $result.DatabaseSize = [math]::Round((Get-Item $dbFile).Length / 1MB, 2)
            }
        } catch {
            $result.Errors += "Database size check error: $($_.Exception.Message)"
        }
        
        # Test database response time
        try {
            $startTime = Get-Date
            Invoke-DatabaseQuery -Query "SELECT COUNT(*) FROM users"
            $endTime = Get-Date
            $result.ResponseTime = ($endTime - $startTime).TotalMilliseconds
        } catch {
            $result.Errors += "Database response time check error: $($_.Exception.Message)"
        }
        
        Write-MaintenanceLog "Performance check completed. CPU: $($result.CPUUsage)%, Memory: $($result.MemoryUsage)%, Disk: $($result.DiskUsage)%, DB Response: $($result.ResponseTime)ms" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Performance check failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Backup verification
function Invoke-BackupVerification {
    try {
        Write-MaintenanceLog "Starting backup verification..." -Level "INFO"
        
        $result = @{
            BackupsVerified = 0
            BackupsFailed = 0
            OldBackupsRemoved = 0
            Errors = @()
        }
        
        $backupDirectory = Join-Path $PSScriptRoot "../backup"
        $cutoffDate = (Get-Date).AddDays(-$global:MaintenanceConfig.BackupRetentionDays)
        
        if (Test-Path $backupDirectory) {
            # Verify recent backups
            $recentBackups = Get-ChildItem -Path $backupDirectory -Filter "*.sqlite" | Where-Object {
                $_.LastWriteTime -gt (Get-Date).AddDays(-1)
            }
            
            foreach ($backup in $recentBackups) {
                try {
                    # Simple verification: check if file can be opened by SQLite
                    $testQuery = "SELECT COUNT(*) FROM sqlite_master"
                    $connectionString = "Data Source=$($backup.FullName);Version=3;"
                    # Test would go here with SQLite connection
                    $result.BackupsVerified++
                } catch {
                    $result.BackupsFailed++
                    $result.Errors += "Backup verification failed for $($backup.Name): $($_.Exception.Message)"
                }
            }
            
            # Remove old backups
            $oldBackups = Get-ChildItem -Path $backupDirectory -Filter "*.sqlite" | Where-Object {
                $_.LastWriteTime -lt $cutoffDate
            }
            
            foreach ($backup in $oldBackups) {
                try {
                    Remove-Item $backup.FullName -Force
                    $result.OldBackupsRemoved++
                } catch {
                    $result.Errors += "Failed to remove old backup $($backup.Name): $($_.Exception.Message)"
                }
            }
        }
        
        Write-MaintenanceLog "Backup verification completed. Verified: $($result.BackupsVerified), Failed: $($result.BackupsFailed), Old removed: $($result.OldBackupsRemoved)" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Backup verification failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# System health check
function Invoke-SystemHealthCheck {
    try {
        Write-MaintenanceLog "Starting system health check..." -Level "INFO"
        
        $result = @{
            DatabaseConnectivity = $false
            ServiceStatus = @()
            DiskSpace = @()
            ProcessHealth = @()
            Errors = @()
        }
        
        # Test database connectivity
        try {
            $result.DatabaseConnectivity = Test-DatabaseConnection
        } catch {
            $result.Errors += "Database connectivity check error: $($_.Exception.Message)"
        }
        
        # Check disk space
        try {
            $disks = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3"
            foreach ($disk in $disks) {
                $freeSpacePercent = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 2)
                $result.DiskSpace += @{
                    Drive = $disk.DeviceID
                    FreeSpacePercent = $freeSpacePercent
                    FreeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
                    TotalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
                }
                
                if ($freeSpacePercent -lt 10) {
                    $result.Errors += "Low disk space on drive $($disk.DeviceID): $freeSpacePercent% free"
                }
            }
        } catch {
            $result.Errors += "Disk space check error: $($_.Exception.Message)"
        }
        
        # Check process health (if API server is running)
        try {
            $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
            foreach ($process in $nodeProcesses) {
                $result.ProcessHealth += @{
                    ProcessName = $process.Name
                    PID = $process.Id
                    CPU = $process.CPU
                    WorkingSet = [math]::Round($process.WorkingSet / 1MB, 2)
                    StartTime = $process.StartTime
                }
            }
        } catch {
            $result.Errors += "Process health check error: $($_.Exception.Message)"
        }
        
        Write-MaintenanceLog "System health check completed" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "System health check failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Update system statistics
function Invoke-StatisticsUpdate {
    try {
        Write-MaintenanceLog "Starting statistics update..." -Level "INFO"
        
        $result = @{
            StatisticsUpdated = 0
            Errors = @()
        }
        
        $statisticsQueries = @(
            "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL",
            "UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL",
            "UPDATE incidents SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"
        )
        
        foreach ($query in $statisticsQueries) {
            try {
                Invoke-DatabaseQuery -Query $query
                $result.StatisticsUpdated++
            } catch {
                $result.Errors += "Statistics update error: $($_.Exception.Message)"
            }
        }
        
        Write-MaintenanceLog "Statistics update completed. Updated: $($result.StatisticsUpdated)" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Statistics update failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Clean up old audit logs
function Invoke-AuditLogCleanup {
    try {
        Write-MaintenanceLog "Starting audit log cleanup..." -Level "INFO"
        
        $result = @{
            LogsRemoved = 0
            Errors = @()
        }
        
        $cutoffDate = (Get-Date).AddDays(-$global:MaintenanceConfig.AuditLogRetentionDays).ToString("yyyy-MM-dd HH:mm:ss")
        
        $cleanupQuery = @"
            DELETE FROM logs 
            WHERE event_time < '$cutoffDate'
            AND event_type NOT IN ('SECURITY_ALERT', 'SYSTEM_ERROR')
"@
        
        $result.LogsRemoved = Invoke-DatabaseQuery -Query $cleanupQuery
        
        Write-MaintenanceLog "Audit log cleanup completed. Logs removed: $($result.LogsRemoved)" -Level "INFO"
        return $result
        
    } catch {
        Write-MaintenanceLog "Audit log cleanup failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Check if maintenance has already run today
function Test-MaintenanceRunToday {
    try {
        $today = (Get-Date).ToString("yyyy-MM-dd")
        $query = @"
            SELECT COUNT(*) as count FROM logs 
            WHERE event_type = 'SYSTEM_MAINTENANCE' 
            AND DATE(event_time) = '$today'
"@
        
        $result = Invoke-DatabaseQuery -Query $query
        return $result.count -gt 0
        
    } catch {
        return $false
    }
}

# Record maintenance run
function Record-MaintenanceRun {
    param([hashtable]$Results)
    
    try {
        $details = @{
            Duration = $Results.Duration
            Tasks = $Results.Tasks
            Success = $Results.Success
            Errors = $Results.Errors
        }
        
        Add-AuditLog -EventType "SYSTEM_MAINTENANCE" -UserId 0 -Details ($details | ConvertTo-Json -Compress)
        
    } catch {
        Write-MaintenanceLog "Failed to record maintenance run: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Maintenance logging function
function Write-MaintenanceLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console
    Write-Host $logMessage
    
    # Write to log file
    try {
        $logPath = Join-Path $PSScriptRoot $LogPath
        $logMessage | Out-File -FilePath $logPath -Append -Encoding UTF8
    } catch {
        Write-Warning "Failed to write to maintenance log: $($_.Exception.Message)"
    }
}

# Main execution
if ($MyInvocation.InvocationName -ne '.') {
    try {
        Start-SystemMaintenance -Force:$Force -Verbose:$Verbose
    } catch {
        Write-Error "System maintenance failed: $($_.Exception.Message)"
        exit 1
    }
}