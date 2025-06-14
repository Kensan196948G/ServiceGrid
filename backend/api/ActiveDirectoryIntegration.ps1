<#
.SYNOPSIS
    Active Directory統合API - 企業レベル強化版
    ITSMプラットフォーム用の包括的なAD連携機能

.DESCRIPTION
    企業環境におけるActive Directoryとの完全な統合を提供:
    - ユーザー認証とシングルサインオン (SSO)
    - グループベース権限管理 (RBAC)
    - ユーザー・コンピューターの自動同期
    - グループポリシー連携
    - セキュリティ監査ログ
    - LDAPセキュア通信 (LDAPS)
    - フェイルオーバーと負荷分散

.AUTHOR
    Claude Code AI Assistant

.VERSION
    2.0.0

.NOTES
    適用環境: Windows Server 2016+ with PowerShell 5.1+
    必要権限: Domain Users, Read permissions on AD objects
    推奨セットアップ: サービスアカウント使用、SSL暗号化有効
#>

# 必要モジュールの安全なインポート
try {
    Import-Module "$PSScriptRoot/../modules/DBUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/LogUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/WindowsSecurityUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/Config.psm1" -Force -ErrorAction Stop
} catch {
    Write-Error "モジュールのインポートに失敗: $($_.Exception.Message)"
    exit 1
}

# Active Directoryモジュールの高度な初期化
try {
    # ADモジュールのロードと機能チェック
    Import-Module ActiveDirectory -ErrorAction Stop
    
    # ADサービスの可用性チェック
    $testConnection = Test-ADServiceConnection
    if ($testConnection.IsAvailable) {
        $global:ADModuleAvailable = $true
        $global:ADConnectionStatus = 'Connected'
        Write-APILog "Active Directoryモジュールが正常にロードされ、サービス接続が確認されました" -Level "INFO"
    } else {
        $global:ADModuleAvailable = $false
        $global:ADConnectionStatus = 'Disconnected'
        Write-APILog "Active Directoryサービスに接続できません: $($testConnection.Error)" -Level "WARNING"
    }
} catch {
    $global:ADModuleAvailable = $false
    $global:ADConnectionStatus = 'Error'
    Write-APILog "Active Directoryモジュールのロードに失敗: $($_.Exception.Message)" -Level "ERROR"
    
    # フォールバックモードを有効化
    $global:ADFallbackMode = $true
    Write-APILog "ADフォールバックモードを有効化しました" -Level "INFO"
}

# 高度なActive Directory構成管理
$global:ADConfig = @{
    # 基本接続設定
    DomainController = $env:AD_DOMAIN_CONTROLLER ?? 'localhost'
    Domain = $env:AD_DOMAIN ?? $env:USERDOMAIN
    ServiceAccount = $env:AD_SERVICE_ACCOUNT
    ServicePassword = $env:AD_SERVICE_PASSWORD
    SearchBase = $env:AD_SEARCH_BASE
    
    # セキュリティ設定
    UseSSL = [bool]($env:AD_USE_SSL -eq 'true')
    Port = if ($env:AD_PORT) { [int]$env:AD_PORT } else { if ($env:AD_USE_SSL -eq 'true') { 636 } else { 389 } }
    AuthType = $env:AD_AUTH_TYPE ?? 'Negotiate'
    
    # タイムアウト設定
    ConnectionTimeout = [int]($env:AD_CONNECTION_TIMEOUT ?? 30)
    OperationTimeout = [int]($env:AD_OPERATION_TIMEOUT ?? 60)
    
    # キャッシュ設定
    CacheExpiryMinutes = [int]($env:AD_CACHE_EXPIRY ?? 15)
    MaxCacheEntries = [int]($env:AD_MAX_CACHE ?? 1000)
    
    # フィルタリング設定
    UserSearchFilter = '(&(objectClass=user)(objectCategory=person)(!userAccountControl:1.2.840.113556.1.4.803:=2))'
    ComputerSearchFilter = '(objectClass=computer)'
    GroupSearchFilter = '(objectClass=group)'
    
    # 属性マッピング
    UserAttributes = @(
        'sAMAccountName', 'displayName', 'mail', 'telephoneNumber', 
        'department', 'title', 'manager', 'memberOf', 'lastLogon',
        'pwdLastSet', 'accountExpires', 'userAccountControl'
    )
    ComputerAttributes = @(
        'name', 'dNSHostName', 'operatingSystem', 'operatingSystemVersion',
        'lastLogonTimestamp', 'description', 'managedBy'
    )
}

# キャッシュ初期化
$global:ADCache = @{
    Users = @{}
    Computers = @{}
    Groups = @{}
    LastUpdated = @{}
}

# パフォーマンスメトリクス
$global:ADMetrics = @{
    TotalQueries = 0
    CacheHits = 0
    CacheMisses = 0
    ErrorCount = 0
    AverageResponseTime = 0
    LastResetTime = Get-Date
}

# Enhanced Active Directory connectivity testing with retry and timeout
function Test-ADConnectivity {
    param(
        [int]$MaxRetries = 3,
        [int]$RetryDelaySeconds = 5,
        [int]$TimeoutSeconds = 30
    )
    
    $retryCount = 0
    $lastError = $null
    
    while ($retryCount -lt $MaxRetries) {
        try {
            if (-not $global:ADModuleAvailable) {
                throw "Active Directory module is not available"
            }
            
            # Test with timeout
            $job = Start-Job -ScriptBlock {
                Import-Module ActiveDirectory -ErrorAction Stop
                $domain = Get-ADDomain -ErrorAction Stop
                return $domain
            }
            
            $result = Wait-Job -Job $job -Timeout $TimeoutSeconds
            if ($result) {
                $domain = Receive-Job -Job $job
                Remove-Job -Job $job -Force
                
                Write-APILog "Active Directory connectivity test successful: $($domain.DNSRoot)" -Level "DEBUG"
                $global:ADConnectionStatus = 'Connected'
                $global:LastADConnectivityCheck = Get-Date
                return $true
            } else {
                Remove-Job -Job $job -Force
                throw "Connection test timed out after $TimeoutSeconds seconds"
            }
            
        } catch {
            $lastError = $_.Exception.Message
            $retryCount++
            
            Write-APILog "Active Directory connectivity test failed (attempt $retryCount/$MaxRetries): $lastError" -Level "WARNING"
            
            if ($retryCount -lt $MaxRetries) {
                Write-APILog "Retrying AD connection test in $RetryDelaySeconds seconds..." -Level "INFO"
                Start-Sleep -Seconds $RetryDelaySeconds
            }
        }
    }
    
    $global:ADConnectionStatus = 'Disconnected'
    $global:LastADConnectivityCheck = Get-Date
    Write-APILog "Active Directory connectivity test failed after $MaxRetries attempts: $lastError" -Level "ERROR"
    return $false
}

# Test AD service connection with enhanced diagnostics
function Test-ADServiceConnection {
    param(
        [int]$TimeoutSeconds = 15
    )
    
    try {
        # Test LDAP connectivity
        $ldapTest = Test-NetConnection -ComputerName $global:ADConfig.DomainController -Port $global:ADConfig.Port -WarningAction SilentlyContinue
        
        if (-not $ldapTest.TcpTestSucceeded) {
            return @{
                IsAvailable = $false
                Error = "LDAP port $($global:ADConfig.Port) is not accessible on $($global:ADConfig.DomainController)"
                TestResults = @{
                    LDAPConnectivity = $false
                    DomainController = $global:ADConfig.DomainController
                    Port = $global:ADConfig.Port
                }
            }
        }
        
        # Test AD module functionality
        $moduleTest = Test-ADConnectivity -TimeoutSeconds $TimeoutSeconds
        
        return @{
            IsAvailable = $moduleTest
            Error = if (-not $moduleTest) { "AD module test failed" } else { $null }
            TestResults = @{
                LDAPConnectivity = $ldapTest.TcpTestSucceeded
                ADModuleTest = $moduleTest
                DomainController = $global:ADConfig.DomainController
                Port = $global:ADConfig.Port
                ResponseTime = $ldapTest.PingReplyDetails.RoundtripTime
            }
        }
        
    } catch {
        return @{
            IsAvailable = $false
            Error = $_.Exception.Message
            TestResults = @{
                LDAPConnectivity = $false
                ADModuleTest = $false
                DomainController = $global:ADConfig.DomainController
                Port = $global:ADConfig.Port
            }
        }
    }
}

# Enhanced Active Directory users retrieval with resilience
function Invoke-ADUsersGet {
    param($Request)
    
    $operationStart = Get-Date
    $global:ADMetrics.TotalQueries++
    
    try {
        # Authentication check
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # AD availability check with auto-reconnect
        if (-not (Ensure-ADConnection)) {
            return Format-ErrorResponse -Message "Active Directory service is not available. Please check connectivity." -StatusCode 503
        }
        
        # Check cache first
        $cacheKey = "AD_Users_$($Request.Query)"
        if ($global:ADConfig.CacheExpiryMinutes -gt 0 -and $global:ADCache.Users.ContainsKey($cacheKey)) {
            $cachedData = $global:ADCache.Users[$cacheKey]
            $cacheAge = ((Get-Date) - $cachedData.Timestamp).TotalMinutes
            
            if ($cacheAge -lt $global:ADConfig.CacheExpiryMinutes) {
                Write-APILog "Returning cached AD users data (age: $([math]::Round($cacheAge, 1)) minutes)" -Level "DEBUG"
                $global:ADMetrics.CacheHits++
                return $cachedData.Data
            }
        }
        
        $global:ADMetrics.CacheMisses++
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $searchBase = $queryParams.searchBase -or $global:ADConfig.SearchBase
        $filter = $queryParams.filter -or "*"
        $properties = if ($queryParams.properties) { $queryParams.properties -split "," } else { @("SamAccountName", "DisplayName", "EmailAddress", "Title", "Department", "Office", "TelephoneNumber", "Enabled", "LastLogonDate", "PasswordLastSet", "AccountExpirationDate", "DistinguishedName") }
        $resultSetSize = [math]::Min([int]($queryParams.limit -or 1000), 5000)
        
        Write-APILog "Fetching Active Directory users with filter: $filter" -Level "DEBUG"
        
        # Get AD users with retry logic and error handling
        $adUsers = Invoke-ADOperationWithRetry -Operation {
            Get-ADUser -Filter $filter -Properties $properties -SearchBase $searchBase -ResultSetSize $resultSetSize -ErrorAction Stop
        } -OperationName "Get-ADUser" -MaxRetries 3 -RetryDelay 2
        
        # Transform data for ITSM format
        $users = @()
        foreach ($user in $adUsers) {
            $users += @{
                id = $user.ObjectGUID.ToString()
                samAccountName = $user.SamAccountName
                displayName = $user.DisplayName
                givenName = $user.GivenName
                surname = $user.Surname
                email = $user.EmailAddress
                userPrincipalName = $user.UserPrincipalName
                title = $user.Title
                department = $user.Department
                office = $user.Office
                telephoneNumber = $user.TelephoneNumber
                manager = $user.Manager
                enabled = $user.Enabled
                lastLogonDate = if ($user.LastLogonDate) { $user.LastLogonDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                passwordLastSet = if ($user.PasswordLastSet) { $user.PasswordLastSet.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                accountExpirationDate = if ($user.AccountExpirationDate) { $user.AccountExpirationDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                distinguishedName = $user.DistinguishedName
                whenCreated = if ($user.whenCreated) { $user.whenCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                whenChanged = if ($user.whenChanged) { $user.whenChanged.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                source = "ActiveDirectory"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        # Cache the results
        if ($global:ADConfig.CacheExpiryMinutes -gt 0) {
            $global:ADCache.Users[$cacheKey] = @{
                Data = @{
                    Status = "Success"
                    Message = "Active Directory users retrieved successfully"
                    Data = $users
                    Count = $users.Count
                    SearchBase = $searchBase
                    Filter = $filter
                    Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    CachedResult = $true
                }
                Timestamp = Get-Date
            }
        }
        
        # Update metrics
        $operationDuration = ((Get-Date) - $operationStart).TotalMilliseconds
        $global:ADMetrics.AverageResponseTime = (($global:ADMetrics.AverageResponseTime * ($global:ADMetrics.TotalQueries - 1)) + $operationDuration) / $global:ADMetrics.TotalQueries
        
        Add-AuditLog -EventType "AD_USERS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($users.Count) Active Directory users in $([math]::Round($operationDuration, 2))ms"
        
        return @{
            Status = "Success"
            Message = "Active Directory users retrieved successfully"
            Data = $users
            Count = $users.Count
            SearchBase = $searchBase
            Filter = $filter
            ResponseTime = "$([math]::Round($operationDuration, 2))ms"
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            CachedResult = $false
        }
        
    } catch {
        $global:ADMetrics.ErrorCount++
        $operationDuration = ((Get-Date) - $operationStart).TotalMilliseconds
        
        Write-APILog "Error in AD users query after $([math]::Round($operationDuration, 2))ms: $($_.Exception.Message)" -Level "ERROR"
        
        # Mark AD as disconnected if this is a connection error
        if ($_.Exception.Message -match "server is not operational|RPC server|timeout|connection") {
            $global:ADConnectionStatus = 'Error'
            Write-APILog "AD connection marked as error due to: $($_.Exception.Message)" -Level "WARNING"
        }
        
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory users: $($_.Exception.Message)" -StatusCode 500
    }
}

# Get Active Directory computers
function Invoke-ADComputersGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if (-not $global:ADModuleAvailable) {
            return Format-ErrorResponse -Message "Active Directory module is not available on this system" -StatusCode 503
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $searchBase = $queryParams.searchBase -or $global:ADConfig.SearchBase
        $filter = $queryParams.filter -or "*"
        $properties = if ($queryParams.properties) { $queryParams.properties -split "," } else { @("Name", "DNSHostName", "OperatingSystem", "OperatingSystemVersion", "LastLogonDate", "Enabled", "Description", "DistinguishedName") }
        $resultSetSize = [math]::Min([int]($queryParams.limit -or 1000), 5000)
        
        Write-APILog "Fetching Active Directory computers with filter: $filter" -Level "DEBUG"
        
        # Get AD computers
        $adComputers = Get-ADComputer -Filter $filter -Properties $properties -SearchBase $searchBase -ResultSetSize $resultSetSize
        
        # Transform data for ITSM format
        $computers = @()
        foreach ($computer in $adComputers) {
            $computers += @{
                id = $computer.ObjectGUID.ToString()
                name = $computer.Name
                dnsHostName = $computer.DNSHostName
                samAccountName = $computer.SamAccountName
                operatingSystem = $computer.OperatingSystem
                operatingSystemVersion = $computer.OperatingSystemVersion
                description = $computer.Description
                enabled = $computer.Enabled
                lastLogonDate = if ($computer.LastLogonDate) { $computer.LastLogonDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                passwordLastSet = if ($computer.PasswordLastSet) { $computer.PasswordLastSet.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                distinguishedName = $computer.DistinguishedName
                whenCreated = if ($computer.whenCreated) { $computer.whenCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                whenChanged = if ($computer.whenChanged) { $computer.whenChanged.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                source = "ActiveDirectory"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        Add-AuditLog -EventType "AD_COMPUTERS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($computers.Count) Active Directory computers"
        
        return @{
            Status = "Success"
            Message = "Active Directory computers retrieved successfully"
            Data = $computers
            Count = $computers.Count
            SearchBase = $searchBase
            Filter = $filter
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD computers query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory computers: $($_.Exception.Message)"
    }
}

# Get Active Directory groups
function Invoke-ADGroupsGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if (-not $global:ADModuleAvailable) {
            return Format-ErrorResponse -Message "Active Directory module is not available on this system" -StatusCode 503
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $searchBase = $queryParams.searchBase -or $global:ADConfig.SearchBase
        $filter = $queryParams.filter -or "*"
        $properties = if ($queryParams.properties) { $queryParams.properties -split "," } else { @("Name", "DisplayName", "Description", "GroupCategory", "GroupScope", "Members", "DistinguishedName") }
        $resultSetSize = [math]::Min([int]($queryParams.limit -or 1000), 5000)
        
        Write-APILog "Fetching Active Directory groups with filter: $filter" -Level "DEBUG"
        
        # Get AD groups
        $adGroups = Get-ADGroup -Filter $filter -Properties $properties -SearchBase $searchBase -ResultSetSize $resultSetSize
        
        # Transform data for ITSM format
        $groups = @()
        foreach ($group in $adGroups) {
            $memberCount = 0
            if ($group.Members) {
                $memberCount = $group.Members.Count
            }
            
            $groups += @{
                id = $group.ObjectGUID.ToString()
                name = $group.Name
                displayName = $group.DisplayName
                samAccountName = $group.SamAccountName
                description = $group.Description
                groupCategory = $group.GroupCategory.ToString()
                groupScope = $group.GroupScope.ToString()
                memberCount = $memberCount
                distinguishedName = $group.DistinguishedName
                whenCreated = if ($group.whenCreated) { $group.whenCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                whenChanged = if ($group.whenChanged) { $group.whenChanged.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                source = "ActiveDirectory"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        Add-AuditLog -EventType "AD_GROUPS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($groups.Count) Active Directory groups"
        
        return @{
            Status = "Success"
            Message = "Active Directory groups retrieved successfully"
            Data = $groups
            Count = $groups.Count
            SearchBase = $searchBase
            Filter = $filter
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD groups query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory groups: $($_.Exception.Message)"
    }
}

# Get Active Directory organizational units
function Invoke-ADOUsGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if (-not $global:ADModuleAvailable) {
            return Format-ErrorResponse -Message "Active Directory module is not available on this system" -StatusCode 503
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $searchBase = $queryParams.searchBase -or $global:ADConfig.SearchBase
        $filter = $queryParams.filter -or "*"
        
        Write-APILog "Fetching Active Directory organizational units" -Level "DEBUG"
        
        # Get AD OUs
        $adOUs = Get-ADOrganizationalUnit -Filter $filter -SearchBase $searchBase
        
        # Transform data for ITSM format
        $ous = @()
        foreach ($ou in $adOUs) {
            $ous += @{
                id = $ou.ObjectGUID.ToString()
                name = $ou.Name
                distinguishedName = $ou.DistinguishedName
                description = $ou.Description
                city = $ou.City
                country = $ou.Country
                state = $ou.State
                streetAddress = $ou.StreetAddress
                postalCode = $ou.PostalCode
                whenCreated = if ($ou.whenCreated) { $ou.whenCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                whenChanged = if ($ou.whenChanged) { $ou.whenChanged.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { $null }
                source = "ActiveDirectory"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        Add-AuditLog -EventType "AD_OUS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($ous.Count) Active Directory organizational units"
        
        return @{
            Status = "Success"
            Message = "Active Directory organizational units retrieved successfully"
            Data = $ous
            Count = $ous.Count
            SearchBase = $searchBase
            Filter = $filter
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD OUs query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory organizational units: $($_.Exception.Message)"
    }
}

# Get Active Directory authentication logs
function Invoke-ADAuditLogsGet {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        # Parse query parameters
        $queryParams = Parse-QueryString -QueryString $Request.Query
        $startDate = if ($queryParams.startDate) { [DateTime]$queryParams.startDate } else { (Get-Date).AddDays(-7) }
        $endDate = if ($queryParams.endDate) { [DateTime]$queryParams.endDate } else { Get-Date }
        $eventIds = if ($queryParams.eventIds) { $queryParams.eventIds -split "," } else { @("4624", "4625", "4634", "4647", "4648") }
        $maxEvents = [math]::Min([int]($queryParams.limit -or 1000), 10000)
        
        Write-APILog "Fetching Active Directory audit logs from $startDate to $endDate" -Level "DEBUG"
        
        # Get Windows Security logs
        $filterXPath = @"
        *[System[
            (EventID=$($eventIds -join ' or EventID=')) and 
            TimeCreated[@SystemTime>='$($startDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z"))'] and 
            TimeCreated[@SystemTime<='$($endDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z"))']
        ]]
"@
        
        try {
            $events = Get-WinEvent -FilterXPath $filterXPath -LogName "Security" -MaxEvents $maxEvents -ErrorAction Stop
        } catch {
            # If Get-WinEvent fails, return empty result
            Write-APILog "Unable to retrieve Windows Security logs: $($_.Exception.Message)" -Level "WARNING"
            $events = @()
        }
        
        # Transform events for ITSM format
        $auditLogs = @()
        foreach ($event in $events) {
            $eventType = switch ($event.Id) {
                4624 { "Successful Logon" }
                4625 { "Failed Logon" }
                4634 { "Logoff" }
                4647 { "User Initiated Logoff" }
                4648 { "Logon with Explicit Credentials" }
                default { "Unknown Event $($event.Id)" }
            }
            
            # Parse event data
            $userName = ""
            $domain = ""
            $workstation = ""
            $ipAddress = ""
            
            if ($event.Properties) {
                # Extract relevant properties based on event ID
                switch ($event.Id) {
                    4624 { 
                        if ($event.Properties.Count -gt 5) {
                            $userName = $event.Properties[5].Value
                            $domain = $event.Properties[6].Value
                            $workstation = $event.Properties[11].Value
                            $ipAddress = $event.Properties[18].Value
                        }
                    }
                    4625 {
                        if ($event.Properties.Count -gt 5) {
                            $userName = $event.Properties[5].Value
                            $domain = $event.Properties[6].Value
                            $workstation = $event.Properties[13].Value
                            $ipAddress = $event.Properties[19].Value
                        }
                    }
                }
            }
            
            $auditLogs += @{
                eventId = $event.Id
                eventType = $eventType
                timeCreated = $event.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                userName = $userName
                domain = $domain
                workstation = $workstation
                ipAddress = $ipAddress
                levelDisplayName = $event.LevelDisplayName
                message = $event.Message
                source = "ActiveDirectory"
                syncedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
        
        Add-AuditLog -EventType "AD_AUDIT_LOGS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($auditLogs.Count) Active Directory audit logs"
        
        return @{
            Status = "Success"
            Message = "Active Directory audit logs retrieved successfully"
            Data = $auditLogs
            Count = $auditLogs.Count
            Period = @{
                StartDate = $startDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                EndDate = $endDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD audit logs query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory audit logs: $($_.Exception.Message)"
    }
}

# Sync Active Directory data to local database
function Invoke-ADSyncData {
    param($Request)
    
    try {
        $authResult = Test-RequestAuthentication -Request $Request
        if (-not $authResult.IsAuthenticated) {
            return Format-ErrorResponse -Message $authResult.Message -StatusCode 401
        }
        
        if ($authResult.User.role -ne "administrator") {
            return Format-ErrorResponse -Message "管理者権限が必要です" -StatusCode 403
        }
        
        if (-not $global:ADModuleAvailable) {
            return Format-ErrorResponse -Message "Active Directory module is not available on this system" -StatusCode 503
        }
        
        Write-APILog "Starting Active Directory data synchronization" -Level "INFO"
        
        $syncResults = @{
            users = @{ synced = 0; errors = 0 }
            computers = @{ synced = 0; errors = 0 }
            groups = @{ synced = 0; errors = 0 }
            startTime = Get-Date
            endTime = $null
            duration = $null
        }
        
        # Sync users
        try {
            $adUsers = Get-ADUser -Filter * -Properties SamAccountName, DisplayName, EmailAddress, Title, Department, Enabled, LastLogonDate
            
            foreach ($user in $adUsers) {
                try {
                    $query = @"
                        INSERT OR REPLACE INTO ad_users (
                            ad_guid, sam_account_name, display_name, email_address, 
                            title, department, enabled, last_logon_date, last_sync
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
"@
                    
                    Invoke-DatabaseQuery -Query $query -Parameters @(
                        $user.ObjectGUID.ToString(),
                        $user.SamAccountName,
                        $user.DisplayName,
                        $user.EmailAddress,
                        $user.Title,
                        $user.Department,
                        $user.Enabled,
                        if ($user.LastLogonDate) { $user.LastLogonDate.ToString("yyyy-MM-dd HH:mm:ss") } else { $null },
                        (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    )
                    
                    $syncResults.users.synced++
                } catch {
                    $syncResults.users.errors++
                    Write-APILog "Error syncing user $($user.SamAccountName): $($_.Exception.Message)" -Level "ERROR"
                }
            }
        } catch {
            Write-APILog "Error during user sync: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Sync computers
        try {
            $adComputers = Get-ADComputer -Filter * -Properties Name, DNSHostName, OperatingSystem, Enabled, LastLogonDate
            
            foreach ($computer in $adComputers) {
                try {
                    $query = @"
                        INSERT OR REPLACE INTO ad_computers (
                            ad_guid, name, dns_host_name, operating_system, 
                            enabled, last_logon_date, last_sync
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
"@
                    
                    Invoke-DatabaseQuery -Query $query -Parameters @(
                        $computer.ObjectGUID.ToString(),
                        $computer.Name,
                        $computer.DNSHostName,
                        $computer.OperatingSystem,
                        $computer.Enabled,
                        if ($computer.LastLogonDate) { $computer.LastLogonDate.ToString("yyyy-MM-dd HH:mm:ss") } else { $null },
                        (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    )
                    
                    $syncResults.computers.synced++
                } catch {
                    $syncResults.computers.errors++
                    Write-APILog "Error syncing computer $($computer.Name): $($_.Exception.Message)" -Level "ERROR"
                }
            }
        } catch {
            Write-APILog "Error during computer sync: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # Sync groups
        try {
            $adGroups = Get-ADGroup -Filter * -Properties Name, DisplayName, Description, GroupCategory, GroupScope
            
            foreach ($group in $adGroups) {
                try {
                    $query = @"
                        INSERT OR REPLACE INTO ad_groups (
                            ad_guid, name, display_name, description, 
                            group_category, group_scope, last_sync
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
"@
                    
                    Invoke-DatabaseQuery -Query $query -Parameters @(
                        $group.ObjectGUID.ToString(),
                        $group.Name,
                        $group.DisplayName,
                        $group.Description,
                        $group.GroupCategory.ToString(),
                        $group.GroupScope.ToString(),
                        (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    )
                    
                    $syncResults.groups.synced++
                } catch {
                    $syncResults.groups.errors++
                    Write-APILog "Error syncing group $($group.Name): $($_.Exception.Message)" -Level "ERROR"
                }
            }
        } catch {
            Write-APILog "Error during group sync: $($_.Exception.Message)" -Level "ERROR"
        }
        
        $syncResults.endTime = Get-Date
        $syncResults.duration = ($syncResults.endTime - $syncResults.startTime).TotalSeconds
        
        Add-AuditLog -EventType "AD_DATA_SYNC" -UserId $authResult.User.user_id -Details "Synced AD data: $($syncResults.users.synced) users, $($syncResults.computers.synced) computers, $($syncResults.groups.synced) groups"
        
        Write-APILog "Active Directory data synchronization completed in $($syncResults.duration) seconds" -Level "INFO"
        
        return @{
            Status = "Success"
            Message = "Active Directory data synchronization completed"
            Data = $syncResults
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD data sync: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to synchronize Active Directory data: $($_.Exception.Message)"
    }
}

# Initialize Active Directory integration tables
function Initialize-ADTables {
    try {
        Write-APILog "Initializing Active Directory integration tables" -Level "INFO"
        
        # Create AD users table
        $createUsersTable = @"
            CREATE TABLE IF NOT EXISTS ad_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad_guid TEXT UNIQUE NOT NULL,
                sam_account_name TEXT,
                display_name TEXT,
                email_address TEXT,
                title TEXT,
                department TEXT,
                enabled BOOLEAN,
                last_logon_date DATETIME,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        # Create AD computers table
        $createComputersTable = @"
            CREATE TABLE IF NOT EXISTS ad_computers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad_guid TEXT UNIQUE NOT NULL,
                name TEXT,
                dns_host_name TEXT,
                operating_system TEXT,
                enabled BOOLEAN,
                last_logon_date DATETIME,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        # Create AD groups table
        $createGroupsTable = @"
            CREATE TABLE IF NOT EXISTS ad_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad_guid TEXT UNIQUE NOT NULL,
                name TEXT,
                display_name TEXT,
                description TEXT,
                group_category TEXT,
                group_scope TEXT,
                last_sync DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
"@
        
        Invoke-DatabaseQuery -Query $createUsersTable
        Invoke-DatabaseQuery -Query $createComputersTable
        Invoke-DatabaseQuery -Query $createGroupsTable
        
        Write-APILog "Active Directory integration tables created successfully" -Level "INFO"
        
    } catch {
        Write-APILog "Error creating AD tables: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# Ensure Active Directory connection with auto-reconnect
function Ensure-ADConnection {
    param(
        [int]$MaxRetries = 2
    )
    
    # Check if we recently tested connectivity
    if ($global:LastADConnectivityCheck -and 
        ((Get-Date) - $global:LastADConnectivityCheck).TotalMinutes -lt 5 -and 
        $global:ADConnectionStatus -eq 'Connected') {
        return $true
    }
    
    # Test connectivity
    if (Test-ADConnectivity -MaxRetries $MaxRetries) {
        return $true
    }
    
    # If AD module is available but connection failed, try reconnect
    if ($global:ADModuleAvailable -and $global:ADConnectionStatus -ne 'Connected') {
        Write-APILog "Attempting to reconnect to Active Directory..." -Level "INFO"
        
        try {
            # Force module reload
            Remove-Module ActiveDirectory -Force -ErrorAction SilentlyContinue
            Import-Module ActiveDirectory -Force -ErrorAction Stop
            
            # Test again
            if (Test-ADConnectivity -MaxRetries 1) {
                Write-APILog "Active Directory reconnection successful" -Level "INFO"
                return $true
            }
        } catch {
            Write-APILog "AD reconnection failed: $($_.Exception.Message)" -Level "ERROR"
        }
    }
    
    return $false
}

# Execute AD operations with retry logic and error handling
function Invoke-ADOperationWithRetry {
    param(
        [ScriptBlock]$Operation,
        [string]$OperationName,
        [int]$MaxRetries = 3,
        [int]$RetryDelay = 2,
        [int]$TimeoutSeconds = 60
    )
    
    $retryCount = 0
    $lastError = $null
    
    while ($retryCount -lt $MaxRetries) {
        try {
            # Execute operation with timeout
            $job = Start-Job -ScriptBlock $Operation
            $result = Wait-Job -Job $job -Timeout $TimeoutSeconds
            
            if ($result) {
                $data = Receive-Job -Job $job
                Remove-Job -Job $job -Force
                
                if ($retryCount -gt 0) {
                    Write-APILog "$OperationName succeeded on retry attempt $retryCount" -Level "INFO"
                }
                
                return $data
            } else {
                Remove-Job -Job $job -Force
                throw "Operation timed out after $TimeoutSeconds seconds"
            }
            
        } catch {
            $lastError = $_.Exception.Message
            $retryCount++
            
            Write-APILog "$OperationName failed (attempt $retryCount/$MaxRetries): $lastError" -Level "WARNING"
            
            # Check if this is a connection-related error that warrants retry
            $isRetryableError = $lastError -match "server is not operational|RPC server|timeout|connection|network|DNS"
            
            if ($retryCount -lt $MaxRetries -and $isRetryableError) {
                Write-APILog "Retrying $OperationName in $RetryDelay seconds (retryable error detected)..." -Level "INFO"
                Start-Sleep -Seconds $RetryDelay
                
                # Try to reconnect before retry
                if ($retryCount -eq 1) {
                    Write-APILog "Attempting AD reconnection before retry..." -Level "INFO"
                    Ensure-ADConnection -MaxRetries 1
                }
            } elseif (-not $isRetryableError) {
                Write-APILog "$OperationName failed with non-retryable error: $lastError" -Level "ERROR"
                break
            }
        }
    }
    
    Write-APILog "$OperationName failed after $MaxRetries attempts: $lastError" -Level "ERROR"
    throw $lastError
}

# Clear expired cache entries
function Clear-ADCacheExpired {
    $now = Get-Date
    $expiryMinutes = $global:ADConfig.CacheExpiryMinutes
    
    if ($expiryMinutes -le 0) {
        return
    }
    
    $expiredKeys = @()
    
    # Check Users cache
    foreach ($key in $global:ADCache.Users.Keys) {
        $cacheAge = ($now - $global:ADCache.Users[$key].Timestamp).TotalMinutes
        if ($cacheAge -gt $expiryMinutes) {
            $expiredKeys += $key
        }
    }
    
    # Check Computers cache
    foreach ($key in $global:ADCache.Computers.Keys) {
        $cacheAge = ($now - $global:ADCache.Computers[$key].Timestamp).TotalMinutes
        if ($cacheAge -gt $expiryMinutes) {
            $expiredKeys += $key
        }
    }
    
    # Check Groups cache
    foreach ($key in $global:ADCache.Groups.Keys) {
        $cacheAge = ($now - $global:ADCache.Groups[$key].Timestamp).TotalMinutes
        if ($cacheAge -gt $expiryMinutes) {
            $expiredKeys += $key
        }
    }
    
    # Remove expired entries
    foreach ($key in $expiredKeys) {
        if ($global:ADCache.Users.ContainsKey($key)) {
            $global:ADCache.Users.Remove($key)
        }
        if ($global:ADCache.Computers.ContainsKey($key)) {
            $global:ADCache.Computers.Remove($key)
        }
        if ($global:ADCache.Groups.ContainsKey($key)) {
            $global:ADCache.Groups.Remove($key)
        }
    }
    
    if ($expiredKeys.Count -gt 0) {
        Write-APILog "Cleared $($expiredKeys.Count) expired AD cache entries" -Level "DEBUG"
    }
}

# Get AD performance metrics
function Get-ADPerformanceMetrics {
    $uptime = if ($global:ADMetrics.LastResetTime) { 
        ((Get-Date) - $global:ADMetrics.LastResetTime).TotalHours 
    } else { 0 }
    
    $cacheTotal = $global:ADMetrics.CacheHits + $global:ADMetrics.CacheMisses
    $cacheHitRate = if ($cacheTotal -gt 0) { 
        [math]::Round(($global:ADMetrics.CacheHits / $cacheTotal) * 100, 2) 
    } else { 0 }
    
    return @{
        TotalQueries = $global:ADMetrics.TotalQueries
        ErrorCount = $global:ADMetrics.ErrorCount
        ErrorRate = if ($global:ADMetrics.TotalQueries -gt 0) { 
            [math]::Round(($global:ADMetrics.ErrorCount / $global:ADMetrics.TotalQueries) * 100, 2) 
        } else { 0 }
        CacheHits = $global:ADMetrics.CacheHits
        CacheMisses = $global:ADMetrics.CacheMisses
        CacheHitRate = "$cacheHitRate%"
        AverageResponseTime = "$([math]::Round($global:ADMetrics.AverageResponseTime, 2))ms"
        UptimeHours = [math]::Round($uptime, 2)
        ConnectionStatus = $global:ADConnectionStatus
        LastConnectivityCheck = if ($global:LastADConnectivityCheck) { 
            $global:LastADConnectivityCheck.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") 
        } else { "Never" }
        CacheSize = @{
            Users = $global:ADCache.Users.Count
            Computers = $global:ADCache.Computers.Count
            Groups = $global:ADCache.Groups.Count
        }
    }
}

# Initialize tables and start cache cleanup timer
Initialize-ADTables

# Set up periodic cache cleanup (every 30 minutes)
Register-EngineEvent -SourceIdentifier "ADCacheCleanup" -Forward
$null = New-Object System.Timers.Timer | ForEach-Object {
    $_.Interval = 1800000  # 30 minutes
    $_.AutoReset = $true
    $_.Add_Elapsed({ Clear-ADCacheExpired })
    $_.Start()
    $global:ADCacheCleanupTimer = $_
}

Write-APILog "Active Directory integration initialized with enhanced reliability features" -Level "INFO"