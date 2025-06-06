# Config.psm1 - システム設定共通モジュール

$script:Config = @{
    Server = @{
        Port = 8080
        Host = "localhost"
        Protocol = "http"
    }
    Database = @{
        Path = "db/itsm.sqlite"
        BackupPath = "backup"
        BackupRetentionDays = 30
    }
    Authentication = @{
        TokenExpiryMinutes = 60
        PasswordMinLength = 8
        SessionTimeout = 120
    }
    Logging = @{
        Level = "INFO"
        RetentionDays = 30
        MaxFileSize = "10MB"
    }
    Api = @{
        MaxRequestSize = "5MB"
        RateLimitPerMinute = 100
        EnableCors = $true
    }
    System = @{
        DefaultPageSize = 20
        MaxPageSize = 100
        DateFormat = "yyyy-MM-dd"
        TimeFormat = "HH:mm:ss"
    }
}

function Get-ConfigValue {
    param(
        [string]$Path
    )
    
    try {
        $keys = $Path.Split('.')
        $current = $script:Config
        
        foreach ($key in $keys) {
            if ($current.ContainsKey($key)) {
                $current = $current[$key]
            } else {
                return $null
            }
        }
        
        return $current
    }
    catch {
        Write-Error "Failed to get config value for path: $Path"
        return $null
    }
}

function Set-ConfigValue {
    param(
        [string]$Path,
        [object]$Value
    )
    
    try {
        $keys = $Path.Split('.')
        $current = $script:Config
        
        for ($i = 0; $i -lt $keys.Count - 1; $i++) {
            $key = $keys[$i]
            if (-not $current.ContainsKey($key)) {
                $current[$key] = @{}
            }
            $current = $current[$key]
        }
        
        $current[$keys[-1]] = $Value
        return $true
    }
    catch {
        Write-Error "Failed to set config value for path: $Path"
        return $false
    }
}

function Get-ServerUrl {
    param()
    
    try {
        $protocol = Get-ConfigValue "Server.Protocol"
        $host = Get-ConfigValue "Server.Host"
        $port = Get-ConfigValue "Server.Port"
        
        return "$protocol`://$host`:$port"
    }
    catch {
        Write-Error "Failed to get server URL"
        return "http://localhost:8080"
    }
}

function Get-DatabasePath {
    param()
    
    try {
        return Get-ConfigValue "Database.Path"
    }
    catch {
        Write-Error "Failed to get database path"
        return "db/itsm.sqlite"
    }
}

function Test-ConfigValid {
    param()
    
    try {
        $requiredPaths = @(
            "Server.Port",
            "Server.Host",
            "Database.Path",
            "Authentication.TokenExpiryMinutes"
        )
        
        foreach ($path in $requiredPaths) {
            $value = Get-ConfigValue $path
            if ($null -eq $value) {
                Write-Error "Missing required config value: $path"
                return $false
            }
        }
        
        $port = Get-ConfigValue "Server.Port"
        if ($port -lt 1 -or $port -gt 65535) {
            Write-Error "Invalid port number: $port"
            return $false
        }
        
        return $true
    }
    catch {
        Write-Error "Config validation failed: $($_.Exception.Message)"
        return $false
    }
}

function Export-Config {
    param(
        [string]$FilePath = "config.json"
    )
    
    try {
        $configJson = $script:Config | ConvertTo-Json -Depth 10
        Set-Content -Path $FilePath -Value $configJson
        return $true
    }
    catch {
        Write-Error "Failed to export config: $($_.Exception.Message)"
        return $false
    }
}

function Import-Config {
    param(
        [string]$FilePath = "config.json"
    )
    
    try {
        if (Test-Path $FilePath) {
            $configJson = Get-Content -Path $FilePath -Raw
            $importedConfig = $configJson | ConvertFrom-Json
            
            foreach ($section in $importedConfig.PSObject.Properties) {
                $script:Config[$section.Name] = $section.Value
            }
            
            return $true
        } else {
            Write-Warning "Config file not found: $FilePath"
            return $false
        }
    }
    catch {
        Write-Error "Failed to import config: $($_.Exception.Message)"
        return $false
    }
}

function Get-AllConfig {
    param()
    
    return $script:Config
}

Export-ModuleMember -Function Get-ConfigValue, Set-ConfigValue, Get-ServerUrl, Get-DatabasePath, Test-ConfigValid, Export-Config, Import-Config, Get-AllConfig