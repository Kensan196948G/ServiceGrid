# ServiceRequestIntegration.ps1 - Windows統合サービス処理
# Active Directory・Microsoft 365・Windows自動化処理
# Version: 1.0.0

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/WindowsSecurityUtil.psm1" -Force

# Microsoft Graph PowerShell モジュール (オプション)
try {
    Import-Module Microsoft.Graph.Authentication -ErrorAction SilentlyContinue
    Import-Module Microsoft.Graph.Users -ErrorAction SilentlyContinue
    Import-Module Microsoft.Graph.Groups -ErrorAction SilentlyContinue
    $script:GraphAvailable = $true
} catch {
    Write-Warning "Microsoft Graph PowerShell モジュールが利用できません。Microsoft 365統合機能は制限されます。"
    $script:GraphAvailable = $false
}

<#
.SYNOPSIS
    Active Directoryユーザー作成要求の処理

.PARAMETER RequestData
    サービス要求データ（JSON形式）
#>
function New-ADUserFromServiceRequest {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "AD ユーザー作成要求を開始: $($RequestData.username)"
        
        # 必須パラメータ確認
        $requiredFields = @('username', 'firstName', 'lastName', 'department', 'email')
        foreach ($field in $requiredFields) {
            if (-not $RequestData.ContainsKey($field) -or [string]::IsNullOrEmpty($RequestData[$field])) {
                throw "必須フィールドが不足しています: $field"
            }
        }
        
        # Active Directory モジュール確認
        if (-not (Get-Module -Name ActiveDirectory -ListAvailable)) {
            throw "Active Directory モジュールが利用できません"
        }
        
        Import-Module ActiveDirectory -Force
        
        # ユーザー重複確認
        $existingUser = Get-ADUser -Filter "SamAccountName -eq '$($RequestData.username)'" -ErrorAction SilentlyContinue
        if ($existingUser) {
            throw "ユーザー名 '$($RequestData.username)' は既に存在します"
        }
        
        # パスワード生成
        $password = New-SecurePassword -Length 12 -IncludeSpecialChars
        $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force
        
        # OU パス決定
        $ouPath = Get-DepartmentOU -Department $RequestData.department
        
        # AD ユーザー作成
        $userParams = @{
            SamAccountName = $RequestData.username
            Name = "$($RequestData.firstName) $($RequestData.lastName)"
            GivenName = $RequestData.firstName
            Surname = $RequestData.lastName
            DisplayName = "$($RequestData.firstName) $($RequestData.lastName)"
            EmailAddress = $RequestData.email
            Department = $RequestData.department
            Title = $RequestData.jobTitle
            Office = $RequestData.office
            UserPrincipalName = "$($RequestData.username)@$((Get-ADDomain).DNSRoot)"
            AccountPassword = $securePassword
            Enabled = $true
            ChangePasswordAtLogon = $true
            Path = $ouPath
        }
        
        $newUser = New-ADUser @userParams -PassThru
        
        # グループメンバーシップ追加
        if ($RequestData.groups) {
            foreach ($groupName in $RequestData.groups) {
                try {
                    Add-ADGroupMember -Identity $groupName -Members $newUser.SamAccountName
                    Write-LogMessage -Level "INFO" -Message "ユーザー '$($RequestData.username)' をグループ '$groupName' に追加しました"
                } catch {
                    Write-Warning "グループ '$groupName' への追加に失敗しました: $($_.Exception.Message)"
                }
            }
        }
        
        # 監査ログ記録
        Write-SecurityAuditLog -Action "USER_CREATED" -Target $RequestData.username -Details @{
            User = $newUser
            Groups = $RequestData.groups
            CreatedBy = "ServiceRequest"
        }
        
        # メールボックス作成要求 (Exchange Online)
        if ($script:GraphAvailable -and $RequestData.createMailbox) {
            try {
                $mailboxResult = New-ExchangeMailboxFromRequest -UserData $RequestData
                Write-LogMessage -Level "INFO" -Message "メールボックス作成要求を送信しました: $($RequestData.username)"
            } catch {
                Write-Warning "メールボックス作成に失敗しました: $($_.Exception.Message)"
            }
        }
        
        return @{
            Success = $true
            Message = "ADユーザーが正常に作成されました"
            Data = @{
                Username = $newUser.SamAccountName
                DistinguishedName = $newUser.DistinguishedName
                UserPrincipalName = $newUser.UserPrincipalName
                TemporaryPassword = $password
                Groups = $RequestData.groups
            }
        }
        
    } catch {
        Write-Error "ADユーザー作成でエラーが発生しました: $($_.Exception.Message)"
        
        # エラー監査ログ
        Write-SecurityAuditLog -Action "USER_CREATION_FAILED" -Target $RequestData.username -Details @{
            Error = $_.Exception.Message
            RequestData = $RequestData
        }
        
        return @{
            Success = $false
            Message = "ADユーザー作成に失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

<#
.SYNOPSIS
    Active Directoryグループアクセス権限付与

.PARAMETER RequestData
    アクセス要求データ
#>
function Grant-ADGroupAccessFromRequest {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "ADグループアクセス権限付与を開始: $($RequestData.username) -> $($RequestData.groupName)"
        
        # 必須パラメータ確認
        if (-not $RequestData.username -or -not $RequestData.groupName) {
            throw "ユーザー名またはグループ名が指定されていません"
        }
        
        Import-Module ActiveDirectory -Force
        
        # ユーザー存在確認
        $user = Get-ADUser -Identity $RequestData.username -ErrorAction SilentlyContinue
        if (-not $user) {
            throw "ユーザー '$($RequestData.username)' が見つかりません"
        }
        
        # グループ存在確認
        $group = Get-ADGroup -Identity $RequestData.groupName -ErrorAction SilentlyContinue
        if (-not $group) {
            throw "グループ '$($RequestData.groupName)' が見つかりません"
        }
        
        # 既存メンバーシップ確認
        $isMember = Get-ADGroupMember -Identity $RequestData.groupName | Where-Object { $_.SamAccountName -eq $RequestData.username }
        if ($isMember) {
            return @{
                Success = $true
                Message = "ユーザーは既にグループのメンバーです"
                Data = @{
                    Username = $RequestData.username
                    GroupName = $RequestData.groupName
                    Action = "Already Member"
                }
            }
        }
        
        # グループメンバー追加
        Add-ADGroupMember -Identity $RequestData.groupName -Members $user.SamAccountName
        
        # 権限確認（オプション）
        if ($RequestData.verifyAccess) {
            Start-Sleep -Seconds 5  # AD レプリケーション待機
            $verificationResult = Test-ADGroupMembership -Username $RequestData.username -GroupName $RequestData.groupName
        }
        
        # 監査ログ記録
        Write-SecurityAuditLog -Action "GROUP_ACCESS_GRANTED" -Target "$($RequestData.username)" -Details @{
            GroupName = $RequestData.groupName
            GrantedBy = "ServiceRequest"
            Timestamp = Get-Date
        }
        
        return @{
            Success = $true
            Message = "グループアクセス権限が正常に付与されました"
            Data = @{
                Username = $RequestData.username
                GroupName = $RequestData.groupName
                GroupDistinguishedName = $group.DistinguishedName
                Action = "Access Granted"
            }
        }
        
    } catch {
        Write-Error "グループアクセス権限付与でエラーが発生しました: $($_.Exception.Message)"
        
        # エラー監査ログ
        Write-SecurityAuditLog -Action "GROUP_ACCESS_GRANT_FAILED" -Target $RequestData.username -Details @{
            GroupName = $RequestData.groupName
            Error = $_.Exception.Message
        }
        
        return @{
            Success = $false
            Message = "グループアクセス権限付与に失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

<#
.SYNOPSIS
    ソフトウェアインストール要求の処理

.PARAMETER RequestData
    インストール要求データ
#>
function Install-SoftwareFromRequest {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "ソフトウェアインストール要求を開始: $($RequestData.softwareName)"
        
        # 必須パラメータ確認
        if (-not $RequestData.softwareName -or -not $RequestData.targetComputer) {
            throw "ソフトウェア名または対象コンピューターが指定されていません"
        }
        
        # 対象コンピューター接続確認
        $computerOnline = Test-Connection -ComputerName $RequestData.targetComputer -Count 1 -Quiet
        if (-not $computerOnline) {
            throw "対象コンピューター '$($RequestData.targetComputer)' に接続できません"
        }
        
        # ソフトウェアパッケージ確認
        $packagePath = Get-SoftwarePackagePath -SoftwareName $RequestData.softwareName
        if (-not (Test-Path $packagePath)) {
            throw "ソフトウェアパッケージが見つかりません: $packagePath"
        }
        
        # リモートインストール実行
        $installResult = Invoke-RemoteSoftwareInstall -ComputerName $RequestData.targetComputer -PackagePath $packagePath -InstallOptions $RequestData.installOptions
        
        # インストール確認
        $verificationResult = Test-SoftwareInstallation -ComputerName $RequestData.targetComputer -SoftwareName $RequestData.softwareName
        
        # 監査ログ記録
        Write-SecurityAuditLog -Action "SOFTWARE_INSTALLED" -Target $RequestData.targetComputer -Details @{
            SoftwareName = $RequestData.softwareName
            PackagePath = $packagePath
            InstallResult = $installResult
            VerificationResult = $verificationResult
        }
        
        return @{
            Success = $verificationResult.Success
            Message = if ($verificationResult.Success) { "ソフトウェアが正常にインストールされました" } else { "インストールは完了しましたが、確認に失敗しました" }
            Data = @{
                SoftwareName = $RequestData.softwareName
                TargetComputer = $RequestData.targetComputer
                InstallResult = $installResult
                VerificationResult = $verificationResult
            }
        }
        
    } catch {
        Write-Error "ソフトウェアインストールでエラーが発生しました: $($_.Exception.Message)"
        
        # エラー監査ログ
        Write-SecurityAuditLog -Action "SOFTWARE_INSTALL_FAILED" -Target $RequestData.targetComputer -Details @{
            SoftwareName = $RequestData.softwareName
            Error = $_.Exception.Message
        }
        
        return @{
            Success = $false
            Message = "ソフトウェアインストールに失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

<#
.SYNOPSIS
    パスワードリセット要求の処理

.PARAMETER RequestData
    パスワードリセット要求データ
#>
function Reset-UserPasswordFromRequest {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "パスワードリセット要求を開始: $($RequestData.username)"
        
        if (-not $RequestData.username) {
            throw "ユーザー名が指定されていません"
        }
        
        Import-Module ActiveDirectory -Force
        
        # ユーザー存在確認
        $user = Get-ADUser -Identity $RequestData.username -ErrorAction SilentlyContinue
        if (-not $user) {
            throw "ユーザー '$($RequestData.username)' が見つかりません"
        }
        
        # 新しいパスワード生成
        $newPassword = New-SecurePassword -Length 12 -IncludeSpecialChars
        $securePassword = ConvertTo-SecureString -String $newPassword -AsPlainText -Force
        
        # パスワード変更
        Set-ADAccountPassword -Identity $RequestData.username -NewPassword $securePassword -Reset
        
        # 次回ログイン時パスワード変更を強制
        Set-ADUser -Identity $RequestData.username -ChangePasswordAtLogon $true
        
        # アカウントロック解除（必要な場合）
        if ($RequestData.unlockAccount) {
            Unlock-ADAccount -Identity $RequestData.username
        }
        
        # 監査ログ記録
        Write-SecurityAuditLog -Action "PASSWORD_RESET" -Target $RequestData.username -Details @{
            ResetBy = "ServiceRequest"
            UnlockAccount = $RequestData.unlockAccount
            Timestamp = Get-Date
        }
        
        return @{
            Success = $true
            Message = "パスワードが正常にリセットされました"
            Data = @{
                Username = $RequestData.username
                TemporaryPassword = $newPassword
                ChangePasswordAtLogon = $true
                AccountUnlocked = $RequestData.unlockAccount
            }
        }
        
    } catch {
        Write-Error "パスワードリセットでエラーが発生しました: $($_.Exception.Message)"
        
        # エラー監査ログ
        Write-SecurityAuditLog -Action "PASSWORD_RESET_FAILED" -Target $RequestData.username -Details @{
            Error = $_.Exception.Message
        }
        
        return @{
            Success = $false
            Message = "パスワードリセットに失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

<#
.SYNOPSIS
    Microsoft 365 Teams チャンネル作成

.PARAMETER RequestData
    Teams チャンネル作成要求データ
#>
function New-TeamsChannelFromRequest {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    if (-not $script:GraphAvailable) {
        return @{
            Success = $false
            Message = "Microsoft Graph PowerShell モジュールが利用できません"
            Data = $null
        }
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "Teams チャンネル作成要求を開始: $($RequestData.channelName)"
        
        # Microsoft Graph 認証
        Connect-MgGraph -Scopes "Team.Create", "Channel.Create.All"
        
        # チーム作成または既存チーム使用
        if ($RequestData.teamId) {
            $team = Get-MgTeam -TeamId $RequestData.teamId
        } else {
            # 新しいチーム作成
            $teamParams = @{
                DisplayName = $RequestData.teamName
                Description = $RequestData.teamDescription
                Visibility = $RequestData.visibility ?? "Private"
            }
            $team = New-MgTeam @teamParams
        }
        
        # チャンネル作成
        $channelParams = @{
            DisplayName = $RequestData.channelName
            Description = $RequestData.channelDescription
            MembershipType = $RequestData.membershipType ?? "Standard"
        }
        
        $channel = New-MgTeamChannel -TeamId $team.Id @channelParams
        
        # メンバー追加
        if ($RequestData.members) {
            foreach ($member in $RequestData.members) {
                try {
                    $memberParams = @{
                        "@odata.type" = "#microsoft.graph.aadUserConversationMember"
                        "user@odata.bind" = "https://graph.microsoft.com/v1.0/users('$member')"
                        roles = @("member")
                    }
                    New-MgTeamChannelMember -TeamId $team.Id -ChannelId $channel.Id -BodyParameter $memberParams
                } catch {
                    Write-Warning "メンバー '$member' の追加に失敗しました: $($_.Exception.Message)"
                }
            }
        }
        
        return @{
            Success = $true
            Message = "Teams チャンネルが正常に作成されました"
            Data = @{
                TeamId = $team.Id
                ChannelId = $channel.Id
                ChannelName = $channel.DisplayName
                WebUrl = $channel.WebUrl
            }
        }
        
    } catch {
        Write-Error "Teams チャンネル作成でエラーが発生しました: $($_.Exception.Message)"
        
        return @{
            Success = $false
            Message = "Teams チャンネル作成に失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

# ユーティリティ関数

function Get-DepartmentOU {
    param([string]$Department)
    
    $ouMappings = @{
        "IT" = "OU=IT,OU=Departments,DC=company,DC=local"
        "Sales" = "OU=Sales,OU=Departments,DC=company,DC=local"
        "HR" = "OU=HR,OU=Departments,DC=company,DC=local"
        "Finance" = "OU=Finance,OU=Departments,DC=company,DC=local"
    }
    
    return $ouMappings[$Department] ?? "OU=Users,DC=company,DC=local"
}

function New-SecurePassword {
    param(
        [int]$Length = 12,
        [switch]$IncludeSpecialChars
    )
    
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    if ($IncludeSpecialChars) {
        $chars += "!@#$%^&*"
    }
    
    return -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

function Get-SoftwarePackagePath {
    param([string]$SoftwareName)
    
    $packageMappings = @{
        "Office365" = "\\server\software\Office365\setup.exe"
        "Chrome" = "\\server\software\Chrome\ChromeSetup.exe"
        "Zoom" = "\\server\software\Zoom\ZoomInstaller.exe"
    }
    
    return $packageMappings[$SoftwareName]
}

function Invoke-RemoteSoftwareInstall {
    param(
        [string]$ComputerName,
        [string]$PackagePath,
        [string]$InstallOptions = "/S"
    )
    
    $scriptBlock = {
        param($Path, $Options)
        Start-Process -FilePath $Path -ArgumentList $Options -Wait -PassThru
    }
    
    return Invoke-Command -ComputerName $ComputerName -ScriptBlock $scriptBlock -ArgumentList $PackagePath, $InstallOptions
}

function Test-SoftwareInstallation {
    param(
        [string]$ComputerName,
        [string]$SoftwareName
    )
    
    $scriptBlock = {
        param($Software)
        Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*$Software*" }
    }
    
    $result = Invoke-Command -ComputerName $ComputerName -ScriptBlock $scriptBlock -ArgumentList $SoftwareName
    
    return @{
        Success = ($result -ne $null)
        InstalledSoftware = $result
    }
}

function Test-ADGroupMembership {
    param(
        [string]$Username,
        [string]$GroupName
    )
    
    $member = Get-ADGroupMember -Identity $GroupName | Where-Object { $_.SamAccountName -eq $Username }
    return ($member -ne $null)
}

# エクスポートする関数
Export-ModuleMember -Function @(
    'New-ADUserFromServiceRequest',
    'Grant-ADGroupAccessFromRequest', 
    'Install-SoftwareFromRequest',
    'Reset-UserPasswordFromRequest',
    'New-TeamsChannelFromRequest'
)