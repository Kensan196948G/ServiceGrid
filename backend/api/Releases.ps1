# Releases.ps1 - リリース管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Releases {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Title = "",
        [string]$Status = "",
        [string]$Responsible = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/releases" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($Responsible) {
            $whereClause += " AND responsible LIKE @responsible"
            $params["responsible"] = "%$Responsible%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM releases $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM releases $whereClause ORDER BY release_id DESC LIMIT $PageSize OFFSET $offset"
        $releases = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "RELEASE_VIEW" -User $user -Detail "Viewed releases list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/releases" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Releases = $releases
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
        Write-LogEntry -Level "ERROR" -Message "Get-Releases failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/releases" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Release {
    param(
        [string]$Token,
        [int]$ReleaseId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/releases/$ReleaseId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM releases WHERE release_id = @release_id"
        $params = @{ release_id = $ReleaseId }
        
        $release = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $release -or $release.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/releases/$ReleaseId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Release not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "RELEASE_VIEW" -User $user -Detail "Viewed release: $ReleaseId"
        Write-ApiLog -Method "GET" -Endpoint "/releases/$ReleaseId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $release[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Release failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/releases/$ReleaseId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Release {
    param(
        [string]$Token,
        [hashtable]$ReleaseData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("title", "description")
        foreach ($field in $requiredFields) {
            if (-not $ReleaseData.ContainsKey($field) -or -not $ReleaseData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO releases (title, description, status, release_date, responsible, created_date, updated_date)
VALUES (@title, @description, @status, @release_date, @responsible, @created_date, @updated_date)
"@
        
        $insertParams = @{
            title = $ReleaseData["title"]
            description = $ReleaseData["description"]
            status = if ($ReleaseData["status"]) { $ReleaseData["status"] } else { "Planned" }
            release_date = $ReleaseData["release_date"]
            responsible = if ($ReleaseData["responsible"]) { $ReleaseData["responsible"] } else { $user }
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newReleaseId = Get-LastInsertId
            Save-AuditLog -EventType "RELEASE_CREATE" -User $user -Detail "Created release: $($ReleaseData['title'])"
            Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Release created successfully"
                Data = @{ ReleaseId = $newReleaseId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create release"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Release failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/releases" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Release {
    param(
        [string]$Token,
        [int]$ReleaseId,
        [hashtable]$ReleaseData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM releases WHERE release_id = @release_id"
        $checkParams = @{ release_id = $ReleaseId }
        $existingRelease = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingRelease[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Release not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ release_id = $ReleaseId }
        
        $allowedFields = @("title", "description", "status", "release_date", "responsible")
        
        foreach ($field in $allowedFields) {
            if ($ReleaseData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $ReleaseData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE releases SET $($updateFields -join ', ') WHERE release_id = @release_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "RELEASE_UPDATE" -User $user -Detail "Updated release: $ReleaseId"
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Release updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update release"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Release failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/releases/$ReleaseId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Release {
    param(
        [string]$Token,
        [int]$ReleaseId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT title FROM releases WHERE release_id = @release_id"
        $checkParams = @{ release_id = $ReleaseId }
        $existingRelease = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingRelease -or $existingRelease.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Release not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM releases WHERE release_id = @release_id"
        $deleteParams = @{ release_id = $ReleaseId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "RELEASE_DELETE" -User $user -Detail "Deleted release: $($existingRelease[0].title)"
            Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Release deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete release"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Release failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/releases/$ReleaseId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Releases, Get-Release, New-Release, Update-Release, Remove-Release