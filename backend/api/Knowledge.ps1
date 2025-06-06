# Knowledge.ps1 - ナレッジ管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-KnowledgeList {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Title = "",
        [string]$Category = "",
        [string]$CreatedBy = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($Category) {
            $whereClause += " AND category = @category"
            $params["category"] = $Category
        }
        
        if ($CreatedBy) {
            $whereClause += " AND created_by LIKE @created_by"
            $params["created_by"] = "%$CreatedBy%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM knowledge $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT knowledge_id, title, category, created_by, created_date, updated_date FROM knowledge $whereClause ORDER BY knowledge_id DESC LIMIT $PageSize OFFSET $offset"
        $knowledgeList = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "KNOWLEDGE_VIEW" -User $user -Detail "Viewed knowledge list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Knowledge = $knowledgeList
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
        Write-LogEntry -Level "ERROR" -Message "Get-KnowledgeList failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Knowledge {
    param(
        [string]$Token,
        [int]$KnowledgeId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM knowledge WHERE knowledge_id = @knowledge_id"
        $params = @{ knowledge_id = $KnowledgeId }
        
        $knowledge = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $knowledge -or $knowledge.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Knowledge not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "KNOWLEDGE_VIEW" -User $user -Detail "Viewed knowledge: $KnowledgeId"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $knowledge[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Knowledge failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Knowledge {
    param(
        [string]$Token,
        [hashtable]$KnowledgeData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("title", "content")
        foreach ($field in $requiredFields) {
            if (-not $KnowledgeData.ContainsKey($field) -or -not $KnowledgeData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO knowledge (title, content, category, created_by, created_date, updated_date)
VALUES (@title, @content, @category, @created_by, @created_date, @updated_date)
"@
        
        $insertParams = @{
            title = $KnowledgeData["title"]
            content = $KnowledgeData["content"]
            category = if ($KnowledgeData["category"]) { $KnowledgeData["category"] } else { "General" }
            created_by = $user
            created_date = Get-Date -Format "yyyy-MM-dd"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newKnowledgeId = Get-LastInsertId
            Save-AuditLog -EventType "KNOWLEDGE_CREATE" -User $user -Detail "Created knowledge: $($KnowledgeData['title'])"
            Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Knowledge created successfully"
                Data = @{ KnowledgeId = $newKnowledgeId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create knowledge"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Knowledge failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/knowledge" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Knowledge {
    param(
        [string]$Token,
        [int]$KnowledgeId,
        [hashtable]$KnowledgeData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT created_by FROM knowledge WHERE knowledge_id = @knowledge_id"
        $checkParams = @{ knowledge_id = $KnowledgeId }
        $existingKnowledge = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingKnowledge -or $existingKnowledge.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Knowledge not found"
                Data = $null
            }
        }
        
        # 作成者または管理者のみ編集可能
        $isCreator = ($existingKnowledge[0].created_by -eq $user)
        $isAdmin = (Test-UserRole -Token $Token -RequiredRoles @("administrator"))
        
        if (-not $isCreator -and -not $isAdmin) {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Only the creator or administrator can edit this knowledge"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ knowledge_id = $KnowledgeId }
        
        $allowedFields = @("title", "content", "category")
        
        foreach ($field in $allowedFields) {
            if ($KnowledgeData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $KnowledgeData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE knowledge SET $($updateFields -join ', ') WHERE knowledge_id = @knowledge_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "KNOWLEDGE_UPDATE" -User $user -Detail "Updated knowledge: $KnowledgeId"
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Knowledge updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update knowledge"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Knowledge failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Knowledge {
    param(
        [string]$Token,
        [int]$KnowledgeId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT title, created_by FROM knowledge WHERE knowledge_id = @knowledge_id"
        $checkParams = @{ knowledge_id = $KnowledgeId }
        $existingKnowledge = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingKnowledge -or $existingKnowledge.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Knowledge not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM knowledge WHERE knowledge_id = @knowledge_id"
        $deleteParams = @{ knowledge_id = $KnowledgeId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "KNOWLEDGE_DELETE" -User $user -Detail "Deleted knowledge: $($existingKnowledge[0].title)"
            Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Knowledge deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete knowledge"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Knowledge failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/knowledge/$KnowledgeId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Search-Knowledge {
    param(
        [string]$Token,
        [string]$SearchTerm,
        [int]$Page = 1,
        [int]$PageSize = 20
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge/search" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not $SearchTerm) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge/search" -StatusCode 400 -User $user
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
        
        $whereClause = "WHERE (title LIKE @search_term OR content LIKE @search_term OR category LIKE @search_term)"
        $params = @{ search_term = "%$SearchTerm%" }
        
        $countQuery = "SELECT COUNT(*) as total FROM knowledge $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = @"
SELECT knowledge_id, title, category, created_by, created_date, 
       SUBSTR(content, 1, 200) as content_preview
FROM knowledge $whereClause 
ORDER BY knowledge_id DESC 
LIMIT $PageSize OFFSET $offset
"@
        
        $searchResults = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "KNOWLEDGE_SEARCH" -User $user -Detail "Searched knowledge: '$SearchTerm'"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/search" -StatusCode 200 -User $user
        
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
        Write-LogEntry -Level "ERROR" -Message "Search-Knowledge failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/search" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-KnowledgeCategories {
    param(
        [string]$Token
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/knowledge/categories" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = @"
SELECT category, COUNT(*) as count 
FROM knowledge 
WHERE category IS NOT NULL AND category != '' 
GROUP BY category 
ORDER BY count DESC, category ASC
"@
        
        $categories = Invoke-SqlQuery -Query $query
        
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/categories" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $categories
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-KnowledgeCategories failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/knowledge/categories" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-KnowledgeList, Get-Knowledge, New-Knowledge, Update-Knowledge, Remove-Knowledge, Search-Knowledge, Get-KnowledgeCategories