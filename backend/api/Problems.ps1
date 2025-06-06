# Problems.ps1 - 問題管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Problems {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Title = "",
        [string]$Status = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/problems" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        $countQuery = "SELECT COUNT(*) as total FROM problems $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM problems $whereClause ORDER BY problem_id DESC LIMIT $PageSize OFFSET $offset"
        $problems = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "PROBLEM_VIEW" -User $user -Detail "Viewed problems list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/problems" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Problems = $problems
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
        Write-LogEntry -Level "ERROR" -Message "Get-Problems failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/problems" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Problem {
    param(
        [string]$Token,
        [int]$ProblemId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/problems/$ProblemId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM problems WHERE problem_id = @problem_id"
        $params = @{ problem_id = $ProblemId }
        
        $problem = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $problem -or $problem.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/problems/$ProblemId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Problem not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "PROBLEM_VIEW" -User $user -Detail "Viewed problem: $ProblemId"
        Write-ApiLog -Method "GET" -Endpoint "/problems/$ProblemId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $problem[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Problem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/problems/$ProblemId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Problem {
    param(
        [string]$Token,
        [hashtable]$ProblemData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("title")
        foreach ($field in $requiredFields) {
            if (-not $ProblemData.ContainsKey($field) -or -not $ProblemData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO problems (title, root_cause, status, registered_date, closed_date, created_date, updated_date)
VALUES (@title, @root_cause, @status, @registered_date, @closed_date, @created_date, @updated_date)
"@
        
        $insertParams = @{
            title = $ProblemData["title"]
            root_cause = $ProblemData["root_cause"]
            status = if ($ProblemData["status"]) { $ProblemData["status"] } else { "Open" }
            registered_date = if ($ProblemData["registered_date"]) { $ProblemData["registered_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            closed_date = $ProblemData["closed_date"]
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newProblemId = Get-LastInsertId
            Save-AuditLog -EventType "PROBLEM_CREATE" -User $user -Detail "Created problem: $($ProblemData['title'])"
            Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Problem created successfully"
                Data = @{ ProblemId = $newProblemId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create problem"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Problem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/problems" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Problem {
    param(
        [string]$Token,
        [int]$ProblemId,
        [hashtable]$ProblemData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM problems WHERE problem_id = @problem_id"
        $checkParams = @{ problem_id = $ProblemId }
        $existingProblem = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingProblem[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Problem not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ problem_id = $ProblemId }
        
        $allowedFields = @("title", "root_cause", "status", "registered_date", "closed_date")
        
        foreach ($field in $allowedFields) {
            if ($ProblemData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $ProblemData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE problems SET $($updateFields -join ', ') WHERE problem_id = @problem_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "PROBLEM_UPDATE" -User $user -Detail "Updated problem: $ProblemId"
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Problem updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update problem"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Problem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/problems/$ProblemId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Problem {
    param(
        [string]$Token,
        [int]$ProblemId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT title FROM problems WHERE problem_id = @problem_id"
        $checkParams = @{ problem_id = $ProblemId }
        $existingProblem = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingProblem -or $existingProblem.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Problem not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM problems WHERE problem_id = @problem_id"
        $deleteParams = @{ problem_id = $ProblemId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "PROBLEM_DELETE" -User $user -Detail "Deleted problem: $($existingProblem[0].title)"
            Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Problem deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete problem"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Problem failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/problems/$ProblemId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Problems, Get-Problem, New-Problem, Update-Problem, Remove-Problem