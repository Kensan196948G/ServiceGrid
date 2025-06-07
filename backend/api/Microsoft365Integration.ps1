# Microsoft 365 Integration API for ITSM Platform
# Provides integration with Microsoft 365 services
# Version: 2025.6.7

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force

# Microsoft Graph API configuration
$global:M365Config = @{
    TenantId = $env:M365_TENANT_ID
    ClientId = $env:M365_CLIENT_ID
    ClientSecret = $env:M365_CLIENT_SECRET
    GraphBaseUrl = "https://graph.microsoft.com/v1.0"
    BetaBaseUrl = "https://graph.microsoft.com/beta"
    Scopes = @(
        "https://graph.microsoft.com/User.Read.All",
        "https://graph.microsoft.com/Group.Read.All",
        "https://graph.microsoft.com/Directory.Read.All",
        "https://graph.microsoft.com/Organization.Read.All",
        "https://graph.microsoft.com/AuditLog.Read.All"
    )
    AccessToken = $null
    TokenExpiry = $null
}

# Get Microsoft Graph access token
function Get-M365AccessToken {
    try {
        # Check if current token is still valid
        if ($global:M365Config.AccessToken -and $global:M365Config.TokenExpiry -gt (Get-Date).AddMinutes(5)) {
            return $global:M365Config.AccessToken
        }
        
        # Request new token
        $tokenUrl = "https://login.microsoftonline.com/$($global:M365Config.TenantId)/oauth2/v2.0/token"
        
        $body = @{
            client_id = $global:M365Config.ClientId
            client_secret = $global:M365Config.ClientSecret
            scope = $global:M365Config.Scopes -join " "
            grant_type = "client_credentials"
        }
        
        $response = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
        
        $global:M365Config.AccessToken = $response.access_token
        $global:M365Config.TokenExpiry = (Get-Date).AddSeconds($response.expires_in)
        
        Write-APILog "Microsoft 365 access token obtained successfully" -Level "INFO"
        return $response.access_token
        
    } catch {
        Write-APILog "Failed to obtain Microsoft 365 access token: $($_.Exception.Message)" -Level "ERROR"
        throw "Microsoft 365 authentication failed: $($_.Exception.Message)"
    }
}

# Make authenticated Graph API request
function Invoke-GraphAPIRequest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null,
        [switch]$UseBeta = $false
    )
    
    try {
        $token = Get-M365AccessToken
        $baseUrl = if ($UseBeta) { $global:M365Config.BetaBaseUrl } else { $global:M365Config.GraphBaseUrl }
        $uri = "$baseUrl/$Endpoint"
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        return $response
        
    } catch {
        Write-APILog "Graph API request failed: $($_.Exception.Message)" -Level "ERROR"
        throw "Graph API error: $($_.Exception.Message)"
    }
}

# Get Microsoft 365 users
function Invoke-M365UsersGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $top = [math]::Min([int]($queryParams.top -or 100), 999)
        $skip = [int]($queryParams.skip -or 0)
        $filter = $queryParams.filter
        $search = $queryParams.search
        
        # Build Graph API query
        $endpoint = "users"
        $params = @()
        
        if ($top) { $params += "`$top=$top" }
        if ($skip) { $params += "`$skip=$skip" }
        if ($filter) { $params += "`$filter=$filter" }
        if ($search) { $params += "`$search=`"$search`"" }
        
        # Add common properties
        $select = "id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones,accountEnabled,createdDateTime,lastSignInDateTime"
        $params += "`$select=$select"
        
        if ($params.Count -gt 0) {
            $endpoint += "?" + ($params -join "&")
        }
        
        Write-APILog "Fetching Microsoft 365 users: $endpoint" -Level "DEBUG"
        
        $response = Invoke-GraphAPIRequest -Endpoint $endpoint
        
        # Transform data for ITSM format
        $users = @()
        foreach ($user in $response.value) {
            $users += @{
                id = $user.id
                displayName = $user.displayName
                email = $user.mail -or $user.userPrincipalName
                userPrincipalName = $user.userPrincipalName
                jobTitle = $user.jobTitle
                department = $user.department
                officeLocation = $user.officeLocation
                mobilePhone = $user.mobilePhone
                businessPhones = $user.businessPhones
                accountEnabled = $user.accountEnabled
                createdDateTime = $user.createdDateTime
                lastSignInDateTime = $user.lastSignInDateTime
                source = "Microsoft365"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        # Create audit log entry
        Add-AuditLog -EventType "M365_USERS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($users.Count) Microsoft 365 users"
        
        return @{
            Status = "Success"
            Message = "Microsoft 365 users retrieved successfully"
            Data = $users
            Pagination = @{
                Total = if ($response.'@odata.count') { $response.'@odata.count' } else { $users.Count }
                Skip = $skip
                Top = $top
                NextLink = $response.'@odata.nextLink'
            }
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in M365 users query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Microsoft 365 users: $($_.Exception.Message)"
    }
}

# Get Microsoft 365 licenses
function Invoke-M365LicensesGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        Write-APILog "Fetching Microsoft 365 licenses" -Level "DEBUG"
        
        # Get organization subscriptions
        $subscriptions = Invoke-GraphAPIRequest -Endpoint "subscribedSkus"
        
        # Get license assignments
        $assignments = Invoke-GraphAPIRequest -Endpoint "users?`$select=id,displayName,userPrincipalName,assignedLicenses"
        
        # Process license data
        $licenseData = @{
            subscriptions = @()
            assignments = @()
            summary = @{
                totalLicenses = 0
                assignedLicenses = 0
                availableLicenses = 0
            }
        }
        
        # Process subscriptions
        foreach ($sku in $subscriptions.value) {
            $licenseData.subscriptions += @{
                skuId = $sku.skuId
                skuPartNumber = $sku.skuPartNumber
                servicePlans = $sku.servicePlans
                prepaidUnits = $sku.prepaidUnits
                consumedUnits = $sku.consumedUnits
                capabilityStatus = $sku.capabilityStatus
            }
            
            $licenseData.summary.totalLicenses += $sku.prepaidUnits.enabled
            $licenseData.summary.assignedLicenses += $sku.consumedUnits
        }
        
        $licenseData.summary.availableLicenses = $licenseData.summary.totalLicenses - $licenseData.summary.assignedLicenses
        
        # Process assignments
        foreach ($user in $assignments.value) {
            if ($user.assignedLicenses -and $user.assignedLicenses.Count -gt 0) {
                $licenseData.assignments += @{
                    userId = $user.id
                    displayName = $user.displayName
                    userPrincipalName = $user.userPrincipalName
                    assignedLicenses = $user.assignedLicenses
                }
            }
        }
        
        Add-AuditLog -EventType "M365_LICENSES_QUERY" -UserId $authResult.User.user_id -Details "Retrieved Microsoft 365 license information"
        
        return @{
            Status = "Success"
            Message = "Microsoft 365 licenses retrieved successfully"
            Data = $licenseData
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in M365 licenses query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Microsoft 365 licenses: $($_.Exception.Message)"
    }
}

# Get Microsoft 365 groups
function Invoke-M365GroupsGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $top = [math]::Min([int]($queryParams.top -or 100), 999)
        $skip = [int]($queryParams.skip -or 0)
        $filter = $queryParams.filter
        
        # Build Graph API query
        $endpoint = "groups"
        $params = @()
        
        if ($top) { $params += "`$top=$top" }
        if ($skip) { $params += "`$skip=$skip" }
        if ($filter) { $params += "`$filter=$filter" }
        
        # Add common properties
        $select = "id,displayName,description,mail,mailEnabled,securityEnabled,groupTypes,membershipRule,createdDateTime"
        $params += "`$select=$select"
        
        if ($params.Count -gt 0) {
            $endpoint += "?" + ($params -join "&")
        }
        
        Write-APILog "Fetching Microsoft 365 groups: $endpoint" -Level "DEBUG"
        
        $response = Invoke-GraphAPIRequest -Endpoint $endpoint
        
        # Transform data for ITSM format
        $groups = @()
        foreach ($group in $response.value) {
            $groupType = "Security"
            if ($group.groupTypes -contains "Unified") {
                $groupType = "Microsoft365"
            } elseif ($group.mailEnabled) {
                $groupType = "Distribution"
            }
            
            $groups += @{
                id = $group.id
                displayName = $group.displayName
                description = $group.description
                mail = $group.mail
                groupType = $groupType
                mailEnabled = $group.mailEnabled
                securityEnabled = $group.securityEnabled
                membershipRule = $group.membershipRule
                createdDateTime = $group.createdDateTime
                source = "Microsoft365"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        Add-AuditLog -EventType "M365_GROUPS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($groups.Count) Microsoft 365 groups"
        
        return @{
            Status = "Success"
            Message = "Microsoft 365 groups retrieved successfully"
            Data = $groups
            Pagination = @{
                Total = if ($response.'@odata.count') { $response.'@odata.count' } else { $groups.Count }
                Skip = $skip
                Top = $top
                NextLink = $response.'@odata.nextLink'
            }
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in M365 groups query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Microsoft 365 groups: $($_.Exception.Message)"
    }
}

# Get Microsoft 365 Teams
function Invoke-M365TeamsGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        Write-APILog "Fetching Microsoft Teams" -Level "DEBUG"
        
        # Get all Teams (which are Microsoft 365 groups with Teams enabled)
        $endpoint = "groups?`$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&`$select=id,displayName,description,mail,createdDateTime"
        $response = Invoke-GraphAPIRequest -Endpoint $endpoint
        
        $teams = @()
        foreach ($team in $response.value) {
            # Get additional team details
            try {
                $teamDetails = Invoke-GraphAPIRequest -Endpoint "teams/$($team.id)"
                $channels = Invoke-GraphAPIRequest -Endpoint "teams/$($team.id)/channels"
                
                $teams += @{
                    id = $team.id
                    displayName = $team.displayName
                    description = $team.description
                    mail = $team.mail
                    visibility = $teamDetails.visibility
                    isArchived = $teamDetails.isArchived
                    webUrl = $teamDetails.webUrl
                    channelCount = $channels.value.Count
                    createdDateTime = $team.createdDateTime
                    source = "MicrosoftTeams"
                    syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                }
            } catch {
                # If we can't get team details, include basic info
                $teams += @{
                    id = $team.id
                    displayName = $team.displayName
                    description = $team.description
                    mail = $team.mail
                    createdDateTime = $team.createdDateTime
                    source = "MicrosoftTeams"
                    syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    error = "Unable to retrieve detailed team information"
                }
            }
        }
        
        Add-AuditLog -EventType "M365_TEAMS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($teams.Count) Microsoft Teams"
        
        return @{
            Status = "Success"
            Message = "Microsoft Teams retrieved successfully"
            Data = $teams
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in M365 Teams query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Microsoft Teams: $($_.Exception.Message)"
    }
}

# Get OneDrive usage
function Invoke-M365OneDriveGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        Write-APILog "Fetching OneDrive usage data" -Level "DEBUG"
        
        # Get OneDrive usage reports
        $usageResponse = Invoke-GraphAPIRequest -Endpoint "reports/getOneDriveUsageAccountDetail(period='D30')" -UseBeta
        
        # Parse CSV response
        $csvData = $usageResponse -split "`n"
        $headers = ($csvData[0] -split ",").Trim('"')
        
        $oneDriveData = @()
        for ($i = 1; $i -lt $csvData.Count; $i++) {
            if ($csvData[$i].Trim()) {
                $values = ($csvData[$i] -split ",").Trim('"')
                $record = @{}
                for ($j = 0; $j -lt $headers.Count; $j++) {
                    $record[$headers[$j]] = $values[$j]
                }
                $oneDriveData += $record
            }
        }
        
        Add-AuditLog -EventType "M365_ONEDRIVE_QUERY" -UserId $authResult.User.user_id -Details "Retrieved OneDrive usage data for $($oneDriveData.Count) users"
        
        return @{
            Status = "Success"
            Message = "OneDrive usage data retrieved successfully"
            Data = $oneDriveData
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in OneDrive usage query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve OneDrive usage data: $($_.Exception.Message)"
    }
}

# Sync Microsoft 365 data to local database
function Invoke-M365SyncData {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if ($authResult.User.role -ne "administrator") {
            return Format-ErrorResponse -Message "管理者権限が必要です" -StatusCode 403
        }
        
        Write-APILog "Starting Microsoft 365 data synchronization" -Level "INFO"
        
        $syncResults = @{
            users = @{ synced = 0; errors = 0 }
            groups = @{ synced = 0; errors = 0 }
            licenses = @{ synced = 0; errors = 0 }
            startTime = Get-Date
            endTime = $null
            duration = $null
        }
        
        # Sync users
        try {
            $usersResponse = Invoke-GraphAPIRequest -Endpoint "users?`$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled"
            
            foreach ($user in $usersResponse.value) {
                try {
                    # Insert or update user in local database
                    $query = @"
                        INSERT OR REPLACE INTO m365_users (
                            m365_id, display_name, user_principal_name, mail, 
                            job_title, department, account_enabled, last_sync
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"@
                    
                    Invoke-DatabaseQuery -Query $query -Parameters @(
                        $user.id,
                        $user.displayName,
                        $user.userPrincipalName,
                        $user.mail,
                        $user.jobTitle,
                        $user.department,
                        $user.accountEnabled,
                        (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    )
                    
                    $syncResults.users.synced++
                } catch {
                    $syncResults.users.errors++
                    Write-APILog "Error syncing user $($user.userPrincipalName): $($_.Exception.Message)" -Level "ERROR"
                }
            }
        } catch {
            Write-APILog "Error during user sync: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Sync groups
        try {
            $groupsResponse = Invoke-GraphAPIRequest -Endpoint "groups?`$select=id,displayName,description,mail,groupTypes,securityEnabled"
            
            foreach ($group in $groupsResponse.value) {
                try {
                    $query = @"
                        INSERT OR REPLACE INTO m365_groups (
                            m365_id, display_name, description, mail, 
                            group_types, security_enabled, last_sync
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
"@
                    
                    Invoke-DatabaseQuery -Query $query -Parameters @(
                        $group.id,
                        $group.displayName,
                        $group.description,
                        $group.mail,
                        ($group.groupTypes -join ","),
                        $group.securityEnabled,
                        (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    )
                    
                    $syncResults.groups.synced++
                } catch {
                    $syncResults.groups.errors++
                    Write-APILog "Error syncing group $($group.displayName): $($_.Exception.Message)" -Level "ERROR"
                }
            }
        } catch {
            Write-APILog "Error during group sync: $($_.Exception.Message)" -Level "ERROR"
        }
        
        $syncResults.endTime = Get-Date
        $syncResults.duration = ($syncResults.endTime - $syncResults.startTime).TotalSeconds
        
        Add-AuditLog -EventType "M365_DATA_SYNC" -UserId $authResult.User.user_id -Details "Synced M365 data: $($syncResults.users.synced) users, $($syncResults.groups.synced) groups"
        
        Write-APILog "Microsoft 365 data synchronization completed in $($syncResults.duration) seconds" -Level "INFO"
        
        return @{
            Status = "Success"
            Message = "Microsoft 365 data synchronization completed"
            Data = $syncResults
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in M365 data sync: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to synchronize Microsoft 365 data: $($_.Exception.Message)"
    }
}

# Initialize Microsoft 365 integration tables
function Initialize-M365Tables {
    try {
        Write-APILog "Initializing Microsoft 365 integration tables" -Level "INFO"
        
        # Create M365 users table
        $createUsersTable = @"
            CREATE TABLE IF NOT EXISTS m365_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                m365_id TEXT UNIQUE NOT NULL,
                display_name TEXT,
                user_principal_name TEXT,
                mail TEXT,
                job_title TEXT,
                department TEXT,
                account_enabled BOOLEAN,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        # Create M365 groups table
        $createGroupsTable = @"
            CREATE TABLE IF NOT EXISTS m365_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                m365_id TEXT UNIQUE NOT NULL,
                display_name TEXT,
                description TEXT,
                mail TEXT,
                group_types TEXT,
                security_enabled BOOLEAN,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        # Create M365 licenses table
        $createLicensesTable = @"
            CREATE TABLE IF NOT EXISTS m365_licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku_id TEXT,
                sku_part_number TEXT,
                service_plans TEXT,
                prepared_units INTEGER,
                consumed_units INTEGER,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        Invoke-DatabaseQuery -Query $createUsersTable
        Invoke-DatabaseQuery -Query $createGroupsTable
        Invoke-DatabaseQuery -Query $createLicensesTable
        
        Write-APILog "Microsoft 365 integration tables created successfully" -Level "INFO"
        
    } catch {
        Write-APILog "Error creating M365 tables: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Initialize tables on module load
Initialize-M365Tables