# ServiceRequestWorkflow.ps1 - サービス要求承認ワークフロー管理
# PowerShell統合型承認フロー自動化システム
# Version: 1.0.0

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/Config.psm1" -Force
Import-Module "$PSScriptRoot/../modules/WindowsSecurityUtil.psm1" -Force

# ワークフロー設定
$script:WorkflowConfig = @{
    ApprovalLevels = @{
        "user_creation" = 2
        "software_install" = 1
        "access_request" = 1
        "system_change" = 3
        "budget_request" = 2
    }
    AutoProcessing = @{
        "password_reset" = $true
        "license_renewal" = $true
        "standard_software" = $true
    }
    SLAHours = @{
        "critical" = 4
        "high" = 8
        "medium" = 24
        "low" = 72
    }
}

<#
.SYNOPSIS
    サービス要求の承認処理を実行

.PARAMETER RequestId
    対象のサービス要求ID

.PARAMETER ApproverToken
    承認者のJWTトークン

.PARAMETER Decision
    承認決定 (approved, rejected, pending)

.PARAMETER Comments
    承認コメント
#>
function Invoke-ServiceRequestApproval {
    param(
        [Parameter(Mandatory)]
        [string]$RequestId,
        
        [Parameter(Mandatory)]
        [string]$ApproverToken,
        
        [Parameter(Mandatory)]
        [ValidateSet("approved", "rejected", "pending")]
        [string]$Decision,
        
        [string]$Comments = ""
    )
    
    try {
        # 認証確認
        if (-not (Test-AuthToken -Token $ApproverToken)) {
            Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 401 -User "UNAUTHORIZED"
            return @{
                Status = 401
                Message = "認証が無効です"
                Data = $null
            }
        }
        
        $approver = Get-TokenUser -Token $ApproverToken
        
        # サービス要求取得
        $request = Get-DatabaseRecord -Table "service_requests" -Id $RequestId
        if (-not $request) {
            return @{
                Status = 404
                Message = "サービス要求が見つかりません"
                Data = $null
            }
        }
        
        # 承認権限確認
        $hasApprovalPermission = Test-ApprovalPermission -User $approver -RequestType $request.request_type -Level $request.approval_level
        if (-not $hasApprovalPermission) {
            return @{
                Status = 403
                Message = "承認権限がありません"
                Data = $null
            }
        }
        
        # 承認記録を保存
        $approvalData = @{
            request_id = $RequestId
            approver_id = $approver.username
            approval_level = $request.approval_level
            status = $Decision
            comments = $Comments
            approved_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $approvalId = Add-DatabaseRecord -Table "service_request_approvals" -Data $approvalData
        
        # サービス要求ステータス更新
        $newStatus = Get-NextWorkflowStatus -CurrentStatus $request.status -Decision $Decision -RequestType $request.request_type
        
        Update-DatabaseRecord -Table "service_requests" -Id $RequestId -Data @{
            status = $newStatus
            updated_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        # 自動処理判定
        if ($Decision -eq "approved" -and $script:WorkflowConfig.AutoProcessing[$request.request_type]) {
            Start-AutoProcessing -RequestId $RequestId -RequestType $request.request_type
        }
        
        # 通知送信
        Send-ApprovalNotification -RequestId $RequestId -Decision $Decision -Approver $approver.username
        
        Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 200 -User $approver.username
        
        return @{
            Status = 200
            Message = "承認処理が完了しました"
            Data = @{
                RequestId = $RequestId
                Decision = $Decision
                ApprovalId = $approvalId
                NextStatus = $newStatus
            }
        }
        
    } catch {
        Write-Error "承認処理でエラーが発生しました: $($_.Exception.Message)"
        Write-ApiLog -Method "POST" -Endpoint "/service-requests/$RequestId/approve" -StatusCode 500 -User $approver.username -Error $_.Exception.Message
        
        return @{
            Status = 500
            Message = "承認処理でエラーが発生しました"
            Data = $null
        }
    }
}

<#
.SYNOPSIS
    自動処理可能なサービス要求を処理開始

.PARAMETER RequestId
    対象のサービス要求ID

.PARAMETER RequestType
    サービス要求の種別
#>
function Start-AutoProcessing {
    param(
        [Parameter(Mandatory)]
        [string]$RequestId,
        
        [Parameter(Mandatory)]
        [string]$RequestType
    )
    
    try {
        # Windows統合ジョブとして実行
        $jobData = @{
            request_id = $RequestId
            job_type = $RequestType
            job_status = "queued"
            powershell_script = Get-ProcessingScript -RequestType $RequestType
            created_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $jobId = Add-DatabaseRecord -Table "windows_integration_jobs" -Data $jobData
        
        # PowerShellジョブとしてバックグラウンド実行
        $scriptBlock = {
            param($RequestId, $RequestType, $JobId)
            
            Import-Module "$using:PSScriptRoot/../modules/DBUtil.psm1" -Force
            Import-Module "$using:PSScriptRoot/../modules/WindowsSecurityUtil.psm1" -Force
            
            try {
                # ジョブステータス更新
                Update-DatabaseRecord -Table "windows_integration_jobs" -Id $JobId -Data @{
                    job_status = "running"
                }
                
                # 実際の処理実行
                $result = Invoke-WindowsServiceRequest -RequestId $RequestId -RequestType $RequestType
                
                # 結果記録
                Update-DatabaseRecord -Table "windows_integration_jobs" -Id $JobId -Data @{
                    job_status = "completed"
                    execution_result = ($result | ConvertTo-Json -Depth 3)
                    completed_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }
                
                # サービス要求ステータス更新
                Update-DatabaseRecord -Table "service_requests" -Id $RequestId -Data @{
                    status = "completed"
                    integration_status = "success"
                    powershell_job_id = $JobId
                }
                
            } catch {
                # エラー処理
                Update-DatabaseRecord -Table "windows_integration_jobs" -Id $JobId -Data @{
                    job_status = "failed"
                    execution_result = $_.Exception.Message
                    completed_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }
                
                Update-DatabaseRecord -Table "service_requests" -Id $RequestId -Data @{
                    status = "failed"
                    integration_status = "error"
                }
            }
        }
        
        # バックグラウンドジョブ開始
        $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $RequestId, $RequestType, $jobId
        
        Write-LogMessage -Level "INFO" -Message "自動処理ジョブを開始しました - RequestId: $RequestId, JobId: $jobId, PowerShellJobId: $($job.Id)"
        
        return $jobId
        
    } catch {
        Write-Error "自動処理の開始でエラーが発生しました: $($_.Exception.Message)"
        throw
    }
}

<#
.SYNOPSIS
    Windows統合サービス要求処理

.PARAMETER RequestId
    サービス要求ID

.PARAMETER RequestType
    サービス要求種別
#>
function Invoke-WindowsServiceRequest {
    param(
        [Parameter(Mandatory)]
        [string]$RequestId,
        
        [Parameter(Mandatory)]
        [string]$RequestType
    )
    
    try {
        # サービス要求詳細取得
        $request = Get-DatabaseRecord -Table "service_requests" -Id $RequestId
        $requestData = $request.detail | ConvertFrom-Json
        
        switch ($RequestType) {
            "user_creation" {
                return New-ADUserFromServiceRequest -RequestData $requestData
            }
            "group_access" {
                return Grant-ADGroupAccessFromRequest -RequestData $requestData
            }
            "software_install" {
                return Install-SoftwareFromRequest -RequestData $requestData
            }
            "password_reset" {
                return Reset-UserPasswordFromRequest -RequestData $requestData
            }
            default {
                throw "未対応のサービス要求種別です: $RequestType"
            }
        }
        
    } catch {
        Write-Error "Windows統合処理でエラーが発生しました: $($_.Exception.Message)"
        throw
    }
}

<#
.SYNOPSIS
    承認権限の確認

.PARAMETER User
    ユーザー情報

.PARAMETER RequestType
    サービス要求種別

.PARAMETER Level
    承認レベル
#>
function Test-ApprovalPermission {
    param(
        [Parameter(Mandatory)]
        [hashtable]$User,
        
        [Parameter(Mandatory)]
        [string]$RequestType,
        
        [Parameter(Mandatory)]
        [int]$Level
    )
    
    # 管理者は全て承認可能
    if ($User.role -eq "administrator") {
        return $true
    }
    
    # 承認者権限確認
    if ($User.role -eq "approver" -and $Level -le 2) {
        return $true
    }
    
    # マネージャーは特定種別の承認可能
    if ($User.role -eq "manager") {
        $managerApprovalTypes = @("user_creation", "access_request", "software_install")
        if ($RequestType -in $managerApprovalTypes -and $Level -le 1) {
            return $true
        }
    }
    
    return $false
}

<#
.SYNOPSIS
    次のワークフローステータスを決定

.PARAMETER CurrentStatus
    現在のステータス

.PARAMETER Decision
    承認決定

.PARAMETER RequestType
    サービス要求種別
#>
function Get-NextWorkflowStatus {
    param(
        [Parameter(Mandatory)]
        [string]$CurrentStatus,
        
        [Parameter(Mandatory)]
        [string]$Decision,
        
        [Parameter(Mandatory)]
        [string]$RequestType
    )
    
    if ($Decision -eq "rejected") {
        return "rejected"
    }
    
    if ($Decision -eq "approved") {
        $requiredLevels = $script:WorkflowConfig.ApprovalLevels[$RequestType]
        if ($requiredLevels -le 1) {
            return "approved"
        } else {
            return "pending_approval"
        }
    }
    
    return $CurrentStatus
}

<#
.SYNOPSIS
    承認通知の送信

.PARAMETER RequestId
    サービス要求ID

.PARAMETER Decision
    承認決定

.PARAMETER Approver
    承認者
#>
function Send-ApprovalNotification {
    param(
        [Parameter(Mandatory)]
        [string]$RequestId,
        
        [Parameter(Mandatory)]
        [string]$Decision,
        
        [Parameter(Mandatory)]
        [string]$Approver
    )
    
    try {
        # 通知データ準備
        $notificationData = @{
            RequestId = $RequestId
            Decision = $Decision
            Approver = $Approver
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        # メール通知 (将来実装)
        # Send-EmailNotification -Data $notificationData
        
        # システムログ記録
        Write-LogMessage -Level "INFO" -Message "承認通知: RequestId=$RequestId, Decision=$Decision, Approver=$Approver"
        
    } catch {
        Write-Warning "承認通知の送信に失敗しました: $($_.Exception.Message)"
    }
}

<#
.SYNOPSIS
    サービス要求種別別の処理スクリプト取得

.PARAMETER RequestType
    サービス要求種別
#>
function Get-ProcessingScript {
    param(
        [Parameter(Mandatory)]
        [string]$RequestType
    )
    
    $scripts = @{
        "user_creation" = "New-ADUser"
        "group_access" = "Add-ADGroupMember"
        "software_install" = "Install-Software"
        "password_reset" = "Set-ADAccountPassword"
    }
    
    return $scripts[$RequestType]
}

# エクスポートする関数
Export-ModuleMember -Function @(
    'Invoke-ServiceRequestApproval',
    'Start-AutoProcessing',
    'Invoke-WindowsServiceRequest',
    'Test-ApprovalPermission'
)