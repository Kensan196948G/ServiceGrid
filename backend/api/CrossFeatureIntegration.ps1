# CrossFeatureIntegration.ps1 - Feature間統合連携テスト
# ITSM統合システム全Feature連携確認
# Version: 1.0.0

param(
    [Parameter(Mandatory)]
    [string]$Action,
    
    [string]$FeatureTarget = "All",  # All, B, C, E
    [hashtable]$TestData = @{},
    [switch]$DetailedReport = $false
)

# Feature連携設定
$script:IntegrationConfig = @{
    FeatureEndpoints = @{
        "B" = @{
            Name = "UI/テスト"
            BaseURL = "http://localhost:3001"
            TestPaths = @("/", "/assets", "/incidents", "/service-requests")
            TestComponents = @("Layout", "AssetPage", "IncidentPage", "ServiceRequestPage")
        }
        "C" = @{
            Name = "API開発"
            BaseURL = "http://localhost:8082"
            TestPaths = @("/api/assets", "/api/incidents", "/api/service-requests", "/api/auth")
            TestModules = @("assets.js", "incidents.js", "service-requests-enhanced.js", "auth.js")
        }
        "E" = @{
            Name = "非機能要件"
            TestAreas = @("Security", "Performance", "Monitoring", "Quality")
            SecurityTests = @("AuthValidation", "InputSanitization", "AccessControl")
            PerformanceTests = @("ResponseTime", "Memory", "Concurrency")
        }
    }
    PowerShellIntegrationPoints = @(
        "ServiceRequestWorkflow",
        "WindowsIntegration", 
        "SecurityManager",
        "JobScheduler"
    )
    LogPath = "$PSScriptRoot\..\logs\cross-feature-integration.log"
}

<#
.SYNOPSIS
    全Feature統合テスト実行

.PARAMETER FeatureTarget
    テスト対象Feature (All, B, C, E)
#>
function Test-CrossFeatureIntegration {
    param(
        [string]$FeatureTarget = "All"
    )
    
    $integrationResults = @{
        OverallSuccess = $true
        TestedFeatures = @()
        TestResults = @{}
        PowerShellIntegration = @{}
        Issues = @()
        Recommendations = @()
        TestTimestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "Feature間統合テスト開始 - 対象: $FeatureTarget"
        
        # Feature-B (UI/テスト) 連携確認
        if ($FeatureTarget -eq "All" -or $FeatureTarget -eq "B") {
            $featureBResult = Test-FeatureBIntegration
            $integrationResults.TestResults["Feature-B"] = $featureBResult
            $integrationResults.TestedFeatures += "Feature-B"
            
            if (-not $featureBResult.Success) {
                $integrationResults.OverallSuccess = $false
                $integrationResults.Issues += $featureBResult.Issues
            }
        }
        
        # Feature-C (API開発) 連携確認  
        if ($FeatureTarget -eq "All" -or $FeatureTarget -eq "C") {
            $featureCResult = Test-FeatureCIntegration
            $integrationResults.TestResults["Feature-C"] = $featureCResult
            $integrationResults.TestedFeatures += "Feature-C"
            
            if (-not $featureCResult.Success) {
                $integrationResults.OverallSuccess = $false
                $integrationResults.Issues += $featureCResult.Issues
            }
        }
        
        # Feature-E (非機能要件) 連携確認
        if ($FeatureTarget -eq "All" -or $FeatureTarget -eq "E") {
            $featureEResult = Test-FeatureEIntegration
            $integrationResults.TestResults["Feature-E"] = $featureEResult
            $integrationResults.TestedFeatures += "Feature-E"
            
            if (-not $featureEResult.Success) {
                $integrationResults.OverallSuccess = $false
                $integrationResults.Issues += $featureEResult.Issues
            }
        }
        
        # PowerShell統合ポイント確認
        $integrationResults.PowerShellIntegration = Test-PowerShellIntegrationPoints
        
        # 総合評価・推奨事項生成
        $integrationResults.Recommendations = Get-IntegrationRecommendations -Results $integrationResults
        
        Write-LogMessage -Level "INFO" -Message "Feature間統合テスト完了 - 総合結果: $($integrationResults.OverallSuccess)"
        
        return $integrationResults
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "統合テスト実行でエラーが発生しました: $($_.Exception.Message)"
        
        $integrationResults.OverallSuccess = $false
        $integrationResults.Issues += "統合テスト実行エラー: $($_.Exception.Message)"
        
        return $integrationResults
    }
}

<#
.SYNOPSIS
    Feature-B (UI/テスト) 連携確認

.OUTPUTS
    Feature-B連携テスト結果
#>
function Test-FeatureBIntegration {
    $result = @{
        Success = $true
        TestedComponents = @()
        Issues = @()
        Recommendations = @()
        Details = @{}
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "Feature-B (UI/テスト) 連携確認開始"
        
        # 1. React コンポーネント存在確認
        $uiBasePath = "$PSScriptRoot\..\..\src"
        $expectedComponents = @(
            "components\Layout.tsx",
            "pages\AssetPage.tsx", 
            "pages\IncidentPage.tsx",
            "pages\ServiceRequestPage.tsx"
        )
        
        foreach ($component in $expectedComponents) {
            $componentPath = Join-Path $uiBasePath $component
            if (Test-Path $componentPath) {
                $result.TestedComponents += $component
                $result.Details[$component] = "存在確認"
            } else {
                $result.Issues += "コンポーネントが見つかりません: $component"
                $result.Success = $false
            }
        }
        
        # 2. PowerShell連携インターフェース確認
        $integrationInterfaces = @{
            "ServiceRequestApproval" = "承認UI"
            "WorkflowProgress" = "進捗表示UI"
            "PowerShellJobStatus" = "ジョブ状況UI"
        }
        
        foreach ($interface in $integrationInterfaces.Keys) {
            # 実際の実装では、TypeScript型定義やReactコンポーネントの確認
            $result.Details[$interface] = "インターフェース定義済み (仮)"
        }
        
        # 3. テスト統合確認
        $testPath = "$PSScriptRoot\..\tests"
        $integrationTests = @(
            "powershell-security.test.js",
            "service-requests-simple-no-db.test.js"
        )
        
        foreach ($test in $integrationTests) {
            $testFilePath = Join-Path $testPath $test
            if (Test-Path $testFilePath) {
                $result.Details["Test-$test"] = "統合テスト存在"
            } else {
                $result.Issues += "統合テストが見つかりません: $test"
            }
        }
        
        # 4. 推奨事項生成
        if ($result.Issues.Count -eq 0) {
            $result.Recommendations += "UI統合準備完了 - PowerShell結果表示コンポーネント実装を推奨"
        } else {
            $result.Recommendations += "不足しているUIコンポーネントの実装が必要"
        }
        
        Write-LogMessage -Level "INFO" -Message "Feature-B連携確認完了 - 成功: $($result.Success)"
        
    } catch {
        $result.Success = $false
        $result.Issues += "Feature-B連携確認エラー: $($_.Exception.Message)"
        Write-LogMessage -Level "ERROR" -Message $result.Issues[-1]
    }
    
    return $result
}

<#
.SYNOPSIS
    Feature-C (API開発) 連携確認

.OUTPUTS
    Feature-C連携テスト結果
#>
function Test-FeatureCIntegration {
    $result = @{
        Success = $true
        TestedEndpoints = @()
        Issues = @()
        Recommendations = @()
        Details = @{}
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "Feature-C (API開発) 連携確認開始"
        
        # 1. Node.js API ファイル存在確認
        $apiBasePath = "$PSScriptRoot"
        $expectedApis = @(
            "assets.js",
            "incidents.js", 
            "service-requests-enhanced.js",
            "service-requests-integration.js",
            "auth.js"
        )
        
        foreach ($api in $expectedApis) {
            $apiPath = Join-Path $apiBasePath $api
            if (Test-Path $apiPath) {
                $result.TestedEndpoints += $api
                $result.Details[$api] = "API実装確認"
            } else {
                $result.Issues += "APIファイルが見つかりません: $api"
                $result.Success = $false
            }
        }
        
        # 2. PowerShell統合モジュール確認
        $integrationModulePath = Join-Path $apiBasePath "service-requests-integration.js"
        if (Test-Path $integrationModulePath) {
            $moduleContent = Get-Content -Path $integrationModulePath -Raw
            
            # PowerShell実行機能確認
            if ($moduleContent -match "executePowerShellCommand") {
                $result.Details["PowerShellExecution"] = "PowerShell実行機能実装済み"
            } else {
                $result.Issues += "PowerShell実行機能が見つかりません"
                $result.Success = $false
            }
            
            # Windows統合確認
            if ($moduleContent -match "ServiceRequestIntegration") {
                $result.Details["WindowsIntegration"] = "Windows統合クラス実装済み"
            } else {
                $result.Issues += "Windows統合クラスが見つかりません"
            }
        }
        
        # 3. データベーススキーマ統合確認
        $schemaPath = "$PSScriptRoot\..\db\service-requests-enhanced-schema.sql"
        if (Test-Path $schemaPath) {
            $schemaContent = Get-Content -Path $schemaPath -Raw
            
            # PowerShell統合テーブル確認
            $requiredTables = @(
                "windows_integration_jobs",
                "service_request_approvals",
                "service_request_types"
            )
            
            foreach ($table in $requiredTables) {
                if ($schemaContent -match $table) {
                    $result.Details["DB-$table"] = "テーブル定義済み"
                } else {
                    $result.Issues += "データベーステーブルが見つかりません: $table"
                    $result.Success = $false
                }
            }
        } else {
            $result.Issues += "拡張データベーススキーマが見つかりません"
            $result.Success = $false
        }
        
        # 4. 推奨事項生成
        if ($result.Issues.Count -eq 0) {
            $result.Recommendations += "API統合準備完了 - PowerShell実行エンドポイントの本格実装を推奨"
        } else {
            $result.Recommendations += "不足しているAPI統合機能の実装が必要"
        }
        
        Write-LogMessage -Level "INFO" -Message "Feature-C連携確認完了 - 成功: $($result.Success)"
        
    } catch {
        $result.Success = $false
        $result.Issues += "Feature-C連携確認エラー: $($_.Exception.Message)"
        Write-LogMessage -Level "ERROR" -Message $result.Issues[-1]
    }
    
    return $result
}

<#
.SYNOPSIS
    Feature-E (非機能要件) 連携確認

.OUTPUTS
    Feature-E連携テスト結果
#>
function Test-FeatureEIntegration {
    $result = @{
        Success = $true
        TestedAreas = @()
        Issues = @()
        Recommendations = @()
        Details = @{}
    }
    
    try {
        Write-LogMessage -Level "INFO" -Message "Feature-E (非機能要件) 連携確認開始"
        
        # 1. セキュリティ統合確認
        $securityManagerPath = "$PSScriptRoot\PowerShellSecurityManager.ps1"
        if (Test-Path $securityManagerPath) {
            $result.TestedAreas += "Security"
            $result.Details["SecurityManager"] = "PowerShellセキュリティ管理実装済み"
            
            # セキュリティ機能詳細確認
            $securityContent = Get-Content -Path $securityManagerPath -Raw
            $securityFeatures = @(
                "Test-ScriptSecurity" = "スクリプトセキュリティ検証",
                "Write-SecurityAuditLog" = "セキュリティ監査ログ",
                "Test-ModuleSecurity" = "モジュールセキュリティ検証"
            )
            
            foreach ($feature in $securityFeatures.Keys) {
                if ($securityContent -match $feature) {
                    $result.Details["Security-$feature"] = $securityFeatures[$feature]
                } else {
                    $result.Issues += "セキュリティ機能が見つかりません: $feature"
                }
            }
        } else {
            $result.Issues += "PowerShellセキュリティマネージャーが見つかりません"
            $result.Success = $false
        }
        
        # 2. パフォーマンス監視統合確認
        $jobSchedulerPath = "$PSScriptRoot\PowerShellJobScheduler.ps1"
        if (Test-Path $jobSchedulerPath) {
            $result.TestedAreas += "Performance"
            $result.Details["JobScheduler"] = "PowerShellジョブスケジューラー実装済み"
            
            # パフォーマンス機能確認
            $jobContent = Get-Content -Path $jobSchedulerPath -Raw
            if ($jobContent -match "MaxConcurrentJobs") {
                $result.Details["Performance-Concurrency"] = "同時実行制限実装済み"
            }
            if ($jobContent -match "TimeoutMinutes") {
                $result.Details["Performance-Timeout"] = "タイムアウト制御実装済み"
            }
        } else {
            $result.Issues += "PowerShellジョブスケジューラーが見つかりません"
        }
        
        # 3. 品質保証統合確認
        $qualityTestPath = "$PSScriptRoot\..\tests\powershell-security.test.js"
        if (Test-Path $qualityTestPath) {
            $result.TestedAreas += "Quality"
            $result.Details["QualityTests"] = "PowerShell品質テスト実装済み"
        } else {
            $result.Issues += "PowerShell品質テストが見つかりません"
        }
        
        # 4. 監視統合確認
        $logPath = "$PSScriptRoot\..\logs"
        if (Test-Path $logPath) {
            $result.TestedAreas += "Monitoring"
            $result.Details["Logging"] = "ログ出力ディレクトリ確認済み"
        } else {
            $result.Issues += "ログ出力ディレクトリが見つかりません"
        }
        
        # 5. 推奨事項生成
        if ($result.Issues.Count -eq 0) {
            $result.Recommendations += "非機能要件統合準備完了 - リアルタイム監視ダッシュボード実装を推奨"
        } else {
            $result.Recommendations += "不足している非機能要件統合の実装が必要"
        }
        
        Write-LogMessage -Level "INFO" -Message "Feature-E連携確認完了 - 成功: $($result.Success)"
        
    } catch {
        $result.Success = $false
        $result.Issues += "Feature-E連携確認エラー: $($_.Exception.Message)"
        Write-LogMessage -Level "ERROR" -Message $result.Issues[-1]
    }
    
    return $result
}

<#
.SYNOPSIS
    PowerShell統合ポイント確認

.OUTPUTS
    PowerShell統合状況
#>
function Test-PowerShellIntegrationPoints {
    $integrationPoints = @{}
    
    foreach ($point in $script:IntegrationConfig.PowerShellIntegrationPoints) {
        $integrationPoints[$point] = @{
            Status = "Unknown"
            Details = @()
            Issues = @()
        }
        
        switch ($point) {
            "ServiceRequestWorkflow" {
                $workflowPath = "$PSScriptRoot\ServiceRequestWorkflow.ps1"
                if (Test-Path $workflowPath) {
                    $integrationPoints[$point].Status = "Implemented"
                    $integrationPoints[$point].Details += "承認ワークフロー機能実装済み"
                } else {
                    $integrationPoints[$point].Status = "Missing"
                    $integrationPoints[$point].Issues += "ワークフローファイルが見つかりません"
                }
            }
            "WindowsIntegration" {
                $integrationPath = "$PSScriptRoot\ServiceRequestIntegration.ps1"
                if (Test-Path $integrationPath) {
                    $integrationPoints[$point].Status = "Implemented"
                    $integrationPoints[$point].Details += "Windows統合機能実装済み"
                } else {
                    $integrationPoints[$point].Status = "Missing"
                    $integrationPoints[$point].Issues += "Windows統合ファイルが見つかりません"
                }
            }
            "SecurityManager" {
                $securityPath = "$PSScriptRoot\PowerShellSecurityManager.ps1"
                if (Test-Path $securityPath) {
                    $integrationPoints[$point].Status = "Implemented"
                    $integrationPoints[$point].Details += "セキュリティ管理機能実装済み"
                } else {
                    $integrationPoints[$point].Status = "Missing"
                    $integrationPoints[$point].Issues += "セキュリティマネージャーが見つかりません"
                }
            }
            "JobScheduler" {
                $schedulerPath = "$PSScriptRoot\PowerShellJobScheduler.ps1"
                if (Test-Path $schedulerPath) {
                    $integrationPoints[$point].Status = "Implemented"
                    $integrationPoints[$point].Details += "ジョブスケジューラー実装済み"
                } else {
                    $integrationPoints[$point].Status = "Missing"
                    $integrationPoints[$point].Issues += "ジョブスケジューラーが見つかりません"
                }
            }
        }
    }
    
    return $integrationPoints
}

<#
.SYNOPSIS
    統合テスト結果に基づく推奨事項生成

.PARAMETER Results
    統合テスト結果

.OUTPUTS
    推奨事項配列
#>
function Get-IntegrationRecommendations {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Results
    )
    
    $recommendations = @()
    
    # 全体的な成功率評価
    $successCount = ($Results.TestResults.Values | Where-Object { $_.Success }).Count
    $totalCount = $Results.TestResults.Count
    
    if ($totalCount -gt 0) {
        $successRate = [math]::Round(($successCount / $totalCount) * 100, 2)
        
        if ($successRate -eq 100) {
            $recommendations += "🎉 全Feature統合テスト完全成功！本格実装フェーズへ移行可能"
        } elseif ($successRate -ge 80) {
            $recommendations += "⚡ 統合テスト高成功率($successRate%) - 残課題解決後、部分実装開始推奨"
        } elseif ($successRate -ge 60) {
            $recommendations += "🔧 統合テスト中程度成功率($successRate%) - 主要課題解決に注力"
        } else {
            $recommendations += "🚨 統合テスト低成功率($successRate%) - 基盤実装の見直しが必要"
        }
    }
    
    # PowerShell統合ポイント評価
    $psImplementedCount = ($Results.PowerShellIntegration.Values | Where-Object { $_.Status -eq "Implemented" }).Count
    $psTotalCount = $Results.PowerShellIntegration.Count
    
    if ($psTotalCount -gt 0) {
        $psRate = [math]::Round(($psImplementedCount / $psTotalCount) * 100, 2)
        if ($psRate -eq 100) {
            $recommendations += "✅ PowerShell統合基盤完全実装 - 高度な機能実装を推奨"
        } else {
            $recommendations += "🔨 PowerShell統合基盤($psRate%実装) - 残り統合ポイントの実装推奨"
        }
    }
    
    # 具体的な改善提案
    $recommendations += "📈 次期優先実装: リアルタイム監視ダッシュボード・AI支援承認機能"
    $recommendations += "🔗 Feature間API統合の強化・エンドツーエンドテストの拡張"
    
    return $recommendations
}

# ログ記録用関数
function Write-LogMessage {
    param(
        [string]$Level = "INFO",
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    $logPath = $script:IntegrationConfig.LogPath
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    Add-Content -Path $logPath -Value $logMessage -Encoding UTF8
    Write-Host $logMessage
}

# メイン実行ロジック
switch ($Action) {
    "TestIntegration" {
        $result = Test-CrossFeatureIntegration -FeatureTarget $FeatureTarget
        if ($DetailedReport) {
            $result | ConvertTo-Json -Depth 5
        } else {
            @{
                OverallSuccess = $result.OverallSuccess
                TestedFeatures = $result.TestedFeatures
                IssuesCount = $result.Issues.Count
                Recommendations = $result.Recommendations[0..2]  # 上位3件
            } | ConvertTo-Json -Depth 3
        }
    }
    "TestFeatureB" {
        $result = Test-FeatureBIntegration
        $result | ConvertTo-Json -Depth 3
    }
    "TestFeatureC" {
        $result = Test-FeatureCIntegration
        $result | ConvertTo-Json -Depth 3
    }
    "TestFeatureE" {
        $result = Test-FeatureEIntegration
        $result | ConvertTo-Json -Depth 3
    }
    "TestPowerShell" {
        $result = Test-PowerShellIntegrationPoints
        $result | ConvertTo-Json -Depth 3
    }
    default {
        @{
            Error = "未対応のアクション: $Action"
            AvailableActions = @("TestIntegration", "TestFeatureB", "TestFeatureC", "TestFeatureE", "TestPowerShell")
        } | ConvertTo-Json
    }
}