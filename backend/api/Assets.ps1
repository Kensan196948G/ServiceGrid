# Assets.ps1 - 資産管理API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Get-Assets {
    param(
        [string]$Token,
        [int]$Page = 1,
        [int]$PageSize = 20,
        [string]$AssetNo = "",
        [string]$Name = "",
        [string]$Type = "",
        [string]$Status = ""
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/assets" -StatusCode 401 -User "UNAUTHORIZED"
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
        
        if ($AssetNo) {
            $whereClause += " AND asset_no LIKE @asset_no"
            $params["asset_no"] = "%$AssetNo%"
        }
        
        if ($Name) {
            $whereClause += " AND name LIKE @name"
            $params["name"] = "%$Name%"
        }
        
        if ($Type) {
            $whereClause += " AND type = @type"
            $params["type"] = $Type
        }
        
        if ($Status) {
            $whereClause += " AND status = @status"
            $params["status"] = $Status
        }
        
        $countQuery = "SELECT COUNT(*) as total FROM assets $whereClause"
        $countResult = Invoke-SqlQuery -Query $countQuery -Parameters $params
        $totalCount = $countResult[0].total
        
        $dataQuery = "SELECT * FROM assets $whereClause ORDER BY asset_id DESC LIMIT $PageSize OFFSET $offset"
        $assets = Invoke-SqlQuery -Query $dataQuery -Parameters $params
        
        Save-AuditLog -EventType "ASSET_VIEW" -User $user -Detail "Viewed assets list (Page: $Page)"
        Write-ApiLog -Method "GET" -Endpoint "/assets" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = @{
                Assets = $assets
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
        Write-LogEntry -Level "ERROR" -Message "Get-Assets failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/assets" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-Asset {
    param(
        [string]$Token,
        [int]$AssetId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/assets/$AssetId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT * FROM assets WHERE asset_id = @asset_id"
        $params = @{ asset_id = $AssetId }
        
        $asset = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $asset -or $asset.Count -eq 0) {
            Write-ApiLog -Method "GET" -Endpoint "/assets/$AssetId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Asset not found"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "ASSET_VIEW" -User $user -Detail "Viewed asset: $AssetId"
        Write-ApiLog -Method "GET" -Endpoint "/assets/$AssetId" -StatusCode 200 -User $user
        
        return @{
            Status = 200
            Message = "Success"
            Data = $asset[0]
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-Asset failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/assets/$AssetId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function New-Asset {
    param(
        [string]$Token,
        [hashtable]$AssetData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $requiredFields = @("asset_no", "name", "type")
        foreach ($field in $requiredFields) {
            if (-not $AssetData.ContainsKey($field) -or -not $AssetData[$field]) {
                Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM assets WHERE asset_no = @asset_no"
        $checkParams = @{ asset_no = $AssetData["asset_no"] }
        $existingAsset = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingAsset[0].count -gt 0) {
            Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 409 -User $user
            return @{
                Status = 409
                Message = "Asset number already exists"
                Data = $null
            }
        }
        
        $insertQuery = @"
INSERT INTO assets (asset_no, name, type, user, location, status, warranty_end, created_date, updated_date)
VALUES (@asset_no, @name, @type, @user, @location, @status, @warranty_end, @created_date, @updated_date)
"@
        
        $insertParams = @{
            asset_no = $AssetData["asset_no"]
            name = $AssetData["name"]
            type = $AssetData["type"]
            user = $AssetData["user"]
            location = $AssetData["location"]
            status = if ($AssetData["status"]) { $AssetData["status"] } else { "Active" }
            warranty_end = $AssetData["warranty_end"]
            created_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $result = Invoke-SqlNonQuery -Query $insertQuery -Parameters $insertParams
        
        if ($result -gt 0) {
            $newAssetId = Get-LastInsertId
            Save-AuditLog -EventType "ASSET_CREATE" -User $user -Detail "Created asset: $($AssetData['asset_no'])"
            Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 201 -User $user
            
            return @{
                Status = 201
                Message = "Asset created successfully"
                Data = @{ AssetId = $newAssetId }
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to create asset"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "New-Asset failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/assets" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Update-Asset {
    param(
        [string]$Token,
        [int]$AssetId,
        [hashtable]$AssetData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator", "operator"))) {
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT COUNT(*) as count FROM assets WHERE asset_id = @asset_id"
        $checkParams = @{ asset_id = $AssetId }
        $existingAsset = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if ($existingAsset[0].count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Asset not found"
                Data = $null
            }
        }
        
        $updateFields = @()
        $updateParams = @{ asset_id = $AssetId }
        
        $allowedFields = @("asset_no", "name", "type", "user", "location", "status", "warranty_end")
        
        foreach ($field in $allowedFields) {
            if ($AssetData.ContainsKey($field)) {
                $updateFields += "$field = @$field"
                $updateParams[$field] = $AssetData[$field]
            }
        }
        
        if ($updateFields.Count -eq 0) {
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "No valid fields to update"
                Data = $null
            }
        }
        
        $updateFields += "updated_date = @updated_date"
        $updateParams["updated_date"] = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $updateQuery = "UPDATE assets SET $($updateFields -join ', ') WHERE asset_id = @asset_id"
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "ASSET_UPDATE" -User $user -Detail "Updated asset: $AssetId"
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Asset updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update asset"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Asset failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/assets/$AssetId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Remove-Asset {
    param(
        [string]$Token,
        [int]$AssetId
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not (Test-UserRole -Token $Token -RequiredRoles @("administrator"))) {
            Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 403 -User $user
            return @{
                Status = 403
                Message = "Insufficient permissions"
                Data = $null
            }
        }
        
        $checkQuery = "SELECT asset_no FROM assets WHERE asset_id = @asset_id"
        $checkParams = @{ asset_id = $AssetId }
        $existingAsset = Invoke-SqlQuery -Query $checkQuery -Parameters $checkParams
        
        if (-not $existingAsset -or $existingAsset.Count -eq 0) {
            Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "Asset not found"
                Data = $null
            }
        }
        
        $deleteQuery = "DELETE FROM assets WHERE asset_id = @asset_id"
        $deleteParams = @{ asset_id = $AssetId }
        
        $result = Invoke-SqlNonQuery -Query $deleteQuery -Parameters $deleteParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "ASSET_DELETE" -User $user -Detail "Deleted asset: $($existingAsset[0].asset_no)"
            Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Asset deleted successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to delete asset"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Remove-Asset failed: $($_.Exception.Message)"
        Write-ApiLog -Method "DELETE" -Endpoint "/assets/$AssetId" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Get-Assets, Get-Asset, New-Asset, Update-Asset, Remove-Asset