# BackupJob.ps1 - データベース自動バックアップジョブ

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Start-BackupJob {
    param(
        [string]$BackupPath = "",
        [int]$RetentionDays = 30
    )
    
    try {
        Write-LogEntry -Level "INFO" -Message "Starting database backup job"
        
        $dbPath = Get-DatabasePath
        $backupDir = if ($BackupPath) { $BackupPath } else { Get-ConfigValue "Database.BackupPath" }
        $retentionDays = if ($RetentionDays -gt 0) { $RetentionDays } else { Get-ConfigValue "Database.BackupRetentionDays" }
        
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force
            Write-LogEntry -Level "INFO" -Message "Created backup directory: $backupDir"
        }
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFileName = "itsm_backup_$timestamp.sqlite"
        $backupFilePath = Join-Path $backupDir $backupFileName
        
        if (Test-Path $dbPath) {
            Copy-Item -Path $dbPath -Destination $backupFilePath -Force
            
            if (Test-Path $backupFilePath) {
                $fileSize = (Get-Item $backupFilePath).Length
                Write-LogEntry -Level "INFO" -Message "Database backup completed: $backupFileName (Size: $fileSize bytes)"
                
                Remove-OldBackups -BackupDirectory $backupDir -RetentionDays $retentionDays
                
                return @{
                    Success = $true
                    BackupFile = $backupFilePath
                    FileSize = $fileSize
                    Timestamp = $timestamp
                }
            } else {
                Write-LogEntry -Level "ERROR" -Message "Backup file was not created successfully"
                return @{
                    Success = $false
                    Error = "Backup file creation failed"
                }
            }
        } else {
            Write-LogEntry -Level "ERROR" -Message "Source database file not found: $dbPath"
            return @{
                Success = $false
                Error = "Source database not found"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Backup job failed: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Remove-OldBackups {
    param(
        [string]$BackupDirectory,
        [int]$RetentionDays
    )
    
    try {
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $backupFiles = Get-ChildItem -Path $BackupDirectory -Filter "itsm_backup_*.sqlite" | 
                       Where-Object { $_.CreationTime -lt $cutoffDate }
        
        $deletedCount = 0
        foreach ($file in $backupFiles) {
            try {
                Remove-Item -Path $file.FullName -Force
                $deletedCount++
                Write-LogEntry -Level "INFO" -Message "Deleted old backup: $($file.Name)"
            }
            catch {
                Write-LogEntry -Level "WARNING" -Message "Failed to delete backup file: $($file.Name) - $($_.Exception.Message)"
            }
        }
        
        if ($deletedCount -gt 0) {
            Write-LogEntry -Level "INFO" -Message "Cleanup completed: $deletedCount old backup files removed"
        }
        
        return $deletedCount
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Backup cleanup failed: $($_.Exception.Message)"
        return 0
    }
}

function Test-BackupIntegrity {
    param(
        [string]$BackupFilePath
    )
    
    try {
        if (-not (Test-Path $BackupFilePath)) {
            return @{
                Valid = $false
                Error = "Backup file not found"
            }
        }
        
        $connectionString = "Data Source=$BackupFilePath"
        Add-Type -AssemblyName System.Data.SQLite
        
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        $command = $connection.CreateCommand()
        $command.CommandText = "PRAGMA integrity_check"
        $result = $command.ExecuteScalar()
        
        $connection.Close()
        
        $isValid = ($result -eq "ok")
        
        Write-LogEntry -Level "INFO" -Message "Backup integrity check result: $result"
        
        return @{
            Valid = $isValid
            Result = $result
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Backup integrity check failed: $($_.Exception.Message)"
        return @{
            Valid = $false
            Error = $_.Exception.Message
        }
    }
}

function Get-BackupList {
    param(
        [string]$BackupDirectory = "",
        [int]$MaxResults = 20
    )
    
    try {
        $backupDir = if ($BackupDirectory) { $BackupDirectory } else { Get-ConfigValue "Database.BackupPath" }
        
        if (-not (Test-Path $backupDir)) {
            return @()
        }
        
        $backupFiles = Get-ChildItem -Path $backupDir -Filter "itsm_backup_*.sqlite" | 
                       Sort-Object CreationTime -Descending | 
                       Select-Object -First $MaxResults
        
        $backupList = @()
        foreach ($file in $backupFiles) {
            $backupList += @{
                FileName = $file.Name
                FilePath = $file.FullName
                FileSize = $file.Length
                CreationTime = $file.CreationTime
                LastWriteTime = $file.LastWriteTime
            }
        }
        
        return $backupList
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get backup list: $($_.Exception.Message)"
        return @()
    }
}

function Restore-Database {
    param(
        [string]$BackupFilePath,
        [string]$TargetDatabasePath = "",
        [switch]$VerifyIntegrity = $true
    )
    
    try {
        if (-not (Test-Path $BackupFilePath)) {
            Write-LogEntry -Level "ERROR" -Message "Backup file not found: $BackupFilePath"
            return @{
                Success = $false
                Error = "Backup file not found"
            }
        }
        
        if ($VerifyIntegrity) {
            $integrityCheck = Test-BackupIntegrity -BackupFilePath $BackupFilePath
            if (-not $integrityCheck.Valid) {
                Write-LogEntry -Level "ERROR" -Message "Backup integrity check failed: $($integrityCheck.Error)"
                return @{
                    Success = $false
                    Error = "Backup file integrity check failed"
                }
            }
        }
        
        $targetPath = if ($TargetDatabasePath) { $TargetDatabasePath } else { Get-DatabasePath }
        
        if (Test-Path $targetPath) {
            $backupCurrentDb = "$targetPath.restore_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            Copy-Item -Path $targetPath -Destination $backupCurrentDb -Force
            Write-LogEntry -Level "INFO" -Message "Current database backed up to: $backupCurrentDb"
        }
        
        Copy-Item -Path $BackupFilePath -Destination $targetPath -Force
        
        if (Test-Path $targetPath) {
            Write-LogEntry -Level "INFO" -Message "Database restored successfully from: $BackupFilePath"
            
            return @{
                Success = $true
                RestoredFrom = $BackupFilePath
                RestoredTo = $targetPath
                Timestamp = Get-Date
            }
        } else {
            Write-LogEntry -Level "ERROR" -Message "Database restore failed"
            return @{
                Success = $false
                Error = "Restore operation failed"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Database restore failed: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# スケジュール実行用のメイン関数
function Invoke-ScheduledBackup {
    param()
    
    try {
        Write-LogEntry -Level "INFO" -Message "Scheduled backup job started"
        
        $result = Start-BackupJob
        
        if ($result.Success) {
            Write-LogEntry -Level "INFO" -Message "Scheduled backup completed successfully"
        } else {
            Write-LogEntry -Level "ERROR" -Message "Scheduled backup failed: $($result.Error)"
        }
        
        return $result
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Scheduled backup job error: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Start-BackupJob, Remove-OldBackups, Test-BackupIntegrity, Get-BackupList, Restore-Database, Invoke-ScheduledBackup