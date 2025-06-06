# Changes.ps1 - 変更管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Changes {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Subject = "",
        [string]$Status = "",
        [string]$RequestedBy = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/changes" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($Subject) {
            $whereClause += " AND subject LIKE @subject"
            $params["subject"] = "%$Subject%"
        }
        
        if ($Status) {
            $whereClause += " AND status = @status"
            $params["status"] = $Status
        }
        
        if ($RequestedBy) {
            $whereClause += " AND requested_by LIKE @requested_by"
            $params["requested_by"] = "%$RequestedBy%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM changes $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM changes $whereClause ORDER BY change_id DESC LIMIT $PageSize OFFSET $offset"
        $changes = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "CHANGE_VIEW" -User $user -Detail "Viewed changes list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/changes" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Changes = $changes
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
        Write-LogEntry -Level "ERROR" -Message "Get-Changes failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/changes" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Change {
    param(
        [string]$Token,
        [int]$ChangeId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/changes/$ChangeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM changes WHERE change_id = @change_id"
        $params = @{ change_id = $ChangeId }
        
        $change = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $change -or $change.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/changes/$ChangeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Change not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "CHANGE_VIEW" -User $user -Detail "Viewed change: $ChangeId"
        Write-ApiLog -Method "GET" -Endpoint "/changes/$ChangeId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $change[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Change failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/changes/$ChangeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Change {
    param(
        [string]$Token,
        [hashtable]$ChangeData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("subject", "detail")
        foreach ($field in $requiredFields) {
            if (-not $ChangeData.ContainsKey($field) -or -not $ChangeData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO changes (subject, detail, status, requested_by, approved_by, request_date, approve_date, created_date, updated_date)
VALUES (@subject, @detail, @status, @requested_by, @approved_by, @request_date, @approve_date, @created_date, @updated_date)
"@
        
        $insertParams = @{
            subject = $ChangeData["subject"]
            detail = $ChangeData["detail"]
            status = if ($ChangeData["status"]) { $ChangeData["status"] } else { "Pending" }
            requested_by = if ($ChangeData["requested_by"]) { $ChangeData["requested_by"] } else { $user }
            approved_by = $ChangeData["approved_by"]
            request_date = if ($ChangeData["request_date"]) { $ChangeData["request_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            approve_date = $ChangeData["approve_date"]
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newChangeId = Get-LastInsertId
            Save-AuditLog -EventType "CHANGE_CREATE" -User $user -Detail "Created change: $($ChangeData['subject'])"
            Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Change created successfully"
                Data = @{ ChangeId = $newChangeId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create change"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Change failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/changes" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Change {
    param(
        [string]$Token,
        [int]$ChangeId,
        [hashtable]$ChangeData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM changes WHERE change_id = @change_id"
        $checkParams = @{ change_id = $ChangeId }
        $existingChange = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingChange[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Change not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ change_id = $ChangeId }
        
        $allowedFields = @("subject", "detail", "status", "requested_by", "approved_by", "request_date", "approve_date")
        
        foreach ($field in $allowedFields) {
            if ($ChangeData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $ChangeData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE changes SET $($updateFields -join ', ') WHERE change_id = @change_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "CHANGE_UPDATE" -User $user -Detail "Updated change: $ChangeId"
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Change updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update change"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Change failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/changes/$ChangeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Change {
    param(
        [string]$Token,
        [int]$ChangeId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT subject FROM changes WHERE change_id = @change_id"
        $checkParams = @{ change_id = $ChangeId }
        $existingChange = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingChange -or $existingChange.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Change not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM changes WHERE change_id = @change_id"
        $deleteParams = @{ change_id = $ChangeId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "CHANGE_DELETE" -User $user -Detail "Deleted change: $($existingChange[0].subject)"
            Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Change deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete change"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Change failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/changes/$ChangeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Changes, Get-Change, New-Change, Update-Change, Remove-Change