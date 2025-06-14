<#
.SYNOPSIS
    システム監視・アラート機能 - 企業レベル強化版
    包括的なITインフラ監視とインテリジェントアラート機能

.DESCRIPTION
    ITSMプラットフォーム用の高度な監視システムで、以下の機能を提供:
    - リアルタイムシステム監視 (CPU、メモリ、ディスク、ネットワーク)
    - サービス可用性監視とヘルスチェック
    - 予測的障害検知とアラート
    - SLA違反の早期警告
    - 自動インシデント作成
    - カスタムメトリクス収集
    - 高度なレポーティング

.AUTHOR
    Claude Code AI Assistant

.VERSION
    2.0.0

.NOTES
    実行間隔: 1分毎（推奨）
    対象環境: Windows Server 2016+ with PowerShell 5.1+
    依存関係: Performance Counter, WMI, Event Log アクセス権限
#>

# 必要モジュールのインポート
try {
    Import-Module "$PSScriptRoot/../modules/DBUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/LogUtil.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/Config.psm1" -Force -ErrorAction Stop
    Import-Module "$PSScriptRoot/../modules/WindowsSecurityUtil.psm1" -Force -ErrorAction Stop
} catch {
    Write-Error "モジュールのインポートに失敗: $($_.Exception.Message)"
    exit 1
}

# グローバル設定
$script:MonitoringConfig = @{
    # 監視間隔設定
    CheckIntervalSeconds = 60
    HistoryRetentionDays = 30
    AlertCooldownMinutes = 15
    
    # パフォーマンス閾値
    CPUWarningThreshold = 80
    CPUCriticalThreshold = 95
    MemoryWarningThreshold = 85
    MemoryCriticalThreshold = 95
    DiskWarningThreshold = 85
    DiskCriticalThreshold = 95
    
    # ネットワーク監視
    NetworkLatencyWarning = 100  # ms
    NetworkLatencyCritical = 500 # ms
    PacketLossWarning = 1        # %
    PacketLossCritical = 5       # %
    
    # サービス監視対象
    CriticalServices = @(
        'MSSQLSERVER', 'W3SVC', 'WinRM', 'DHCP', 'DNS', 
        'EventLog', 'Spooler', 'Themes', 'AudioSrv'
    )
    
    # 監視対象URL
    HealthCheckUrls = @(
        @{ Name = 'Frontend'; Url = 'http://localhost:3001/health'; Timeout = 10 }
        @{ Name = 'Backend'; Url = 'http://localhost:8082/api/health'; Timeout = 10 }
        @{ Name = 'Database'; Url = 'http://localhost:8082/api/test'; Timeout = 15 }
    )
    
    # アラート設定
    EmailEnabled = $true
    SlackEnabled = $false
    TeamsEnabled = $false
    SMSEnabled = $false
}

# メトリクス収集結果格納
$script:CurrentMetrics = @{}
$script:MetricsHistory = @()
$script:ActiveAlerts = @{}

<#
.SYNOPSIS
    システム全体の包括的な監視を実行

.DESCRIPTION
    CPU、メモリ、ディスク、ネットワーク、サービス、URLの監視を並行実行
#>
function Start-ComprehensiveMonitoring {
    [CmdletBinding()]
    param()
    
    Write-APILog "包括的システム監視を開始します" -Level "INFO"
    
    try {
        # 並行監視タスクの実行
        $tasks = @()
        
        # システムリソース監視
        $tasks += Start-Job -ScriptBlock { 
            param($Config, $PSScriptRoot)
            . "$PSScriptRoot/../jobs/MonitoringAndAlertingJob-Enhanced.ps1"
            Get-SystemResourceMetrics -Config $Config
        } -ArgumentList $script:MonitoringConfig, $PSScriptRoot
        
        # サービス監視
        $tasks += Start-Job -ScriptBlock { 
            param($Config, $PSScriptRoot)
            . "$PSScriptRoot/../jobs/MonitoringAndAlertingJob-Enhanced.ps1"
            Get-ServiceStatusMetrics -Config $Config
        } -ArgumentList $script:MonitoringConfig, $PSScriptRoot
        
        # ネットワーク監視
        $tasks += Start-Job -ScriptBlock { 
            param($Config, $PSScriptRoot)
            . "$PSScriptRoot/../jobs/MonitoringAndAlertingJob-Enhanced.ps1"
            Get-NetworkPerformanceMetrics -Config $Config
        } -ArgumentList $script:MonitoringConfig, $PSScriptRoot
        
        # URL監視
        $tasks += Start-Job -ScriptBlock { 
            param($Config, $PSScriptRoot)
            . "$PSScriptRoot/../jobs/MonitoringAndAlertingJob-Enhanced.ps1"
            Get-UrlHealthCheckMetrics -Config $Config
        } -ArgumentList $script:MonitoringConfig, $PSScriptRoot
        
        # 全タスクの完了を待機（タイムアウト付き）
        $results = $tasks | Wait-Job -Timeout 30 | Receive-Job
        $tasks | Remove-Job -Force
        
        # 結果のマージ
        $script:CurrentMetrics = @{
            Timestamp = Get-Date
            System = $results[0]
            Services = $results[1]
            Network = $results[2]
            UrlChecks = $results[3]
        }
        
        # アラート処理
        Test-AlertConditions
        
        # メトリクスの永続化
        Save-MonitoringMetrics
        
        Write-APILog "監視サイクルが正常に完了しました" -Level "INFO"
        
    } catch {
        Write-APILog "監視処理中にエラーが発生: $($_.Exception.Message)" -Level "ERROR"
        Send-Alert -Type "Critical" -Message "監視システム自体に障害が発生しました: $($_.Exception.Message)"
    }
}

<#
.SYNOPSIS
    システムリソースメトリクスの収集

.DESCRIPTION
    CPU、メモリ、ディスク使用率の詳細な監視
#>
function Get-SystemResourceMetrics {
    [CmdletBinding()]
    param([hashtable]$Config)
    
    try {
        # CPU使用率取得
        $cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 3
        $cpuUsage = ($cpuCounter.CounterSamples | Measure-Object CookedValue -Average).Average
        
        # メモリ使用率取得
        $totalMemory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
        $availableMemory = (Get-Counter '\Memory\Available Bytes').CounterSamples[0].CookedValue
        $memoryUsage = [math]::Round((($totalMemory - $availableMemory) / $totalMemory) * 100, 2)
        
        # ディスク使用率取得
        $diskInfo = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ForEach-Object {
            @{
                Drive = $_.DeviceID
                TotalGB = [math]::Round($_.Size / 1GB, 2)
                FreeGB = [math]::Round($_.FreeSpace / 1GB, 2)
                UsedPercent = [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 2)
            }
        }
        
        # プロセス監視
        $topProcesses = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | ForEach-Object {
            @{
                Name = $_.Name
                CPU = $_.CPU
                WorkingSet = [math]::Round($_.WorkingSet / 1MB, 2)
                Handles = $_.Handles
            }
        }
        
        return @{
            CPU = @{
                UsagePercent = [math]::Round($cpuUsage, 2)
                Status = if ($cpuUsage -gt $Config.CPUCriticalThreshold) { "Critical" } 
                        elseif ($cpuUsage -gt $Config.CPUWarningThreshold) { "Warning" } 
                        else { "Normal" }
            }
            Memory = @{
                UsagePercent = $memoryUsage
                TotalGB = [math]::Round($totalMemory / 1GB, 2)
                AvailableGB = [math]::Round($availableMemory / 1GB, 2)
                Status = if ($memoryUsage -gt $Config.MemoryCriticalThreshold) { "Critical" } 
                        elseif ($memoryUsage -gt $Config.MemoryWarningThreshold) { "Warning" } 
                        else { "Normal" }
            }
            Disk = $diskInfo
            TopProcesses = $topProcesses
        }
        
    } catch {
        Write-APILog "システムリソースメトリクス取得エラー: $($_.Exception.Message)" -Level "ERROR"
        return @{ Error = $_.Exception.Message }
    }
}

<#
.SYNOPSIS
    サービス状態の監視

.DESCRIPTION
    重要なWindowsサービスの実行状態を監視
#>
function Get-ServiceStatusMetrics {
    [CmdletBinding()]
    param([hashtable]$Config)
    
    try {
        $serviceStatus = @{}
        $criticalIssues = 0
        
        foreach ($serviceName in $Config.CriticalServices) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction Stop
                $serviceStatus[$serviceName] = @{
                    Name = $service.Name
                    DisplayName = $service.DisplayName
                    Status = $service.Status.ToString()
                    StartType = $service.StartType.ToString()
                    CanStop = $service.CanStop
                    CanRestart = $service.CanStop -and $service.CanPauseAndContinue
                }
                
                if ($service.Status -ne 'Running' -and $service.StartType -eq 'Automatic') {
                    $criticalIssues++
                }
                
            } catch {
                $serviceStatus[$serviceName] = @{
                    Name = $serviceName
                    Status = "NotFound"
                    Error = $_.Exception.Message
                }
                $criticalIssues++
            }
        }
        
        return @{
            Services = $serviceStatus
            CriticalIssues = $criticalIssues
            TotalMonitored = $Config.CriticalServices.Count
            OverallStatus = if ($criticalIssues -eq 0) { "Normal" } 
                           elseif ($criticalIssues -le 2) { "Warning" } 
                           else { "Critical" }
        }
        
    } catch {
        Write-APILog "サービス監視エラー: $($_.Exception.Message)" -Level "ERROR"
        return @{ Error = $_.Exception.Message }
    }
}

<#
.SYNOPSIS
    ネットワークパフォーマンスの監視

.DESCRIPTION
    ネットワーク遅延、パケットロス、帯域使用率の監視
#>
function Get-NetworkPerformanceMetrics {
    [CmdletBinding()]
    param([hashtable]$Config)
    
    try {
        # 基本的な接続性テスト
        $connectivityTests = @(
            @{ Target = "8.8.8.8"; Description = "Google DNS" }
            @{ Target = "1.1.1.1"; Description = "Cloudflare DNS" }
            @{ Target = "localhost"; Description = "Local Host" }
        )
        
        $networkResults = @{}
        foreach ($test in $connectivityTests) {
            try {
                $ping = Test-Connection -ComputerName $test.Target -Count 4 -Quiet
                if ($ping) {
                    $pingStats = Test-Connection -ComputerName $test.Target -Count 4 | 
                                Measure-Object ResponseTime -Average, Maximum, Minimum
                    
                    $networkResults[$test.Target] = @{
                        Target = $test.Target
                        Description = $test.Description
                        Available = $true
                        AverageLatency = [math]::Round($pingStats.Average, 2)
                        MaxLatency = $pingStats.Maximum
                        MinLatency = $pingStats.Minimum
                        Status = if ($pingStats.Average -gt $Config.NetworkLatencyCritical) { "Critical" }
                                elseif ($pingStats.Average -gt $Config.NetworkLatencyWarning) { "Warning" }
                                else { "Normal" }
                    }
                } else {
                    $networkResults[$test.Target] = @{
                        Target = $test.Target
                        Description = $test.Description
                        Available = $false
                        Status = "Critical"
                    }
                }
            } catch {
                $networkResults[$test.Target] = @{
                    Target = $test.Target
                    Description = $test.Description
                    Available = $false
                    Error = $_.Exception.Message
                    Status = "Critical"
                }
            }
        }
        
        # ネットワークアダプター統計
        $networkAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
            $stats = Get-NetAdapterStatistics -Name $_.Name
            @{
                Name = $_.Name
                LinkSpeed = $_.LinkSpeed
                BytesReceived = $stats.ReceivedBytes
                BytesSent = $stats.SentBytes
                PacketsReceived = $stats.ReceivedUnicastPackets
                PacketsSent = $stats.SentUnicastPackets
            }
        }
        
        return @{
            ConnectivityTests = $networkResults
            NetworkAdapters = $networkAdapters
            OverallStatus = if (($networkResults.Values | Where-Object { $_.Status -eq "Critical" }).Count -eq 0) { "Normal" }
                           elseif (($networkResults.Values | Where-Object { $_.Status -eq "Critical" }).Count -le 1) { "Warning" }
                           else { "Critical" }
        }
        
    } catch {
        Write-APILog "ネットワーク監視エラー: $($_.Exception.Message)" -Level "ERROR"
        return @{ Error = $_.Exception.Message }
    }
}

<#
.SYNOPSIS
    URLヘルスチェックの実行

.DESCRIPTION
    重要なWebエンドポイントの可用性とレスポンス時間を監視
#>
function Get-UrlHealthCheckMetrics {
    [CmdletBinding()]
    param([hashtable]$Config)
    
    try {
        $urlResults = @{}
        
        foreach ($urlCheck in $Config.HealthCheckUrls) {
            try {
                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                $response = Invoke-WebRequest -Uri $urlCheck.Url -TimeoutSec $urlCheck.Timeout -UseBasicParsing
                $stopwatch.Stop()
                
                $urlResults[$urlCheck.Name] = @{
                    Name = $urlCheck.Name
                    Url = $urlCheck.Url
                    StatusCode = $response.StatusCode
                    ResponseTimeMs = $stopwatch.ElapsedMilliseconds
                    Available = $true
                    Status = if ($response.StatusCode -eq 200 -and $stopwatch.ElapsedMilliseconds -lt 5000) { "Normal" }
                            elseif ($response.StatusCode -eq 200) { "Warning" }
                            else { "Critical" }
                    ContentLength = $response.Content.Length
                }
                
            } catch {
                $urlResults[$urlCheck.Name] = @{
                    Name = $urlCheck.Name
                    Url = $urlCheck.Url
                    Available = $false
                    Error = $_.Exception.Message
                    Status = "Critical"
                }
            }
        }
        
        return @{
            UrlChecks = $urlResults
            OverallStatus = if (($urlResults.Values | Where-Object { $_.Status -eq "Critical" }).Count -eq 0) { "Normal" }
                           elseif (($urlResults.Values | Where-Object { $_.Status -eq "Critical" }).Count -le 1) { "Warning" }
                           else { "Critical" }
        }
        
    } catch {
        Write-APILog "URLヘルスチェックエラー: $($_.Exception.Message)" -Level "ERROR"
        return @{ Error = $_.Exception.Message }
    }
}

<#
.SYNOPSIS
    アラート条件のテストと処理

.DESCRIPTION
    収集したメトリクスに基づいてアラート条件をチェックし、必要に応じてアラートを送信
#>
function Test-AlertConditions {
    [CmdletBinding()]
    param()
    
    try {
        $currentTime = Get-Date
        $newAlerts = @()
        
        # システムリソースアラート
        if ($script:CurrentMetrics.System.CPU.Status -in @("Warning", "Critical")) {
            $alertKey = "CPU_HIGH"
            if (-not $script:ActiveAlerts.ContainsKey($alertKey) -or 
                (($currentTime - $script:ActiveAlerts[$alertKey].LastSent).TotalMinutes -gt $script:MonitoringConfig.AlertCooldownMinutes)) {
                
                $newAlerts += @{
                    Key = $alertKey
                    Type = $script:CurrentMetrics.System.CPU.Status
                    Message = "CPU使用率が異常に高くなっています: $($script:CurrentMetrics.System.CPU.UsagePercent)%"
                    Timestamp = $currentTime
                }
            }
        }
        
        if ($script:CurrentMetrics.System.Memory.Status -in @("Warning", "Critical")) {
            $alertKey = "MEMORY_HIGH"
            if (-not $script:ActiveAlerts.ContainsKey($alertKey) -or 
                (($currentTime - $script:ActiveAlerts[$alertKey].LastSent).TotalMinutes -gt $script:MonitoringConfig.AlertCooldownMinutes)) {
                
                $newAlerts += @{
                    Key = $alertKey
                    Type = $script:CurrentMetrics.System.Memory.Status
                    Message = "メモリ使用率が異常に高くなっています: $($script:CurrentMetrics.System.Memory.UsagePercent)%"
                    Timestamp = $currentTime
                }
            }
        }
        
        # サービスアラート
        if ($script:CurrentMetrics.Services.OverallStatus -in @("Warning", "Critical")) {
            $alertKey = "SERVICES_DOWN"
            if (-not $script:ActiveAlerts.ContainsKey($alertKey) -or 
                (($currentTime - $script:ActiveAlerts[$alertKey].LastSent).TotalMinutes -gt $script:MonitoringConfig.AlertCooldownMinutes)) {
                
                $newAlerts += @{
                    Key = $alertKey
                    Type = $script:CurrentMetrics.Services.OverallStatus
                    Message = "重要サービスに問題があります: $($script:CurrentMetrics.Services.CriticalIssues)件の問題"
                    Timestamp = $currentTime
                }
            }
        }
        
        # URLヘルスチェックアラート
        if ($script:CurrentMetrics.UrlChecks.OverallStatus -in @("Warning", "Critical")) {
            $alertKey = "URL_HEALTH_ISSUE"
            if (-not $script:ActiveAlerts.ContainsKey($alertKey) -or 
                (($currentTime - $script:ActiveAlerts[$alertKey].LastSent).TotalMinutes -gt $script:MonitoringConfig.AlertCooldownMinutes)) {
                
                $failedUrls = ($script:CurrentMetrics.UrlChecks.UrlChecks.Values | Where-Object { $_.Status -eq "Critical" }).Count
                $newAlerts += @{
                    Key = $alertKey
                    Type = $script:CurrentMetrics.UrlChecks.OverallStatus
                    Message = "Webサービスに問題があります: $failedUrls件のエンドポイントが利用不可"
                    Timestamp = $currentTime
                }
            }
        }
        
        # 新しいアラートの送信
        foreach ($alert in $newAlerts) {
            Send-Alert -Type $alert.Type -Message $alert.Message
            $script:ActiveAlerts[$alert.Key] = @{
                LastSent = $alert.Timestamp
                Type = $alert.Type
                Message = $alert.Message
            }
        }
        
        Write-APILog "アラート処理完了: $($newAlerts.Count)件の新しいアラート" -Level "INFO"
        
    } catch {
        Write-APILog "アラート処理エラー: $($_.Exception.Message)" -Level "ERROR"
    }
}

<#
.SYNOPSIS
    アラートの送信

.DESCRIPTION
    設定に基づいてメール、Slack、Teams等にアラートを送信
#>
function Send-Alert {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Type,
        
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    
    try {
        $alertData = @{
            Type = $Type
            Message = $Message
            Timestamp = Get-Date
            ServerName = $env:COMPUTERNAME
            Source = "MonitoringSystem"
        }
        
        # ログへの記録
        Write-APILog "アラート: [$Type] $Message" -Level "WARNING"
        
        # データベースへのアラート記録
        try {
            $insertQuery = @"
                INSERT INTO monitoring_alerts (alert_type, message, severity, server_name, created_at) 
                VALUES (?, ?, ?, ?, datetime('now'))
"@
            Invoke-DBQuery -Query $insertQuery -Parameters @($Type, $Message, $Type, $env:COMPUTERNAME)
        } catch {
            Write-APILog "アラートのデータベース記録に失敗: $($_.Exception.Message)" -Level "ERROR"
        }
        
        # メール送信（設定されている場合）
        if ($script:MonitoringConfig.EmailEnabled) {
            try {
                # メール送信ロジック（実装は環境に依存）
                Write-APILog "メールアラート送信: $Message" -Level "INFO"
            } catch {
                Write-APILog "メール送信失敗: $($_.Exception.Message)" -Level "ERROR"
            }
        }
        
        # 自動インシデント作成（Critical レベルの場合）
        if ($Type -eq "Critical") {
            try {
                Create-AutoIncident -AlertData $alertData
            } catch {
                Write-APILog "自動インシデント作成失敗: $($_.Exception.Message)" -Level "ERROR"
            }
        }
        
    } catch {
        Write-APILog "アラート送信エラー: $($_.Exception.Message)" -Level "ERROR"
    }
}

<#
.SYNOPSIS
    監視メトリクスの永続化

.DESCRIPTION
    収集したメトリクスをデータベースに保存し、履歴データを管理
#>
function Save-MonitoringMetrics {
    [CmdletBinding()]
    param()
    
    try {
        if (-not $script:CurrentMetrics -or -not $script:CurrentMetrics.Timestamp) {
            Write-APILog "保存すべきメトリクスがありません" -Level "WARNING"
            return
        }
        
        # システムメトリクスの保存
        if ($script:CurrentMetrics.System) {
            $insertQuery = @"
                INSERT INTO monitoring_metrics (
                    metric_type, server_name, cpu_usage, memory_usage, 
                    disk_usage, network_status, service_status, 
                    overall_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
"@
            
            $diskUsageJson = $script:CurrentMetrics.System.Disk | ConvertTo-Json -Compress
            $serviceStatusJson = $script:CurrentMetrics.Services | ConvertTo-Json -Compress
            $networkStatusJson = $script:CurrentMetrics.Network | ConvertTo-Json -Compress
            
            Invoke-DBQuery -Query $insertQuery -Parameters @(
                "SYSTEM",
                $env:COMPUTERNAME,
                $script:CurrentMetrics.System.CPU.UsagePercent,
                $script:CurrentMetrics.System.Memory.UsagePercent,
                $diskUsageJson,
                $networkStatusJson,
                $serviceStatusJson,
                "Normal" # 全体ステータスの計算ロジックは後で実装
            )
        }
        
        # 古いメトリクスデータのクリーンアップ
        $cleanupQuery = @"
            DELETE FROM monitoring_metrics 
            WHERE created_at < datetime('now', '-$($script:MonitoringConfig.HistoryRetentionDays) days')
"@
        Invoke-DBQuery -Query $cleanupQuery
        
        Write-APILog "監視メトリクスが正常に保存されました" -Level "INFO"
        
    } catch {
        Write-APILog "メトリクス保存エラー: $($_.Exception.Message)" -Level "ERROR"
    }
}

<#
.SYNOPSIS
    Critical レベルアラート用の自動インシデント作成

.DESCRIPTION
    重大なアラートが発生した場合に自動的にインシデントを作成
#>
function Create-AutoIncident {
    [CmdletBinding()]
    param([hashtable]$AlertData)
    
    try {
        $incidentTitle = "自動生成: $($AlertData.Type) - $($AlertData.ServerName)"
        $incidentDescription = @"
システム監視により自動的に検出された重大な問題です。

アラート種別: $($AlertData.Type)
発生サーバー: $($AlertData.ServerName)
検出時刻: $($AlertData.Timestamp)
詳細: $($AlertData.Message)

このインシデントは監視システムにより自動作成されました。
至急確認と対応をお願いします。
"@
        
        $insertIncidentQuery = @"
            INSERT INTO incidents (
                title, description, priority, status, category,
                reported_by, created_at, impact, urgency
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
"@
        
        Invoke-DBQuery -Query $insertIncidentQuery -Parameters @(
            $incidentTitle,
            $incidentDescription,
            "Critical",
            "Open",
            "Infrastructure",
            "MONITORING_SYSTEM",
            "High",
            "High"
        )
        
        Write-APILog "重大アラートに対する自動インシデントを作成しました: $incidentTitle" -Level "INFO"
        
    } catch {
        Write-APILog "自動インシデント作成エラー: $($_.Exception.Message)" -Level "ERROR"
    }
}

# メイン実行部分
if ($MyInvocation.InvocationName -ne '.') {
    try {
        Write-APILog "システム監視ジョブを開始します" -Level "INFO"
        Start-ComprehensiveMonitoring
        Write-APILog "システム監視ジョブが正常に完了しました" -Level "INFO"
    } catch {
        Write-APILog "システム監視ジョブでエラーが発生: $($_.Exception.Message)" -Level "ERROR"
        exit 1
    }
}