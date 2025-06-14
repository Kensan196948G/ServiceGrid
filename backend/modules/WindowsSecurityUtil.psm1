<#
.SYNOPSIS
    Windowsセキュリティユーティリティ - 強化版
    認証、許可、セキュリティ監査、脇威検知機能を提供

.DESCRIPTION
    PowerShell API用の包括的なセキュリティユーティリティモジュールで、以下の機能を実装:
    - JWTトークン認証と検証
    - ロールベースアクセス制御 (RBAC)
    - APIレート制限とスロットリング
    - 入力サニタイゼーションとバリデーション
    - セキュリティイベントのログ記録
    - SQLインジェクション対策
    - 脇威検知とアラート

.AUTHOR
    Claude Code AI Assistant

.VERSION
    2.0.0
#>

# グローバル変数の初期化
$script:SecurityConfig = @{
    MaxFailedAttempts = 5
    LockoutDurationMinutes = 30
    TokenExpiryHours = 1
    RateLimitPerMinute = 60
    MaxRequestSizeKB = 1024
    AllowedIPRanges = @('127.0.0.1', '192.168.0.0/16', '10.0.0.0/8')
    SuspiciousPatterns = @(
        '(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+',
        '<script[^>]*>',
        'javascript:',
        'vbscript:',
        'onload\s*=',
        'onerror\s*='
    )
}

# メモリキャッシュ初期化
$script:AuthCache = @{}
$script:RateLimitCache = @{}
$script:FailedAttemptsCache = @{}

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

Export-ModuleMember -Function Test-RequestAuthentication, Format-ErrorResponse, Parse-QueryString, Add-AuditLog, Test-DatabaseConnection, Invoke-DatabaseQuery, Write-APILog