# SLAs.ps1 - サービスレベル管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-SLAs {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$ServiceName = "",
        [string]$Status = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/slas" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        $maxPageSize = Get-ConfigValue "System.MaxPageSize"
        
        if ($PageSize -gt $maxPageSize) {
            $PageSize = $maxPageSize
        }
        
        $offset = ($Page - 1) * $PageSize
        
        $whereClause = "WHERE 1=1"
        $params = @{}
        
        if ($ServiceName) {
            $whereClause += " AND service_name LIKE @service_name"
            $params["service_name"] = "%$ServiceName%"
        }
        
        if ($Status) {
            $whereClause += " AND status = @status"
            $params["status"] = $Status
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM slas $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM slas $whereClause ORDER BY sla_id DESC LIMIT $PageSize OFFSET $offset"
        $slas = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "SLA_VIEW" -User $user -Detail "Viewed SLAs list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/slas" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                SLAs = $slas
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
        Write-LogEntry -Level "ERROR" -Message "Get-SLAs failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/slas" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-SLA {
    param(
        [string]$Token,
        [int]$SlaId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/slas/$SlaId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM slas WHERE sla_id = @sla_id"
        $params = @{ sla_id = $SlaId }
        
        $sla = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $sla -or $sla.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/slas/$SlaId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "SLA not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "SLA_VIEW" -User $user -Detail "Viewed SLA: $SlaId"
        Write-ApiLog -Method "GET" -Endpoint "/slas/$SlaId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $sla[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-SLA failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/slas/$SlaId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-SLA {
    param(
        [string]$Token,
        [hashtable]$SlaData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("service_name", "target_value")
        foreach ($field in $requiredFields) {
            if (-not $SlaData.ContainsKey($field) -or -not $SlaData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO slas (service_name, target_value, actual_value, measurement_date, status, created_date)
VALUES (@service_name, @target_value, @actual_value, @measurement_date, @status, @created_date)
"@
        
        $insertParams = @{
            service_name = $SlaData["service_name"]
            target_value = $SlaData["target_value"]
            actual_value = $SlaData["actual_value"]
            measurement_date = if ($SlaData["measurement_date"]) { $SlaData["measurement_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            status = if ($SlaData["status"]) { $SlaData["status"] } else { "Active" }
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newSlaId = Get-LastInsertId
            Save-AuditLog -EventType "SLA_CREATE" -User $user -Detail "Created SLA: $($SlaData['service_name'])"
            Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "SLA created successfully"
                Data = @{ SlaId = $newSlaId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create SLA"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-SLA failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/slas" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-SLA {
    param(
        [string]$Token,
        [int]$SlaId,
        [hashtable]$SlaData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM slas WHERE sla_id = @sla_id"
        $checkParams = @{ sla_id = $SlaId }
        $existingSla = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingSla[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "SLA not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ sla_id = $SlaId }
        
        $allowedFields = @("service_name", "target_value", "actual_value", "measurement_date", "status")
        
        foreach ($field in $allowedFields) {
            if ($SlaData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $SlaData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateQuery = "UPDATE slas SET $($updateFields -join ', ') WHERE sla_id = @sla_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "SLA_UPDATE" -User $user -Detail "Updated SLA: $SlaId"
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "SLA updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update SLA"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-SLA failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/slas/$SlaId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-SLA {
    param(
        [string]$Token,
        [int]$SlaId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT service_name FROM slas WHERE sla_id = @sla_id"
        $checkParams = @{ sla_id = $SlaId }
        $existingSla = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingSla -or $existingSla.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "SLA not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM slas WHERE sla_id = @sla_id"
        $deleteParams = @{ sla_id = $SlaId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "SLA_DELETE" -User $user -Detail "Deleted SLA: $($existingSla[0].service_name)"
            Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "SLA deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete SLA"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-SLA failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/slas/$SlaId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-SLAs, Get-SLA, New-SLA, Update-SLA, Remove-SLA