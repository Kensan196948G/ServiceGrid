# Incidents.ps1 - インシデント管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Incidents {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Title = "",
        [string]$Status = "",
        [string]$Priority = "",
        [string]$Assignee = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/incidents" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($Title) {
            $whereClause += " AND title LIKE @title"
            $params["title"] = "%$Title%"
        }
        
        if ($Status) {
            $whereClause += " AND status = @status"
            $params["status"] = $Status
        }
        
        if ($Priority) {
            $whereClause += " AND priority = @priority"
            $params["priority"] = $Priority
        }
        
        if ($Assignee) {
            $whereClause += " AND assignee LIKE @assignee"
            $params["assignee"] = "%$Assignee%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM incidents $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM incidents $whereClause ORDER BY incident_id DESC LIMIT $PageSize OFFSET $offset"
        $incidents = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "INCIDENT_VIEW" -User $user -Detail "Viewed incidents list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/incidents" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Incidents = $incidents
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
        Write-LogEntry -Level "ERROR" -Message "Get-Incidents failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/incidents" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Incident {
    param(
        [string]$Token,
        [int]$IncidentId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/incidents/$IncidentId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM incidents WHERE incident_id = @incident_id"
        $params = @{ incident_id = $IncidentId }
        
        $incident = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $incident -or $incident.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/incidents/$IncidentId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Incident not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "INCIDENT_VIEW" -User $user -Detail "Viewed incident: $IncidentId"
        Write-ApiLog -Method "GET" -Endpoint "/incidents/$IncidentId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $incident[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Incident failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/incidents/$IncidentId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Incident {
    param(
        [string]$Token,
        [hashtable]$IncidentData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("title", "description", "priority")
        foreach ($field in $requiredFields) {
            if (-not $IncidentData.ContainsKey($field) -or -not $IncidentData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $validPriorities = @("Low", "Medium", "High", "Critical")
        if ($validPriorities -notcontains $IncidentData["priority"]) {
            Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "Invalid priority value"
                Data = $null
            }
        }
        
        $insertQuery = @"
INSERT INTO incidents (title, description, status, priority, assignee, reported_date, resolved_date, created_date, updated_date)
VALUES (@title, @description, @status, @priority, @assignee, @reported_date, @resolved_date, @created_date, @updated_date)
"@
        
        $insertParams = @{
            title = $IncidentData["title"]
            description = $IncidentData["description"]
            status = if ($IncidentData["status"]) { $IncidentData["status"] } else { "Open" }
            priority = $IncidentData["priority"]
            assignee = $IncidentData["assignee"]
            reported_date = if ($IncidentData["reported_date"]) { $IncidentData["reported_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            resolved_date = $IncidentData["resolved_date"]
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newIncidentId = Get-LastInsertId
            Save-AuditLog -EventType "INCIDENT_CREATE" -User $user -Detail "Created incident: $($IncidentData['title'])"
            Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Incident created successfully"
                Data = @{ IncidentId = $newIncidentId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create incident"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Incident failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/incidents" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Incident {
    param(
        [string]$Token,
        [int]$IncidentId,
        [hashtable]$IncidentData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM incidents WHERE incident_id = @incident_id"
        $checkParams = @{ incident_id = $IncidentId }
        $existingIncident = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingIncident[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Incident not found"
                Data = $null
            }
        }
        
        if ($IncidentData.ContainsKey("priority")) {
            $validPriorities = @("Low", "Medium", "High", "Critical")
            if ($validPriorities -notcontains $IncidentData["priority"]) {
                Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Invalid priority value"
                    Data = $null
                }
            }
        }
        
        if ($IncidentData.ContainsKey("status")) {
            $validStatuses = @("Open", "In Progress", "Resolved", "Closed")
            if ($validStatuses -notcontains $IncidentData["status"]) {
                Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Invalid status value"
                    Data = $null
                }
            }
            
            if ($IncidentData["status"] -eq "Resolved" -or $IncidentData["status"] -eq "Closed") {
                if (-not $IncidentData.ContainsKey("resolved_date")) {
                    $IncidentData["resolved_date"] = Get-Date -Format "yyyy-MM-dd"
                }
            }
        }
        
        $updateFields = @()
        $updateParams = @{ incident_id = $IncidentId }
        
        $allowedFields = @("title", "description", "status", "priority", "assignee", "reported_date", "resolved_date")
        
        foreach ($field in $allowedFields) {
            if ($IncidentData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $IncidentData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE incidents SET $($updateFields -join ', ') WHERE incident_id = @incident_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "INCIDENT_UPDATE" -User $user -Detail "Updated incident: $IncidentId"
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Incident updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update incident"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Incident failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/incidents/$IncidentId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Incident {
    param(
        [string]$Token,
        [int]$IncidentId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT title FROM incidents WHERE incident_id = @incident_id"
        $checkParams = @{ incident_id = $IncidentId }
        $existingIncident = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingIncident -or $existingIncident.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Incident not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM incidents WHERE incident_id = @incident_id"
        $deleteParams = @{ incident_id = $IncidentId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "INCIDENT_DELETE" -User $user -Detail "Deleted incident: $($existingIncident[0].title)"
            Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Incident deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete incident"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Incident failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/incidents/$IncidentId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Incidents, Get-Incident, New-Incident, Update-Incident, Remove-Incident