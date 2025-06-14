# EnhancedSecurityUtil.psm1 - 強化されたセキュリティユーティリティモジュール

function Test-SecurityCompliance {
    <#
    .SYNOPSIS
    システムのセキュリティコンプライアンス状態をチェック
    
    .DESCRIPTION
    ITSMシステムのセキュリティ要件に基づいてコンプライアンスをチェックし、
    ISO27001、ITIL準拠の観点からセキュリティ状態を評価する
    
    .PARAMETER CheckType
    チェックタイプ: "Full", "Basic", "Critical"
    
    .EXAMPLE
    Test-SecurityCompliance -CheckType "Full"
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("Full", "Basic", "Critical")]
        [string]$CheckType = "Basic"
    )
    
    $results = @{
        OverallScore = 0
        MaxScore = 0
        Status = "Unknown"
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        Checks = @()
    }
    
    Write-Host "セキュリティコンプライアンスチェック開始: $CheckType" -ForegroundColor Green
    
    # 1. ファイアウォール状態チェック
    try {
        $firewallStatus = Get-NetFirewallProfile | Where-Object { $_.Enabled -eq $true }
        $firewallCheck = @{
            Name = "Windows Firewall Status"
            Category = "Network Security"
            Status = if ($firewallStatus.Count -gt 0) { "PASS" } else { "FAIL" }
            Score = if ($firewallStatus.Count -gt 0) { 10 } else { 0 }
            MaxScore = 10
            Details = "有効なファイアウォールプロファイル: $($firewallStatus.Count)"
            Recommendation = if ($firewallStatus.Count -eq 0) { "Windows Firewallを有効にしてください" } else { "適切に設定されています" }
        }
        $results.Checks += $firewallCheck
    }
    catch {
        $results.Checks += @{
            Name = "Windows Firewall Status"
            Category = "Network Security"
            Status = "ERROR"
            Score = 0
            MaxScore = 10
            Details = "ファイアウォール状態の取得に失敗: $($_.Exception.Message)"
        }
    }
    
    # 2. Windows Defender状態チェック
    try {
        $defenderStatus = Get-MpComputerStatus
        $defenderCheck = @{
            Name = "Windows Defender Status"
            Category = "Antivirus"
            Status = if ($defenderStatus.AntivirusEnabled) { "PASS" } else { "FAIL" }
            Score = if ($defenderStatus.AntivirusEnabled) { 15 } else { 0 }
            MaxScore = 15
            Details = "Antivirus有効: $($defenderStatus.AntivirusEnabled), 定義ファイル更新: $($defenderStatus.AntivirusSignatureLastUpdated)"
            Recommendation = if (-not $defenderStatus.AntivirusEnabled) { "Windows Defenderを有効にしてください" } else { "適切に設定されています" }
        }
        $results.Checks += $defenderCheck
    }
    catch {
        $results.Checks += @{
            Name = "Windows Defender Status"
            Category = "Antivirus"
            Status = "ERROR"
            Score = 0
            MaxScore = 15
            Details = "Windows Defender状態の取得に失敗: $($_.Exception.Message)"
        }
    }
    
    # 3. システム更新状態チェック
    if ($CheckType -eq "Full") {
        try {
            $lastUpdate = Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1
            $daysSinceUpdate = if ($lastUpdate.InstalledOn) {
                [math]::Round((Get-Date) - $lastUpdate.InstalledOn).TotalDays
            } else { 999 }
            
            $updateCheck = @{
                Name = "System Updates"
                Category = "Patch Management"
                Status = if ($daysSinceUpdate -le 30) { "PASS" } elseif ($daysSinceUpdate -le 60) { "WARNING" } else { "FAIL" }
                Score = if ($daysSinceUpdate -le 30) { 15 } elseif ($daysSinceUpdate -le 60) { 8 } else { 0 }
                MaxScore = 15
                Details = "最新更新からの日数: $daysSinceUpdate 日"
                Recommendation = if ($daysSinceUpdate -gt 30) { "システム更新を実行してください" } else { "更新状態は良好です" }
            }
            $results.Checks += $updateCheck
        }
        catch {
            $results.Checks += @{
                Name = "System Updates"
                Category = "Patch Management"
                Status = "ERROR"
                Score = 0
                MaxScore = 15
                Details = "システム更新情報の取得に失敗"
            }
        }
    }
    
    # 4. ユーザーアカウント制御設定
    try {
        $uacKey = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -ErrorAction SilentlyContinue
        $uacEnabled = $uacKey.EnableLUA -eq 1
        
        $uacCheck = @{
            Name = "User Account Control (UAC)"
            Category = "Access Control"
            Status = if ($uacEnabled) { "PASS" } else { "FAIL" }
            Score = if ($uacEnabled) { 10 } else { 0 }
            MaxScore = 10
            Details = "UAC有効: $uacEnabled"
            Recommendation = if (-not $uacEnabled) { "UACを有効にしてください" } else { "適切に設定されています" }
        }
        $results.Checks += $uacCheck
    }
    catch {
        $results.Checks += @{
            Name = "User Account Control (UAC)"
            Category = "Access Control"
            Status = "ERROR"
            Score = 0
            MaxScore = 10
            Details = "UAC設定の取得に失敗"
        }
    }
    
    # 5. ログ設定チェック
    try {
        $auditPolicy = auditpol /get /category:*
        $logCheck = @{
            Name = "Audit Logging Configuration"
            Category = "Logging & Monitoring"
            Status = if ($auditPolicy -contains "Success and Failure") { "PASS" } else { "WARNING" }
            Score = if ($auditPolicy -contains "Success and Failure") { 10 } else { 5 }
            MaxScore = 10
            Details = "監査ログ設定確認済み"
            Recommendation = "監査ログ設定を詳細に確認してください"
        }
        $results.Checks += $logCheck
    }
    catch {
        $results.Checks += @{
            Name = "Audit Logging Configuration"
            Category = "Logging & Monitoring"
            Status = "ERROR"
            Score = 0
            MaxScore = 10
            Details = "監査設定の取得に失敗"
        }
    }
    
    # スコア計算
    $results.OverallScore = ($results.Checks | Measure-Object -Property Score -Sum).Sum
    $results.MaxScore = ($results.Checks | Measure-Object -Property MaxScore -Sum).Sum
    $scorePercentage = if ($results.MaxScore -gt 0) { [math]::Round(($results.OverallScore / $results.MaxScore) * 100, 1) } else { 0 }
    
    $results.Status = if ($scorePercentage -ge 80) { "COMPLIANT" } 
                     elseif ($scorePercentage -ge 60) { "PARTIALLY_COMPLIANT" } 
                     else { "NON_COMPLIANT" }
    
    Write-Host "セキュリティコンプライアンスチェック完了" -ForegroundColor Green
    Write-Host "総合スコア: $($results.OverallScore)/$($results.MaxScore) ($scorePercentage%)" -ForegroundColor $(if ($scorePercentage -ge 80) { "Green" } elseif ($scorePercentage -ge 60) { "Yellow" } else { "Red" })
    Write-Host "ステータス: $($results.Status)" -ForegroundColor $(if ($results.Status -eq "COMPLIANT") { "Green" } elseif ($results.Status -eq "PARTIALLY_COMPLIANT") { "Yellow" } else { "Red" })
    
    return $results
}

function Get-SecurityRecommendations {
    <#
    .SYNOPSIS
    セキュリティ推奨事項を取得
    
    .DESCRIPTION
    現在のシステム状態に基づいてセキュリティ推奨事項を提供
    #>
    
    $recommendations = @()
    
    # Windows Updateチェック
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
        
        if ($searchResult.Updates.Count -gt 0) {
            $recommendations += @{
                Priority = "High"
                Category = "Patch Management"
                Title = "利用可能なWindows Update"
                Description = "$($searchResult.Updates.Count) 件の重要な更新プログラムが利用可能です"
                Action = "Windows Updateを実行してシステムを最新の状態に保ってください"
            }
        }
    }
    catch {
        $recommendations += @{
            Priority = "Medium"
            Category = "Patch Management"
            Title = "Windows Update状態確認不可"
            Description = "Windows Updateの状態を確認できませんでした"
            Action = "手動でWindows Updateの状態を確認してください"
        }
    }
    
    # パスワードポリシーチェック
    try {
        $secPol = secedit /export /cfg "$env:TEMP\secpol.cfg" /quiet
        $content = Get-Content "$env:TEMP\secpol.cfg"
        $minPwdLen = ($content | Where-Object { $_ -like "MinimumPasswordLength*" }) -replace "MinimumPasswordLength = ", ""
        
        if ([int]$minPwdLen -lt 8) {
            $recommendations += @{
                Priority = "High"
                Category = "Password Policy"
                Title = "パスワード最小長の強化"
                Description = "現在の最小パスワード長: $minPwdLen 文字"
                Action = "パスワード最小長を8文字以上に設定してください"
            }
        }
        
        Remove-Item "$env:TEMP\secpol.cfg" -Force -ErrorAction SilentlyContinue
    }
    catch {
        $recommendations += @{
            Priority = "Medium"
            Category = "Password Policy"
            Title = "パスワードポリシー確認"
            Description = "パスワードポリシーの確認を推奨します"
            Action = "グループポリシーまたはローカルセキュリティポリシーでパスワード設定を確認してください"
        }
    }
    
    return $recommendations
}

function Start-SecurityHardening {
    <#
    .SYNOPSIS
    自動セキュリティ強化を実行
    
    .DESCRIPTION
    基本的なセキュリティ強化設定を自動で適用
    
    .PARAMETER Mode
    実行モード: "Scan", "Apply", "Rollback"
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("Scan", "Apply", "Rollback")]
        [string]$Mode = "Scan"
    )
    
    $results = @{
        Mode = $Mode
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        Actions = @()
    }
    
    Write-Host "セキュリティ強化処理開始: $Mode モード" -ForegroundColor Blue
    
    # 1. Windows Firewall有効化
    if ($Mode -eq "Apply") {
        try {
            Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
            $results.Actions += @{
                Action = "Enable Windows Firewall"
                Status = "SUCCESS"
                Details = "全プロファイルでファイアウォールを有効化"
            }
        }
        catch {
            $results.Actions += @{
                Action = "Enable Windows Firewall"
                Status = "ERROR"
                Details = $_.Exception.Message
            }
        }
    }
    
    # 2. 自動更新設定
    if ($Mode -eq "Apply") {
        try {
            $autoUpdateKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
            if (-not (Test-Path $autoUpdateKey)) {
                New-Item -Path $autoUpdateKey -Force | Out-Null
            }
            Set-ItemProperty -Path $autoUpdateKey -Name "AUOptions" -Value 4  # 自動ダウンロード・自動インストール
            
            $results.Actions += @{
                Action = "Configure Automatic Updates"
                Status = "SUCCESS"
                Details = "自動更新を有効化"
            }
        }
        catch {
            $results.Actions += @{
                Action = "Configure Automatic Updates"
                Status = "ERROR"
                Details = $_.Exception.Message
            }
        }
    }
    
    # 3. 不要なサービス無効化（慎重に）
    if ($Mode -eq "Apply") {
        $unnecessaryServices = @("Spooler", "Fax") # 例：環境に応じて調整
        
        foreach ($serviceName in $unnecessaryServices) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service -and $service.Status -eq "Running") {
                    Stop-Service -Name $serviceName -Force
                    Set-Service -Name $serviceName -StartupType Disabled
                    
                    $results.Actions += @{
                        Action = "Disable Unnecessary Service"
                        Status = "SUCCESS"
                        Details = "サービス '$serviceName' を無効化"
                    }
                }
            }
            catch {
                $results.Actions += @{
                    Action = "Disable Unnecessary Service"
                    Status = "ERROR"
                    Details = "サービス '$serviceName' の無効化に失敗: $($_.Exception.Message)"
                }
            }
        }
    }
    
    Write-Host "セキュリティ強化処理完了: $($results.Actions.Count) 項目処理" -ForegroundColor Green
    
    return $results
}

function Get-SecurityEventAnalysis {
    <#
    .SYNOPSIS
    セキュリティイベントログの分析
    
    .DESCRIPTION
    Windows Securityログから異常なイベントを検出・分析
    #>
    param(
        [int]$DaysBack = 7,
        [int]$MaxEvents = 1000
    )
    
    $startTime = (Get-Date).AddDays(-$DaysBack)
    $analysis = @{
        Period = "過去 $DaysBack 日間"
        TotalEvents = 0
        Alerts = @()
        Summary = @{}
    }
    
    try {
        # ログイン失敗の検出
        $failedLogons = Get-WinEvent -FilterHashtable @{
            LogName = 'Security'
            ID = 4625  # Failed logon
            StartTime = $startTime
        } -MaxEvents $MaxEvents -ErrorAction SilentlyContinue
        
        if ($failedLogons) {
            $analysis.TotalEvents += $failedLogons.Count
            $analysis.Summary["Failed_Logons"] = $failedLogons.Count
            
            # 複数回失敗したアカウントを特定
            $suspiciousAccounts = $failedLogons | 
                ForEach-Object { $_.Properties[5].Value } |
                Group-Object | 
                Where-Object { $_.Count -gt 5 } |
                Sort-Object Count -Descending
            
            foreach ($account in $suspiciousAccounts) {
                $analysis.Alerts += @{
                    Severity = "High"
                    Type = "Multiple Failed Logons"
                    Account = $account.Name
                    Count = $account.Count
                    Description = "アカウント '$($account.Name)' で $($account.Count) 回のログイン失敗"
                }
            }
        }
        
        # 特権昇格の検出
        $privilegeUse = Get-WinEvent -FilterHashtable @{
            LogName = 'Security'
            ID = 4672  # Special privileges assigned
            StartTime = $startTime
        } -MaxEvents $MaxEvents -ErrorAction SilentlyContinue
        
        if ($privilegeUse) {
            $analysis.Summary["Privilege_Use"] = $privilegeUse.Count
            
            # 時間外の特権使用を検出
            $afterHours = $privilegeUse | Where-Object { 
                $_.TimeCreated.Hour -lt 8 -or $_.TimeCreated.Hour -gt 18 
            }
            
            if ($afterHours.Count -gt 0) {
                $analysis.Alerts += @{
                    Severity = "Medium"
                    Type = "After Hours Privilege Use"
                    Count = $afterHours.Count
                    Description = "時間外（8時前または18時後）に $($afterHours.Count) 回の特権使用"
                }
            }
        }
        
        # システム変更の検出
        $systemChanges = Get-WinEvent -FilterHashtable @{
            LogName = 'System'
            Level = 2,3  # Error, Warning
            StartTime = $startTime
        } -MaxEvents $MaxEvents -ErrorAction SilentlyContinue
        
        if ($systemChanges) {
            $analysis.Summary["System_Issues"] = $systemChanges.Count
            
            if ($systemChanges.Count -gt 50) {
                $analysis.Alerts += @{
                    Severity = "Medium"
                    Type = "High System Error Rate"
                    Count = $systemChanges.Count
                    Description = "システムエラー・警告が異常に多い ($($systemChanges.Count) 件)"
                }
            }
        }
        
    }
    catch {
        $analysis.Alerts += @{
            Severity = "Low"
            Type = "Analysis Error"
            Description = "イベントログ分析中にエラー: $($_.Exception.Message)"
        }
    }
    
    return $analysis
}

# モジュールエクスポート
Export-ModuleMember -Function @(
    'Test-SecurityCompliance',
    'Get-SecurityRecommendations', 
    'Start-SecurityHardening',
    'Get-SecurityEventAnalysis'
)