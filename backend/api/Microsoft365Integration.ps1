# Microsoft 365 Integration API for ITSM Platform
# Provides integration with Microsoft 365 services
# Version: 2025.6.7

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force

# Enhanced Microsoft Graph API configuration with error handling
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
    
    # Enhanced configuration for reliability
    MaxRetries = 3
    RetryDelaySeconds = @(2, 5, 10)  # Exponential backoff
    TimeoutSeconds = 60
    RateLimitBuffer = 10  # Reserve 10% of rate limit
    
    # Rate limiting tracking
    RateLimit = @{
        Remaining = 10000
        Reset = (Get-Date).AddHours(1)
        LastChecked = Get-Date
    }
    
    # Connection status
    ConnectionStatus = 'Unknown'
    LastConnectivityCheck = $null
    
    # Performance metrics
    Metrics = @{
        TotalRequests = 0
        SuccessfulRequests = 0
        FailedRequests = 0
        RetryCount = 0
        AverageResponseTime = 0
        LastResetTime = Get-Date
    }
    
    # Cache settings
    EnableCache = $true
    CacheExpiryMinutes = 15
    MaxCacheEntries = 1000
}

# Initialize M365 cache
$global:M365Cache = @{
    Users = @{}
    Groups = @{}
    Licenses = @{}
    Teams = @{}
    LastCleaned = Get-Date
}

# Enhanced Microsoft Graph access token with retry logic
function Get-M365AccessToken {
    param(
        [int]$MaxRetries = 3
    )
    
    # Check if current token is still valid
    if ($global:M365Config.AccessToken -and $global:M365Config.TokenExpiry -gt (Get-Date).AddMinutes(5)) {
        return $global:M365Config.AccessToken
    }
    
    $retryCount = 0
    $lastError = $null
    
    while ($retryCount -lt $MaxRetries) {
        try {
            Write-APILog "Requesting Microsoft 365 access token (attempt $($retryCount + 1)/$MaxRetries)" -Level "DEBUG"
            
            # Validate configuration
            if (-not $global:M365Config.TenantId -or -not $global:M365Config.ClientId -or -not $global:M365Config.ClientSecret) {
                throw "Microsoft 365 configuration is incomplete. Please check TenantId, ClientId, and ClientSecret."
            }
            
            $tokenUrl = "https://login.microsoftonline.com/$($global:M365Config.TenantId)/oauth2/v2.0/token"
            
            $body = @{
                client_id = $global:M365Config.ClientId
                client_secret = $global:M365Config.ClientSecret
                scope = $global:M365Config.Scopes -join " "
                grant_type = "client_credentials"
            }
            
            $splat = @{
                Uri = $tokenUrl
                Method = "POST"
                Body = $body
                ContentType = "application/x-www-form-urlencoded"
                TimeoutSec = $global:M365Config.TimeoutSeconds
                ErrorAction = "Stop"
            }
            
            $response = Invoke-RestMethod @splat
            
            $global:M365Config.AccessToken = $response.access_token
            $global:M365Config.TokenExpiry = (Get-Date).AddSeconds($response.expires_in - 300)  # 5 minute buffer
            $global:M365Config.ConnectionStatus = 'Connected'
            $global:M365Config.LastConnectivityCheck = Get-Date
            
            Write-APILog "Microsoft 365 access token obtained successfully" -Level "INFO"
            return $response.access_token
            
        } catch {
            $lastError = $_.Exception.Message
            $retryCount++
            $global:M365Config.ConnectionStatus = 'Error'
            
            Write-APILog "Failed to obtain M365 access token (attempt $retryCount/$MaxRetries): $lastError" -Level "WARNING"
            
            # Check if this is a retryable error
            $isRetryable = $lastError -match "timeout|network|connection|temporary|rate|5\d\d"
            
            if ($retryCount -lt $MaxRetries -and $isRetryable) {
                $delay = $global:M365Config.RetryDelaySeconds[[Math]::Min($retryCount - 1, $global:M365Config.RetryDelaySeconds.Length - 1)]
                Write-APILog "Retrying M365 authentication in $delay seconds..." -Level "INFO"
                Start-Sleep -Seconds $delay
            } elseif (-not $isRetryable) {
                Write-APILog "Non-retryable authentication error: $lastError" -Level "ERROR"
                break
            }
        }
    }
    
    $global:M365Config.Metrics.FailedRequests++
    throw "Microsoft 365 authentication failed after $MaxRetries attempts: $lastError"
}

# Enhanced Graph API request with rate limiting and retry logic
function Invoke-GraphAPIRequest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null,
        [switch]$UseBeta = $false,
        [int]$MaxRetries = $null,
        [switch]$SkipCache = $false
    )
    
    if (-not $MaxRetries) { $MaxRetries = $global:M365Config.MaxRetries }
    $requestStart = Get-Date
    $global:M365Config.Metrics.TotalRequests++
    
    # Check cache first (for GET requests)
    if ($Method -eq "GET" -and -not $SkipCache -and $global:M365Config.EnableCache) {
        $cacheKey = "$Method`:$Endpoint"
        $cachedResult = Get-M365CachedResult -Key $cacheKey
        if ($cachedResult) {
            Write-APILog "Returning cached result for: $Endpoint" -Level "DEBUG"
            return $cachedResult
        }
    }
    
    # Check rate limiting
    if (-not (Test-M365RateLimit)) {
        throw "Microsoft 365 API rate limit exceeded. Please wait before making more requests."
    }
    
    $retryCount = 0
    $lastError = $null
    
    while ($retryCount -lt $MaxRetries) {
        try {
            $token = Get-M365AccessToken
            $baseUrl = if ($UseBeta) { $global:M365Config.BetaBaseUrl } else { $global:M365Config.GraphBaseUrl }
            $uri = "$baseUrl/$Endpoint"
            
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
                "ConsistencyLevel" = "eventual"  # For advanced queries
            }
            
            $params = @{
                Uri = $uri
                Method = $Method
                Headers = $headers
                TimeoutSec = $global:M365Config.TimeoutSeconds
                ErrorAction = "Stop"
            }
            
            if ($Body) {
                $params.Body = $Body | ConvertTo-Json -Depth 10 -Compress
            }
            
            Write-APILog "Making Graph API request: $Method $Endpoint" -Level "DEBUG"
            
            $response = Invoke-RestMethod @params
            
            # Update rate limit info from response headers
            Update-M365RateLimit -Response $response
            
            # Cache successful GET responses
            if ($Method -eq "GET" -and $global:M365Config.EnableCache -and -not $SkipCache) {
                Set-M365CachedResult -Key "$Method`:$Endpoint" -Value $response
            }
            
            # Update metrics
            $responseTime = ((Get-Date) - $requestStart).TotalMilliseconds
            Update-M365Metrics -Success $true -ResponseTime $responseTime -RetryCount $retryCount
            
            return $response
            
        } catch {
            $lastError = $_.Exception.Message
            $retryCount++
            
            # Parse HTTP status code
            $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
            
            Write-APILog "Graph API request failed (attempt $retryCount/$MaxRetries): $lastError (Status: $statusCode)" -Level "WARNING"
            
            # Handle specific error codes
            $shouldRetry = $false
            switch ($statusCode) {
                429 {  # Too Many Requests
                    $shouldRetry = $true
                    $retryAfter = Get-RetryAfterHeader -Exception $_.Exception
                    $delay = if ($retryAfter) { $retryAfter } else { [Math]::Pow(2, $retryCount) * 2 }
                    Write-APILog "Rate limited. Waiting $delay seconds before retry..." -Level "INFO"
                    Start-Sleep -Seconds $delay
                }
                503 {  # Service Unavailable
                    $shouldRetry = $true
                    $delay = [Math]::Pow(2, $retryCount) * 2
                    Write-APILog "Service unavailable. Waiting $delay seconds before retry..." -Level "INFO"
                    Start-Sleep -Seconds $delay
                }
                500 { # Internal Server Error
                    $shouldRetry = $true
                    $delay = [Math]::Pow(2, $retryCount) * 2
                    Start-Sleep -Seconds $delay
                }
                401 {  # Unauthorized - token might be expired
                    if ($retryCount -eq 1) {
                        Write-APILog "Authentication failed, clearing token cache..." -Level "INFO"
                        $global:M365Config.AccessToken = $null
                        $global:M365Config.TokenExpiry = $null
                        $shouldRetry = $true
                    }
                }
                default {
                    # For other errors, check if it's network-related
                    if ($lastError -match "timeout|network|connection|DNS") {
                        $shouldRetry = $true
                        $delay = $global:M365Config.RetryDelaySeconds[[Math]::Min($retryCount - 1, $global:M365Config.RetryDelaySeconds.Length - 1)]
                        Start-Sleep -Seconds $delay
                    }
                }
            }
            
            if (-not $shouldRetry -or $retryCount -ge $MaxRetries) {
                break
            }
        }
    }
    
    # Update metrics for failed request
    $responseTime = ((Get-Date) - $requestStart).TotalMilliseconds
    Update-M365Metrics -Success $false -ResponseTime $responseTime -RetryCount $retryCount
    $global:M365Config.Metrics.FailedRequests++
    
    throw "Graph API request failed after $MaxRetries attempts: $lastError"
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

# Test Microsoft 365 rate limiting
function Test-M365RateLimit {
    $now = Get-Date
    
    # Reset rate limit tracking if needed
    if ($now -gt $global:M365Config.RateLimit.Reset) {
        $global:M365Config.RateLimit.Remaining = 10000  # Conservative estimate
        $global:M365Config.RateLimit.Reset = $now.AddHours(1)
    }
    
    # Check if we have enough requests remaining
    $bufferRequests = [Math]::Ceiling($global:M365Config.RateLimit.Remaining * ($global:M365Config.RateLimitBuffer / 100))
    return $global:M365Config.RateLimit.Remaining -gt $bufferRequests
}

# Update rate limit information from response headers
function Update-M365RateLimit {
    param($Response)
    
    try {
        # Microsoft Graph uses different headers than standard REST APIs
        # Look for throttling information in response
        if ($Response.PSObject.Properties['@odata.deltaLink'] -or $Response.PSObject.Properties['@odata.nextLink']) {
            # This is a successful response, assume good rate limit status
            $global:M365Config.RateLimit.LastChecked = Get-Date
        }
    } catch {
        # Ignore errors in rate limit parsing
    }
}

# Get retry-after header value
function Get-RetryAfterHeader {
    param($Exception)
    
    try {
        if ($Exception.Response -and $Exception.Response.Headers['Retry-After']) {
            $retryAfter = $Exception.Response.Headers['Retry-After']
            if ($retryAfter -match '^\\d+$') {
                return [int]$retryAfter
            }
        }
    } catch {
        # Ignore errors
    }
    
    return $null
}

# Get cached result
function Get-M365CachedResult {
    param([string]$Key)
    
    if (-not $global:M365Cache.ContainsKey($Key)) {
        return $null
    }
    
    $cached = $global:M365Cache[$Key]
    $age = ((Get-Date) - $cached.Timestamp).TotalMinutes
    
    if ($age -gt $global:M365Config.CacheExpiryMinutes) {
        $global:M365Cache.Remove($Key)
        return $null
    }
    
    return $cached.Data
}

# Set cached result
function Set-M365CachedResult {
    param(
        [string]$Key,
        [object]$Value
    )
    
    # Limit cache size
    if ($global:M365Cache.Count -gt $global:M365Config.MaxCacheEntries) {
        Clear-M365ExpiredCache
    }
    
    $global:M365Cache[$Key] = @{
        Data = $Value
        Timestamp = Get-Date
    }
}

# Clear expired cache entries
function Clear-M365ExpiredCache {
    $now = Get-Date
    $expiredKeys = @()
    
    foreach ($key in $global:M365Cache.Keys) {
        if ($key -eq 'LastCleaned') { continue }
        
        $cached = $global:M365Cache[$key]
        if ($cached -and $cached.Timestamp) {
            $age = ($now - $cached.Timestamp).TotalMinutes
            if ($age -gt $global:M365Config.CacheExpiryMinutes) {
                $expiredKeys += $key
            }
        }
    }
    
    foreach ($key in $expiredKeys) {
        $global:M365Cache.Remove($key)
    }
    
    $global:M365Cache.LastCleaned = $now
    
    if ($expiredKeys.Count -gt 0) {
        Write-APILog \"Cleared $($expiredKeys.Count) expired M365 cache entries\" -Level \"DEBUG\"
    }
}

# Update performance metrics
function Update-M365Metrics {
    param(
        [bool]$Success,
        [double]$ResponseTime,
        [int]$RetryCount = 0
    )
    
    if ($Success) {
        $global:M365Config.Metrics.SuccessfulRequests++
    }
    
    if ($RetryCount -gt 0) {
        $global:M365Config.Metrics.RetryCount += $RetryCount
    }
    
    # Update average response time
    $total = $global:M365Config.Metrics.SuccessfulRequests + $global:M365Config.Metrics.FailedRequests
    if ($total -gt 0) {
        $global:M365Config.Metrics.AverageResponseTime = 
            (($global:M365Config.Metrics.AverageResponseTime * ($total - 1)) + $ResponseTime) / $total
    }
}

# Get M365 performance metrics
function Get-M365PerformanceMetrics {
    $uptime = ((Get-Date) - $global:M365Config.Metrics.LastResetTime).TotalHours
    $totalRequests = $global:M365Config.Metrics.SuccessfulRequests + $global:M365Config.Metrics.FailedRequests
    $successRate = if ($totalRequests -gt 0) { 
        [math]::Round(($global:M365Config.Metrics.SuccessfulRequests / $totalRequests) * 100, 2) 
    } else { 0 }
    
    return @{
        TotalRequests = $totalRequests
        SuccessfulRequests = $global:M365Config.Metrics.SuccessfulRequests
        FailedRequests = $global:M365Config.Metrics.FailedRequests
        SuccessRate = \"$successRate%\"
        RetryCount = $global:M365Config.Metrics.RetryCount
        AverageResponseTime = \"$([math]::Round($global:M365Config.Metrics.AverageResponseTime, 2))ms\"
        ConnectionStatus = $global:M365Config.ConnectionStatus
        LastConnectivityCheck = if ($global:M365Config.LastConnectivityCheck) {
            $global:M365Config.LastConnectivityCheck.ToString(\"yyyy-MM-ddTHH:mm:ss.fffZ\")
        } else { \"Never\" }
        TokenExpiry = if ($global:M365Config.TokenExpiry) {
            $global:M365Config.TokenExpiry.ToString(\"yyyy-MM-ddTHH:mm:ss.fffZ\")
        } else { \"Not authenticated\" }
        CacheSize = $global:M365Cache.Count - 1  # Exclude LastCleaned entry
        UptimeHours = [math]::Round($uptime, 2)
        RateLimitStatus = @{
            Remaining = $global:M365Config.RateLimit.Remaining
            Reset = $global:M365Config.RateLimit.Reset.ToString(\"yyyy-MM-ddTHH:mm:ss.fffZ\")
        }
    }
}

# Test Microsoft 365 connectivity
function Test-M365Connectivity {
    param(
        [int]$TimeoutSeconds = 30
    )
    
    try {
        Write-APILog \"Testing Microsoft 365 connectivity...\" -Level \"DEBUG\"
        
        # Try to get a simple endpoint
        $testResponse = Invoke-GraphAPIRequest -Endpoint \"organization\" -MaxRetries 1
        
        if ($testResponse -and $testResponse.value) {
            $global:M365Config.ConnectionStatus = 'Connected'
            $global:M365Config.LastConnectivityCheck = Get-Date
            Write-APILog \"Microsoft 365 connectivity test successful\" -Level \"INFO\"
            return $true
        } else {
            throw \"No data returned from test endpoint\"
        }
        
    } catch {
        $global:M365Config.ConnectionStatus = 'Error'
        $global:M365Config.LastConnectivityCheck = Get-Date
        Write-APILog \"Microsoft 365 connectivity test failed: $($_.Exception.Message)\" -Level \"ERROR\"
        return $false
    }
}

# Initialize tables and setup periodic cache cleanup
Initialize-M365Tables

# Setup cache cleanup timer (every 30 minutes)
Register-EngineEvent -SourceIdentifier \"M365CacheCleanup\" -Forward
$null = New-Object System.Timers.Timer | ForEach-Object {
    $_.Interval = 1800000  # 30 minutes
    $_.AutoReset = $true
    $_.Add_Elapsed({ Clear-M365ExpiredCache })
    $_.Start()
    $global:M365CacheCleanupTimer = $_
}

Write-APILog \"Microsoft 365 integration initialized with enhanced error handling and rate limiting\" -Level \"INFO\""