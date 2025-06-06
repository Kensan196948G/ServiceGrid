# Availability.ps1 - 可用性管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Availability {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$ServiceName = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/availability" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        $countQuery = "SELECT COUNT(*) as total FROM availability $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM availability $whereClause ORDER BY availability_id DESC LIMIT $PageSize OFFSET $offset"
        $availability = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "AVAILABILITY_VIEW" -User $user -Detail "Viewed availability list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/availability" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Availability = $availability
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
        Write-LogEntry -Level "ERROR" -Message "Get-Availability failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/availability" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-AvailabilityItem {
    param(
        [string]$Token,
        [int]$AvailabilityId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/availability/$AvailabilityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM availability WHERE availability_id = @availability_id"
        $params = @{ availability_id = $AvailabilityId }
        
        $availability = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $availability -or $availability.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/availability/$AvailabilityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Availability item not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "AVAILABILITY_VIEW" -User $user -Detail "Viewed availability: $AvailabilityId"
        Write-ApiLog -Method "GET" -Endpoint "/availability/$AvailabilityId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $availability[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-AvailabilityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/availability/$AvailabilityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-AvailabilityItem {
    param(
        [string]$Token,
        [hashtable]$AvailabilityData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("service_name", "uptime_percent")
        foreach ($field in $requiredFields) {
            if (-not $AvailabilityData.ContainsKey($field) -or -not $AvailabilityData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO availability (service_name, uptime_percent, downtime_minutes, measurement_date, created_date)
VALUES (@service_name, @uptime_percent, @downtime_minutes, @measurement_date, @created_date)
"@
        
        $insertParams = @{
            service_name = $AvailabilityData["service_name"]
            uptime_percent = $AvailabilityData["uptime_percent"]
            downtime_minutes = if ($AvailabilityData["downtime_minutes"]) { $AvailabilityData["downtime_minutes"] } else { 0 }
            measurement_date = if ($AvailabilityData["measurement_date"]) { $AvailabilityData["measurement_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newAvailabilityId = Get-LastInsertId
            Save-AuditLog -EventType "AVAILABILITY_CREATE" -User $user -Detail "Created availability: $($AvailabilityData['service_name'])"
            Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Availability item created successfully"
                Data = @{ AvailabilityId = $newAvailabilityId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create availability item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-AvailabilityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/availability" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-AvailabilityItem {
    param(
        [string]$Token,
        [int]$AvailabilityId,
        [hashtable]$AvailabilityData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM availability WHERE availability_id = @availability_id"
        $checkParams = @{ availability_id = $AvailabilityId }
        $existingAvailability = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingAvailability[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Availability item not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ availability_id = $AvailabilityId }
        
        $allowedFields = @("service_name", "uptime_percent", "downtime_minutes", "measurement_date")
        
        foreach ($field in $allowedFields) {
            if ($AvailabilityData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $AvailabilityData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateQuery = "UPDATE availability SET $($updateFields -join ', ') WHERE availability_id = @availability_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "AVAILABILITY_UPDATE" -User $user -Detail "Updated availability: $AvailabilityId"
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Availability item updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update availability item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-AvailabilityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/availability/$AvailabilityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-AvailabilityItem {
    param(
        [string]$Token,
        [int]$AvailabilityId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT service_name FROM availability WHERE availability_id = @availability_id"
        $checkParams = @{ availability_id = $AvailabilityId }
        $existingAvailability = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingAvailability -or $existingAvailability.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Availability item not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM availability WHERE availability_id = @availability_id"
        $deleteParams = @{ availability_id = $AvailabilityId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "AVAILABILITY_DELETE" -User $user -Detail "Deleted availability: $($existingAvailability[0].service_name)"
            Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Availability item deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete availability item"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-AvailabilityItem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/availability/$AvailabilityId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Availability, Get-AvailabilityItem, New-AvailabilityItem, Update-AvailabilityItem, Remove-AvailabilityItem