# AuditLog.ps1 - 監査ログ管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-AuditLogs {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$EventType = "",
        [string]$User = "",
        [string]$FromDate = "",
        [string]$ToDate = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $maxPageSize = Get-ConfigValue "System.MaxPageSize"
        if ($PageSize -gt $maxPageSize) {
            $PageSize = $maxPageSize
        }
        
        $offset = ($Page - 1) * $PageSize
        
        $whereClause = "WHERE 1=1"
        $params = @{}
        
        if ($EventType) {
            $whereClause += " AND event_type = @event_type"
            $params["event_type"] = $EventType
        }
        
        if ($User) {
            $whereClause += " AND user LIKE @user"
            $params["user"] = "%$User%"
        }
        
        if ($FromDate) {
            $whereClause += " AND event_time >= @from_date"
            $params["from_date"] = $FromDate
        }
        
        if ($ToDate) {
            $whereClause += " AND event_time <= @to_date"
            $params["to_date"] = $ToDate
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM logs $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM logs $whereClause ORDER BY log_id DESC LIMIT $PageSize OFFSET $offset"
        $auditLogs = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "AUDIT_LOG_VIEW" -User $currentUser -Detail "Viewed audit logs (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                AuditLogs = $auditLogs
                Pagination = @{
                    Page = $Page
                    PageSize = $PageSize
                    TotalCount = $totalCount
                    TotalPages = [Math]::Ceiling($totalCount / $PageSize)
                }
                Filters = @{
                    EventType = $EventType
                    User = $User
                    FromDate = $FromDate
                    ToDate = $ToDate
                }
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-AuditLogs failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-AuditLog {
    param(
        [string]$Token,
        [int]$LogId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/$LogId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/$LogId" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $query = "SELECT * FROM logs WHERE log_id = @log_id"
        $params = @{ log_id = $LogId }
        
        $auditLog = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $auditLog -or $auditLog.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/$LogId" -StatusCode 404 -User $currentUser
            return @{
                Status = 404
                Message = "Audit log not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "AUDIT_LOG_VIEW" -User $currentUser -Detail "Viewed audit log: $LogId"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/$LogId" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Success"
            Data = $auditLog[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-AuditLog failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/$LogId" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-EventTypes {
    param(
        [string]$Token
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/event-types" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/event-types" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $query = @"
SELECT event_type, COUNT(*) as count 
FROM logs 
GROUP BY event_type 
ORDER BY count DESC, event_type ASC
"@
        
        $eventTypes = Invoke-SqlQuery -Query $query
        
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/event-types" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Success"
            Data = $eventTypes
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-EventTypes failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/event-types" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-AuditStatistics {
    param(
        [string]$Token,
        [int]$Days = 30
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/statistics" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/statistics" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $fromDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-dd")
        
        # 全体統計
        $overallQuery = @"
SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT user) as unique_users,
    MIN(event_time) as earliest_event,
    MAX(event_time) as latest_event
FROM logs 
WHERE event_time >= @from_date
"@
        
        $overallParams = @{ from_date = $fromDate }
        $overallStats = Invoke-SqlQuery -Query $overallQuery -Parameters $overallParams
        
        # イベントタイプ別統計
        $eventTypeQuery = @"
SELECT event_type, COUNT(*) as count
FROM logs 
WHERE event_time >= @from_date
GROUP BY event_type 
ORDER BY count DESC
LIMIT 10
"@
        
        $eventTypeStats = Invoke-SqlQuery -Query $eventTypeQuery -Parameters $overallParams
        
        # ユーザー別統計
        $userQuery = @"
SELECT user, COUNT(*) as count
FROM logs 
WHERE event_time >= @from_date AND user != 'SYSTEM'
GROUP BY user 
ORDER BY count DESC
LIMIT 10
"@
        
        $userStats = Invoke-SqlQuery -Query $userQuery -Parameters $overallParams
        
        # 日別統計
        $dailyQuery = @"
SELECT 
    DATE(event_time) as event_date,
    COUNT(*) as count
FROM logs 
WHERE event_time >= @from_date
GROUP BY DATE(event_time)
ORDER BY event_date DESC
"@
        
        $dailyStats = Invoke-SqlQuery -Query $dailyQuery -Parameters $overallParams
        
        # 時間別統計（過去24時間）
        $hourlyQuery = @"
SELECT 
    strftime('%H', event_time) as hour,
    COUNT(*) as count
FROM logs 
WHERE event_time >= datetime('now', '-1 day')
GROUP BY strftime('%H', event_time)
ORDER BY hour
"@
        
        $hourlyStats = Invoke-SqlQuery -Query $hourlyQuery
        
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/statistics" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Period = @{
                    Days = $Days
                    From = $fromDate
                    To = (Get-Date).ToString("yyyy-MM-dd")
                }
                Overall = $overallStats[0]
                EventTypes = $eventTypeStats
                Users = $userStats
                Daily = $dailyStats
                Hourly = $hourlyStats
                GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-AuditStatistics failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/statistics" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Export-AuditLogs {
    param(
        [string]$Token,
        [string]$Format = "csv",
        [string]$EventType = "",
        [string]$User = "",
        [string]$FromDate = "",
        [string]$ToDate = "",
        [int]$MaxRecords = 10000
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $validFormats = @("csv", "json")
        if ($validFormats -notcontains $Format.ToLower()) {
            Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 400 -User $currentUser
            return @{
                Status = 400
                Message = "Invalid format. Supported formats: csv, json"
                Data = $null
            }
        }
        
        $whereClause = "WHERE 1=1"
        $params = @{}
        
        if ($EventType) {
            $whereClause += " AND event_type = @event_type"
            $params["event_type"] = $EventType
        }
        
        if ($User) {
            $whereClause += " AND user LIKE @user"
            $params["user"] = "%$User%"
        }
        
        if ($FromDate) {
            $whereClause += " AND event_time >= @from_date"
            $params["from_date"] = $FromDate
        }
        
        if ($ToDate) {
            $whereClause += " AND event_time <= @to_date"
            $params["to_date"] = $ToDate
        }
        
        $dataQuery = "SELECT * FROM logs $whereClause ORDER BY log_id DESC LIMIT $MaxRecords"
        $auditLogs = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        if (-not $auditLogs -or $auditLogs.Count -eq 0) {
            Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 404 -User $currentUser
            return @{
                Status = 404
                Message = "No audit logs found for the specified criteria"
                Data = $null
            }
        }
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $fileName = "audit_logs_export_$timestamp.$Format"
        $exportPath = "logs/export"
        
        if (-not (Test-Path $exportPath)) {
            New-Item -ItemType Directory -Path $exportPath -Force
        }
        
        $filePath = Join-Path $exportPath $fileName
        
        if ($Format.ToLower() -eq "csv") {
            $csvContent = $auditLogs | ConvertTo-Csv -NoTypeInformation
            Set-Content -Path $filePath -Value $csvContent
        } else {
            $jsonContent = $auditLogs | ConvertTo-Json -Depth 10
            Set-Content -Path $filePath -Value $jsonContent
        }
        
        Save-AuditLog -EventType "AUDIT_LOG_EXPORT" -User $currentUser -Detail "Exported $($auditLogs.Count) audit logs to $fileName"
        Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Audit logs exported successfully"
            Data = @{
                FileName = $fileName
                FilePath = $filePath
                RecordCount = $auditLogs.Count
                Format = $Format
                ExportedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Export-AuditLogs failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/audit-logs/export" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Search-AuditLogs {
    param(
        [string]$Token,
        [string]$SearchTerm,
        [int]$Page = 1,
        [int]$PageSize = 20
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/search" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $currentUser = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/search" -StatusCode 403 -User $currentUser
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        if (-not $SearchTerm) {
            Write-ApiLog -Method "GET" -Endpoint "/audit-logs/search" -StatusCode 400 -User $currentUser
            return @{
                Status = 400
                Message = "Search term is required"
                Data = $null
            }
        }
        
        $maxPageSize = Get-ConfigValue "System.MaxPageSize"
        if ($PageSize -gt $maxPageSize) {
            $PageSize = $maxPageSize
        }
        
        $offset = ($Page - 1) * $PageSize
        
        $whereClause = "WHERE (event_type LIKE @search_term OR user LIKE @search_term OR detail LIKE @search_term)"
        $params = @{ search_term = "%$SearchTerm%" }
        
        $countQuery = "SELECT COUNT(*) as total FROM logs $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM logs $whereClause ORDER BY log_id DESC LIMIT $PageSize OFFSET $offset"
        $searchResults = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "AUDIT_LOG_SEARCH" -User $currentUser -Detail "Searched audit logs: '$SearchTerm'"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/search" -StatusCode 200 -User $currentUser
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                SearchTerm = $SearchTerm
                Results = $searchResults
                Pagination = @{
                    Page = $Page
                    PageSize = $PageSize
                    TotalCount = $totalCount
                    TotalPages = [Math]::Ceiling($totalCount / $PageSize)
                }
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Search-AuditLogs failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/audit-logs/search" -StatusCode 500 -User $currentUser
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-AuditLogs, Get-AuditLog, Get-EventTypes, Get-AuditStatistics, Export-AuditLogs, Search-AuditLogs