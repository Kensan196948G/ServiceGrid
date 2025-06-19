# PowerShellJobScheduler.ps1 - 高度なジョブスケジュール・管理システム
# ITSM統合システム用 バックグラウンドタスク管理
# Version: 2.0.0

param(
    [Parameter(Mandatory)]
    [string]$Action,
    
    [string]$JobName = "",
    [string]$ScriptPath = "",
    [hashtable]$Parameters = @{},
    [string]$Schedule = "Immediate",  # Immediate, Daily, Weekly, Monthly, Custom
    [string]$Priority = "Normal",     # Low, Normal, High, Critical
    [int]$MaxRetries = 3,
    [int]$TimeoutMinutes = 30,
    [switch]$EnableNotification = $false
)

# ジョブ管理設定
$script:JobConfig = @{
    JobStorePath = "$PSScriptRoot\..\jobs\job-queue.json"
    LogPath = "$PSScriptRoot\..\logs\job-scheduler.log"
    MaxConcurrentJobs = 5
    JobRetentionDays = 30
    NotificationEmail = "admin@company.com"
    DefaultTimeout = 1800  # 30分
}

<#
.SYNOPSIS
    新しいPowerShellジョブを作成・スケジュール

.PARAMETER JobName
    ジョブの識別名

.PARAMETER ScriptPath
    実行するスクリプトのパス

.PARAMETER Parameters
    スクリプトに渡すパラメータ

.PARAMETER Schedule
    実行スケジュール
#>
function New-PowerShellJob {
    param(
        [Parameter(Mandatory)]
        [string]$JobName,
        
        [Parameter(Mandatory)]
        [string]$ScriptPath,
        
        [hashtable]$Parameters = @{},
        [string]$Schedule = "Immediate",
        [string]$Priority = "Normal",
        [int]$MaxRetries = 3,
        [int]$TimeoutMinutes = 30
    )
    
    try {
        # ジョブID生成
        $jobId = "JOB-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([System.Guid]::NewGuid().ToString().Substring(0,8))"
        
        # スケジュール計算
        $scheduledTime = Get-ScheduledTime -Schedule $Schedule
        
        # ジョブオブジェクト作成
        $job = @{
            JobId = $jobId
            JobName = $JobName
            ScriptPath = $ScriptPath
            Parameters = $Parameters
            Schedule = $Schedule
            ScheduledTime = $scheduledTime
            Priority = $Priority
            Status = "Queued"
            MaxRetries = $MaxRetries
            CurrentRetries = 0
            TimeoutMinutes = $TimeoutMinutes
            CreatedAt = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            CreatedBy = $env:USERNAME
            LastUpdated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            ExecutionHistory = @()
            NotificationEnabled = $EnableNotification
        }
        
        # ジョブキューに追加
        Add-JobToQueue -Job $job
        
        Write-LogMessage -Level "INFO" -Message "新しいジョブを作成しました: $JobName (ID: $jobId)"
        
        return @{
            Success = $true
            JobId = $jobId
            ScheduledTime = $scheduledTime
            Message = "ジョブが正常に作成されました"
        }
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "ジョブ作成でエラーが発生しました: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    ジョブキューからジョブを実行

.PARAMETER JobId
    実行するジョブのID
#>
function Start-QueuedJob {
    param(
        [string]$JobId = $null
    )
    
    try {
        $jobQueue = Get-JobQueue
        
        # 実行対象ジョブの選択
        if ($JobId) {
            $targetJobs = $jobQueue | Where-Object { $_.JobId -eq $JobId -and $_.Status -eq "Queued" }
        } else {
            # 優先度順・スケジュール時刻順で実行
            $now = Get-Date
            $targetJobs = $jobQueue | Where-Object { 
                $_.Status -eq "Queued" -and 
                [datetime]$_.ScheduledTime -le $now 
            } | Sort-Object {
                switch ($_.Priority) {
                    "Critical" { 1 }
                    "High" { 2 }
                    "Normal" { 3 }
                    "Low" { 4 }
                    default { 3 }
                }
            }, ScheduledTime | Select-Object -First $script:JobConfig.MaxConcurrentJobs
        }
        
        $results = @()
        
        foreach ($job in $targetJobs) {
            $result = Invoke-JobExecution -Job $job
            $results += $result
        }
        
        return $results
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "ジョブ実行でエラーが発生しました: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    個別ジョブの実行処理

.PARAMETER Job
    実行するジョブオブジェクト
#>
function Invoke-JobExecution {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Job
    )
    
    $executionResult = @{
        JobId = $Job.JobId
        JobName = $Job.JobName
        Success = $false
        StartTime = Get-Date
        EndTime = $null
        Duration = $null
        Output = $null
        Error = $null
        RetryCount = $Job.CurrentRetries
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "ジョブ実行開始: $($Job.JobName) (ID: $($Job.JobId))"
        
        # ジョブステータス更新
        Update-JobStatus -JobId $Job.JobId -Status "Running" -StartTime $executionResult.StartTime
        
        # スクリプト存在確認
        if (-not (Test-Path $Job.ScriptPath)) {
            throw "スクリプトファイルが見つかりません: $($Job.ScriptPath)"
        }
        
        # パラメータ準備
        $paramArray = @()
        foreach ($key in $Job.Parameters.Keys) {
            $value = $Job.Parameters[$key]
            if ($value -is [string]) {
                $paramArray += "-$key `"$value`""
            } else {
                $paramArray += "-$key $value"
            }
        }
        $paramString = $paramArray -join " "
        
        # タイムアウト付きでジョブ実行
        $timeoutSeconds = $Job.TimeoutMinutes * 60
        $scriptCommand = "& `"$($Job.ScriptPath)`" $paramString"
        
        $job = Start-Job -ScriptBlock {
            param($ScriptPath, $ParamString)
            try {
                # 安全なスクリプト実行（Invoke-Expressionの代わり）
                $result = & $ScriptPath @(if ($ParamString) { $ParamString.Split(' ') })
                return @{
                    Success = $true
                    Output = $result
                    Error = $null
                }
            } catch {
                return @{
                    Success = $false
                    Output = $null
                    Error = $_.Exception.Message
                }
            }
        } -ArgumentList $Job.ScriptPath, $paramString
        
        # ジョブ完了待機
        $completed = Wait-Job -Job $job -Timeout $timeoutSeconds
        
        if ($completed) {
            $jobResult = Receive-Job -Job $job
            $executionResult.Success = $jobResult.Success
            $executionResult.Output = $jobResult.Output
            $executionResult.Error = $jobResult.Error
            
            if ($jobResult.Success) {
                Update-JobStatus -JobId $Job.JobId -Status "Completed"
                Write-LogMessage -Level "INFO" -Message "ジョブ完了: $($Job.JobName)"
            } else {
                # 再試行判定
                if ($Job.CurrentRetries -lt $Job.MaxRetries) {
                    $nextRetry = (Get-Date).AddMinutes(5)  # 5分後に再試行
                    Update-JobStatus -JobId $Job.JobId -Status "Queued" -ScheduledTime $nextRetry -IncrementRetry
                    Write-LogMessage -Level "WARN" -Message "ジョブ失敗、再試行予定: $($Job.JobName) (試行回数: $($Job.CurrentRetries + 1)/$($Job.MaxRetries))"
                } else {
                    Update-JobStatus -JobId $Job.JobId -Status "Failed"
                    Write-LogMessage -Level "ERROR" -Message "ジョブ失敗、再試行上限到達: $($Job.JobName)"
                }
            }
        } else {
            # タイムアウト処理
            Stop-Job -Job $job -PassThru | Remove-Job -Force
            $executionResult.Error = "ジョブ実行がタイムアウトしました ($($Job.TimeoutMinutes)分)"
            
            # 再試行判定
            if ($Job.CurrentRetries -lt $Job.MaxRetries) {
                $nextRetry = (Get-Date).AddMinutes(10)  # 10分後に再試行
                Update-JobStatus -JobId $Job.JobId -Status "Queued" -ScheduledTime $nextRetry -IncrementRetry
                Write-LogMessage -Level "WARN" -Message "ジョブタイムアウト、再試行予定: $($Job.JobName)"
            } else {
                Update-JobStatus -JobId $Job.JobId -Status "Failed"
                Write-LogMessage -Level "ERROR" -Message "ジョブタイムアウト、再試行上限到達: $($Job.JobName)"
            }
        }
        
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        
    } catch {
        $executionResult.Error = $_.Exception.Message
        Update-JobStatus -JobId $Job.JobId -Status "Failed"
        Write-LogMessage -Level "ERROR" -Message "ジョブ実行でエラーが発生しました: $($Job.JobName) - $($_.Exception.Message)"
    } finally {
        $executionResult.EndTime = Get-Date
        $executionResult.Duration = $executionResult.EndTime - $executionResult.StartTime
        
        # 実行履歴に記録
        Add-JobExecutionHistory -JobId $Job.JobId -ExecutionResult $executionResult
        
        # 通知送信
        if ($Job.NotificationEnabled) {
            Send-JobNotification -Job $Job -ExecutionResult $executionResult
        }
    }
    
    return $executionResult
}

<#
.SYNOPSIS
    ジョブキューの管理

.PARAMETER Job
    追加するジョブオブジェクト
#>
function Add-JobToQueue {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Job
    )
    
    try {
        $queuePath = $script:JobConfig.JobStorePath
        
        # 既存キュー読み込み
        $jobQueue = @()
        if (Test-Path $queuePath) {
            $queueContent = Get-Content -Path $queuePath -Raw -ErrorAction SilentlyContinue
            if ($queueContent) {
                $jobQueue = $queueContent | ConvertFrom-Json
            }
        }
        
        # 新しいジョブを追加
        $jobQueue += $Job
        
        # キューファイル保存
        $queueDir = Split-Path $queuePath -Parent
        if (-not (Test-Path $queueDir)) {
            New-Item -Path $queueDir -ItemType Directory -Force | Out-Null
        }
        
        $jobQueue | ConvertTo-Json -Depth 10 | Set-Content -Path $queuePath -Encoding UTF8
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "ジョブキューへの追加に失敗しました: $($_.Exception.Message)"
        throw
    }
}

<#
.SYNOPSIS
    ジョブキューの取得

.OUTPUTS
    ジョブキューの配列
#>
function Get-JobQueue {
    try {
        $queuePath = $script:JobConfig.JobStorePath
        
        if (Test-Path $queuePath) {
            $queueContent = Get-Content -Path $queuePath -Raw -ErrorAction SilentlyContinue
            if ($queueContent) {
                return $queueContent | ConvertFrom-Json
            }
        }
        
        return @()
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "ジョブキューの読み込みに失敗しました: $($_.Exception.Message)"
        return @()
    }
}

<#
.SYNOPSIS
    ジョブステータスの更新

.PARAMETER JobId
    更新するジョブのID

.PARAMETER Status
    新しいステータス
#>
function Update-JobStatus {
    param(
        [Parameter(Mandatory)]
        [string]$JobId,
        
        [Parameter(Mandatory)]
        [string]$Status,
        
        [datetime]$StartTime,
        [datetime]$ScheduledTime,
        [switch]$IncrementRetry
    )
    
    try {
        $jobQueue = Get-JobQueue
        $updatedQueue = @()
        
        foreach ($job in $jobQueue) {
            if ($job.JobId -eq $JobId) {
                $job.Status = $Status
                $job.LastUpdated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
                
                if ($StartTime) {
                    $job.StartTime = $StartTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                }
                
                if ($ScheduledTime) {
                    $job.ScheduledTime = $ScheduledTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                }
                
                if ($IncrementRetry) {
                    $job.CurrentRetries++
                }
            }
            $updatedQueue += $job
        }
        
        # 更新されたキューを保存
        $queuePath = $script:JobConfig.JobStorePath
        $updatedQueue | ConvertTo-Json -Depth 10 | Set-Content -Path $queuePath -Encoding UTF8
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "ジョブステータス更新に失敗しました: $($_.Exception.Message)"
    }
}

<#
.SYNOPSIS
    スケジュール時刻の計算

.PARAMETER Schedule
    スケジュール指定
#>
function Get-ScheduledTime {
    param(
        [Parameter(Mandatory)]
        [string]$Schedule
    )
    
    $now = Get-Date
    
    switch ($Schedule) {
        "Immediate" {
            return $now
        }
        "Daily" {
            return $now.Date.AddDays(1).AddHours(2)  # 翌日の午前2時
        }
        "Weekly" {
            $daysUntilSunday = 7 - [int]$now.DayOfWeek
            return $now.Date.AddDays($daysUntilSunday).AddHours(3)  # 次の日曜日午前3時
        }
        "Monthly" {
            $nextMonth = $now.Date.AddMonths(1)
            return [datetime]::new($nextMonth.Year, $nextMonth.Month, 1, 4, 0, 0)  # 翌月1日午前4時
        }
        default {
            # カスタムスケジュール（ISO 8601形式）の解析
            try {
                return [datetime]::Parse($Schedule)
            } catch {
                Write-LogMessage -Level "WARN" -Message "無効なスケジュール形式、即座実行に設定: $Schedule"
                return $now
            }
        }
    }
}

<#
.SYNOPSIS
    ジョブ実行履歴の追加

.PARAMETER JobId
    対象ジョブID

.PARAMETER ExecutionResult
    実行結果
#>
function Add-JobExecutionHistory {
    param(
        [Parameter(Mandatory)]
        [string]$JobId,
        
        [Parameter(Mandatory)]
        [hashtable]$ExecutionResult
    )
    
    try {
        $jobQueue = Get-JobQueue
        $updatedQueue = @()
        
        foreach ($job in $jobQueue) {
            if ($job.JobId -eq $JobId) {
                if (-not $job.ExecutionHistory) {
                    $job.ExecutionHistory = @()
                }
                
                $historyEntry = @{
                    ExecutionTime = $ExecutionResult.StartTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    Duration = $ExecutionResult.Duration.TotalSeconds
                    Success = $ExecutionResult.Success
                    RetryCount = $ExecutionResult.RetryCount
                }
                
                if ($ExecutionResult.Error) {
                    $historyEntry.Error = $ExecutionResult.Error
                }
                
                $job.ExecutionHistory += $historyEntry
                
                # 履歴は最新10件まで保持
                if ($job.ExecutionHistory.Count -gt 10) {
                    $job.ExecutionHistory = $job.ExecutionHistory | Select-Object -Last 10
                }
            }
            $updatedQueue += $job
        }
        
        # 更新されたキューを保存
        $queuePath = $script:JobConfig.JobStorePath
        $updatedQueue | ConvertTo-Json -Depth 10 | Set-Content -Path $queuePath -Encoding UTF8
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "実行履歴の追加に失敗しました: $($_.Exception.Message)"
    }
}

<#
.SYNOPSIS
    ジョブ通知の送信

.PARAMETER Job
    対象ジョブ

.PARAMETER ExecutionResult
    実行結果
#>
function Send-JobNotification {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Job,
        
        [Parameter(Mandatory)]
        [hashtable]$ExecutionResult
    )
    
    try {
        $subject = if ($ExecutionResult.Success) {
            "ジョブ完了通知: $($Job.JobName)"
        } else {
            "ジョブ失敗通知: $($Job.JobName)"
        }
        
        $body = @"
ジョブ実行結果

ジョブ名: $($Job.JobName)
ジョブID: $($Job.JobId)
実行時刻: $($ExecutionResult.StartTime)
所要時間: $($ExecutionResult.Duration)
結果: $(if ($ExecutionResult.Success) { "成功" } else { "失敗" })

$(if ($ExecutionResult.Error) { "エラー: $($ExecutionResult.Error)" })

詳細は管理画面でご確認ください。
"@
        
        # メール送信（実際の実装では外部サービスまたはExchange連携）
        Write-LogMessage -Level "INFO" -Message "通知送信: $subject"
        
        # 現在はログ記録のみ（実際の環境では Send-MailMessage やGraph API使用）
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "通知送信に失敗しました: $($_.Exception.Message)"
    }
}

# ログ記録用関数
function Write-LogMessage {
    param(
        [string]$Level = "INFO",
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    $logPath = $script:JobConfig.LogPath
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    Add-Content -Path $logPath -Value $logMessage -Encoding UTF8
    Write-Host $logMessage
}

# メイン実行ロジック
switch ($Action) {
    "CreateJob" {
        $result = New-PowerShellJob -JobName $JobName -ScriptPath $ScriptPath -Parameters $Parameters -Schedule $Schedule -Priority $Priority -MaxRetries $MaxRetries -TimeoutMinutes $TimeoutMinutes
        $result | ConvertTo-Json -Depth 3
    }
    "RunJobs" {
        $results = Start-QueuedJob
        $results | ConvertTo-Json -Depth 3
    }
    "RunSpecificJob" {
        $result = Start-QueuedJob -JobId $Parameters.JobId
        $result | ConvertTo-Json -Depth 3
    }
    "GetQueue" {
        $queue = Get-JobQueue
        $queue | ConvertTo-Json -Depth 3
    }
    "GetJobStatus" {
        $queue = Get-JobQueue
        $job = $queue | Where-Object { $_.JobId -eq $Parameters.JobId }
        if ($job) {
            $job | ConvertTo-Json -Depth 3
        } else {
            @{ Error = "ジョブが見つかりません: $($Parameters.JobId)" } | ConvertTo-Json
        }
    }
    default {
        @{
            Error = "未対応のアクション: $Action"
            AvailableActions = @("CreateJob", "RunJobs", "RunSpecificJob", "GetQueue", "GetJobStatus")
        } | ConvertTo-Json
    }
}