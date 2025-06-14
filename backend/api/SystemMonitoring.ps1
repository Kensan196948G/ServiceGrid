# SystemMonitoring.ps1 - システム監視・パフォーマンス分析API

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1"
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1"
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1"
Import-Module "$PSScriptRoot/../modules/EnhancedSecurityUtil.psm1"

function Get-SystemPerformanceMetrics {
    <#
    .SYNOPSIS
    システムパフォーマンスメトリクスを取得
    #>
    param(
        [string]$Token,
        [int]$DurationMinutes = 5
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        Write-ApiLog -Method "GET" -Endpoint "/system/performance" -StatusCode 200 -User $user.Username
        
        $metrics = @{
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            ServerInfo = @{
                ComputerName = $env:COMPUTERNAME
                OSVersion = (Get-CimInstance Win32_OperatingSystem).Caption
                PowerShellVersion = $PSVersionTable.PSVersion.ToString()
                Domain = (Get-CimInstance Win32_ComputerSystem).Domain
                Uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
            }
            CPU = @{}
            Memory = @{}
            Disk = @{}
            Network = @{}
            Processes = @()
            Services = @()
        }
        
        # CPU使用率
        Write-Host "CPU使用率を取得中..." -ForegroundColor Yellow
        $cpuUsage = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 3
        $avgCpuUsage = ($cpuUsage.CounterSamples | Measure-Object -Property CookedValue -Average).Average
        
        $metrics.CPU = @{
            Usage = [math]::Round($avgCpuUsage, 2)
            CoreCount = (Get-CimInstance Win32_Processor).NumberOfCores
            LogicalProcessors = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
            Architecture = (Get-CimInstance Win32_Processor).Architecture
            MaxClockSpeed = (Get-CimInstance Win32_Processor).MaxClockSpeed
        }
        
        # メモリ使用量
        Write-Host "メモリ使用量を取得中..." -ForegroundColor Yellow
        $memory = Get-CimInstance Win32_OperatingSystem
        $totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        $usedMemoryGB = $totalMemoryGB - $freeMemoryGB
        $memoryUsagePercent = [math]::Round(($usedMemoryGB / $totalMemoryGB) * 100, 2)
        
        $metrics.Memory = @{
            TotalGB = $totalMemoryGB
            UsedGB = $usedMemoryGB
            FreeGB = $freeMemoryGB
            UsagePercent = $memoryUsagePercent
            AvailableGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        }
        
        # ディスク使用量
        Write-Host "ディスク使用量を取得中..." -ForegroundColor Yellow
        $disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        $diskInfo = @()
        
        foreach ($disk in $disks) {
            $totalGB = [math]::Round($disk.Size / 1GB, 2)
            $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            $usedGB = $totalGB - $freeGB
            $usagePercent = if ($totalGB -gt 0) { [math]::Round(($usedGB / $totalGB) * 100, 2) } else { 0 }
            
            $diskInfo += @{
                Drive = $disk.DeviceID
                TotalGB = $totalGB
                UsedGB = $usedGB
                FreeGB = $freeGB
                UsagePercent = $usagePercent
                FileSystem = $disk.FileSystem
                Label = $disk.VolumeName
            }
        }
        $metrics.Disk = $diskInfo
        
        # ネットワーク統計
        Write-Host "ネットワーク統計を取得中..." -ForegroundColor Yellow
        $networkAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Virtual -eq $false }
        $networkInfo = @()
        
        foreach ($adapter in $networkAdapters) {
            try {
                $stats = Get-NetAdapterStatistics -Name $adapter.Name
                $networkInfo += @{
                    Name = $adapter.Name
                    Description = $adapter.InterfaceDescription
                    Speed = $adapter.LinkSpeed
                    BytesReceived = $stats.BytesReceived
                    BytesSent = $stats.BytesSent
                    PacketsReceived = $stats.PacketsReceived
                    PacketsSent = $stats.PacketsSent
                }
            }
            catch {
                Write-Warning "Network adapter $($adapter.Name) statistics could not be retrieved"
            }
        }
        $metrics.Network = $networkInfo
        
        # トップCPU使用プロセス
        Write-Host "プロセス情報を取得中..." -ForegroundColor Yellow
        $topProcesses = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
        $processInfo = @()
        
        foreach ($process in $topProcesses) {
            $processInfo += @{
                Name = $process.ProcessName
                ID = $process.Id
                CPU = [math]::Round($process.CPU, 2)
                WorkingSetMB = [math]::Round($process.WorkingSet / 1MB, 2)
                StartTime = if ($process.StartTime) { $process.StartTime.ToString("yyyy-MM-ddTHH:mm:ss") } else { "N/A" }
            }
        }
        $metrics.Processes = $processInfo
        
        # 重要なサービス状態
        Write-Host "サービス状態を取得中..." -ForegroundColor Yellow
        $importantServices = @("Spooler", "BITS", "Themes", "AudioSrv", "Dhcp", "Dnscache", "EventLog", "PlugPlay", "RpcSs", "Schedule", "W32Time", "Winmgmt", "WinRM")
        $serviceInfo = @()
        
        foreach ($serviceName in $importantServices) {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service) {
                $serviceInfo += @{
                    Name = $service.Name
                    DisplayName = $service.DisplayName
                    Status = $service.Status.ToString()
                    StartType = $service.StartType.ToString()
                }
            }
        }
        $metrics.Services = $serviceInfo
        
        return @{
            Status = 200
            Message = "システムパフォーマンスメトリクスを正常に取得しました"
            Data = $metrics
        }
    }
    catch {
        Write-ApiLog -Method "GET" -Endpoint "/system/performance" -StatusCode 500 -User $user.Username -Details $_.Exception.Message
        return @{
            Status = 500
            Message = "システムパフォーマンスメトリクスの取得に失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

function Get-SystemHealthCheck {
    <#
    .SYNOPSIS
    包括的なシステムヘルスチェックを実行
    #>
    param(
        [string]$Token,
        [ValidateSet("Basic", "Full", "Critical")]
        [string]$CheckLevel = "Basic"
    )
    
    try {
        if (-not (Test-AuthToken -Token $Token)) {
            return @{
                Status = 401
                Message = "Unauthorized"
                Data = $null
            }
        }
        
        $user = Get-TokenUser -Token $Token
        Write-ApiLog -Method "GET" -Endpoint "/system/health" -StatusCode 200 -User $user.Username
        
        Write-Host "システムヘルスチェック開始: $CheckLevel レベル" -ForegroundColor Green
        
        $healthReport = @{
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            CheckLevel = $CheckLevel
            OverallStatus = "Unknown"
            Score = 0
            MaxScore = 0
            Categories = @{
                SystemResources = @{}
                WindowsServices = @{}
                SecurityCompliance = @{}
                NetworkConnectivity = @{}
                EventLogs = @{}
            }
            Recommendations = @()
        }
        
        # 1. システムリソースチェック
        Write-Host "1. システムリソースをチェック中..." -ForegroundColor Cyan
        $resourceCheck = Test-SystemResources
        $healthReport.Categories.SystemResources = $resourceCheck
        $healthReport.Score += $resourceCheck.Score
        $healthReport.MaxScore += $resourceCheck.MaxScore
        
        # 2. Windowsサービスチェック
        Write-Host "2. Windowsサービスをチェック中..." -ForegroundColor Cyan
        $serviceCheck = Test-WindowsServices
        $healthReport.Categories.WindowsServices = $serviceCheck
        $healthReport.Score += $serviceCheck.Score
        $healthReport.MaxScore += $serviceCheck.MaxScore
        
        # 3. セキュリティコンプライアンスチェック
        if ($CheckLevel -eq "Full" -or $CheckLevel -eq "Critical") {
            Write-Host "3. セキュリティコンプライアンスをチェック中..." -ForegroundColor Cyan
            $securityCheck = Test-SecurityCompliance -CheckType $CheckLevel
            $healthReport.Categories.SecurityCompliance = $securityCheck
            $healthReport.Score += $securityCheck.OverallScore
            $healthReport.MaxScore += $securityCheck.MaxScore
        }
        
        # 4. ネットワーク接続チェック
        Write-Host "4. ネットワーク接続をチェック中..." -ForegroundColor Cyan
        $networkCheck = Test-NetworkConnectivity
        $healthReport.Categories.NetworkConnectivity = $networkCheck
        $healthReport.Score += $networkCheck.Score
        $healthReport.MaxScore += $networkCheck.MaxScore
        
        # 5. イベントログチェック
        if ($CheckLevel -eq "Full") {
            Write-Host "5. イベントログをチェック中..." -ForegroundColor Cyan
            $eventLogCheck = Test-EventLogs
            $healthReport.Categories.EventLogs = $eventLogCheck
            $healthReport.Score += $eventLogCheck.Score
            $healthReport.MaxScore += $eventLogCheck.MaxScore
        }
        
        # 総合評価
        $scorePercentage = if ($healthReport.MaxScore -gt 0) { 
            [math]::Round(($healthReport.Score / $healthReport.MaxScore) * 100, 1) 
        } else { 0 }
        
        $healthReport.OverallStatus = if ($scorePercentage -ge 85) { "Excellent" }
                                     elseif ($scorePercentage -ge 70) { "Good" }
                                     elseif ($scorePercentage -ge 50) { "Fair" }
                                     else { "Poor" }
        
        # 推奨事項を収集
        foreach ($category in $healthReport.Categories.Values) {
            if ($category.Recommendations) {
                $healthReport.Recommendations += $category.Recommendations
            }
        }
        
        Write-Host "システムヘルスチェック完了" -ForegroundColor Green
        Write-Host "総合スコア: $($healthReport.Score)/$($healthReport.MaxScore) ($scorePercentage%)" -ForegroundColor $(
            if ($scorePercentage -ge 85) { "Green" } 
            elseif ($scorePercentage -ge 70) { "Yellow" } 
            else { "Red" }
        )
        
        return @{
            Status = 200
            Message = "システムヘルスチェックを正常に完了しました"
            Data = $healthReport
        }
    }
    catch {
        Write-ApiLog -Method "GET" -Endpoint "/system/health" -StatusCode 500 -User $user.Username -Details $_.Exception.Message
        return @{
            Status = 500
            Message = "システムヘルスチェックに失敗しました: $($_.Exception.Message)"
            Data = $null
        }
    }
}

function Test-SystemResources {
    $check = @{
        Name = "System Resources"
        Score = 0
        MaxScore = 40
        Status = "Unknown"
        Details = @{}
        Recommendations = @()
    }
    
    try {
        # CPU使用率チェック
        $cpuUsage = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 2
        $avgCpu = ($cpuUsage.CounterSamples | Measure-Object -Property CookedValue -Average).Average
        
        if ($avgCpu -lt 70) { $check.Score += 10 }
        elseif ($avgCpu -lt 85) { $check.Score += 6 }
        else { $check.Recommendations += "CPU使用率が高すぎます ($([math]::Round($avgCpu, 1))%)" }
        
        $check.Details.CPU = @{
            Usage = [math]::Round($avgCpu, 2)
            Status = if ($avgCpu -lt 70) { "Good" } elseif ($avgCpu -lt 85) { "Warning" } else { "Critical" }
        }
        
        # メモリ使用量チェック
        $memory = Get-CimInstance Win32_OperatingSystem
        $memoryUsage = (($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100
        
        if ($memoryUsage -lt 80) { $check.Score += 10 }
        elseif ($memoryUsage -lt 90) { $check.Score += 6 }
        else { $check.Recommendations += "メモリ使用量が高すぎます ($([math]::Round($memoryUsage, 1))%)" }
        
        $check.Details.Memory = @{
            Usage = [math]::Round($memoryUsage, 2)
            Status = if ($memoryUsage -lt 80) { "Good" } elseif ($memoryUsage -lt 90) { "Warning" } else { "Critical" }
        }
        
        # ディスク容量チェック
        $systemDisk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
        $diskUsage = (($systemDisk.Size - $systemDisk.FreeSpace) / $systemDisk.Size) * 100
        
        if ($diskUsage -lt 80) { $check.Score += 10 }
        elseif ($diskUsage -lt 90) { $check.Score += 6 }
        else { $check.Recommendations += "システムディスクの使用量が高すぎます ($([math]::Round($diskUsage, 1))%)" }
        
        $check.Details.Disk = @{
            Usage = [math]::Round($diskUsage, 2)
            FreeSpaceGB = [math]::Round($systemDisk.FreeSpace / 1GB, 2)
            Status = if ($diskUsage -lt 80) { "Good" } elseif ($diskUsage -lt 90) { "Warning" } else { "Critical" }
        }
        
        # アップタイムチェック
        $uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
        if ($uptime.TotalDays -lt 30) { $check.Score += 10 }
        elseif ($uptime.TotalDays -lt 60) { $check.Score += 6 }
        else { $check.Recommendations += "システムの稼働時間が長すぎます ($([math]::Round($uptime.TotalDays, 1)) 日)" }
        
        $check.Details.Uptime = @{
            Days = [math]::Round($uptime.TotalDays, 1)
            Status = if ($uptime.TotalDays -lt 30) { "Good" } elseif ($uptime.TotalDays -lt 60) { "Warning" } else { "Critical" }
        }
        
        $check.Status = if ($check.Score -ge 32) { "Good" } elseif ($check.Score -ge 24) { "Warning" } else { "Critical" }
    }
    catch {
        $check.Status = "Error"
        $check.Details.Error = $_.Exception.Message
    }
    
    return $check
}

function Test-WindowsServices {
    $check = @{
        Name = "Windows Services"
        Score = 0
        MaxScore = 20
        Status = "Unknown"
        Details = @{
            CriticalServices = @()
            FailedServices = @()
        }
        Recommendations = @()
    }
    
    $criticalServices = @("EventLog", "RpcSs", "Winmgmt", "Schedule", "Dhcp", "Dnscache")
    
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($service) {
            $serviceInfo = @{
                Name = $service.Name
                Status = $service.Status.ToString()
                StartType = $service.StartType.ToString()
            }
            
            if ($service.Status -eq "Running") {
                $check.Score += 3
                $serviceInfo.Health = "Good"
            }
            else {
                $check.Details.FailedServices += $serviceName
                $check.Recommendations += "重要なサービス '$serviceName' が停止しています"
                $serviceInfo.Health = "Failed"
            }
            
            $check.Details.CriticalServices += $serviceInfo
        }
    }
    
    $check.Status = if ($check.Score -ge 16) { "Good" } elseif ($check.Score -ge 12) { "Warning" } else { "Critical" }
    return $check
}

function Test-NetworkConnectivity {
    $check = @{
        Name = "Network Connectivity"
        Score = 0
        MaxScore = 20
        Status = "Unknown"
        Details = @{
            InternetAccess = $false
            DNSResolution = $false
            NetworkAdapters = @()
        }
        Recommendations = @()
    }
    
    try {
        # インターネット接続テスト
        $internetTest = Test-NetConnection -ComputerName "8.8.8.8" -Port 53 -InformationLevel Quiet
        if ($internetTest) {
            $check.Score += 10
            $check.Details.InternetAccess = $true
        }
        else {
            $check.Recommendations += "インターネット接続に問題があります"
        }
        
        # DNS解決テスト
        try {
            $dnsTest = Resolve-DnsName -Name "google.com" -Type A -ErrorAction Stop
            if ($dnsTest) {
                $check.Score += 5
                $check.Details.DNSResolution = $true
            }
        }
        catch {
            $check.Recommendations += "DNS解決に問題があります"
        }
        
        # ネットワークアダプター状態
        $adapters = Get-NetAdapter | Where-Object { $_.Virtual -eq $false }
        foreach ($adapter in $adapters) {
            $adapterInfo = @{
                Name = $adapter.Name
                Status = $adapter.Status.ToString()
                Speed = $adapter.LinkSpeed
            }
            
            if ($adapter.Status -eq "Up") {
                $check.Score += 2
                $adapterInfo.Health = "Good"
            }
            else {
                $adapterInfo.Health = "Down"
            }
            
            $check.Details.NetworkAdapters += $adapterInfo
        }
        
        $check.Status = if ($check.Score -ge 16) { "Good" } elseif ($check.Score -ge 10) { "Warning" } else { "Critical" }
    }
    catch {
        $check.Status = "Error"
        $check.Details.Error = $_.Exception.Message
    }
    
    return $check
}

function Test-EventLogs {
    $check = @{
        Name = "Event Logs"
        Score = 0
        MaxScore = 20
        Status = "Unknown"
        Details = @{
            CriticalErrors = 0
            WarningCount = 0
            RecentCritical = @()
        }
        Recommendations = @()
    }
    
    try {
        $startTime = (Get-Date).AddDays(-1)  # 過去24時間
        
        # システムログの重大エラー
        $criticalErrors = Get-WinEvent -FilterHashtable @{
            LogName = 'System'
            Level = 1,2  # Critical, Error
            StartTime = $startTime
        } -MaxEvents 100 -ErrorAction SilentlyContinue
        
        if ($criticalErrors) {
            $check.Details.CriticalErrors = $criticalErrors.Count
            
            if ($criticalErrors.Count -eq 0) { $check.Score += 10 }
            elseif ($criticalErrors.Count -le 5) { $check.Score += 6 }
            else { $check.Recommendations += "システムに重大なエラーが多発しています ($($criticalErrors.Count) 件)" }
            
            # 最近の重要エラーを記録
            $check.Details.RecentCritical = $criticalErrors | Select-Object -First 5 | ForEach-Object {
                @{
                    TimeCreated = $_.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss")
                    Id = $_.Id
                    LevelDisplayName = $_.LevelDisplayName
                    Message = $_.Message.Substring(0, [Math]::Min(100, $_.Message.Length))
                }
            }
        }
        else {
            $check.Score += 10
        }
        
        # 警告レベルのイベント
        $warnings = Get-WinEvent -FilterHashtable @{
            LogName = 'System'
            Level = 3  # Warning
            StartTime = $startTime
        } -MaxEvents 50 -ErrorAction SilentlyContinue
        
        if ($warnings) {
            $check.Details.WarningCount = $warnings.Count
            
            if ($warnings.Count -le 10) { $check.Score += 5 }
            elseif ($warnings.Count -le 25) { $check.Score += 3 }
            else { $check.Recommendations += "システム警告が多発しています ($($warnings.Count) 件)" }
        }
        else {
            $check.Score += 5
        }
        
        $check.Status = if ($check.Score -ge 16) { "Good" } elseif ($check.Score -ge 10) { "Warning" } else { "Critical" }
    }
    catch {
        $check.Status = "Error"
        $check.Details.Error = $_.Exception.Message
        $check.Score = 5  # 部分点
    }
    
    return $check
}

# 関数をエクスポート
Export-ModuleMember -Function @(
    'Get-SystemPerformanceMetrics',
    'Get-SystemHealthCheck'
)