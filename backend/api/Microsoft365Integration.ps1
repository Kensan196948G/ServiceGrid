# Microsoft365Integration.ps1 - Microsoft 365統合機能拡張
# ITSM統合システム用 Graph API・Teams・SharePoint統合
# Version: 2.0.0

param(
    [Parameter(Mandatory)]
    [string]$Action,
    
    [string]$TenantId = "",
    [string]$ClientId = "",
    [string]$ClientSecret = "",
    [hashtable]$RequestData = @{}
)

# Microsoft 365統合設定
$script:M365Config = @{
    GraphApiVersion = "v1.0"
    GraphBaseUrl = "https://graph.microsoft.com"
    AuthEndpoint = "https://login.microsoftonline.com"
    DefaultScopes = @(
        "https://graph.microsoft.com/User.Read.All",
        "https://graph.microsoft.com/Group.ReadWrite.All",
        "https://graph.microsoft.com/Team.ReadWrite.All"
    )
}

function Get-GraphAccessToken {
    param(
        [Parameter(Mandatory)]
        [string]$TenantId,
        [Parameter(Mandatory)]
        [string]$ClientId,
        [Parameter(Mandatory)]
        [string]$ClientSecret
    )
    
    try {
        $tokenUrl = "$($script:M365Config.AuthEndpoint)/$TenantId/oauth2/v2.0/token"
        $body = @{
            client_id = $ClientId
            client_secret = $ClientSecret
            scope = ($script:M365Config.DefaultScopes -join " ")
            grant_type = "client_credentials"
        }
        
        $response = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
        return $response.access_token
        
    } catch {
        throw "アクセストークン取得でエラーが発生しました: $($_.Exception.Message)"
    }
}

function New-M365UserFromServiceRequest {
    param(
        [Parameter(Mandatory)]
        [string]$AccessToken,
        [Parameter(Mandatory)]
        [hashtable]$UserData
    )
    
    try {
        $headers = @{
            "Authorization" = "Bearer $AccessToken"
            "Content-Type" = "application/json"
        }
        
        $userObject = @{
            accountEnabled = $true
            displayName = $UserData.displayName
            mailNickname = $UserData.mailNickname
            userPrincipalName = $UserData.userPrincipalName
            passwordProfile = @{
                forceChangePasswordNextSignIn = $true
                password = $UserData.temporaryPassword
            }
        }
        
        $createUrl = "$($script:M365Config.GraphBaseUrl)/$($script:M365Config.GraphApiVersion)/users"
        $response = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $headers -Body ($userObject | ConvertTo-Json -Depth 3)
        
        return @{
            Success = $true
            UserId = $response.id
            UserPrincipalName = $response.userPrincipalName
            Message = "ユーザーが正常に作成されました"
        }
        
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function New-TeamsChannelFromRequest {
    param(
        [Parameter(Mandatory)]
        [string]$AccessToken,
        [Parameter(Mandatory)]
        [hashtable]$TeamData
    )
    
    try {
        $headers = @{
            "Authorization" = "Bearer $AccessToken"
            "Content-Type" = "application/json"
        }
        
        $groupObject = @{
            displayName = $TeamData.displayName
            description = $TeamData.description
            mailNickname = $TeamData.mailNickname
            groupTypes = @("Unified")
            mailEnabled = $true
            securityEnabled = $false
        }
        
        $groupUrl = "$($script:M365Config.GraphBaseUrl)/$($script:M365Config.GraphApiVersion)/groups"
        $groupResponse = Invoke-RestMethod -Uri $groupUrl -Method POST -Headers $headers -Body ($groupObject | ConvertTo-Json -Depth 3)
        
        return @{
            Success = $true
            TeamId = $groupResponse.id
            Message = "Teamsチームが正常に作成されました"
        }
        
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# メイン実行ロジック
switch ($Action) {
    "GetToken" {
        $token = Get-GraphAccessToken -TenantId $TenantId -ClientId $ClientId -ClientSecret $ClientSecret
        @{ AccessToken = $token } | ConvertTo-Json
    }
    "CreateUser" {
        $token = Get-GraphAccessToken -TenantId $TenantId -ClientId $ClientId -ClientSecret $ClientSecret
        $result = New-M365UserFromServiceRequest -AccessToken $token -UserData $RequestData
        $result | ConvertTo-Json -Depth 3
    }
    "CreateTeam" {
        $token = Get-GraphAccessToken -TenantId $TenantId -ClientId $ClientId -ClientSecret $ClientSecret
        $result = New-TeamsChannelFromRequest -AccessToken $token -TeamData $RequestData
        $result | ConvertTo-Json -Depth 3
    }
    default {
        @{
            Error = "未対応のアクション: $Action"
            AvailableActions = @("GetToken", "CreateUser", "CreateTeam")
        } | ConvertTo-Json
    }
}