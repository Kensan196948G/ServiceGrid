# AIAssistanceEngine.ps1 - AI支援機能エンジン
# ITSM統合システム用 機械学習・承認予測・異常検知
# Version: 2.0.0

param(
    [Parameter(Mandatory)]
    [string]$Action,
    
    [hashtable]$RequestData = @{},
    [string]$ModelType = "ServiceRequestPrediction",
    [int]$ConfidenceThreshold = 70,
    [switch]$EnableLogging = $true
)

# AI支援設定
$script:AIConfig = @{
    ModelEndpoint = "http://localhost:11434/api/generate"  # Ollama local endpoint
    Models = @{
        ServiceRequestPrediction = "llama3.2"
        AnomalyDetection = "llama3.2"
        ApprovalPrediction = "llama3.2"
        RiskAssessment = "llama3.2"
    }
    LogPath = "$PSScriptRoot\..\logs\ai-assistance.log"
    CachePath = "$PSScriptRoot\..\cache\ai-predictions.json"
    DefaultTimeout = 30
    MaxRetries = 3
}

<#
.SYNOPSIS
    サービス要求の自動分類・優先度予測

.PARAMETER RequestData
    サービス要求データ

.OUTPUTS
    分類・優先度予測結果
#>
function Invoke-ServiceRequestPrediction {
    param(
        [Parameter(Mandatory)]
        [hashtable]$RequestData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "サービス要求予測分析開始"
        
        # プロンプト構築
        $prompt = @"
以下のサービス要求を分析し、最適な分類と優先度を予測してください。

要求詳細:
- タイトル: $($RequestData.title)
- 説明: $($RequestData.description)
- 要求者: $($RequestData.requester)
- 部署: $($RequestData.department)
- 緊急度: $($RequestData.urgency)

分析項目:
1. カテゴリ分類 (user_creation, group_access, software_install, password_reset, hardware_request, other)
2. 優先度 (Low, Medium, High, Critical)
3. 推定処理時間 (時間)
4. 必要な承認レベル (自動, 管理者, 部門長)
5. リスクレベル (Low, Medium, High)

JSON形式で回答してください:
{
  "category": "予測カテゴリ",
  "priority": "予測優先度", 
  "estimatedHours": 予測時間,
  "approvalLevel": "必要承認レベル",
  "riskLevel": "リスクレベル",
  "confidence": 信頼度パーセント,
  "reasoning": "判断理由"
}
"@

        # AI予測実行
        $prediction = Invoke-AIModel -Prompt $prompt -ModelType $ModelType
        
        if ($prediction) {
            Write-LogMessage -Level "INFO" -Message "サービス要求予測完了: カテゴリ=$($prediction.category), 優先度=$($prediction.priority)"
            
            return @{
                Success = $true
                Prediction = $prediction
                Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
                ModelUsed = $script:AIConfig.Models[$ModelType]
            }
        } else {
            return @{
                Success = $false
                Error = "AI予測の生成に失敗しました"
            }
        }
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "サービス要求予測でエラーが発生しました: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    承認パターン学習・予測

.PARAMETER ApprovalData
    過去の承認データ

.OUTPUTS
    承認予測結果
#>
function Invoke-ApprovalPrediction {
    param(
        [Parameter(Mandatory)]
        [hashtable]$ApprovalData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "承認予測分析開始"
        
        $prompt = @"
以下の承認要求について、過去のパターンを基に承認予測を行ってください。

承認要求詳細:
- 要求種別: $($ApprovalData.requestType)
- 金額: $($ApprovalData.amount)
- 要求者役職: $($ApprovalData.requesterLevel)
- 部署: $($ApprovalData.department)
- 緊急度: $($ApprovalData.urgency)
- 過去承認率: $($ApprovalData.historicalApprovalRate)%

予測項目:
1. 承認確率 (0-100%)
2. 予想承認者 (部門長, 取締役, CFO)
3. 承認までの予想日数
4. 条件付き承認の可能性
5. 追加情報要求の可能性

JSON形式で回答:
{
  "approvalProbability": 承認確率,
  "expectedApprover": "予想承認者",
  "estimatedDays": 予想日数,
  "conditionalApprovalRisk": リスクパーセント,
  "additionalInfoRequired": true/false,
  "confidence": 信頼度,
  "recommendation": "推奨アクション"
}
"@

        $prediction = Invoke-AIModel -Prompt $prompt -ModelType "ApprovalPrediction"
        
        if ($prediction) {
            Write-LogMessage -Level "INFO" -Message "承認予測完了: 承認確率=$($prediction.approvalProbability)%"
            
            return @{
                Success = $true
                Prediction = $prediction
                Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            }
        } else {
            return @{
                Success = $false
                Error = "承認予測の生成に失敗しました"
            }
        }
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "承認予測でエラーが発生しました: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    異常検知・パターン分析

.PARAMETER SystemData
    システム運用データ

.OUTPUTS
    異常検知結果
#>
function Invoke-AnomalyDetection {
    param(
        [Parameter(Mandatory)]
        [hashtable]$SystemData
    )
    
    try {
        Write-LogMessage -Level "INFO" -Message "異常検知分析開始"
        
        $prompt = @"
以下のシステム運用データを分析し、異常や潜在的な問題を検知してください。

運用データ:
- 時間帯: $($SystemData.timeframe)
- 要求件数: $($SystemData.requestCount)
- 平均処理時間: $($SystemData.avgProcessingTime)分
- エラー率: $($SystemData.errorRate)%
- ユーザー数: $($SystemData.userCount)
- システム負荷: $($SystemData.systemLoad)%

分析項目:
1. 異常レベル (Normal, Warning, Critical)
2. 検出された異常パターン
3. 推定原因
4. 推奨対処法
5. 今後の予測

JSON形式で回答:
{
  "anomalyLevel": "異常レベル",
  "detectedPatterns": ["パターン1", "パターン2"],
  "estimatedCause": "推定原因",
  "recommendations": ["対処法1", "対処法2"],
  "futureRisk": "将来リスク",
  "confidence": 信頼度,
  "alertRequired": true/false
}
"@

        $detection = Invoke-AIModel -Prompt $prompt -ModelType "AnomalyDetection"
        
        if ($detection) {
            Write-LogMessage -Level "INFO" -Message "異常検知完了: レベル=$($detection.anomalyLevel)"
            
            # 重要な異常の場合はアラート生成
            if ($detection.alertRequired -eq $true) {
                Send-AnomalyAlert -Detection $detection
            }
            
            return @{
                Success = $true
                Detection = $detection
                Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
                AlertSent = $detection.alertRequired
            }
        } else {
            return @{
                Success = $false
                Error = "異常検知の実行に失敗しました"
            }
        }
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "異常検知でエラーが発生しました: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    AIモデル実行（Ollama/ローカルLLM）

.PARAMETER Prompt
    AIモデルへのプロンプト

.PARAMETER ModelType
    使用するモデルタイプ

.OUTPUTS
    AI応答結果
#>
function Invoke-AIModel {
    param(
        [Parameter(Mandatory)]
        [string]$Prompt,
        
        [string]$ModelType = "ServiceRequestPrediction"
    )
    
    try {
        $modelName = $script:AIConfig.Models[$ModelType]
        
        # Ollamaリクエスト構築
        $requestBody = @{
            model = $modelName
            prompt = $Prompt
            stream = $false
            options = @{
                temperature = 0.7
                max_tokens = 1000
            }
        } | ConvertTo-Json -Depth 3
        
        # AI APIコール
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $script:AIConfig.ModelEndpoint -Method POST -Body $requestBody -Headers $headers -TimeoutSec $script:AIConfig.DefaultTimeout
        
        # JSON応答の解析
        if ($response.response) {
            try {
                # JSON形式の応答を解析
                $jsonMatch = [regex]::Match($response.response, '\{.*\}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                if ($jsonMatch.Success) {
                    $jsonResult = $jsonMatch.Value | ConvertFrom-Json
                    return $jsonResult
                } else {
                    Write-LogMessage -Level "WARN" -Message "JSON形式の応答が見つかりませんでした"
                    return $null
                }
            } catch {
                Write-LogMessage -Level "ERROR" -Message "JSON解析エラー: $($_.Exception.Message)"
                return $null
            }
        }
        
        return $null
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "AIモデル実行でエラーが発生しました: $($_.Exception.Message)"
        return $null
    }
}

<#
.SYNOPSIS
    異常アラート送信

.PARAMETER Detection
    検知結果
#>
function Send-AnomalyAlert {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Detection
    )
    
    try {
        Write-LogMessage -Level "WARN" -Message "異常アラート送信: $($Detection.anomalyLevel)"
        
        # アラート通知の実装（メール・Teams・ログ等）
        $alertMessage = @"
【ITSM異常検知アラート】

異常レベル: $($Detection.anomalyLevel)
検出時刻: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
検出パターン: $($Detection.detectedPatterns -join ", ")
推定原因: $($Detection.estimatedCause)
推奨対処: $($Detection.recommendations -join ", ")

詳細は管理画面でご確認ください。
"@
        
        # 実際の環境では、メール送信やTeams通知を実装
        Write-LogMessage -Level "ALERT" -Message $alertMessage
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "アラート送信でエラーが発生しました: $($_.Exception.Message)"
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
    
    $logPath = $script:AIConfig.LogPath
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    Add-Content -Path $logPath -Value $logMessage -Encoding UTF8
    Write-Host $logMessage
}

# メイン実行ロジック
switch ($Action) {
    "PredictServiceRequest" {
        $result = Invoke-ServiceRequestPrediction -RequestData $RequestData
        $result | ConvertTo-Json -Depth 3
    }
    "PredictApproval" {
        $result = Invoke-ApprovalPrediction -ApprovalData $RequestData
        $result | ConvertTo-Json -Depth 3
    }
    "DetectAnomalies" {
        $result = Invoke-AnomalyDetection -SystemData $RequestData
        $result | ConvertTo-Json -Depth 3
    }
    "TestModel" {
        # テスト用のダミーデータで動作確認
        $testData = @{
            title = "新規ユーザーアカウント作成"
            description = "営業部の新入社員用にActive Directoryアカウントを作成してください"
            requester = "田中太郎"
            department = "営業部"
            urgency = "Medium"
        }
        $result = Invoke-ServiceRequestPrediction -RequestData $testData
        $result | ConvertTo-Json -Depth 3
    }
    default {
        @{
            Error = "未対応のアクション: $Action"
            AvailableActions = @("PredictServiceRequest", "PredictApproval", "DetectAnomalies", "TestModel")
        } | ConvertTo-Json
    }
}