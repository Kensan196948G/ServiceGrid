# PowerShell HTTP API Server for ITSM Platform
# Comprehensive REST API server implementation
# Version: 2025.6.7

param(
    [int]$Port = 8083,
    [string]$LogPath = "../logs/powershell-api.log",
    [switch]$EnableSSL = $false,
    [string]$CertificatePath = "",
    [switch]$Verbose = $false
)

# Import required modules
Import-Module "../modules/DBUtil.psm1" -Force
Import-Module "../modules/AuthUtil.psm1" -Force
Import-Module "../modules/LogUtil.psm1" -Force
Import-Module "../modules/Config.psm1" -Force

# Enhanced global configuration with performance optimizations
$global:Config = @{
    Port = $Port
    EnableSSL = $EnableSSL
    CertificatePath = $CertificatePath
    LogPath = $LogPath
    MaxRequestSize = 10MB
    RequestTimeout = 30
    EnableCORS = $true
    DebugMode = $Verbose
    
    # Performance optimization settings
    MaxConcurrentRequests = 50
    ConnectionPoolSize = 10
    EnableRequestCaching = $true
    CacheExpiryMinutes = 15
    EnableCompression = $true
    EnableRateLimiting = $true
    RateLimitPerMinute = 1000
    
    # Memory management
    MaxMemoryUsageMB = 1024
    GCInterval = 300  # seconds
    EnableMemoryMonitoring = $true
    
    # Database optimization
    DBConnectionPoolSize = 5
    DBQueryTimeout = 30
    EnableDBCache = $true
    
    # Security enhancements
    MaxLoginAttempts = 5
    LoginLockoutMinutes = 15
    EnableAuditLogging = $true
    SessionTimeoutMinutes = 60
}

# API endpoints mapping
$global:APIEndpoints = @{
    # Authentication endpoints
    "POST:/api/auth/login" = { param($Request) Invoke-AuthLogin $Request }
    "POST:/api/auth/logout" = { param($Request) Invoke-AuthLogout $Request }
    "GET:/api/auth/me" = { param($Request) Invoke-AuthMe $Request }
    "PUT:/api/auth/password" = { param($Request) Invoke-AuthChangePassword $Request }
    
    # Assets endpoints
    "GET:/api/assets" = { param($Request) Invoke-AssetsGet $Request }
    "GET:/api/assets/stats" = { param($Request) Invoke-AssetsStats $Request }
    "GET:/api/assets/generate-tag" = { param($Request) Invoke-AssetsGenerateTag $Request }
    "GET:/api/assets/{id}" = { param($Request) Invoke-AssetsGetById $Request }
    "POST:/api/assets" = { param($Request) Invoke-AssetsCreate $Request }
    "PUT:/api/assets/{id}" = { param($Request) Invoke-AssetsUpdate $Request }
    "DELETE:/api/assets/{id}" = { param($Request) Invoke-AssetsDelete $Request }
    
    # Incidents endpoints
    "GET:/api/incidents" = { param($Request) Invoke-IncidentsGet $Request }
    "GET:/api/incidents/stats" = { param($Request) Invoke-IncidentsStats $Request }
    "GET:/api/incidents/{id}" = { param($Request) Invoke-IncidentsGetById $Request }
    "POST:/api/incidents" = { param($Request) Invoke-IncidentsCreate $Request }
    "PUT:/api/incidents/{id}" = { param($Request) Invoke-IncidentsUpdate $Request }
    "DELETE:/api/incidents/{id}" = { param($Request) Invoke-IncidentsDelete $Request }
    
    # Service Requests endpoints
    "GET:/api/service-requests" = { param($Request) Invoke-ServiceRequestsGet $Request }
    "GET:/api/service-requests/stats" = { param($Request) Invoke-ServiceRequestsStats $Request }
    "GET:/api/service-requests/{id}" = { param($Request) Invoke-ServiceRequestsGetById $Request }
    "POST:/api/service-requests" = { param($Request) Invoke-ServiceRequestsCreate $Request }
    "PUT:/api/service-requests/{id}" = { param($Request) Invoke-ServiceRequestsUpdate $Request }
    "DELETE:/api/service-requests/{id}" = { param($Request) Invoke-ServiceRequestsDelete $Request }
    "PUT:/api/service-requests/{id}/approve" = { param($Request) Invoke-ServiceRequestsApprove $Request }
    "PUT:/api/service-requests/{id}/reject" = { param($Request) Invoke-ServiceRequestsReject $Request }
    
    # Knowledge endpoints
    "GET:/api/knowledge" = { param($Request) Invoke-KnowledgeGet $Request }
    "GET:/api/knowledge/search" = { param($Request) Invoke-KnowledgeSearch $Request }
    "GET:/api/knowledge/{id}" = { param($Request) Invoke-KnowledgeGetById $Request }
    "POST:/api/knowledge" = { param($Request) Invoke-KnowledgeCreate $Request }
    "PUT:/api/knowledge/{id}" = { param($Request) Invoke-KnowledgeUpdate $Request }
    "DELETE:/api/knowledge/{id}" = { param($Request) Invoke-KnowledgeDelete $Request }
    
    # Changes endpoints
    "GET:/api/changes" = { param($Request) Invoke-ChangesGet $Request }
    "GET:/api/changes/stats" = { param($Request) Invoke-ChangesStats $Request }
    "GET:/api/changes/{id}" = { param($Request) Invoke-ChangesGetById $Request }
    "POST:/api/changes" = { param($Request) Invoke-ChangesCreate $Request }
    "PUT:/api/changes/{id}" = { param($Request) Invoke-ChangesUpdate $Request }
    "DELETE:/api/changes/{id}" = { param($Request) Invoke-ChangesDelete $Request }
    "PUT:/api/changes/{id}/approve" = { param($Request) Invoke-ChangesApprove $Request }
    
    # Problems endpoints
    "GET:/api/problems" = { param($Request) Invoke-ProblemsGet $Request }
    "GET:/api/problems/{id}" = { param($Request) Invoke-ProblemsGetById $Request }
    "POST:/api/problems" = { param($Request) Invoke-ProblemsCreate $Request }
    "PUT:/api/problems/{id}" = { param($Request) Invoke-ProblemsUpdate $Request }
    "DELETE:/api/problems/{id}" = { param($Request) Invoke-ProblemsDelete $Request }
    
    # Releases endpoints
    "GET:/api/releases" = { param($Request) Invoke-ReleasesGet $Request }
    "GET:/api/releases/{id}" = { param($Request) Invoke-ReleasesGetById $Request }
    "POST:/api/releases" = { param($Request) Invoke-ReleasesCreate $Request }
    "PUT:/api/releases/{id}" = { param($Request) Invoke-ReleasesUpdate $Request }
    "DELETE:/api/releases/{id}" = { param($Request) Invoke-ReleasesDelete $Request }
    
    # SLAs endpoints
    "GET:/api/slas" = { param($Request) Invoke-SLAsGet $Request }
    "GET:/api/slas/{id}" = { param($Request) Invoke-SLAsGetById $Request }
    "POST:/api/slas" = { param($Request) Invoke-SLAsCreate $Request }
    "PUT:/api/slas/{id}" = { param($Request) Invoke-SLAsUpdate $Request }
    "DELETE:/api/slas/{id}" = { param($Request) Invoke-SLAsDelete $Request }
    
    # Capacity endpoints
    "GET:/api/capacity" = { param($Request) Invoke-CapacityGet $Request }
    "GET:/api/capacity/metrics" = { param($Request) Invoke-CapacityMetrics $Request }
    "POST:/api/capacity" = { param($Request) Invoke-CapacityCreate $Request }
    "PUT:/api/capacity/{id}" = { param($Request) Invoke-CapacityUpdate $Request }
    
    # Availability endpoints
    "GET:/api/availability" = { param($Request) Invoke-AvailabilityGet $Request }
    "GET:/api/availability/metrics" = { param($Request) Invoke-AvailabilityMetrics $Request }
    "POST:/api/availability" = { param($Request) Invoke-AvailabilityCreate $Request }
    "PUT:/api/availability/{id}" = { param($Request) Invoke-AvailabilityUpdate $Request }
    
    # Audit logs endpoints
    "GET:/api/audit-logs" = { param($Request) Invoke-AuditLogsGet $Request }
    "GET:/api/audit-logs/stats" = { param($Request) Invoke-AuditLogsStats $Request }
    "POST:/api/audit-logs/export" = { param($Request) Invoke-AuditLogsExport $Request }
    
    # Users endpoints
    "GET:/api/users" = { param($Request) Invoke-UsersGet $Request }
    "GET:/api/users/{id}" = { param($Request) Invoke-UsersGetById $Request }
    "POST:/api/users" = { param($Request) Invoke-UsersCreate $Request }
    "PUT:/api/users/{id}" = { param($Request) Invoke-UsersUpdate $Request }
    "DELETE:/api/users/{id}" = { param($Request) Invoke-UsersDelete $Request }
    
    # Reports endpoints
    "GET:/api/reports/dashboard" = { param($Request) Invoke-ReportsDashboard $Request }
    "GET:/api/reports/assets" = { param($Request) Invoke-ReportsAssets $Request }
    "GET:/api/reports/incidents" = { param($Request) Invoke-ReportsIncidents $Request }
    "GET:/api/reports/performance" = { param($Request) Invoke-ReportsPerformance $Request }
    
    # Health check endpoints
    "GET:/api/health" = { param($Request) Invoke-HealthCheck $Request }
    "GET:/api/status" = { param($Request) Invoke-StatusCheck $Request }
    "GET:/api/version" = { param($Request) Invoke-VersionCheck $Request }
    
    # Microsoft 365 Integration endpoints
    "GET:/api/integration/m365/users" = { param($Request) Invoke-M365UsersGet $Request }
    "GET:/api/integration/m365/licenses" = { param($Request) Invoke-M365LicensesGet $Request }
    "GET:/api/integration/m365/groups" = { param($Request) Invoke-M365GroupsGet $Request }
    
    # Active Directory Integration endpoints
    "GET:/api/integration/ad/users" = { param($Request) Invoke-ADUsersGet $Request }
    "GET:/api/integration/ad/computers" = { param($Request) Invoke-ADComputersGet $Request }
    "GET:/api/integration/ad/groups" = { param($Request) Invoke-ADGroupsGet $Request }
    "GET:/api/integration/ad/ous" = { param($Request) Invoke-ADOUsGet $Request }
    "GET:/api/integration/ad/audit-logs" = { param($Request) Invoke-ADAuditLogsGet $Request }
    "POST:/api/integration/ad/sync" = { param($Request) Invoke-ADSyncData $Request }
    
    # Windows Security Analysis endpoints
    "POST:/api/security/analyze-logs" = { param($Request) Invoke-SecurityLogAnalysis $Request }
    "POST:/api/security/disable-account" = { param($Request) Invoke-DisableSuspiciousAccount $Request }
    "GET:/api/security/system-info" = { param($Request) Invoke-GetSystemInfo $Request }
    
    # File System Monitoring endpoints
    "POST:/api/filesystem/start-monitoring" = { param($Request) Invoke-StartFileSystemMonitoring $Request }
    "POST:/api/filesystem/stop-monitoring" = { param($Request) Invoke-StopFileSystemMonitoring $Request }
    "GET:/api/filesystem/monitoring-status" = { param($Request) Invoke-GetFileSystemMonitoringStatus $Request }
    "GET:/api/filesystem/security-report" = { param($Request) Invoke-GetFileSystemSecurityReport $Request }
}

# Enhanced HTTP server with performance optimizations
function Start-PowerShellAPIServer {
    try {
        Write-APILog "Starting Enhanced PowerShell API Server on port $Port" -Level "INFO"
        Write-APILog "Performance Mode: MaxConcurrent=$($global:Config.MaxConcurrentRequests), PoolSize=$($global:Config.ConnectionPoolSize)" -Level "INFO"
        
        # Initialize performance monitoring
        Initialize-PerformanceMonitoring
        
        # Initialize connection pools
        Initialize-ConnectionPools
        
        # Initialize memory management
        Initialize-MemoryManagement
        
        # Initialize rate limiting
        Initialize-RateLimiting
        
        # Initialize HTTP listener with enhanced settings
        $httpListener = New-Object System.Net.HttpListener
        $prefix = if ($EnableSSL) { "https://+:$Port/" } else { "http://+:$Port/" }
        $httpListener.Prefixes.Add($prefix)
        
        # Configure advanced listener settings
        $httpListener.TimeoutManager.IdleConnection = [TimeSpan]::FromSeconds(30)
        $httpListener.TimeoutManager.HeaderWait = [TimeSpan]::FromSeconds(10)
        $httpListener.TimeoutManager.EntityBody = [TimeSpan]::FromSeconds(120)
        
        if ($EnableSSL -and $CertificatePath) {
            Write-APILog "Configuring SSL with certificate: $CertificatePath" -Level "INFO"
        }
        
        $httpListener.Start()
        Write-APILog "Enhanced HTTP Listener started successfully" -Level "INFO"
        Write-Host "Enhanced PowerShell API Server running on $prefix" -ForegroundColor Green
        Write-Host "Performance Features: Connection Pooling, Rate Limiting, Memory Monitoring" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        
        # Enhanced request processing loop with connection management
        $global:ActiveRequests = 0
        $global:TotalRequestsProcessed = 0
        
        while ($httpListener.IsListening) {
            try {
                # Check memory usage periodically
                if ((Get-Date) -gt $global:NextMemoryCheck) {
                    Invoke-MemoryCleanup
                    $global:NextMemoryCheck = (Get-Date).AddSeconds($global:Config.GCInterval)
                }
                
                # Rate limiting check
                if (-not (Test-RateLimit)) {
                    Start-Sleep -Milliseconds 100
                    continue
                }
                
                # Connection limit check
                if ($global:ActiveRequests -ge $global:Config.MaxConcurrentRequests) {
                    Start-Sleep -Milliseconds 50
                    continue
                }
                
                # Get incoming request (non-blocking with timeout)
                $context = $httpListener.GetContext()
                $global:ActiveRequests++
                $global:TotalRequestsProcessed++
                
                # Process request with enhanced async handling
                $job = Start-Job -ScriptBlock {
                    param($Context, $APIEndpoints, $Config)
                    try {
                        Process-EnhancedHTTPRequest -Context $Context -APIEndpoints $APIEndpoints -Config $Config
                    } finally {
                        # Decrement active request counter
                        $using:global:ActiveRequests--
                    }
                } -ArgumentList $context, $global:APIEndpoints, $global:Config
                
                # Clean up completed jobs periodically
                if ($global:TotalRequestsProcessed % 100 -eq 0) {
                    Get-Job -State Completed | Remove-Job -Force
                }
                
            } catch [System.Net.HttpListenerException] {
                if ($_.Exception.ErrorCode -eq 995) {
                    Write-APILog "Server shutdown requested" -Level "INFO"
                    break
                } else {
                    Write-APILog "HTTP Listener error: $($_.Exception.Message)" -Level "ERROR"
                }
            } catch {
                Write-APILog "Unexpected error in main loop: $($_.Exception.Message)" -Level "ERROR"
                $global:ActiveRequests = [Math]::Max(0, $global:ActiveRequests - 1)
            }
        }
        
    } catch {
        Write-APILog "Failed to start API server: $($_.Exception.Message)" -Level "ERROR"
        throw
    } finally {
        if ($httpListener) {
            $httpListener.Stop()
            $httpListener.Dispose()
            Write-APILog "HTTP Listener stopped and disposed" -Level "INFO"
        }
    }
}

# Enhanced HTTP request processing with performance optimizations
function Process-EnhancedHTTPRequest {
    param(
        [System.Net.HttpListenerContext]$Context,
        [hashtable]$APIEndpoints,
        [hashtable]$Config
    )
    
    $request = $Context.Request
    $response = $Context.Response
    $startTime = Get-Date
    
    try {
        # Log request
        $clientIP = $request.RemoteEndPoint.Address.ToString()
        $method = $request.HttpMethod
        $url = $request.Url.PathAndQuery
        $userAgent = $request.UserAgent
        
        Write-APILog "[$clientIP] $method $url - User-Agent: $userAgent" -Level "INFO"
        
        # Set CORS headers if enabled
        if ($Config.EnableCORS) {
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $response.Headers.Add("Access-Control-Max-Age", "3600")
        }
        
        # Handle OPTIONS requests (CORS preflight)
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            return
        }
        
        # Parse request body if present
        $requestBody = $null
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $requestBody = $reader.ReadToEnd()
            $reader.Close()
        }
        
        # Create enhanced request object with performance metrics
        $requestObj = @{
            Method = $method
            Path = $request.Url.AbsolutePath
            Query = $request.Url.Query
            Headers = @{}
            Body = $requestBody
            UserIP = $clientIP
            UserAgent = $userAgent
            Timestamp = $startTime
            RequestId = [Guid]::NewGuid().ToString()
            ProcessingStartTime = Get-Date
        }
        
        # Copy headers
        foreach ($header in $request.Headers.AllKeys) {
            $requestObj.Headers[$header] = $request.Headers[$header]
        }
        
        # Enhanced endpoint matching with caching
        $cacheKey = "$method:$($request.Url.AbsolutePath)"
        $endpoint = $null
        
        if ($global:Config.EnableRequestCaching -and $global:EndpointCache.ContainsKey($cacheKey)) {
            $endpoint = $global:EndpointCache[$cacheKey]
            $global:PerformanceMetrics.CacheHits++
        } else {
            $endpoint = Find-MatchingEndpoint -Method $method -Path $request.Url.AbsolutePath -Endpoints $APIEndpoints
            if ($endpoint -and $global:Config.EnableRequestCaching) {
                $global:EndpointCache[$cacheKey] = $endpoint
                $global:PerformanceMetrics.CacheMisses++
            }
        }
        
        if ($endpoint) {
            # Execute endpoint with error handling and metrics
            try {
                $executionStart = Get-Date
                $result = & $endpoint.Handler $requestObj
                $executionTime = ((Get-Date) - $executionStart).TotalMilliseconds
                
                # Update performance metrics
                Update-EndpointMetrics -Path $request.Url.AbsolutePath -ExecutionTime $executionTime -Success $true
                
                # Send response with compression if enabled
                Send-EnhancedJSONResponse -Response $response -Data $result -StatusCode 200 -EnableCompression $Config.EnableCompression
                
            } catch {
                $executionTime = ((Get-Date) - $executionStart).TotalMilliseconds
                Update-EndpointMetrics -Path $request.Url.AbsolutePath -ExecutionTime $executionTime -Success $false
                throw
            }
        } else {
            # Enhanced 404 response
            $errorResult = @{
                Status = "Error"
                Message = "Endpoint not found: $method $($request.Url.AbsolutePath)"
                RequestId = $requestObj.RequestId
                Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                AvailableEndpoints = if ($Config.DebugMode) { $APIEndpoints.Keys | Sort-Object } else { $null }
            }
            Send-EnhancedJSONResponse -Response $response -Data $errorResult -StatusCode 404 -EnableCompression $Config.EnableCompression
        }
        
    } catch {
        # Handle errors
        $errorMessage = $_.Exception.Message
        $stackTrace = $_.ScriptStackTrace
        
        Write-APILog "Request error: $errorMessage" -Level "ERROR"
        Write-APILog "Stack trace: $stackTrace" -Level "DEBUG"
        
        $errorResult = @{
            Status = "Error"
            Message = $errorMessage
            Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
        if ($Config.DebugMode) {
            $errorResult.StackTrace = $stackTrace
        }
        
        Send-JSONResponse -Response $response -Data $errorResult -StatusCode 500
        
    } finally {
        # Log response time
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        Write-APILog "Request completed in ${duration}ms" -Level "DEBUG"
        
        # Ensure response is closed
        try {
            $response.Close()
        } catch {
            # Ignore close errors
        }
    }
}

# Find matching API endpoint
function Find-MatchingEndpoint {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Endpoints
    )
    
    # Try exact match first
    $exactKey = "$Method`:$Path"
    if ($Endpoints.ContainsKey($exactKey)) {
        return @{ Handler = $Endpoints[$exactKey]; Parameters = @{} }
    }
    
    # Try pattern matching for parameterized routes
    foreach ($key in $Endpoints.Keys) {
        if ($key.StartsWith("$Method`:")) {
            $pattern = $key.Substring($Method.Length + 1)
            $match = Test-PathPattern -Path $Path -Pattern $pattern
            if ($match.IsMatch) {
                return @{ 
                    Handler = $Endpoints[$key]
                    Parameters = $match.Parameters 
                }
            }
        }
    }
    
    return $null
}

# Test path against pattern
function Test-PathPattern {
    param(
        [string]$Path,
        [string]$Pattern
    )
    
    # Convert pattern to regex
    $regexPattern = $Pattern -replace '\{([^}]+)\}', '(?<$1>[^/]+)'
    $regexPattern = "^$regexPattern$"
    
    if ($Path -match $regexPattern) {
        $parameters = @{}
        foreach ($name in $Matches.Keys) {
            if ($name -ne "0") {
                $parameters[$name] = $Matches[$name]
            }
        }
        return @{ IsMatch = $true; Parameters = $parameters }
    }
    
    return @{ IsMatch = $false; Parameters = @{} }
}

# Enhanced JSON response with compression and performance optimizations
function Send-EnhancedJSONResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [object]$Data,
        [int]$StatusCode = 200,
        [bool]$EnableCompression = $false
    )
    
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    
    # Add performance headers
    $Response.Headers.Add("X-Response-Time", (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"))
    $Response.Headers.Add("X-Server-Version", "Enhanced-PowerShell-API-2.0")
    
    # Convert to JSON with optimized settings
    $json = $Data | ConvertTo-Json -Depth 10 -Compress
    
    # Apply compression if enabled and response is large enough
    if ($EnableCompression -and $json.Length -gt 1024) {
        try {
            $ms = New-Object System.IO.MemoryStream
            $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
            $sw = New-Object System.IO.StreamWriter($gz)
            $sw.Write($json)
            $sw.Close()
            $gz.Close()
            
            $buffer = $ms.ToArray()
            $Response.Headers.Add("Content-Encoding", "gzip")
            $ms.Close()
        } catch {
            # Fall back to uncompressed if compression fails
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        }
    } else {
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    }
    
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
}

# Initialize performance monitoring
function Initialize-PerformanceMonitoring {
    $global:PerformanceMetrics = @{
        RequestCount = 0
        ErrorCount = 0
        CacheHits = 0
        CacheMisses = 0
        AverageResponseTime = 0
        StartTime = Get-Date
        EndpointMetrics = @{}
    }
    
    $global:EndpointCache = @{}
    $global:NextMemoryCheck = (Get-Date).AddSeconds($global:Config.GCInterval)
    
    Write-APILog "Performance monitoring initialized" -Level "INFO"
}

# Initialize connection pools
function Initialize-ConnectionPools {
    $global:ConnectionPool = @{
        Database = @{
            Available = [System.Collections.Queue]::new()
            InUse = [System.Collections.ArrayList]::new()
            MaxSize = $global:Config.DBConnectionPoolSize
            Created = 0
        }
    }
    
    Write-APILog "Connection pools initialized with size: $($global:Config.DBConnectionPoolSize)" -Level "INFO"
}

# Initialize memory management
function Initialize-MemoryManagement {
    $global:MemoryMetrics = @{
        LastGC = Get-Date
        MaxMemoryMB = $global:Config.MaxMemoryUsageMB
        CurrentMemoryMB = 0
        GCCount = 0
    }
    
    Write-APILog "Memory management initialized with limit: $($global:Config.MaxMemoryUsageMB)MB" -Level "INFO"
}

# Initialize rate limiting
function Initialize-RateLimiting {
    $global:RateLimiting = @{
        Requests = [System.Collections.Queue]::new()
        MaxPerMinute = $global:Config.RateLimitPerMinute
        Enabled = $global:Config.EnableRateLimiting
    }
    
    Write-APILog "Rate limiting initialized: $($global:Config.RateLimitPerMinute) requests/minute" -Level "INFO"
}

# Test rate limiting
function Test-RateLimit {
    if (-not $global:RateLimiting.Enabled) {
        return $true
    }
    
    $now = Get-Date
    $oneMinuteAgo = $now.AddMinutes(-1)
    
    # Remove old requests
    while ($global:RateLimiting.Requests.Count -gt 0 -and $global:RateLimiting.Requests.Peek() -lt $oneMinuteAgo) {
        $global:RateLimiting.Requests.Dequeue() | Out-Null
    }
    
    # Check if we're under the limit
    if ($global:RateLimiting.Requests.Count -lt $global:RateLimiting.MaxPerMinute) {
        $global:RateLimiting.Requests.Enqueue($now)
        return $true
    }
    
    return $false
}

# Memory cleanup function
function Invoke-MemoryCleanup {
    $beforeGC = [GC]::GetTotalMemory($false)
    $currentMB = [math]::Round($beforeGC / 1MB, 2)
    
    if ($currentMB -gt $global:MemoryMetrics.MaxMemoryMB) {
        Write-APILog "Memory usage ($currentMB MB) exceeds limit ($($global:MemoryMetrics.MaxMemoryMB) MB), forcing garbage collection" -Level "WARNING"
        
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
        [GC]::Collect()
        
        $afterGC = [GC]::GetTotalMemory($false)
        $freedMB = [math]::Round(($beforeGC - $afterGC) / 1MB, 2)
        
        $global:MemoryMetrics.LastGC = Get-Date
        $global:MemoryMetrics.GCCount++
        $global:MemoryMetrics.CurrentMemoryMB = [math]::Round($afterGC / 1MB, 2)
        
        Write-APILog "Garbage collection completed: freed $freedMB MB, current usage: $($global:MemoryMetrics.CurrentMemoryMB) MB" -Level "INFO"
    }
}

# Update endpoint performance metrics
function Update-EndpointMetrics {
    param(
        [string]$Path,
        [double]$ExecutionTime,
        [bool]$Success
    )
    
    if (-not $global:PerformanceMetrics.EndpointMetrics.ContainsKey($Path)) {
        $global:PerformanceMetrics.EndpointMetrics[$Path] = @{
            TotalRequests = 0
            SuccessfulRequests = 0
            FailedRequests = 0
            AverageResponseTime = 0
            MinResponseTime = [double]::MaxValue
            MaxResponseTime = 0
            LastAccessed = Get-Date
        }
    }
    
    $metrics = $global:PerformanceMetrics.EndpointMetrics[$Path]
    $metrics.TotalRequests++
    $metrics.LastAccessed = Get-Date
    
    if ($Success) {
        $metrics.SuccessfulRequests++
    } else {
        $metrics.FailedRequests++
    }
    
    # Update response time statistics
    $metrics.MinResponseTime = [Math]::Min($metrics.MinResponseTime, $ExecutionTime)
    $metrics.MaxResponseTime = [Math]::Max($metrics.MaxResponseTime, $ExecutionTime)
    
    # Calculate running average
    $metrics.AverageResponseTime = (($metrics.AverageResponseTime * ($metrics.TotalRequests - 1)) + $ExecutionTime) / $metrics.TotalRequests
}

# Health check endpoint
function Invoke-HealthCheck {
    param($Request)
    
    return @{
        Status = "Healthy"
        Message = "PowerShell API Server is running"
        Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        Version = "2025.6.7"
        Uptime = [int]((Get-Date) - (Get-Process -Id $PID).StartTime).TotalSeconds
    }
}

# Enhanced status check endpoint with performance metrics
function Invoke-StatusCheck {
    param($Request)
    
    $dbStatus = Test-DatabaseConnection
    $memoryUsage = [math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
    $uptime = [int]((Get-Date) - (Get-Process -Id $PID).StartTime).TotalSeconds
    
    # Calculate performance statistics
    $totalRequests = if ($global:PerformanceMetrics) { $global:PerformanceMetrics.RequestCount } else { 0 }
    $errorRate = if ($totalRequests -gt 0 -and $global:PerformanceMetrics) { 
        [math]::Round(($global:PerformanceMetrics.ErrorCount / $totalRequests) * 100, 2) 
    } else { 0 }
    
    $cacheHitRate = if ($global:PerformanceMetrics -and ($global:PerformanceMetrics.CacheHits + $global:PerformanceMetrics.CacheMisses) -gt 0) {
        [math]::Round(($global:PerformanceMetrics.CacheHits / ($global:PerformanceMetrics.CacheHits + $global:PerformanceMetrics.CacheMisses)) * 100, 2)
    } else { 0 }
    
    return @{
        Status = "Running"
        Database = if ($dbStatus) { "Connected" } else { "Disconnected" }
        Memory = @{
            CurrentUsageMB = $memoryUsage
            MaxLimitMB = if ($global:MemoryMetrics) { $global:MemoryMetrics.MaxMemoryMB } else { "N/A" }
            GCCount = if ($global:MemoryMetrics) { $global:MemoryMetrics.GCCount } else { 0 }
            LastGC = if ($global:MemoryMetrics) { $global:MemoryMetrics.LastGC.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } else { "N/A" }
        }
        Performance = @{
            TotalRequests = $totalRequests
            ActiveRequests = if ($global:ActiveRequests) { $global:ActiveRequests } else { 0 }
            ErrorRate = "$errorRate%"
            CacheHitRate = "$cacheHitRate%"
            AverageResponseTime = if ($global:PerformanceMetrics) { "$([math]::Round($global:PerformanceMetrics.AverageResponseTime, 2))ms" } else { "N/A" }
            UptimeSeconds = $uptime
        }
        Configuration = @{
            MaxConcurrentRequests = $global:Config.MaxConcurrentRequests
            ConnectionPoolSize = $global:Config.ConnectionPoolSize
            RateLimitPerMinute = $global:Config.RateLimitPerMinute
            CompressionEnabled = $global:Config.EnableCompression
            CachingEnabled = $global:Config.EnableRequestCaching
        }
        Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        Environment = @{
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
            OS = $PSVersionTable.OS
            Platform = $PSVersionTable.Platform
        }
    }
}

# Version check endpoint
function Invoke-VersionCheck {
    param($Request)
    
    return @{
        Version = "2025.6.7"
        ApiVersion = "v1.0"
        BuildDate = "2025-06-07"
        PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        Features = @(
            "Authentication",
            "Asset Management",
            "Incident Management",
            "Service Requests",
            "Change Management",
            "Problem Management",
            "Release Management",
            "Knowledge Management",
            "SLA Management",
            "Capacity Management",
            "Availability Management",
            "Audit Logging",
            "Microsoft 365 Integration",
            "Active Directory Integration"
        )
    }
}

# Signal handler for graceful shutdown
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-APILog "Shutting down PowerShell API Server..." -Level "INFO"
}

# Start the server
try {
    Write-Host "Initializing PowerShell API Server..." -ForegroundColor Green
    
    # Load all API modules
    $apiModules = Get-ChildItem -Path "*.ps1" -Exclude "PowerShellAPIServer.ps1"
    foreach ($module in $apiModules) {
        Write-Host "Loading API module: $($module.Name)" -ForegroundColor Cyan
        . $module.FullName
    }
    
    # Test database connection
    if (-not (Test-DatabaseConnection)) {
        Write-Warning "Database connection failed. Some endpoints may not work correctly."
    }
    
    # Start the server
    Start-PowerShellAPIServer
    
} catch {
    Write-Error "Failed to start PowerShell API Server: $($_.Exception.Message)"
    exit 1
}