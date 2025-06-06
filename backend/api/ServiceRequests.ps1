# ServiceRequests.ps1 - サービス要求管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-ServiceRequests {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$Subject = "",
        [string]$Status = "",
        [string]$Applicant = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/service-requests" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($Applicant) {
            $whereClause += " AND applicant LIKE @applicant"
            $params["applicant"] = "%$Applicant%"
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM service_requests $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM service_requests $whereClause ORDER BY request_id DESC LIMIT $PageSize OFFSET $offset"
        $serviceRequests = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "SERVICE_REQUEST_VIEW" -User $user -Detail "Viewed service requests list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/service-requests" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                ServiceRequests = $serviceRequests
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
        Write-LogEntry -Level "ERROR" -Message "Get-ServiceRequests failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/service-requests" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-ServiceRequest {
    param(
        [string]$Token,
        [int]$RequestId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/service-requests/$RequestId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM service_requests WHERE request_id = @request_id"
        $params = @{ request_id = $RequestId }
        
        $serviceRequest = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $serviceRequest -or $serviceRequest.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/service-requests/$RequestId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Service request not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "SERVICE_REQUEST_VIEW" -User $user -Detail "Viewed service request: $RequestId"
        Write-ApiLog -Method "GET" -Endpoint "/service-requests/$RequestId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $serviceRequest[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-ServiceRequest failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/service-requests/$RequestId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-ServiceRequest {
    param(
        [string]$Token,
        [hashtable]$RequestData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $requiredFields = @("subject", "detail", "applicant")
        foreach ($field in $requiredFields) {
            if (-not $RequestData.ContainsKey($field) -or -not $RequestData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/service-requests" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $insertQuery = @"
INSERT INTO service_requests (subject, detail, status, applicant, requested_date, approved_by, approved_date, created_date, updated_date)
VALUES (@subject, @detail, @status, @applicant, @requested_date, @approved_by, @approved_date, @created_date, @updated_date)
"@
        
        $insertParams = @{
            subject = $RequestData["subject"]
            detail = $RequestData["detail"]
            status = if ($RequestData["status"]) { $RequestData["status"] } else { "Pending" }
            applicant = $RequestData["applicant"]
            requested_date = if ($RequestData["requested_date"]) { $RequestData["requested_date"] } else { Get-Date -Format "yyyy-MM-dd" }
            approved_by = $RequestData["approved_by"]
            approved_date = $RequestData["approved_date"]
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newRequestId = Get-LastInsertId
            Save-AuditLog -EventType "SERVICE_REQUEST_CREATE" -User $user -Detail "Created service request: $($RequestData['subject'])"
            Write-ApiLog -Method "POST" -Endpoint "/service-requests" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Service request created successfully"
                Data = @{ RequestId = $newRequestId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create service request"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-ServiceRequest failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/service-requests" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-ServiceRequest {
    param(
        [string]$Token,
        [int]$RequestId,
        [hashtable]$RequestData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM service_requests WHERE request_id = @request_id"
        $checkParams = @{ request_id = $RequestId }
        $existingRequest = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingRequest[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Service request not found"
                Data = $null
            }
        }
        
        if ($RequestData.ContainsKey("status")) {
            $validStatuses = @("Pending", "Under Review", "Approved", "Rejected", "Completed")
            if ($validStatuses -notcontains $RequestData["status"]) {
                Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Invalid status value"
                    Data = $null
                }
            }
            
            if ($RequestData["status"] -eq "Approved" -or $RequestData["status"] -eq "Rejected") {
                if (-not $RequestData.ContainsKey("approved_by")) {
                    $RequestData["approved_by"] = $user
                }
                if (-not $RequestData.ContainsKey("approved_date")) {
                    $RequestData["approved_date"] = Get-Date -Format "yyyy-MM-dd"
                }
            }
        }
        
        $updateFields = @()
        $updateParams = @{ request_id = $RequestId }
        
        $allowedFields = @("subject", "detail", "status", "applicant", "requested_date", "approved_by", "approved_date")
        
        foreach ($field in $allowedFields) {
            if ($RequestData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $RequestData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE service_requests SET $($updateFields -join ', ') WHERE request_id = @request_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "SERVICE_REQUEST_UPDATE" -User $user -Detail "Updated service request: $RequestId"
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Service request updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update service request"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-ServiceRequest failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/service-requests/$RequestId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-ServiceRequest {
    param(
        [string]$Token,
        [int]$RequestId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT subject FROM service_requests WHERE request_id = @request_id"
        $checkParams = @{ request_id = $RequestId }
        $existingRequest = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingRequest -or $existingRequest.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Service request not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM service_requests WHERE request_id = @request_id"
        $deleteParams = @{ request_id = $RequestId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "SERVICE_REQUEST_DELETE" -User $user -Detail "Deleted service request: $($existingRequest[0].subject)"
            Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Service request deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete service request"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-ServiceRequest failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/service-requests/$RequestId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Approve-ServiceRequest {
    param(
        [string]$Token,
        [int]$RequestId,
        [hashtable]$ApprovalData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT status FROM service_requests WHERE request_id = @request_id"
        $checkParams = @{ request_id = $RequestId }
        $existingRequest = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingRequest -or $existingRequest.Count -eq 0) {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Service request not found"
                Data = $null
            }
        }
        
        $currentStatus = $existingRequest[0].status
        if ($currentStatus -eq "Approved" -or $currentStatus -eq "Rejected" -or $currentStatus -eq "Completed") {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "Service request cannot be approved in current status: $currentStatus"
                Data = $null
            }
        }
        
        $action = if ($ApprovalData.ContainsKey("action")) { $ApprovalData["action"] } else { "approve" }
        $comments = if ($ApprovalData.ContainsKey("comments")) { $ApprovalData["comments"] } else { "" }
        
        $newStatus = if ($action -eq "approve") { "Approved" } else { "Rejected" }
        
        $updateQuery = @"
UPDATE service_requests 
SET status = @status, approved_by = @approved_by, approved_date = @approved_date, updated_date = @updated_date
WHERE request_id = @request_id
"@
        
        $updateParams = @{
            status = $newStatus
            approved_by = $user
            approved_date = Get-Date -Format "yyyy-MM-dd"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            request_id = $RequestId
        }
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            $actionText = if ($action -eq "approve") { "approved" } else { "rejected" }
            Save-AuditLog -EventType "SERVICE_REQUEST_APPROVAL" -User $user -Detail "Service request $actionText: $RequestId - $comments"
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Service request $actionText successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to process approval"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Approve-ServiceRequest failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-ServiceRequests, Get-ServiceRequest, New-ServiceRequest, Update-ServiceRequest, Remove-ServiceRequest, Approve-ServiceRequest