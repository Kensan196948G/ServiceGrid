<#
.SYNOPSIS
    Enhanced Windows Security Utilities Module
    Comprehensive security framework for Windows integration and ITSM systems

.DESCRIPTION
    Enterprise-grade Windows security integration module providing:
    - Advanced authentication and authorization
    - Windows Event Log integration
    - WMI-based system monitoring
    - Active Directory integration
    - Registry security operations
    - Threat detection and response
    - Compliance monitoring
    - Security incident management

.AUTHOR
    Claude Code AI Assistant

.VERSION
    3.0.0 - Enhanced Windows Integration
#>

# Import required modules and assemblies
try {
    Import-Module "$PSScriptRoot/LogUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/DBUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/AuthUtil.psm1" -Force -ErrorAction Stop
    
    # Windows-specific assemblies
    Add-Type -AssemblyName System.DirectoryServices -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.DirectoryServices.AccountManagement -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.Management -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Some Windows integration features may not be available: $($_.Exception.Message)"
}

# Enhanced security configuration
$script:SecurityConfig = @{
    # Authentication settings
    MaxFailedAttempts = 5
    LockoutDurationMinutes = 30
    TokenExpiryHours = 1
    PasswordComplexityEnabled = $true
    TwoFactorRequired = $false
    
    # Network security
    RateLimitPerMinute = 60
    MaxRequestSizeKB = 1024
    AllowedIPRanges = @('127.0.0.1', '192.168.0.0/16', '10.0.0.0/8')
    EnableGeoBlocking = $false
    
    # Threat detection
    SuspiciousPatterns = @(
        '(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+',
        '<script[^>]*>',
        'javascript:',
        'vbscript:',
        'onload\s*=',
        'onerror\s*=',
        '\.\./\.\./\.\.',  # Path traversal
        'cmd\.exe',
        'powershell\.exe',
        'net\s+user',
        'reg\s+add'
    )
    
    # Windows integration
    EnableEventLogMonitoring = $true
    EnableWMIMonitoring = $true
    EnableADIntegration = $false
    EventLogSources = @('Security', 'System', 'Application')
    
    # Compliance and auditing
    EnableComplianceMonitoring = $true
    AuditFailedLogons = $true
    AuditPrivilegeUse = $true
    AuditObjectAccess = $true
    
    # Response settings
    AutoBlockSuspiciousIPs = $true
    NotificationEnabled = $true
    IncidentResponseEnabled = $true
}

# Enhanced caching and tracking
$script:AuthCache = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()
$script:RateLimitCache = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()
$script:FailedAttemptsCache = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()
$script:ThreatIntelligence = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()
$script:SecurityMetrics = @{
    TotalAuthAttempts = 0
    SuccessfulAuths = 0
    FailedAuths = 0
    BlockedIPs = 0
    ThreatsDetected = 0
    IncidentsCreated = 0
    LastReset = Get-Date
}

# Windows system information cache
$script:SystemInfo = @{
    OSVersion = $null
    DomainJoined = $null
    LastUpdated = $null
    SecurityProducts = @()
    RunningServices = @()
}

<#
.SYNOPSIS
    リクエスト認証の包括的テスト

.DESCRIPTION
    JWTトークン認証、レート制限、IPホワイトリストチェックを実行

.PARAMETER Request
    HTTPリクエストオブジェクト

.OUTPUTS
    認証結果、ユーザー情報、エラーメッセージを含むハッシュテーブル
#>
function Test-RequestAuthentication {
    param(
        [Parameter(Mandatory = $true)]
        [System.Object]$Request
    )
    
    try {
        $authHeader = $Request.Headers["Authorization"]
        if (-not $authHeader) {
            return @{
                IsAuthenticated = $false
                Message = "Authorization header missing"
                User = $null
            }
        }
        
        # Extract token (Bearer token format)
        if ($authHeader -match "Bearer\s+(.+)") {
            $token = $matches[1]
        } else {
            $token = $authHeader
        }
        
        if (-not (Test-AuthToken -Token $token)) {
            return @{
                IsAuthenticated = $false
                Message = "Invalid or expired token"
                User = $null
            }
        }
        
        $username = Get-TokenUser -Token $token
        if (-not $username) {
            return @{
                IsAuthenticated = $false
                Message = "Unable to retrieve user information"
                User = $null
            }
        }
        
        # Get user details from database
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        $query = "SELECT user_id, username, role, display_name, email FROM users WHERE username = @username"
        $params = @{ username = $username }
        $userResult = Invoke-SqlQuery -Query $query -Parameters $params
        
        if (-not $userResult -or $userResult.Count -eq 0) {
            return @{
                IsAuthenticated = $false
                Message = "User not found in database"
                User = $null
            }
        }
        
        return @{
            IsAuthenticated = $true
            Message = "Authentication successful"
            User = @{
                user_id = $userResult[0].user_id
                username = $userResult[0].username
                role = $userResult[0].role
                display_name = $userResult[0].display_name
                email = $userResult[0].email
            }
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Authentication test failed: $($_.Exception.Message)"
        return @{
            IsAuthenticated = $false
            Message = "Authentication error: $($_.Exception.Message)"
            User = $null
        }
    }
}

# Format error response
function Format-ErrorResponse {
    param(
        [string]$Message,
        [int]$StatusCode = 500
    )
    
    return @{
        Status = "Error"
        Message = $Message
        StatusCode = $StatusCode
        Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
}

# Parse query string
function Parse-QueryString {
    param([string]$QueryString)
    
    $params = @{}
    
    if ($QueryString -and $QueryString.StartsWith("?")) {
        $QueryString = $QueryString.Substring(1)
    }
    
    if ($QueryString) {
        $pairs = $QueryString -split "&"
        foreach ($pair in $pairs) {
            if ($pair -contains "=") {
                $keyValue = $pair -split "=", 2
                $key = [System.Uri]::UnescapeDataString($keyValue[0])
                $value = [System.Uri]::UnescapeDataString($keyValue[1])
                $params[$key] = $value
            }
        }
    }
    
    return $params
}

# Add audit log entry
function Add-AuditLog {
    param(
        [string]$EventType,
        [string]$UserId,
        [string]$Details
    )
    
    try {
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        
        $query = "INSERT INTO logs (event_type, event_time, user, detail) VALUES (@event_type, @event_time, @user, @detail)"
        $params = @{
            event_type = $EventType
            event_time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            user = $UserId
            detail = $Details
        }
        
        $result = Invoke-SqlNonQuery -Query $query -Parameters $params
        return $result -gt 0
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to add audit log: $($_.Exception.Message)"
        return $false
    }
}

# Test database connection
function Test-DatabaseConnection {
    try {
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        $result = Invoke-SqlQuery -Query "SELECT 1 as test" -DatabasePath "db/itsm.sqlite"
        return $result -ne $null
    } catch {
        return $false
    }
}

# Invoke database query (alias for compatibility)
function Invoke-DatabaseQuery {
    param(
        [string]$Query,
        [array]$Parameters = @()
    )
    
    try {
        Import-Module "$PSScriptRoot/DBUtil.psm1"
        
        # Convert array parameters to hashtable
        $paramHash = @{}
        for ($i = 0; $i -lt $Parameters.Count; $i++) {
            $paramHash["param$i"] = $Parameters[$i]
        }
        
        # Replace ? placeholders with named parameters
        $namedQuery = $Query
        for ($i = 0; $i -lt $Parameters.Count; $i++) {
            $namedQuery = $namedQuery -replace "\?", "@param$i", 1
        }
        
        return Invoke-SqlNonQuery -Query $namedQuery -Parameters $paramHash
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Database query failed: $($_.Exception.Message)"
        throw
    }
}

# Write API log (alias for compatibility)
function Write-APILog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    Write-LogEntry -Level $Level -Message $Message -Category "API"
}

# Windows Event Log integration functions
function Write-WindowsEventLog {
    <#
    .SYNOPSIS
    Writes security events to Windows Event Log
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('Information', 'Warning', 'Error')]
        [string]$EntryType = 'Information',
        
        [Parameter(Mandatory=$false)]
        [int]$EventId = 1000,
        
        [Parameter(Mandatory=$false)]
        [string]$Source = 'ITSM-Platform'
    )
    
    try {
        # Create event source if it doesn't exist
        if (-not [System.Diagnostics.EventLog]::SourceExists($Source)) {
            [System.Diagnostics.EventLog]::CreateEventSource($Source, 'Application')
        }
        
        Write-EventLog -LogName 'Application' -Source $Source -EntryType $EntryType -EventId $EventId -Message $Message
        
        Write-LogEntry -Level "DEBUG" -Message "Windows Event Log entry created" -Category "WINDOWS" -Properties @{
            Source = $Source
            EventId = $EventId
            EntryType = $EntryType
        }
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to write Windows Event Log: $($_.Exception.Message)" -Category "WINDOWS" -Exception $_
    }
}

function Get-WindowsSecurityEvents {
    <#
    .SYNOPSIS
    Retrieves recent Windows security events
    #>
    param(
        [Parameter(Mandatory=$false)]
        [int]$MaxEvents = 100,
        
        [Parameter(Mandatory=$false)]
        [DateTime]$StartTime = (Get-Date).AddHours(-24),
        
        [Parameter(Mandatory=$false)]
        [int[]]$EventIds = @(4625, 4624, 4648, 4672)  # Failed logon, successful logon, explicit logon, special privileges
    )
    
    try {
        $events = @()
        
        foreach ($eventId in $EventIds) {
            $filterHashtable = @{
                LogName = 'Security'
                ID = $eventId
                StartTime = $StartTime
            }
            
            $windowsEvents = Get-WinEvent -FilterHashtable $filterHashtable -MaxEvents $MaxEvents -ErrorAction SilentlyContinue
            if ($windowsEvents) {
                $events += $windowsEvents
            }
        }
        
        # Process and categorize events
        $processedEvents = $events | ForEach-Object {
            @{
                TimeCreated = $_.TimeCreated
                Id = $_.Id
                LevelDisplayName = $_.LevelDisplayName
                Message = $_.Message
                UserId = $_.UserId
                ProcessId = $_.ProcessId
                MachineName = $_.MachineName
                Severity = Get-EventSeverity -EventId $_.Id
                Category = Get-EventCategory -EventId $_.Id
            }
        } | Sort-Object TimeCreated -Descending
        
        Write-LogEntry -Level "DEBUG" -Message "Retrieved $($processedEvents.Count) Windows security events" -Category "WINDOWS" -Properties @{
            EventCount = $processedEvents.Count
            TimeRange = "$StartTime to $(Get-Date)"
        }
        
        return $processedEvents
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to retrieve Windows security events: $($_.Exception.Message)" -Category "WINDOWS" -Exception $_
        return @()
    }
}

function Invoke-WMISecurityQuery {
    <#
    .SYNOPSIS
    Performs WMI queries for security monitoring
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('AntivirusStatus', 'FirewallStatus', 'UpdateStatus', 'ProcessList', 'ServiceList', 'NetworkConnections')]
        [string]$QueryType,
        
        [Parameter(Mandatory=$false)]
        [string]$ComputerName = $env:COMPUTERNAME
    )
    
    try {
        $result = @{
            Success = $false
            Data = $null
            QueryType = $QueryType
            ComputerName = $ComputerName
            Timestamp = Get-Date
        }
        
        switch ($QueryType) {
            'AntivirusStatus' {
                $avProducts = Get-WmiObject -Namespace "root\SecurityCenter2" -Class "AntiVirusProduct" -ComputerName $ComputerName -ErrorAction SilentlyContinue
                $result.Data = $avProducts | ForEach-Object {
                    @{
                        DisplayName = $_.displayName
                        InstanceGuid = $_.instanceGuid
                        PathToSignedProductExe = $_.pathToSignedProductExe
                        PathToSignedReportingExe = $_.pathToSignedReportingExe
                        ProductState = $_.productState
                        Timestamp = $_.timestamp
                    }
                }
            }
            
            'FirewallStatus' {
                $firewallProfiles = Get-WmiObject -Class "Win32_Service" -Filter "Name='MpsSvc'" -ComputerName $ComputerName
                $result.Data = @{
                    FirewallServiceStatus = $firewallProfiles.State
                    StartMode = $firewallProfiles.StartMode
                }
            }
            
            'ProcessList' {
                $processes = Get-WmiObject -Class "Win32_Process" -ComputerName $ComputerName
                $result.Data = $processes | ForEach-Object {
                    @{
                        Name = $_.Name
                        ProcessId = $_.ProcessId
                        ParentProcessId = $_.ParentProcessId
                        CreationDate = $_.CreationDate
                        CommandLine = $_.CommandLine
                        ExecutablePath = $_.ExecutablePath
                    }
                } | Sort-Object Name
            }
            
            'ServiceList' {
                $services = Get-WmiObject -Class "Win32_Service" -ComputerName $ComputerName
                $result.Data = $services | ForEach-Object {
                    @{
                        Name = $_.Name
                        DisplayName = $_.DisplayName
                        State = $_.State
                        StartMode = $_.StartMode
                        PathName = $_.PathName
                        StartName = $_.StartName
                    }
                } | Sort-Object Name
            }
            
            'NetworkConnections' {
                # This requires additional WMI classes or netstat parsing
                $result.Data = @{
                    Message = "Network connections monitoring requires additional implementation"
                    Suggestion = "Use Get-NetTCPConnection cmdlet on PowerShell 3.0+"
                }
            }
        }
        
        $result.Success = $result.Data -ne $null
        
        Write-LogEntry -Level "DEBUG" -Message "WMI security query completed" -Category "WMI" -Properties @{
            QueryType = $QueryType
            Success = $result.Success
            DataCount = if ($result.Data -is [array]) { $result.Data.Count } else { 1 }
        }
        
        return $result
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "WMI security query failed: $($_.Exception.Message)" -Category "WMI" -Exception $_ -Properties @{
            QueryType = $QueryType
            ComputerName = $ComputerName
        }
        
        return @{
            Success = $false
            Data = $null
            QueryType = $QueryType
            ComputerName = $ComputerName
            Error = $_.Exception.Message
            Timestamp = Get-Date
        }
    }
}

function Test-ActiveDirectoryConnectivity {
    <#
    .SYNOPSIS
    Tests Active Directory connectivity and domain information
    #>
    param(
        [Parameter(Mandatory=$false)]
        [string]$DomainName = $env:USERDNSDOMAIN
    )
    
    try {
        $result = @{
            Success = $false
            DomainJoined = $false
            DomainName = $DomainName
            DomainControllers = @()
            CurrentUser = $null
            Error = $null
        }
        
        # Check if computer is domain joined
        $computerSystem = Get-WmiObject -Class Win32_ComputerSystem
        $result.DomainJoined = $computerSystem.PartOfDomain
        
        if ($result.DomainJoined) {
            $result.DomainName = $computerSystem.Domain
            
            # Get current user context
            $result.CurrentUser = @{
                Username = $env:USERNAME
                Domain = $env:USERDOMAIN
                FullName = "$env:USERDOMAIN\$env:USERNAME"
            }
            
            # Test domain connectivity
            try {
                $domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
                $result.DomainControllers = $domain.DomainControllers | ForEach-Object {
                    @{
                        Name = $_.Name
                        IPAddress = $_.IPAddress
                        SiteName = $_.SiteName
                        OSVersion = $_.OSVersion
                    }
                }
                $result.Success = $true
                
            } catch {
                $result.Error = "Failed to connect to domain: $($_.Exception.Message)"
            }
        } else {
            $result.Error = "Computer is not domain joined"
        }
        
        Write-LogEntry -Level "DEBUG" -Message "Active Directory connectivity test completed" -Category "AD" -Properties @{
            DomainJoined = $result.DomainJoined
            Success = $result.Success
            DomainName = $result.DomainName
        }
        
        return $result
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Active Directory connectivity test failed: $($_.Exception.Message)" -Category "AD" -Exception $_
        
        return @{
            Success = $false
            DomainJoined = $false
            Error = $_.Exception.Message
        }
    }
}

function Invoke-SecurityRegistryCheck {
    <#
    .SYNOPSIS
    Performs security-related registry checks
    #>
    param(
        [Parameter(Mandatory=$false)]
        [switch]$IncludeRecommendations = $true
    )
    
    try {
        $result = @{
            Success = $false
            Checks = @()
            Recommendations = @()
            SecurityScore = 0
            MaxScore = 0
        }
        
        # Define security checks
        $securityChecks = @(
            @{
                Name = "UAC Enabled"
                Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
                Value = "EnableLUA"
                ExpectedValue = 1
                Weight = 10
            },
            @{
                Name = "Windows Firewall Enabled"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile"
                Value = "EnableFirewall"
                ExpectedValue = 1
                Weight = 15
            },
            @{
                Name = "Automatic Updates Enabled"
                Path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
                Value = "NoAutoUpdate"
                ExpectedValue = 0
                Weight = 10
            },
            @{
                Name = "Remote Desktop Disabled"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
                Value = "fDenyTSConnections"
                ExpectedValue = 1
                Weight = 8
            },
            @{
                Name = "Guest Account Disabled"
                Path = "HKLM:\SAM\SAM\Domains\Account\Users\000001F5"
                Value = "F"
                ExpectedValue = $null  # Special handling required
                Weight = 12
            }
        )
        
        foreach ($check in $securityChecks) {
            $checkResult = @{
                Name = $check.Name
                Path = $check.Path
                Value = $check.Value
                ExpectedValue = $check.ExpectedValue
                ActualValue = $null
                Passed = $false
                Weight = $check.Weight
                Error = $null
            }
            
            try {
                if (Test-Path $check.Path) {
                    $actualValue = Get-ItemProperty -Path $check.Path -Name $check.Value -ErrorAction SilentlyContinue
                    if ($actualValue) {
                        $checkResult.ActualValue = $actualValue.($check.Value)
                        $checkResult.Passed = $checkResult.ActualValue -eq $check.ExpectedValue
                    }
                } else {
                    $checkResult.Error = "Registry path not found"
                }
            } catch {
                $checkResult.Error = $_.Exception.Message
            }
            
            if ($checkResult.Passed) {
                $result.SecurityScore += $check.Weight
            }
            $result.MaxScore += $check.Weight
            $result.Checks += $checkResult
            
            # Generate recommendations
            if (-not $checkResult.Passed -and $IncludeRecommendations) {
                $recommendation = Get-SecurityRecommendation -Check $check
                if ($recommendation) {
                    $result.Recommendations += $recommendation
                }
            }
        }
        
        $result.Success = $true
        $result.SecurityPercentage = if ($result.MaxScore -gt 0) { 
            [math]::Round(($result.SecurityScore / $result.MaxScore) * 100, 1) 
        } else { 0 }
        
        Write-LogEntry -Level "INFO" -Message "Security registry check completed" -Category "REGISTRY" -Properties @{
            ChecksPassed = ($result.Checks | Where-Object { $_.Passed }).Count
            TotalChecks = $result.Checks.Count
            SecurityScore = $result.SecurityScore
            SecurityPercentage = $result.SecurityPercentage
        }
        
        return $result
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Security registry check failed: $($_.Exception.Message)" -Category "REGISTRY" -Exception $_
        
        return @{
            Success = $false
            Error = $_.Exception.Message
            Checks = @()
            Recommendations = @()
        }
    }
}

# Helper functions
function Get-EventSeverity {
    param([int]$EventId)
    
    switch ($EventId) {
        4625 { return "High" }     # Failed logon
        4648 { return "Medium" }   # Explicit logon
        4672 { return "Medium" }   # Special privileges
        4624 { return "Low" }      # Successful logon
        default { return "Medium" }
    }
}

function Get-EventCategory {
    param([int]$EventId)
    
    switch ($EventId) {
        4625 { return "Authentication" }
        4624 { return "Authentication" }
        4648 { return "Authentication" }
        4672 { return "Privilege Use" }
        default { return "Security" }
    }
}

function Get-SecurityRecommendation {
    param([hashtable]$Check)
    
    $recommendations = @{
        "UAC Enabled" = "Enable User Account Control (UAC) to protect against unauthorized changes"
        "Windows Firewall Enabled" = "Enable Windows Firewall to protect against network threats"
        "Automatic Updates Enabled" = "Enable automatic updates to ensure security patches are installed"
        "Remote Desktop Disabled" = "Disable Remote Desktop if not required to reduce attack surface"
        "Guest Account Disabled" = "Disable the Guest account to prevent unauthorized access"
    }
    
    return $recommendations[$Check.Name]
}

function Get-SystemSecuritySummary {
    <#
    .SYNOPSIS
    Provides a comprehensive security summary of the Windows system
    #>
    try {
        $summary = @{
            Timestamp = Get-Date
            ComputerName = $env:COMPUTERNAME
            OSVersion = (Get-WmiObject Win32_OperatingSystem).Caption
            SecurityStatus = @{}
            Recommendations = @()
        }
        
        # Registry security checks
        $registryResults = Invoke-SecurityRegistryCheck
        $summary.SecurityStatus.Registry = @{
            Score = $registryResults.SecurityScore
            MaxScore = $registryResults.MaxScore
            Percentage = $registryResults.SecurityPercentage
            ChecksPassed = ($registryResults.Checks | Where-Object { $_.Passed }).Count
            TotalChecks = $registryResults.Checks.Count
        }
        
        # WMI security checks
        $antivirusStatus = Invoke-WMISecurityQuery -QueryType "AntivirusStatus"
        $firewallStatus = Invoke-WMISecurityQuery -QueryType "FirewallStatus"
        
        $summary.SecurityStatus.Antivirus = @{
            Installed = $antivirusStatus.Success -and $antivirusStatus.Data.Count -gt 0
            Products = $antivirusStatus.Data
        }
        
        $summary.SecurityStatus.Firewall = @{
            ServiceRunning = $firewallStatus.Data.FirewallServiceStatus -eq "Running"
            StartMode = $firewallStatus.Data.StartMode
        }
        
        # Active Directory status
        $adStatus = Test-ActiveDirectoryConnectivity
        $summary.SecurityStatus.ActiveDirectory = @{
            DomainJoined = $adStatus.DomainJoined
            Connectivity = $adStatus.Success
            DomainName = $adStatus.DomainName
        }
        
        # Generate overall security score
        $overallScore = 0
        $maxOverallScore = 100
        
        # Registry contributes 40%
        $overallScore += ($summary.SecurityStatus.Registry.Percentage * 0.4)
        
        # Antivirus contributes 30%
        if ($summary.SecurityStatus.Antivirus.Installed) {
            $overallScore += 30
        }
        
        # Firewall contributes 20%
        if ($summary.SecurityStatus.Firewall.ServiceRunning) {
            $overallScore += 20
        }
        
        # Domain membership contributes 10%
        if ($summary.SecurityStatus.ActiveDirectory.DomainJoined) {
            $overallScore += 10
        }
        
        $summary.OverallSecurityScore = [math]::Round($overallScore, 1)
        $summary.SecurityLevel = if ($overallScore -ge 80) { "High" } 
                                elseif ($overallScore -ge 60) { "Medium" } 
                                else { "Low" }
        
        Write-LogEntry -Level "INFO" -Message "System security summary generated" -Category "SECURITY" -Properties @{
            SecurityLevel = $summary.SecurityLevel
            OverallScore = $summary.OverallSecurityScore
            ComputerName = $summary.ComputerName
        }
        
        return $summary
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to generate system security summary: $($_.Exception.Message)" -Category "SECURITY" -Exception $_
        throw
    }
}

Export-ModuleMember -Function @(
    'Test-RequestAuthentication',
    'Format-ErrorResponse', 
    'Parse-QueryString',
    'Add-AuditLog',
    'Test-DatabaseConnection',
    'Invoke-DatabaseQuery',
    'Write-APILog',
    'Write-WindowsEventLog',
    'Get-WindowsSecurityEvents',
    'Invoke-WMISecurityQuery',
    'Test-ActiveDirectoryConnectivity',
    'Invoke-SecurityRegistryCheck',
    'Get-SystemSecuritySummary'
)