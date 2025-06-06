# ITSM準拠IT運用システムプラットフォーム - ユーザー管理API
# PowerShell REST API実装

param(
    [Parameter(Mandatory=$false)]
    [string]$Port = "8083",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabasePath = "..\\db\\itsm.sqlite"
)

# 共通モジュールのインポート
Import-Module "..\\modules\\DBUtil.psm1" -Force
Import-Module "..\\modules\\AuthUtil.psm1" -Force
Import-Module "..\\modules\\LogUtil.psm1" -Force
Import-Module "..\\modules\\Config.psm1" -Force

# ログ設定
$LogPath = "..\\..\\logs\\users_api.log"
Write-Log "ユーザー管理API開始 - Port: $Port" -Path $LogPath

# HTTPリスナー開始
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "ユーザー管理API サーバー開始: http://localhost:$Port" -ForegroundColor Green
Write-Log "HTTPリスナー開始" -Path $LogPath

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # CORS設定
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        $url = $request.Url.AbsolutePath
        $method = $request.HttpMethod
        
        Write-Log "リクエスト: $method $url" -Path $LogPath
        
        # OPTIONS プリフライトリクエスト処理
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }
        
        try {
            # 認証チェック（ログイン以外）
            if ($url -notmatch "^/api/users/login") {
                $authHeader = $request.Headers["Authorization"]
                if (-not (Test-JWTToken -Token $authHeader)) {
                    $response.StatusCode = 401
                    $errorResponse = @{
                        error = "Unauthorized"
                        message = "認証が必要です"
                    } | ConvertTo-Json -Depth 10
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.Close()
                    continue
                }
            }
            
            # ルーティング処理
            switch -Regex ($url) {
                "^/api/users$" {
                    switch ($method) {
                        "GET" {
                            Handle-GetUsers -Response $response
                        }
                        "POST" {
                            Handle-CreateUser -Request $request -Response $response
                        }
                        default {
                            Send-MethodNotAllowed -Response $response
                        }
                    }
                }
                "^/api/users/([^/]+)$" {
                    $userId = $matches[1]
                    switch ($method) {
                        "GET" {
                            Handle-GetUser -UserId $userId -Response $response
                        }
                        "PUT" {
                            Handle-UpdateUser -UserId $userId -Request $request -Response $response
                        }
                        "DELETE" {
                            Handle-DeleteUser -UserId $userId -Response $response
                        }
                        default {
                            Send-MethodNotAllowed -Response $response
                        }
                    }
                }
                "^/api/users/login$" {
                    if ($method -eq "POST") {
                        Handle-UserLogin -Request $request -Response $response
                    } else {
                        Send-MethodNotAllowed -Response $response
                    }
                }
                "^/api/users/password/([^/]+)$" {
                    $userId = $matches[1]
                    if ($method -eq "PUT") {
                        Handle-ChangePassword -UserId $userId -Request $request -Response $response
                    } else {
                        Send-MethodNotAllowed -Response $response
                    }
                }
                default {
                    Send-NotFound -Response $response
                }
            }
        }
        catch {
            Write-Log "エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
            Send-InternalServerError -Response $response -Message $_.Exception.Message
        }
    }
}
catch {
    Write-Log "致命的エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    Write-Log "ユーザー管理API停止" -Path $LogPath
}

# ユーザー一覧取得
function Handle-GetUsers {
    param([System.Net.HttpListenerResponse]$Response)
    
    try {
        $query = @"
SELECT user_id, username, role, display_name, email, created_at, updated_at, last_login
FROM users 
ORDER BY created_at DESC
"@
        
        $users = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query
        
        # パスワードハッシュを除外
        $safeUsers = $users | ForEach-Object {
            @{
                user_id = $_.user_id
                username = $_.username
                role = $_.role
                display_name = $_.display_name
                email = $_.email
                created_at = $_.created_at
                updated_at = $_.updated_at
                last_login = $_.last_login
            }
        }
        
        Send-JsonResponse -Response $Response -Data $safeUsers
        Write-Log "ユーザー一覧取得成功: $($users.Count)件" -Path $LogPath
    }
    catch {
        Write-Log "ユーザー一覧取得エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ユーザー一覧の取得に失敗しました"
    }
}

# ユーザー詳細取得
function Handle-GetUser {
    param(
        [string]$UserId,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        $query = @"
SELECT user_id, username, role, display_name, email, created_at, updated_at, last_login
FROM users 
WHERE user_id = @user_id
"@
        
        $params = @{ user_id = $UserId }
        $user = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query -Parameters $params
        
        if ($user) {
            $safeUser = @{
                user_id = $user.user_id
                username = $user.username
                role = $user.role
                display_name = $user.display_name
                email = $user.email
                created_at = $user.created_at
                updated_at = $user.updated_at
                last_login = $user.last_login
            }
            Send-JsonResponse -Response $Response -Data $safeUser
            Write-Log "ユーザー詳細取得成功: ID=$UserId" -Path $LogPath
        } else {
            Send-NotFound -Response $Response -Message "ユーザーが見つかりません"
        }
    }
    catch {
        Write-Log "ユーザー詳細取得エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ユーザー詳細の取得に失敗しました"
    }
}

# ユーザー作成
function Handle-CreateUser {
    param(
        [System.Net.HttpListenerRequest]$Request,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        $body = Read-RequestBody -Request $Request
        $userData = $body | ConvertFrom-Json
        
        # 入力検証
        if (-not $userData.username -or -not $userData.password) {
            Send-BadRequest -Response $Response -Message "ユーザー名とパスワードは必須です"
            return
        }
        
        # ユーザー名重複チェック
        $existingUser = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT COUNT(*) as count FROM users WHERE username = @username" -Parameters @{ username = $userData.username }
        if ($existingUser.count -gt 0) {
            Send-Conflict -Response $Response -Message "ユーザー名が既に存在します"
            return
        }
        
        # パスワードハッシュ化
        $hashedPassword = New-PasswordHash -Password $userData.password
        
        $query = @"
INSERT INTO users (username, password, role, display_name, email, created_at, updated_at)
VALUES (@username, @password, @role, @display_name, @email, datetime('now'), datetime('now'))
"@
        
        $params = @{
            username = $userData.username
            password = $hashedPassword
            role = if ($userData.role) { $userData.role } else { "user" }
            display_name = if ($userData.display_name) { $userData.display_name } else { $userData.username }
            email = if ($userData.email) { $userData.email } else { $null }
        }
        
        Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query -Parameters $params
        
        # 作成されたユーザーを取得
        $newUser = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT user_id, username, role, display_name, email, created_at FROM users WHERE username = @username" -Parameters @{ username = $userData.username }
        
        Send-JsonResponse -Response $Response -Data $newUser -StatusCode 201
        Write-Log "ユーザー作成成功: $($userData.username)" -Path $LogPath
    }
    catch {
        Write-Log "ユーザー作成エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ユーザーの作成に失敗しました"
    }
}

# ユーザー更新
function Handle-UpdateUser {
    param(
        [string]$UserId,
        [System.Net.HttpListenerRequest]$Request,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        $body = Read-RequestBody -Request $Request
        $userData = $body | ConvertFrom-Json
        
        # 更新クエリ構築
        $setClauses = @()
        $params = @{ user_id = $UserId }
        
        if ($userData.role) {
            $setClauses += "role = @role"
            $params.role = $userData.role
        }
        
        if ($userData.display_name) {
            $setClauses += "display_name = @display_name"
            $params.display_name = $userData.display_name
        }
        
        if ($userData.email) {
            $setClauses += "email = @email"
            $params.email = $userData.email
        }
        
        if ($setClauses.Count -eq 0) {
            Send-BadRequest -Response $Response -Message "更新するフィールドが指定されていません"
            return
        }
        
        $setClauses += "updated_at = datetime('now')"
        $setClause = $setClauses -join ", "
        
        $query = "UPDATE users SET $setClause WHERE user_id = @user_id"
        $result = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query -Parameters $params
        
        # 更新後のユーザー情報を取得
        $updatedUser = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT user_id, username, role, display_name, email, created_at, updated_at FROM users WHERE user_id = @user_id" -Parameters @{ user_id = $UserId }
        
        if ($updatedUser) {
            Send-JsonResponse -Response $Response -Data $updatedUser
            Write-Log "ユーザー更新成功: ID=$UserId" -Path $LogPath
        } else {
            Send-NotFound -Response $Response -Message "ユーザーが見つかりません"
        }
    }
    catch {
        Write-Log "ユーザー更新エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ユーザーの更新に失敗しました"
    }
}

# ユーザー削除
function Handle-DeleteUser {
    param(
        [string]$UserId,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        # ユーザー存在確認
        $user = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT username FROM users WHERE user_id = @user_id" -Parameters @{ user_id = $UserId }
        
        if (-not $user) {
            Send-NotFound -Response $Response -Message "ユーザーが見つかりません"
            return
        }
        
        # 削除実行
        $query = "DELETE FROM users WHERE user_id = @user_id"
        Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query -Parameters @{ user_id = $UserId }
        
        Send-JsonResponse -Response $Response -Data @{ message = "ユーザーが削除されました"; username = $user.username }
        Write-Log "ユーザー削除成功: ID=$UserId, Username=$($user.username)" -Path $LogPath
    }
    catch {
        Write-Log "ユーザー削除エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ユーザーの削除に失敗しました"
    }
}

# ユーザーログイン
function Handle-UserLogin {
    param(
        [System.Net.HttpListenerRequest]$Request,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        $body = Read-RequestBody -Request $Request
        $loginData = $body | ConvertFrom-Json
        
        if (-not $loginData.username -or -not $loginData.password) {
            Send-BadRequest -Response $Response -Message "ユーザー名とパスワードは必須です"
            return
        }
        
        # ユーザー認証
        $user = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT user_id, username, password, role, display_name FROM users WHERE username = @username" -Parameters @{ username = $loginData.username }
        
        if (-not $user -or -not (Test-PasswordHash -Password $loginData.password -Hash $user.password)) {
            Send-Unauthorized -Response $Response -Message "ユーザー名またはパスワードが正しくありません"
            return
        }
        
        # JWTトークン生成
        $token = New-JWTToken -UserId $user.user_id -Username $user.username -Role $user.role
        
        # 最終ログイン時刻更新
        Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "UPDATE users SET last_login = datetime('now') WHERE user_id = @user_id" -Parameters @{ user_id = $user.user_id }
        
        $loginResponse = @{
            token = $token
            user = @{
                user_id = $user.user_id
                username = $user.username
                role = $user.role
                display_name = $user.display_name
            }
        }
        
        Send-JsonResponse -Response $Response -Data $loginResponse
        Write-Log "ユーザーログイン成功: $($user.username)" -Path $LogPath
    }
    catch {
        Write-Log "ユーザーログインエラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "ログインに失敗しました"
    }
}

# パスワード変更
function Handle-ChangePassword {
    param(
        [string]$UserId,
        [System.Net.HttpListenerRequest]$Request,
        [System.Net.HttpListenerResponse]$Response
    )
    
    try {
        $body = Read-RequestBody -Request $Request
        $passwordData = $body | ConvertFrom-Json
        
        if (-not $passwordData.current_password -or -not $passwordData.new_password) {
            Send-BadRequest -Response $Response -Message "現在のパスワードと新しいパスワードは必須です"
            return
        }
        
        # 現在のパスワード確認
        $user = Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query "SELECT password FROM users WHERE user_id = @user_id" -Parameters @{ user_id = $UserId }
        
        if (-not $user -or -not (Test-PasswordHash -Password $passwordData.current_password -Hash $user.password)) {
            Send-BadRequest -Response $Response -Message "現在のパスワードが正しくありません"
            return
        }
        
        # 新しいパスワードをハッシュ化
        $newHashedPassword = New-PasswordHash -Password $passwordData.new_password
        
        # パスワード更新
        $query = "UPDATE users SET password = @password, updated_at = datetime('now') WHERE user_id = @user_id"
        Invoke-SQLiteQuery -DatabasePath $DatabasePath -Query $query -Parameters @{ password = $newHashedPassword; user_id = $UserId }
        
        Send-JsonResponse -Response $Response -Data @{ message = "パスワードが変更されました" }
        Write-Log "パスワード変更成功: UserID=$UserId" -Path $LogPath
    }
    catch {
        Write-Log "パスワード変更エラー: $($_.Exception.Message)" -Path $LogPath -Level "ERROR"
        Send-InternalServerError -Response $Response -Message "パスワードの変更に失敗しました"
    }
}

# 共通レスポンス関数
function Send-JsonResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [object]$Data,
        [int]$StatusCode = 200
    )
    
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.StatusCode = $StatusCode
    $jsonResponse = $Data | ConvertTo-Json -Depth 10
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Response.Close()
}

function Send-BadRequest {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$Message
    )
    Send-JsonResponse -Response $Response -Data @{ error = "Bad Request"; message = $Message } -StatusCode 400
}

function Send-Unauthorized {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$Message
    )
    Send-JsonResponse -Response $Response -Data @{ error = "Unauthorized"; message = $Message } -StatusCode 401
}

function Send-NotFound {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$Message = "リソースが見つかりません"
    )
    Send-JsonResponse -Response $Response -Data @{ error = "Not Found"; message = $Message } -StatusCode 404
}

function Send-Conflict {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$Message
    )
    Send-JsonResponse -Response $Response -Data @{ error = "Conflict"; message = $Message } -StatusCode 409
}

function Send-MethodNotAllowed {
    param([System.Net.HttpListenerResponse]$Response)
    Send-JsonResponse -Response $Response -Data @{ error = "Method Not Allowed"; message = "このメソッドは許可されていません" } -StatusCode 405
}

function Send-InternalServerError {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$Message = "内部サーバーエラーが発生しました"
    )
    Send-JsonResponse -Response $Response -Data @{ error = "Internal Server Error"; message = $Message } -StatusCode 500
}

function Read-RequestBody {
    param([System.Net.HttpListenerRequest]$Request)
    
    $reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
    return $reader.ReadToEnd()
}