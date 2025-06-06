# Capacity.ps1 - キャパシティ管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Capacity {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$ResourceName = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/capacity" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($ResourceName) {
            $whereClause += " AND resource_name LIKE @resource_name"
            $params["resource_name"] = "%$ResourceName%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM capacity $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM capacity $whereClause ORDER BY capacity_id DESC LIMIT $PageSize OFFSET $offset"
        $capacity = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "CAPACITY_VIEW" -User $user -Detail "Viewed capacity list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/capacity" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Capacity = $capacity
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
        Write-LogEntry -Level "ERROR" -Message "Get-Capacity failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/capacity" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-CapacityItem {
    param(
        [string]$Token,
        [int]$CapacityId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/capacity/$CapacityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM capacity WHERE capacity_id = @capacity_id"
        $params = @{ capacity_id = $CapacityId }
        
        $capacity = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $capacity -or $capacity.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/capacity/$CapacityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Capacity item not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "CAPACITY_VIEW" -User $user -Detail "Viewed capacity: $CapacityId"
        Write-ApiLog -Method "GET" -Endpoint "/capacity/$CapacityId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $capacity[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-CapacityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/capacity/$CapacityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-CapacityItem {
    param(
        [string]$Token,
        [hashtable]$CapacityData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("resource_name", "max_capacity")
        foreach ($field in $requiredFields) {
            if (-not $CapacityData.ContainsKey($field) -or -not $CapacityData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO capacity (resource_name, current_usage, max_capacity, threshold_percent, measurement_date, created_date)
VALUES (@resource_name, @current_usage, @max_capacity, @threshold_percent, @measurement_date, @created_date)
"@
        
        $insertParams = @{
            resource_name = $CapacityData["resource_name"]
            current_usage = if ($CapacityData["current_usage"]) { $CapacityData["current_usage"] } else { 0 }
            max_capacity = $CapacityData["max_capacity"]
            threshold_percent = if ($CapacityData["threshold_percent"]) { $CapacityData["threshold_percent"] } else { 80 }
            measurement_date = if ($CapacityData["measurement_date"]) { $CapacityData["measurement_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newCapacityId = Get-LastInsertId
            Save-AuditLog -EventType "CAPACITY_CREATE" -User $user -Detail "Created capacity: $($CapacityData['resource_name'])"
            Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Capacity item created successfully"
                Data = @{ CapacityId = $newCapacityId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create capacity item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-CapacityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/capacity" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-CapacityItem {
    param(
        [string]$Token,
        [int]$CapacityId,
        [hashtable]$CapacityData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM capacity WHERE capacity_id = @capacity_id"
        $checkParams = @{ capacity_id = $CapacityId }
        $existingCapacity = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingCapacity[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Capacity item not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ capacity_id = $CapacityId }
        
        $allowedFields = @("resource_name", "current_usage", "max_capacity", "threshold_percent", "measurement_date")
        
        foreach ($field in $allowedFields) {
            if ($CapacityData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $CapacityData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateQuery = "UPDATE capacity SET $($updateFields -join ', ') WHERE capacity_id = @capacity_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "CAPACITY_UPDATE" -User $user -Detail "Updated capacity: $CapacityId"
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Capacity item updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update capacity item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-CapacityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/capacity/$CapacityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-CapacityItem {
    param(
        [string]$Token,
        [int]$CapacityId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT resource_name FROM capacity WHERE capacity_id = @capacity_id"
        $checkParams = @{ capacity_id = $CapacityId }
        $existingCapacity = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingCapacity -or $existingCapacity.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Capacity item not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM capacity WHERE capacity_id = @capacity_id"
        $deleteParams = @{ capacity_id = $CapacityId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "CAPACITY_DELETE" -User $user -Detail "Deleted capacity: $($existingCapacity[0].resource_name)"
            Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Capacity item deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete capacity item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-CapacityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/capacity/$CapacityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Capacity, Get-CapacityItem, New-CapacityItem, Update-CapacityItem, Remove-CapacityItem