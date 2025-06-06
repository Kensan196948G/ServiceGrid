# LogUtil.psm1 - ログ記録共通モジュール

$script:LogPath = "logs/backend.log"
$script:ApiLogPath = "logs/api_access.log"

function Write-LogEntry {
    param(
        [string]$Level = "INFO",
        [string]$Message,
        [string]$Category = "SYSTEM",
        [string]$User = "SYSTEM"
    )
    
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logEntry = "[$timestamp] [$Level] [$Category] [$User] $Message"
        
        if (-not (Test-Path (Split-Path $script:LogPath))) {
            New-Item -ItemType Directory -Path (Split-Path $script:LogPath) -Force
        }
        
        Add-Content -Path $script:LogPath -Value $logEntry
        
        if ($Level -eq "ERROR" -or $Level -eq "WARNING") {
            Write-Host $logEntry -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } else { "Yellow" })
        }
    }
    catch {
        Write-Error "Failed to write log entry: $($_.Exception.Message)"
    }
}

function Write-ApiLog {
    param(
        [string]$Method,
        [string]$Endpoint,
        [int]$StatusCode,
        [string]$User = "ANONYMOUS",
        [string]$RequestBody = "",
        [string]$ResponseTime = ""
    )
    
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logEntry = "[$timestamp] $Method $Endpoint - Status: $StatusCode - User: $User - Time: $ResponseTime"
        
        if (-not (Test-Path (Split-Path $script:ApiLogPath))) {
            New-Item -ItemType Directory -Path (Split-Path $script:ApiLogPath) -Force
        }
        
        Add-Content -Path $script:ApiLogPath -Value $logEntry
        
        if ($RequestBody) {
            Add-Content -Path $script:ApiLogPath -Value "  Request: $RequestBody"
        }
    }
    catch {
        Write-Error "Failed to write API log entry: $($_.Exception.Message)"
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

Export-ModuleMember -Function Write-LogEntry, Write-ApiLog, Save-AuditLog, Get-LogEntries, Clear-OldLogs