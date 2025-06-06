# PasswordUtil.psm1 - パスワード関連ユーティリティ

function New-HashedPassword {
    param(
        [string]$PlainPassword
    )
    
    try {
        Add-Type -AssemblyName System.Web
        
        # ソルトを生成
        $Salt = [System.Web.Security.Membership]::GeneratePassword(16, 4)
        
        # パスワードとソルトを結合してハッシュ化
        $CombinedString = $PlainPassword + $Salt
        $Encoder = New-Object System.Text.UTF8Encoding
        $Hasher = [System.Security.Cryptography.SHA256]::Create()
        
        $Bytes = $Encoder.GetBytes($CombinedString)
        $Hash = $Hasher.ComputeHash($Bytes)
        
        $HashString = [Convert]::ToBase64String($Hash)
        
        return @{
            Hash = $HashString
            Salt = $Salt
        }
    }
    catch {
        Write-Error "Failed to hash password: $($_.Exception.Message)"
        return $null
    }
}

function Test-Password {
    param(
        [string]$PlainPassword,
        [string]$StoredHash,
        [string]$StoredSalt
    )
    
    try {
        # 保存されているソルトを使用してパスワードをハッシュ化
        $CombinedString = $PlainPassword + $StoredSalt
        $Encoder = New-Object System.Text.UTF8Encoding
        $Hasher = [System.Security.Cryptography.SHA256]::Create()
        
        $Bytes = $Encoder.GetBytes($CombinedString)
        $Hash = $Hasher.ComputeHash($Bytes)
        
        $HashString = [Convert]::ToBase64String($Hash)
        
        return $HashString -eq $StoredHash
    }
    catch {
        Write-Error "Failed to verify password: $($_.Exception.Message)"
        return $false
    }
}

function New-SecurePassword {
    param(
        [int]$Length = 12,
        [bool]$IncludeSymbols = $true
    )
    
    try {
        Add-Type -AssemblyName System.Web
        
        if ($IncludeSymbols) {
            return [System.Web.Security.Membership]::GeneratePassword($Length, 4)
        } else {
            # 英数字のみ
            $Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
            $Password = ""
            
            for ($i = 0; $i -lt $Length; $i++) {
                $RandomIndex = Get-Random -Minimum 0 -Maximum $Characters.Length
                $Password += $Characters[$RandomIndex]
            }
            
            return $Password
        }
    }
    catch {
        Write-Error "Failed to generate secure password: $($_.Exception.Message)"
        return $null
    }
}

function Test-PasswordStrength {
    param(
        [string]$Password
    )
    
    $Score = 0
    $Feedback = @()
    
    # 長さチェック
    if ($Password.Length -ge 8) { $Score += 1 } else { $Feedback += "パスワードは8文字以上にしてください" }
    if ($Password.Length -ge 12) { $Score += 1 }
    
    # 複雑さチェック
    if ($Password -cmatch "[A-Z]") { $Score += 1 } else { $Feedback += "大文字を含めてください" }
    if ($Password -cmatch "[a-z]") { $Score += 1 } else { $Feedback += "小文字を含めてください" }
    if ($Password -match "[0-9]") { $Score += 1 } else { $Feedback += "数字を含めてください" }
    if ($Password -match "[^A-Za-z0-9]") { $Score += 1 } else { $Feedback += "記号を含めてください" }
    
    # 一般的なパスワードチェック
    $CommonPasswords = @("password", "123456", "admin", "user", "test", "qwerty")
    if ($CommonPasswords -contains $Password.ToLower()) {
        $Score = 0
        $Feedback += "一般的なパスワードは使用しないでください"
    }
    
    $Strength = switch ($Score) {
        { $_ -ge 5 } { "Strong" }
        { $_ -ge 3 } { "Medium" }
        default { "Weak" }
    }
    
    return @{
        Score = $Score
        Strength = $Strength
        Feedback = $Feedback
    }
}

Export-ModuleMember -Function New-HashedPassword, Test-Password, New-SecurePassword, Test-PasswordStrength