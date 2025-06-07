# Active Directory Integration API for ITSM Platform
# Provides integration with Active Directory services
# Version: 2025.6.7

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force

# Try to import Active Directory module
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    $global:ADModuleAvailable = $true
    Write-APILog "Active Directory module loaded successfully" -Level "INFO"
} catch {
    $global:ADModuleAvailable = $false
    Write-APILog "Active Directory module not available: $($_.Exception.Message)" -Level "WARNING"
}

# Active Directory configuration
$global:ADConfig = @{
    DomainController = $env:AD_DOMAIN_CONTROLLER
    Domain = $env:AD_DOMAIN
    ServiceAccount = $env:AD_SERVICE_ACCOUNT
    ServicePassword = $env:AD_SERVICE_PASSWORD
    SearchBase = $env:AD_SEARCH_BASE
    UseSSL = [bool]$env:AD_USE_SSL
    Port = if ($env:AD_PORT) { [int]$env:AD_PORT } else { if ($env:AD_USE_SSL) { 636 } else { 389 } }
}

# Test Active Directory connectivity
function Test-ADConnectivity {
    try {
        if (-not $global:ADModuleAvailable) {
            throw "Active Directory module is not available"
        }
        
        # Try to get domain information
        $domain = Get-ADDomain -ErrorAction Stop
        Write-APILog "Active Directory connectivity test successful: $($domain.DNSRoot)" -Level "DEBUG"
        return $true
        
    } catch {
        Write-APILog "Active Directory connectivity test failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Get Active Directory users
function Invoke-ADUsersGet {
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
        $properties = if ($queryParams.properties) { $queryParams.properties -split "," } else { @("SamAccountName", "DisplayName", "EmailAddress", "Title", "Department", "Office", "TelephoneNumber", "Enabled", "LastLogonDate", "PasswordLastSet", "AccountExpirationDate", "DistinguishedName") }
        $resultSetSize = [math]::Min([int]($queryParams.limit -or 1000), 5000)
        
        Write-APILog "Fetching Active Directory users with filter: $filter" -Level "DEBUG"
        
        # Get AD users
        $adUsers = Get-ADUser -Filter $filter -Properties $properties -SearchBase $searchBase -ResultSetSize $resultSetSize
        
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
        
        Add-AuditLog -EventType "AD_USERS_QUERY" -UserId $authResult.User.user_id -Details "Retrieved $($users.Count) Active Directory users"
        
        return @{
            Status = "Success"
            Message = "Active Directory users retrieved successfully"
            Data = $users
            Count = $users.Count
            SearchBase = $searchBase
            Filter = $filter
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
    } catch {
        Write-APILog "Error in AD users query: $($_.Exception.Message)" -Level "ERROR"
        return Format-ErrorResponse -Message "Failed to retrieve Active Directory users: $($_.Exception.Message)"
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

# Initialize tables on module load
Initialize-ADTables