# DBUtil.psm1 - Enhanced SQLite Database Operations Module
# Version: 2.0.0 - Enterprise-grade database operations
# Features: Connection pooling, retry logic, transaction management, performance monitoring

# Import required assemblies and modules
try {
    Add-Type -AssemblyName System.Data.SQLite -ErrorAction Stop
    Import-Module "$PSScriptRoot/LogUtil.psm1" -Force -ErrorAction Stop
} catch {
    throw "Failed to load required assemblies or modules: $($_.Exception.Message)"
}

# Database configuration and connection pooling
$script:DatabaseConfig = @{
    DefaultPath = "db/itsm.sqlite"
    ConnectionTimeout = 30
    CommandTimeout = 60
    MaxRetryAttempts = 3
    RetryDelayMs = 1000
    EnableConnectionPooling = $true
    MaxPoolSize = 10
    ConnectionLifetimeMinutes = 30
    EnableQueryLogging = $true
    EnablePerformanceMonitoring = $true
}

# Connection pool management
$script:ConnectionPool = [System.Collections.Concurrent.ConcurrentQueue[object]]::new()
$script:ConnectionMetrics = @{
    TotalConnections = 0
    ActiveConnections = 0
    PooledConnections = 0
    ConnectionsCreated = 0
    ConnectionsReused = 0
    QueryCount = 0
    AverageQueryTime = 0
    LastCleanup = Get-Date
}

# Query performance tracking
$script:QueryPerformance = [System.Collections.Concurrent.ConcurrentDictionary[string, hashtable]]::new()

function Initialize-Database {
    <#
    .SYNOPSIS
    Initializes the SQLite database with enhanced error handling and validation
    
    .DESCRIPTION
    Creates and initializes the database with schema validation, connection testing,
    and comprehensive error handling with rollback capabilities
    #>
    param(
        [Parameter(Mandatory=$false)]
        [ValidateNotNullOrEmpty()]
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath,
        
        [Parameter(Mandatory=$false)]
        [string]$SchemaPath = "db/schema.sql",
        
        [Parameter(Mandatory=$false)]
        [switch]$Force = $false,
        
        [Parameter(Mandatory=$false)]
        [switch]$ValidateSchema = $true
    )
    
    $initResult = @{
        Success = $false
        DatabasePath = $DatabasePath
        SchemaApplied = $false
        ValidationPassed = $false
        ErrorMessage = $null
        CreatedTables = @()
        ExecutionTime = 0
    }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        Write-LogEntry -Level "INFO" -Message "Starting database initialization: $DatabasePath" -Category "DATABASE"
        
        # Validate paths
        $dbDirectory = Split-Path $DatabasePath -Parent
        if ($dbDirectory -and -not (Test-Path $dbDirectory)) {
            New-Item -ItemType Directory -Path $dbDirectory -Force | Out-Null
            Write-LogEntry -Level "INFO" -Message "Created database directory: $dbDirectory" -Category "DATABASE"
        }
        
        # Check if database exists and Force flag
        if ((Test-Path $DatabasePath) -and -not $Force) {
            Write-LogEntry -Level "WARNING" -Message "Database already exists: $DatabasePath" -Category "DATABASE"
            $initResult.ErrorMessage = "Database already exists. Use -Force to recreate."
            return $initResult
        }
        
        # Create database file
        if (-not (Test-Path $DatabasePath) -or $Force) {
            New-Item -ItemType File -Path $DatabasePath -Force | Out-Null
            Write-LogEntry -Level "INFO" -Message "Created database file: $DatabasePath" -Category "DATABASE"
        }
        
        # Test connection
        $connection = Get-DatabaseConnection -DatabasePath $DatabasePath
        if (-not $connection) {
            throw "Failed to establish database connection"
        }
        
        try {
            $connection.Open()
            
            # Enable foreign keys and other pragmas
            $pragmaQueries = @(
                "PRAGMA foreign_keys = ON",
                "PRAGMA journal_mode = WAL",
                "PRAGMA synchronous = NORMAL",
                "PRAGMA temp_store = MEMORY",
                "PRAGMA mmap_size = 268435456",  # 256MB
                "PRAGMA cache_size = 10000"
            )
            
            foreach ($pragma in $pragmaQueries) {
                $command = $connection.CreateCommand()
                $command.CommandText = $pragma
                $command.ExecuteNonQuery() | Out-Null
            }
            
            # Apply schema if provided
            if ($SchemaPath -and (Test-Path $SchemaPath)) {
                $schema = Get-Content $SchemaPath -Raw -ErrorAction Stop
                if ([string]::IsNullOrWhiteSpace($schema)) {
                    throw "Schema file is empty: $SchemaPath"
                }
                
                # Split schema into individual statements
                $statements = $schema -split ';' | Where-Object { $_.Trim() -ne '' }
                
                # Begin transaction
                $transaction = $connection.BeginTransaction()
                
                try {
                    foreach ($statement in $statements) {
                        $statement = $statement.Trim()
                        if ($statement) {
                            $command = $connection.CreateCommand()
                            $command.Transaction = $transaction
                            $command.CommandText = $statement
                            $command.ExecuteNonQuery() | Out-Null
                            
                            # Track created tables
                            if ($statement -match 'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w\[\]]+)') {
                                $tableName = $matches[1] -replace '[\[\]]', ''
                                $initResult.CreatedTables += $tableName
                            }
                        }
                    }
                    
                    $transaction.Commit()
                    $initResult.SchemaApplied = $true
                    Write-LogEntry -Level "INFO" -Message "Schema applied successfully. Tables created: $($initResult.CreatedTables -join ', ')" -Category "DATABASE"
                    
                } catch {
                    $transaction.Rollback()
                    throw "Schema application failed: $($_.Exception.Message)"
                }
            }
            
            # Validate schema if requested
            if ($ValidateSchema) {
                $validationResult = Test-DatabaseSchema -Connection $connection
                $initResult.ValidationPassed = $validationResult.Success
                if (-not $validationResult.Success) {
                    Write-LogEntry -Level "WARNING" -Message "Schema validation failed: $($validationResult.ErrorMessage)" -Category "DATABASE"
                }
            }
            
        } finally {
            if ($connection.State -eq 'Open') {
                $connection.Close()
            }
            $connection.Dispose()
        }
        
        $initResult.Success = $true
        Write-LogEntry -Level "INFO" -Message "Database initialization completed successfully" -Category "DATABASE" -Properties @{
            DatabasePath = $DatabasePath
            SchemaApplied = $initResult.SchemaApplied
            TablesCreated = $initResult.CreatedTables.Count
            ExecutionTimeMs = $stopwatch.ElapsedMilliseconds
        }
        
    } catch {
        $initResult.ErrorMessage = $_.Exception.Message
        Write-LogEntry -Level "ERROR" -Message "Database initialization failed: $($_.Exception.Message)" -Category "DATABASE" -Exception $_
        
        # Cleanup on failure
        if ($Force -and (Test-Path $DatabasePath)) {
            try {
                Remove-Item $DatabasePath -Force -ErrorAction SilentlyContinue
            } catch {
                Write-LogEntry -Level "WARNING" -Message "Failed to cleanup database file after initialization failure" -Category "DATABASE"
            }
        }
        
    } finally {
        $stopwatch.Stop()
        $initResult.ExecutionTime = $stopwatch.ElapsedMilliseconds
    }
    
    return $initResult
}

function Invoke-SqlQuery {
    <#
    .SYNOPSIS
    Executes a SQL query with enhanced error handling and performance monitoring
    
    .DESCRIPTION
    Executes SELECT queries with connection pooling, retry logic, parameter validation,
    and comprehensive performance monitoring
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Query,
        
        [Parameter(Mandatory=$false)]
        [hashtable]$Parameters = @{},
        
        [Parameter(Mandatory=$false)]
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath,
        
        [Parameter(Mandatory=$false)]
        [int]$TimeoutSeconds = $script:DatabaseConfig.CommandTimeout,
        
        [Parameter(Mandatory=$false)]
        [switch]$UseConnectionPool = $true
    )
    
    $queryResult = @{
        Success = $false
        Data = $null
        RowCount = 0
        ExecutionTime = 0
        ErrorMessage = $null
        QueryHash = $null
    }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $connection = $null
    $queryHash = Get-StringHash -InputString "$Query|$($Parameters | ConvertTo-Json -Compress)"
    $queryResult.QueryHash = $queryHash
    
    try {
        # Input validation
        if ([string]::IsNullOrWhiteSpace($Query)) {
            throw "Query cannot be null or empty"
        }
        
        # Validate query type (should be SELECT for this function)
        $queryType = ($Query.Trim() -split '\s+')[0].ToUpper()
        if ($queryType -notin @('SELECT', 'WITH', 'PRAGMA')) {
            Write-LogEntry -Level "WARNING" -Message "Non-SELECT query passed to Invoke-SqlQuery: $queryType" -Category "DATABASE"
        }
        
        # Log query if enabled
        if ($script:DatabaseConfig.EnableQueryLogging) {
            Write-LogEntry -Level "DEBUG" -Message "Executing SQL query" -Category "DATABASE" -Properties @{
                QueryType = $queryType
                ParameterCount = $Parameters.Count
                QueryHash = $queryHash
            }
        }
        
        # Execute with retry logic
        $attempt = 0
        $lastException = $null
        
        do {
            $attempt++
            try {
                # Get connection (pooled or new)
                $connection = if ($UseConnectionPool) { 
                    Get-PooledConnection -DatabasePath $DatabasePath 
                } else { 
                    Get-DatabaseConnection -DatabasePath $DatabasePath 
                }
                
                if (-not $connection) {
                    throw "Failed to obtain database connection"
                }
                
                $connection.Open()
                
                # Create and configure command
                $command = $connection.CreateCommand()
                $command.CommandText = $Query
                $command.CommandTimeout = $TimeoutSeconds
                
                # Add parameters with validation
                foreach ($param in $Parameters.GetEnumerator()) {
                    $paramValue = if ($param.Value -eq $null) { [DBNull]::Value } else { $param.Value }
                    $command.Parameters.AddWithValue("@$($param.Key)", $paramValue) | Out-Null
                }
                
                # Execute query
                $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($command)
                $dataset = New-Object System.Data.DataSet
                $rowCount = $adapter.Fill($dataset)
                
                # Process results
                $queryResult.Data = $dataset.Tables[0].Rows
                $queryResult.RowCount = $rowCount
                $queryResult.Success = $true
                
                # Update performance metrics
                Update-QueryPerformance -QueryHash $queryHash -ExecutionTime $stopwatch.ElapsedMilliseconds -RowCount $rowCount
                $script:ConnectionMetrics.QueryCount++
                
                break  # Success, exit retry loop
                
            } catch {
                $lastException = $_
                
                Write-LogEntry -Level "WARNING" -Message "SQL query attempt $attempt failed: $($_.Exception.Message)" -Category "DATABASE" -Properties @{
                    QueryHash = $queryHash
                    Attempt = $attempt
                    MaxAttempts = $script:DatabaseConfig.MaxRetryAttempts
                }
                
                if ($attempt -lt $script:DatabaseConfig.MaxRetryAttempts) {
                    Start-Sleep -Milliseconds ($script:DatabaseConfig.RetryDelayMs * $attempt)
                }
                
            } finally {
                if ($connection) {
                    if ($UseConnectionPool) {
                        Return-PooledConnection -Connection $connection
                    } else {
                        if ($connection.State -eq 'Open') {
                            $connection.Close()
                        }
                        $connection.Dispose()
                    }
                }
            }
            
        } while ($attempt -lt $script:DatabaseConfig.MaxRetryAttempts)
        
        if (-not $queryResult.Success) {
            throw $lastException
        }
        
    } catch {
        $queryResult.ErrorMessage = $_.Exception.Message
        Write-LogEntry -Level "ERROR" -Message "SQL query failed: $($_.Exception.Message)" -Category "DATABASE" -Exception $_ -Properties @{
            QueryHash = $queryHash
            AttemptsMade = $attempt
        }
        
    } finally {
        $stopwatch.Stop()
        $queryResult.ExecutionTime = $stopwatch.ElapsedMilliseconds
        
        # Log performance if enabled
        if ($script:DatabaseConfig.EnablePerformanceMonitoring) {
            if ($queryResult.ExecutionTime -gt 1000) {  # Log slow queries (>1s)
                Write-LogEntry -Level "WARNING" -Message "Slow SQL query detected" -Category "PERFORMANCE" -Properties @{
                    QueryHash = $queryHash
                    ExecutionTimeMs = $queryResult.ExecutionTime
                    RowCount = $queryResult.RowCount
                }
            }
        }
    }
    
    return if ($queryResult.Success) { $queryResult.Data } else { $null }
}

function Invoke-SqlNonQuery {
    <#
    .SYNOPSIS
    Executes non-query SQL commands with enhanced transaction support
    
    .DESCRIPTION
    Executes INSERT, UPDATE, DELETE commands with automatic transaction management,
    retry logic, and comprehensive error handling
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$Query,
        
        [Parameter(Mandatory=$false)]
        [hashtable]$Parameters = @{},
        
        [Parameter(Mandatory=$false)]
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath,
        
        [Parameter(Mandatory=$false)]
        [int]$TimeoutSeconds = $script:DatabaseConfig.CommandTimeout,
        
        [Parameter(Mandatory=$false)]
        [switch]$UseTransaction = $true,
        
        [Parameter(Mandatory=$false)]
        [switch]$UseConnectionPool = $true
    )
    
    $commandResult = @{
        Success = $false
        RowsAffected = 0
        ExecutionTime = 0
        ErrorMessage = $null
        QueryHash = $null
    }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $connection = $null
    $transaction = $null
    $queryHash = Get-StringHash -InputString "$Query|$($Parameters | ConvertTo-Json -Compress)"
    $commandResult.QueryHash = $queryHash
    
    try {
        # Input validation
        if ([string]::IsNullOrWhiteSpace($Query)) {
            throw "Query cannot be null or empty"
        }
        
        # Validate query type
        $queryType = ($Query.Trim() -split '\s+')[0].ToUpper()
        if ($queryType -notin @('INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'PRAGMA')) {
            Write-LogEntry -Level "WARNING" -Message "Unexpected query type for non-query execution: $queryType" -Category "DATABASE"
        }
        
        # Log command if enabled
        if ($script:DatabaseConfig.EnableQueryLogging) {
            Write-LogEntry -Level "DEBUG" -Message "Executing SQL non-query" -Category "DATABASE" -Properties @{
                QueryType = $queryType
                ParameterCount = $Parameters.Count
                UseTransaction = $UseTransaction
                QueryHash = $queryHash
            }
        }
        
        # Execute with retry logic
        $attempt = 0
        $lastException = $null
        
        do {
            $attempt++
            try {
                # Get connection
                $connection = if ($UseConnectionPool) { 
                    Get-PooledConnection -DatabasePath $DatabasePath 
                } else { 
                    Get-DatabaseConnection -DatabasePath $DatabasePath 
                }
                
                if (-not $connection) {
                    throw "Failed to obtain database connection"
                }
                
                $connection.Open()
                
                # Begin transaction if requested
                if ($UseTransaction) {
                    $transaction = $connection.BeginTransaction()
                }
                
                # Create and configure command
                $command = $connection.CreateCommand()
                $command.CommandText = $Query
                $command.CommandTimeout = $TimeoutSeconds
                
                if ($transaction) {
                    $command.Transaction = $transaction
                }
                
                # Add parameters with validation
                foreach ($param in $Parameters.GetEnumerator()) {
                    $paramValue = if ($param.Value -eq $null) { [DBNull]::Value } else { $param.Value }
                    $command.Parameters.AddWithValue("@$($param.Key)", $paramValue) | Out-Null
                }
                
                # Execute command
                $rowsAffected = $command.ExecuteNonQuery()
                
                # Commit transaction if used
                if ($transaction) {
                    $transaction.Commit()
                }
                
                $commandResult.RowsAffected = $rowsAffected
                $commandResult.Success = $true
                
                # Update performance metrics
                Update-QueryPerformance -QueryHash $queryHash -ExecutionTime $stopwatch.ElapsedMilliseconds -RowCount $rowsAffected
                $script:ConnectionMetrics.QueryCount++
                
                break  # Success, exit retry loop
                
            } catch {
                $lastException = $_
                
                # Rollback transaction on error
                if ($transaction) {
                    try {
                        $transaction.Rollback()
                    } catch {
                        Write-LogEntry -Level "ERROR" -Message "Failed to rollback transaction: $($_.Exception.Message)" -Category "DATABASE"
                    }
                }
                
                Write-LogEntry -Level "WARNING" -Message "SQL non-query attempt $attempt failed: $($_.Exception.Message)" -Category "DATABASE" -Properties @{
                    QueryHash = $queryHash
                    Attempt = $attempt
                    MaxAttempts = $script:DatabaseConfig.MaxRetryAttempts
                }
                
                if ($attempt -lt $script:DatabaseConfig.MaxRetryAttempts) {
                    Start-Sleep -Milliseconds ($script:DatabaseConfig.RetryDelayMs * $attempt)
                }
                
            } finally {
                if ($transaction) {
                    $transaction.Dispose()
                    $transaction = $null
                }
                
                if ($connection) {
                    if ($UseConnectionPool) {
                        Return-PooledConnection -Connection $connection
                    } else {
                        if ($connection.State -eq 'Open') {
                            $connection.Close()
                        }
                        $connection.Dispose()
                    }
                }
            }
            
        } while ($attempt -lt $script:DatabaseConfig.MaxRetryAttempts)
        
        if (-not $commandResult.Success) {
            throw $lastException
        }
        
    } catch {
        $commandResult.ErrorMessage = $_.Exception.Message
        Write-LogEntry -Level "ERROR" -Message "SQL non-query failed: $($_.Exception.Message)" -Category "DATABASE" -Exception $_ -Properties @{
            QueryHash = $queryHash
            AttemptsMade = $attempt
        }
        
    } finally {
        $stopwatch.Stop()
        $commandResult.ExecutionTime = $stopwatch.ElapsedMilliseconds
        
        # Log performance if enabled
        if ($script:DatabaseConfig.EnablePerformanceMonitoring) {
            if ($commandResult.ExecutionTime -gt 1000) {  # Log slow queries (>1s)
                Write-LogEntry -Level "WARNING" -Message "Slow SQL non-query detected" -Category "PERFORMANCE" -Properties @{
                    QueryHash = $queryHash
                    ExecutionTimeMs = $commandResult.ExecutionTime
                    RowsAffected = $commandResult.RowsAffected
                }
            }
        }
    }
    
    return if ($commandResult.Success) { $commandResult.RowsAffected } else { -1 }
}

function Get-LastInsertId {
    <#
    .SYNOPSIS
    Gets the last inserted row ID with enhanced error handling
    #>
    param(
        [Parameter(Mandatory=$false)]
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath
    )
    
    try {
        $result = Invoke-SqlQuery -Query "SELECT last_insert_rowid() as id" -DatabasePath $DatabasePath
        if ($result -and $result.Count -gt 0) {
            return [int64]$result[0].id
        }
        return -1
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to get last insert ID: $($_.Exception.Message)" -Category "DATABASE" -Exception $_
        return -1
    }
}

# Connection pooling functions
function Get-DatabaseConnection {
    <#
    .SYNOPSIS
    Creates a new database connection with proper configuration
    #>
    param(
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath
    )
    
    try {
        $connectionString = "Data Source=$DatabasePath;Version=3;Pooling=false;Connection Timeout=$($script:DatabaseConfig.ConnectionTimeout)"
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        
        $script:ConnectionMetrics.ConnectionsCreated++
        return $connection
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Failed to create database connection: $($_.Exception.Message)" -Category "DATABASE" -Exception $_
        return $null
    }
}

function Get-PooledConnection {
    <#
    .SYNOPSIS
    Gets a connection from the pool or creates a new one
    #>
    param(
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath
    )
    
    if (-not $script:DatabaseConfig.EnableConnectionPooling) {
        return Get-DatabaseConnection -DatabasePath $DatabasePath
    }
    
    $connection = $null
    if ($script:ConnectionPool.TryDequeue([ref]$connection)) {
        # Validate pooled connection
        if ($connection -and $connection.State -eq 'Closed') {
            $script:ConnectionMetrics.ConnectionsReused++
            $script:ConnectionMetrics.PooledConnections--
            return $connection
        } else {
            # Dispose invalid connection
            if ($connection) {
                $connection.Dispose()
            }
        }
    }
    
    # Create new connection if pool is empty or connection invalid
    return Get-DatabaseConnection -DatabasePath $DatabasePath
}

function Return-PooledConnection {
    <#
    .SYNOPSIS
    Returns a connection to the pool or disposes it
    #>
    param(
        [System.Data.SQLite.SQLiteConnection]$Connection
    )
    
    if (-not $Connection) {
        return
    }
    
    try {
        if ($Connection.State -eq 'Open') {
            $Connection.Close()
        }
        
        # Add to pool if enabled and pool not full
        if ($script:DatabaseConfig.EnableConnectionPooling -and 
            $script:ConnectionMetrics.PooledConnections -lt $script:DatabaseConfig.MaxPoolSize) {
            $script:ConnectionPool.Enqueue($Connection)
            $script:ConnectionMetrics.PooledConnections++
        } else {
            $Connection.Dispose()
        }
        
    } catch {
        Write-LogEntry -Level "WARNING" -Message "Failed to return connection to pool: $($_.Exception.Message)" -Category "DATABASE"
        try {
            $Connection.Dispose()
        } catch {}
    }
}

function Test-DatabaseConnection {
    <#
    .SYNOPSIS
    Tests database connectivity and health
    #>
    param(
        [string]$DatabasePath = $script:DatabaseConfig.DefaultPath
    )
    
    try {
        $connection = Get-DatabaseConnection -DatabasePath $DatabasePath
        if (-not $connection) {
            return $false
        }
        
        $connection.Open()
        
        # Test with simple query
        $command = $connection.CreateCommand()
        $command.CommandText = "SELECT 1 as test"
        $result = $command.ExecuteScalar()
        
        $connection.Close()
        $connection.Dispose()
        
        return $result -eq 1
        
    } catch {
        Write-LogEntry -Level "ERROR" -Message "Database connection test failed: $($_.Exception.Message)" -Category "DATABASE" -Exception $_
        return $false
    }
}

function Test-DatabaseSchema {
    <#
    .SYNOPSIS
    Validates database schema integrity
    #>
    param(
        [System.Data.SQLite.SQLiteConnection]$Connection
    )
    
    $validationResult = @{
        Success = $false
        ErrorMessage = $null
        Tables = @()
        Indexes = @()
    }
    
    try {
        # Get table list
        $command = $Connection.CreateCommand()
        $command.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($command)
        $dataset = New-Object System.Data.DataSet
        $adapter.Fill($dataset) | Out-Null
        
        $validationResult.Tables = $dataset.Tables[0].Rows | ForEach-Object { $_.name }
        
        # Basic validation - check for required tables
        $requiredTables = @('users', 'assets', 'incidents', 'logs')
        $missingTables = $requiredTables | Where-Object { $_ -notin $validationResult.Tables }
        
        if ($missingTables.Count -eq 0) {
            $validationResult.Success = $true
        } else {
            $validationResult.ErrorMessage = "Missing required tables: $($missingTables -join ', ')"
        }
        
    } catch {
        $validationResult.ErrorMessage = $_.Exception.Message
    }
    
    return $validationResult
}

function Get-StringHash {
    <#
    .SYNOPSIS
    Generates a hash for a string (for query caching/tracking)
    #>
    param([string]$InputString)
    
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $hasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($InputString))
    return [System.Convert]::ToBase64String($hashBytes).Substring(0, 16)
}

function Update-QueryPerformance {
    <#
    .SYNOPSIS
    Updates query performance metrics
    #>
    param(
        [string]$QueryHash,
        [int]$ExecutionTime,
        [int]$RowCount
    )
    
    if (-not $script:DatabaseConfig.EnablePerformanceMonitoring) {
        return
    }
    
    $perfData = $script:QueryPerformance.GetOrAdd($QueryHash, {
        @{
            ExecutionCount = 0
            TotalExecutionTime = 0
            MinExecutionTime = [int]::MaxValue
            MaxExecutionTime = 0
            AverageExecutionTime = 0
            TotalRowsProcessed = 0
            LastExecuted = Get-Date
        }
    })
    
    $perfData.ExecutionCount++
    $perfData.TotalExecutionTime += $ExecutionTime
    $perfData.MinExecutionTime = [Math]::Min($perfData.MinExecutionTime, $ExecutionTime)
    $perfData.MaxExecutionTime = [Math]::Max($perfData.MaxExecutionTime, $ExecutionTime)
    $perfData.AverageExecutionTime = $perfData.TotalExecutionTime / $perfData.ExecutionCount
    $perfData.TotalRowsProcessed += $RowCount
    $perfData.LastExecuted = Get-Date
}

function Get-DatabaseMetrics {
    <#
    .SYNOPSIS
    Gets database performance and connection metrics
    #>
    return @{
        ConnectionMetrics = $script:ConnectionMetrics
        QueryPerformance = $script:QueryPerformance
        PoolStatus = @{
            CurrentPoolSize = $script:ConnectionPool.Count
            MaxPoolSize = $script:DatabaseConfig.MaxPoolSize
            PoolingEnabled = $script:DatabaseConfig.EnableConnectionPooling
        }
        Configuration = $script:DatabaseConfig
    }
}

# Cleanup function
$MyInvocation.MyCommand.ScriptBlock.Module.OnRemove = {
    # Dispose all pooled connections
    while ($script:ConnectionPool.TryDequeue([ref]$connection)) {
        try {
            if ($connection.State -eq 'Open') {
                $connection.Close()
            }
            $connection.Dispose()
        } catch {}
    }
}

Export-ModuleMember -Function @(
    'Initialize-Database',
    'Invoke-SqlQuery', 
    'Invoke-SqlNonQuery',
    'Get-LastInsertId',
    'Test-DatabaseConnection',
    'Get-DatabaseMetrics'
)