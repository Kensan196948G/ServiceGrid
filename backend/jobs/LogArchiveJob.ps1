# LogArchiveJob.ps1 - ログアーカイブ・管理ジョブ

Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Start-LogArchiveJob {
    param(
        [int]$ArchiveDays = 7,
        [int]$RetentionDays = 30,
        [string]$ArchivePath = "logs/archive"
    )
    
    try {
        Write-LogEntry -Level "INFO" -Message "Starting log archive job"
        
        $logPath = "logs/backend.log"
        $apiLogPath = "logs/api_access.log"
        $archiveDir = $ArchivePath
        
        if (-not (Test-Path $archiveDir)) {
            New-Item -ItemType Directory -Path $archiveDir -Force
            Write-LogEntry -Level "INFO" -Message "Created archive directory: $archiveDir"
        }
        
        $cutoffDate = (Get-Date).AddDays(-$ArchiveDays)
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        
        $archivedFiles = @()
        
        if (Test-Path $logPath) {
            $archived = Archive-LogFile -LogFilePath $logPath -CutoffDate $cutoffDate -ArchiveDirectory $archiveDir -Timestamp $timestamp
            if ($archived.Success) {
                $archivedFiles += $archived
            }
        }
        
        if (Test-Path $apiLogPath) {
            $archived = Archive-LogFile -LogFilePath $apiLogPath -CutoffDate $cutoffDate -ArchiveDirectory $archiveDir -Timestamp $timestamp
            if ($archived.Success) {
                $archivedFiles += $archived
            }
        }
        
        Remove-OldArchives -ArchiveDirectory $archiveDir -RetentionDays $RetentionDays
        
        Clear-OldLogs -DaysToKeep $ArchiveDays
        
        Write-LogEntry -Level "INFO" -Message "Log archive job completed. Files archived: $($archivedFiles.Count)"
        
        return @{
            Success = $true
            ArchivedFiles = $archivedFiles
            Timestamp = $timestamp
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Log archive job failed: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Archive-LogFile {
    param(
        [string]$LogFilePath,
        [DateTime]$CutoffDate,
        [string]$ArchiveDirectory,
        [string]$Timestamp
    )
    
    try {
        if (-not (Test-Path $LogFilePath)) {
            return @{
                Success = $false
                Error = "Log file not found: $LogFilePath"
            }
        }
        
        $logContent = Get-Content $LogFilePath
        $archiveEntries = @()
        $currentEntries = @()
        
        foreach ($line in $logContent) {
            if ($line -match '^\[(.+?)\]') {
                try {
                    $logDate = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd HH:mm:ss", $null)
                    if ($logDate -lt $CutoffDate) {
                        $archiveEntries += $line
                    } else {
                        $currentEntries += $line
                    }
                }
                catch {
                    $currentEntries += $line
                }
            } else {
                if ($archiveEntries.Count -gt $currentEntries.Count) {
                    $archiveEntries += $line
                } else {
                    $currentEntries += $line
                }
            }
        }
        
        if ($archiveEntries.Count -gt 0) {
            $logFileName = Split-Path $LogFilePath -Leaf
            $archiveFileName = "${logFileName}_archive_${Timestamp}.log"
            $archiveFilePath = Join-Path $ArchiveDirectory $archiveFileName
            
            Set-Content -Path $archiveFilePath -Value $archiveEntries
            
            Set-Content -Path $LogFilePath -Value $currentEntries
            
            Write-LogEntry -Level "INFO" -Message "Archived $($archiveEntries.Count) log entries to: $archiveFileName"
            
            return @{
                Success = $true
                ArchiveFile = $archiveFilePath
                ArchivedEntries = $archiveEntries.Count
                RemainingEntries = $currentEntries.Count
            }
        } else {
            Write-LogEntry -Level "INFO" -Message "No log entries to archive for: $LogFilePath"
            return @{
                Success = $true
                ArchiveFile = $null
                ArchivedEntries = 0
                RemainingEntries = $logContent.Count
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to archive log file $LogFilePath`: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Remove-OldArchives {
    param(
        [string]$ArchiveDirectory,
        [int]$RetentionDays
    )
    
    try {
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $archiveFiles = Get-ChildItem -Path $ArchiveDirectory -Filter "*_archive_*.log" | 
                        Where-Object { $_.CreationTime -lt $cutoffDate }
        
        $deletedCount = 0
        foreach ($file in $archiveFiles) {
            try {
                Remove-Item -Path $file.FullName -Force
                $deletedCount++
                Write-LogEntry -Level "INFO" -Message "Deleted old archive: $($file.Name)"
            }
            catch {
                Write-LogEntry -Level "WARNING" -Message "Failed to delete archive file: $($file.Name) - $($_.Exception.Message)"
            }
        }
        
        if ($deletedCount -gt 0) {
            Write-LogEntry -Level "INFO" -Message "Archive cleanup completed: $deletedCount old archive files removed"
        }
        
        return $deletedCount
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Archive cleanup failed: $($_.Exception.Message)"
        return 0
    }
}

function Get-LogStatistics {
    param(
        [string]$LogDirectory = "logs",
        [int]$Days = 30
    )
    
    try {
        $fromDate = (Get-Date).AddDays(-$Days)
        $logFiles = @("backend.log", "api_access.log")
        
        $statistics = @{
            Period = @{
                From = $fromDate
                To = Get-Date
                Days = $Days
            }
            Files = @()
            Summary = @{
                TotalEntries = 0
                ErrorCount = 0
                WarningCount = 0
                InfoCount = 0
            }
        }
        
        foreach ($logFile in $logFiles) {
            $logPath = Join-Path $LogDirectory $logFile
            
            if (Test-Path $logPath) {
                $fileStats = Get-LogFileStatistics -LogFilePath $logPath -FromDate $fromDate
                $statistics.Files += $fileStats
                
                $statistics.Summary.TotalEntries += $fileStats.TotalEntries
                $statistics.Summary.ErrorCount += $fileStats.ErrorCount
                $statistics.Summary.WarningCount += $fileStats.WarningCount
                $statistics.Summary.InfoCount += $fileStats.InfoCount
            }
        }
        
        $archiveDir = "logs/archive"
        if (Test-Path $archiveDir) {
            $archiveFiles = Get-ChildItem -Path $archiveDir -Filter "*_archive_*.log"
            $statistics.ArchiveFiles = $archiveFiles.Count
            $statistics.ArchiveSize = ($archiveFiles | Measure-Object Length -Sum).Sum
        }
        
        return $statistics
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get log statistics: $($_.Exception.Message)"
        return $null
    }
}

function Get-LogFileStatistics {
    param(
        [string]$LogFilePath,
        [DateTime]$FromDate
    )
    
    try {
        $logContent = Get-Content $LogFilePath
        $stats = @{
            FileName = Split-Path $LogFilePath -Leaf
            FileSize = (Get-Item $LogFilePath).Length
            TotalEntries = 0
            ErrorCount = 0
            WarningCount = 0
            InfoCount = 0
            OtherCount = 0
            DateRange = @{
                From = $null
                To = $null
            }
        }
        
        $firstDate = $null
        $lastDate = $null
        
        foreach ($line in $logContent) {
            if ($line -match '^\[(.+?)\] \[(.+?)\]') {
                try {
                    $logDate = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd HH:mm:ss", $null)
                    $logLevel = $matches[2]
                    
                    if ($logDate -ge $FromDate) {
                        $stats.TotalEntries++
                        
                        if ($firstDate -eq $null -or $logDate -lt $firstDate) {
                            $firstDate = $logDate
                        }
                        if ($lastDate -eq $null -or $logDate -gt $lastDate) {
                            $lastDate = $logDate
                        }
                        
                        switch ($logLevel) {
                            "ERROR" { $stats.ErrorCount++ }
                            "WARNING" { $stats.WarningCount++ }
                            "INFO" { $stats.InfoCount++ }
                            default { $stats.OtherCount++ }
                        }
                    }
                }
                catch {
                    # 日付解析失敗時はスキップ
                }
            }
        }
        
        $stats.DateRange.From = $firstDate
        $stats.DateRange.To = $lastDate
        
        return $stats
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get statistics for $LogFilePath`: $($_.Exception.Message)"
        return $null
    }
}

function Compress-Archives {
    param(
        [string]$ArchiveDirectory = "logs/archive",
        [int]$CompressDays = 30
    )
    
    try {
        if (-not (Test-Path $ArchiveDirectory)) {
            return @{
                Success = $true
                CompressedFiles = 0
                Message = "Archive directory not found"
            }
        }
        
        $cutoffDate = (Get-Date).AddDays(-$CompressDays)
        $archiveFiles = Get-ChildItem -Path $ArchiveDirectory -Filter "*_archive_*.log" | 
                        Where-Object { $_.CreationTime -lt $cutoffDate -and $_.Extension -eq ".log" }
        
        $compressedCount = 0
        
        foreach ($file in $archiveFiles) {
            try {
                $zipPath = $file.FullName -replace "\.log$", ".zip"
                
                if (-not (Test-Path $zipPath)) {
                    Compress-Archive -Path $file.FullName -DestinationPath $zipPath -Force
                    
                    if (Test-Path $zipPath) {
                        Remove-Item -Path $file.FullName -Force
                        $compressedCount++
                        Write-LogEntry -Level "INFO" -Message "Compressed archive: $($file.Name)"
                    }
                }
            }
            catch {
                Write-LogEntry -Level "WARNING" -Message "Failed to compress archive: $($file.Name) - $($_.Exception.Message)"
            }
        }
        
        Write-LogEntry -Level "INFO" -Message "Archive compression completed: $compressedCount files compressed"
        
        return @{
            Success = $true
            CompressedFiles = $compressedCount
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Archive compression failed: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# スケジュール実行用のメイン関数
function Invoke-ScheduledLogArchive {
    param()
    
    try {
        Write-LogEntry -Level "INFO" -Message "Scheduled log archive job started"
        
        $result = Start-LogArchiveJob
        
        if ($result.Success) {
            Write-LogEntry -Level "INFO" -Message "Scheduled log archive completed successfully"
            
            # 30日以上経過したアーカイブを圧縮
            Compress-Archives -CompressDays 30
        } else {
            Write-LogEntry -Level "ERROR" -Message "Scheduled log archive failed: $($result.Error)"
        }
        
        return $result
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Scheduled log archive job error: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Start-LogArchiveJob, Archive-LogFile, Remove-OldArchives, Get-LogStatistics, Get-LogFileStatistics, Compress-Archives, Invoke-ScheduledLogArchive