# Auth.ps1 - 認証API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/Config.psm1"

function Invoke-Login {
    param(
        [hashtable]$LoginData
    )
    
    try {
        if (-not $LoginData.ContainsKey("username") -or -not $LoginData.ContainsKey("password")) {
            Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 400 -User "ANONYMOUS"
            return @{
                Status = 400
                Message = "Username and password are required"
                Data = $null
            }
        }
        
        $username = $LoginData["username"]
        $password = $LoginData["password"]
        
        if (-not $username -or -not $password) {
            Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 400 -User "ANONYMOUS"
            return @{
                Status = 400
                Message = "Username and password cannot be empty"
                Data = $null
            }
        }
        
        $userInfo = Test-UserCredentials -Username $username -Password $password
        
        if (-not $userInfo) {
            Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 401 -User $username
            Save-AuditLog -EventType "LOGIN_FAILED" -User $username -Detail "Failed login attempt"
            
            return @{
                Status = 401
                Message = "Invalid username or password"
                Data = $null
            }
        }
        
        $tokenExpiryMinutes = Get-ConfigValue "Authentication.TokenExpiryMinutes"
        $token = New-AuthToken -Username $username -ExpiryMinutes $tokenExpiryMinutes
        
        if (-not $token) {
            Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 500 -User $username
            return @{
                Status = 500
                Message = "Failed to generate authentication token"
                Data = $null
            }
        }
        
        Save-AuditLog -EventType "LOGIN_SUCCESS" -User $username -Detail "Successful login"
        Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 200 -User $username
        
        return @{
            Status = 200
            Message = "Login successful"
            Data = @{
                Token = $token
                User = @{
                    UserId = $userInfo.UserId
                    Username = $userInfo.Username
                    Role = $userInfo.Role
                }
                ExpiryMinutes = $tokenExpiryMinutes
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Invoke-Login failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/login" -StatusCode 500 -User "ANONYMOUS"
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Invoke-Logout {
    param(
        [string]$Token
    )
    
    try {
        if (-not $Token) {
            Write-ApiLog -Method "POST" -Endpoint "/logout" -StatusCode 400 -User "ANONYMOUS"
            return @{
                Status = 400
                Message = "Token is required"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        if (-not $user) {
            Write-ApiLog -Method "POST" -Endpoint "/logout" -StatusCode 401 -User "ANONYMOUS"
            return @{
                Status = 401
                Message = "Invalid or expired token"
                Data = $null
            }
        }
        
        $removed = Remove-AuthToken -Token $Token
        
        if ($removed) {
            Save-AuditLog -EventType "LOGOUT" -User $user -Detail "User logged out"
            Write-ApiLog -Method "POST" -Endpoint "/logout" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Logout successful"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "POST" -Endpoint "/logout" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to logout"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Invoke-Logout failed: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/logout" -StatusCode 500 -User "ANONYMOUS"
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Test-Token {
    param(
        [string]$Token
    )
    
    try {
        if (-not $Token) {
            Write-ApiLog -Method "GET" -Endpoint "/validate" -StatusCode 400 -User "ANONYMOUS"
            return @{
                Status = 400
                Message = "Token is required"
                Data = $null
            }
        }
        
        $isValid = Test-AuthToken -Token $Token
        
        if ($isValid) {
            $user = Get-TokenUser -Token $Token
            
            $query = "SELECT user_id, username, role, display_name, email FROM users WHERE username = @username"
            $params = @{ username = $user }
            $userInfo = Invoke-SqlQuery -Query $query -Parameters $params
            
            if ($userInfo -and $userInfo.Count -gt 0) {
                Write-ApiLog -Method "GET" -Endpoint "/validate" -StatusCode 200 -User $user
                
                return @{
                    Status = 200
                    Message = "Token is valid"
                    Data = @{
                        Valid = $true
                        User = @{
                            UserId = $userInfo[0].user_id
                            Username = $userInfo[0].username
                            Role = $userInfo[0].role
                            DisplayName = $userInfo[0].display_name
                            Email = $userInfo[0].email
                        }
                    }
                }
            } else {
                Write-ApiLog -Method "GET" -Endpoint "/validate" -StatusCode 401 -User "ANONYMOUS"
                return @{
                    Status = 401
                    Message = "User not found"
                    Data = @{ Valid = $false }
                }
            }
        } else {
            Write-ApiLog -Method "GET" -Endpoint "/validate" -StatusCode 401 -User "ANONYMOUS"
            return @{
                Status = 401
                Message = "Token is invalid or expired"
                Data = @{ Valid = $false }
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Test-Token failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/validate" -StatusCode 500 -User "ANONYMOUS"
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = @{ Valid = $false }
        }
    }
}

function Update-Password {
    param(
        [string]$Token,
        [hashtable]$PasswordData
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $requiredFields = @("currentPassword", "newPassword")
        foreach ($field in $requiredFields) {
            if (-not $PasswordData.ContainsKey($field) -or -not $PasswordData[$field]) {
                Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 400 -User $user
                return @{
                    Status = 400
                    Message = "Missing required field: $field"
                    Data = $null
                }
            }
        }
        
        $currentPassword = $PasswordData["currentPassword"]
        $newPassword = $PasswordData["newPassword"]
        
        $minPasswordLength = Get-ConfigValue "Authentication.PasswordMinLength"
        if ($newPassword.Length -lt $minPasswordLength) {
            Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 400 -User $user
            return @{
                Status = 400
                Message = "Password must be at least $minPasswordLength characters long"
                Data = $null
            }
        }
        
        $userInfo = Test-UserCredentials -Username $user -Password $currentPassword
        if (-not $userInfo) {
            Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 401 -User $user
            Save-AuditLog -EventType "PASSWORD_CHANGE_FAILED" -User $user -Detail "Invalid current password"
            
            return @{
                Status = 401
                Message = "Current password is incorrect"
                Data = $null
            }
        }
        
        $updateQuery = "UPDATE users SET password = @new_password, updated_date = @updated_date WHERE username = @username"
        $updateParams = @{
            new_password = $newPassword
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            username = $user
        }
        
        $result = Invoke-SqlNonQuery -Query $updateQuery -Parameters $updateParams
        
        if ($result -gt 0) {
            Save-AuditLog -EventType "PASSWORD_CHANGED" -User $user -Detail "Password successfully changed"
            Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Password updated successfully"
                Data = $null
            }
        } else {
            Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 500 -User $user
            return @{
                Status = 500
                Message = "Failed to update password"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Update-Password failed: $($_.Exception.Message)"
        Write-ApiLog -Method "PUT" -Endpoint "/password" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

function Get-UserProfile {
    param(
        [string]$Token
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            Write-ApiLog -Method "GET" -Endpoint "/profile" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        
        $query = "SELECT user_id, username, role, display_name, email, created_date FROM users WHERE username = @username"
        $params = @{ username = $user }
        
        $userInfo = Invoke-SqlQuery -Query $query -Parameters $params
        
        if ($userInfo -and $userInfo.Count -gt 0) {
            Write-ApiLog -Method "GET" -Endpoint "/profile" -StatusCode 200 -User $user
            
            return @{
                Status = 200
                Message = "Success"
                Data = @{
                    UserId = $userInfo[0].user_id
                    Username = $userInfo[0].username
                    Role = $userInfo[0].role
                    DisplayName = $userInfo[0].display_name
                    Email = $userInfo[0].email
                    CreatedDate = $userInfo[0].created_date
                }
            }
        } else {
            Write-ApiLog -Method "GET" -Endpoint "/profile" -StatusCode 404 -User $user
            return @{
                Status = 404
                Message = "User profile not found"
                Data = $null
            }
        }
    }
    catch {
        Write-LogEntry -Level "ERROR" -Message "Get-UserProfile failed: $($_.Exception.Message)"
        Write-ApiLog -Method "GET" -Endpoint "/profile" -StatusCode 500 -User $user
        
        return @{
            Status = 500
            Message = "Internal server error"
            Data = $null
        }
    }
}

Export-ModuleMember -Function Invoke-Login, Invoke-Logout, Test-Token, Update-Password, Get-UserProfile