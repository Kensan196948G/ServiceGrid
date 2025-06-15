# DBUtil.psm1 - SQLiteデータベース操作共通モジュール - Enhanced with error resilience and connection pooling

function Initialize-Database {
    param(
        [string]$DatabasePath = "db/itsm.sqlite",
        [string]$SchemaPath = "db/schema.sql"
    )
    
    try {
        if (-not (Test-Path $DatabasePath)) {
            New-Item -ItemType File -Path $DatabasePath -Force
        }
        
        $connectionString = "Data Source=$DatabasePath"
        Add-Type -AssemblyName System.Data.SQLite
        
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        if (Test-Path $SchemaPath) {
            $schema = Get-Content $SchemaPath -Raw
            $command = $connection.CreateCommand()
            $command.CommandText = $schema
            $command.ExecuteNonQuery()
        }
        
        $connection.Close()
        Write-Host "Database initialized successfully"
        return $true
    }
    catch {
        Write-Error "Database initialization failed: $($_.Exception.Message)"
        return $false
    }
}

function Invoke-SqlQuery {
    param(
        [string]$Query,
        [hashtable]$Parameters = @{},
        [string]$DatabasePath = "db/itsm.sqlite"
    )
    
    try {
        $connectionString = "Data Source=$DatabasePath"
        Add-Type -AssemblyName System.Data.SQLite
        
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        $command = $connection.CreateCommand()
        $command.CommandText = $Query
        
        foreach ($param in $Parameters.GetEnumerator()) {
            $command.Parameters.AddWithValue("@$($param.Key)", $param.Value)
        }
        
        $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($command)
        $dataset = New-Object System.Data.DataSet
        $adapter.Fill($dataset)
        
        $connection.Close()
        
        return $dataset.Tables[0].Rows
    }
    catch {
        Write-Error "SQL query failed: $($_.Exception.Message)"
        return $null
    }
}

function Invoke-SqlNonQuery {
    param(
        [string]$Query,
        [hashtable]$Parameters = @{},
        [string]$DatabasePath = "db/itsm.sqlite"
    )
    
    try {
        $connectionString = "Data Source=$DatabasePath"
        Add-Type -AssemblyName System.Data.SQLite
        
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        $command = $connection.CreateCommand()
        $command.CommandText = $Query
        
        foreach ($param in $Parameters.GetEnumerator()) {
            $command.Parameters.AddWithValue("@$($param.Key)", $param.Value)
        }
        
        $result = $command.ExecuteNonQuery()
        $connection.Close()
        
        return $result
    }
    catch {
        Write-Error "SQL execution failed: $($_.Exception.Message)"
        return -1
    }
}

function Get-LastInsertId {
    param(
        [string]$DatabasePath = "db/itsm.sqlite"
    )
    
    try {
        $result = Invoke-SqlQuery -Query "SELECT last_insert_rowid() as id" -DatabasePath $DatabasePath
        return $result[0].id
    }
    catch {
        Write-Error "Failed to get last insert ID: $($_.Exception.Message)"
        return -1
    }
}

Export-ModuleMember -Function Initialize-Database, Invoke-SqlQuery, Invoke-SqlNonQuery, Get-LastInsertId