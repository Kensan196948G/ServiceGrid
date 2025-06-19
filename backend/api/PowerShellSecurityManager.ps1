# PowerShellSecurityManager.ps1 - PowerShell実行セキュリティ管理
# ITSM統合システム用 - 企業級セキュリティ対応
# Version: 2.0.0

param(
    [Parameter(Mandatory)]
    [string]$Action,
    
    [string]$ScriptPath = "",
    [string]$ScriptContent = "",
    [string]$ExecutionPolicy = "Restricted",
    [string]$UserContext = "System",
    [hashtable]$Parameters = @{},
    [switch]$EnableLogging = $true,
    [switch]$SandboxMode = $false
)

# セキュリティ設定
$script:SecurityConfig = @{
    AllowedModules = @(
        'ActiveDirectory', 'Microsoft.Graph', 'ExchangeOnlineManagement',
        'Az.Accounts', 'Az.Resources', 'PnP.PowerShell'
    )
    BlockedCommands = @(
        'Invoke-Expression', 'Invoke-Command', 'Start-Process', 
        'New-Object', 'Add-Type', 'Import-Module'
    )
    MaxExecutionTime = 300  # 5分
    MaxMemoryUsage = 512MB
    AllowedFilePaths = @(
        "$PSScriptRoot\..\api\*.ps1",
        "$PSScriptRoot\..\modules\*.psm1",
        "$PSScriptRoot\..\jobs\*.ps1"
    )
    RequiredSignature = $false  # 開発環境用
    AuditLogPath = "$PSScriptRoot\..\logs\powershell-security.log"
}

<#
.SYNOPSIS
    PowerShellスクリプト実行前のセキュリティ検証

.PARAMETER ScriptPath
    実行対象スクリプトのパス

.PARAMETER ScriptContent
    実行対象スクリプトの内容
#>
function Test-ScriptSecurity {
    param(
        [string]$ScriptPath,
        [string]$ScriptContent
    )
    
    $securityResult = @{
        IsSecure = $true
        Warnings = @()
        Errors = @()
        RiskLevel = "Low"
    }
    
    try {
        # 1. ファイルパス検証
        if ($ScriptPath) {
            $isAllowedPath = $false
            foreach ($allowedPath in $script:SecurityConfig.AllowedFilePaths) {
                if ($ScriptPath -like $allowedPath) {
                    $isAllowedPath = $true
                    break
                }
            }
            
            if (-not $isAllowedPath) {
                $securityResult.Errors += "許可されていないパスからの実行: $ScriptPath"
                $securityResult.IsSecure = $false
                $securityResult.RiskLevel = "High"
            }
        }
        
        # 2. スクリプト内容分析
        if ($ScriptContent) {
            # 危険なコマンドチェック
            foreach ($blockedCmd in $script:SecurityConfig.BlockedCommands) {
                if ($ScriptContent -match $blockedCmd) {
                    $securityResult.Warnings += "潜在的に危険なコマンド検出: $blockedCmd"
                    $securityResult.RiskLevel = "Medium"
                }
            }
            
            # 外部接続チェック
            if ($ScriptContent -match "Invoke-WebRequest|Invoke-RestMethod|New-WebServiceProxy") {
                $securityResult.Warnings += "外部ネットワーク接続が検出されました"
                $securityResult.RiskLevel = "Medium"
            }
            
            # ファイルシステム操作チェック
            if ($ScriptContent -match "Remove-Item|Delete|rm\s") {
                $securityResult.Warnings += "ファイル削除操作が検出されました"
            }
            
            # レジストリ操作チェック
            if ($ScriptContent -match "New-ItemProperty|Set-ItemProperty|Remove-ItemProperty") {
                $securityResult.Warnings += "レジストリ操作が検出されました"
                $securityResult.RiskLevel = "Medium"
            }
        }
        
        # 3. デジタル署名確認 (本番環境用)
        if ($script:SecurityConfig.RequiredSignature -and $ScriptPath) {
            $signature = Get-AuthenticodeSignature -FilePath $ScriptPath
            if ($signature.Status -ne "Valid") {
                $securityResult.Errors += "有効なデジタル署名が見つかりません"
                $securityResult.IsSecure = $false
                $securityResult.RiskLevel = "High"
            }
        }
        
        return $securityResult
        
    } catch {
        Write-LogMessage -Level "ERROR" -Message "セキュリティ検証でエラーが発生しました: $($_.Exception.Message)"
        return @{
            IsSecure = $false
            Errors = @("セキュリティ検証処理エラー: $($_.Exception.Message)")
            RiskLevel = "High"
        }
    }
}

<#
.SYNOPSIS
    安全なPowerShellスクリプト実行

.PARAMETER ScriptPath
    実行するスクリプトのパス

.PARAMETER Parameters
    スクリプトに渡すパラメータ

.PARAMETER SandboxMode
    サンドボックスモードで実行
#>
function Invoke-SecurePowerShellScript {
    param(
        [Parameter(Mandatory)]
        [string]$ScriptPath,
        
        [hashtable]$Parameters = @{},
        [switch]$SandboxMode,
        [string]$ExecutionContext = "System"
    )
    
    $executionResult = @{
        Success = $false
        Output = $null
        Error = $null
        ExecutionTime = 0
        SecurityInfo = $null
    }
    
    $startTime = Get-Date
    
    try {
        # 1. セキュリティ検証
        Write-LogMessage -Level "INFO" -Message "PowerShellスクリプト実行開始: $ScriptPath"
        
        $scriptContent = Get-Content -Path $ScriptPath -Raw -ErrorAction SilentlyContinue
        $securityCheck = Test-ScriptSecurity -ScriptPath $ScriptPath -ScriptContent $scriptContent
        
        $executionResult.SecurityInfo = $securityCheck
        
        if (-not $securityCheck.IsSecure) {
            $executionResult.Error = "セキュリティ検証に失敗しました: $($securityCheck.Errors -join ', ')"
            return $executionResult
        }
        
        # 2. 実行ポリシー設定
        $originalPolicy = Get-ExecutionPolicy
        if ($ExecutionPolicy -and $ExecutionPolicy -ne $originalPolicy) {
            Set-ExecutionPolicy -ExecutionPolicy $ExecutionPolicy -Scope Process -Force
        }
        
        # 3. サンドボックスモード設定
        if ($SandboxMode) {
            # 制限されたランスペースで実行
            $runspace = [runspacefactory]::CreateRunspace()
            $runspace.Open()
            
            # 危険なコマンドレットを削除
            foreach ($blockedCmd in $script:SecurityConfig.BlockedCommands) {
                try {
                    $runspace.SessionStateProxy.InvokeCommand.RemoveCommand($blockedCmd, $false)
                } catch {
                    # コマンドが存在しない場合は無視
                }
            }
        }
        
        # 4. パラメータ準備
        $paramString = ""
        if ($Parameters.Count -gt 0) {
            $paramArray = @()
            foreach ($key in $Parameters.Keys) {
                $value = $Parameters[$key]
                if ($value -is [string]) {
                    $paramArray += "-$key `"$value`""
                } else {
                    $paramArray += "-$key $value"
                }
            }
            $paramString = $paramArray -join " "
        }
        
        # 5. スクリプト実行
        $executeCommand = "& `"$ScriptPath`" $paramString"
        
        if ($SandboxMode -and $runspace) {
            $powershell = [powershell]::Create()
            $powershell.Runspace = $runspace
            $powershell.AddScript($executeCommand)
            
            $asyncResult = $powershell.BeginInvoke()
            $completed = $asyncResult.AsyncWaitHandle.WaitOne($script:SecurityConfig.MaxExecutionTime * 1000)
            
            if ($completed) {
                $executionResult.Output = $powershell.EndInvoke($asyncResult)
                $executionResult.Success = $powershell.Streams.Error.Count -eq 0
                
                if ($powershell.Streams.Error.Count -gt 0) {
                    $executionResult.Error = $powershell.Streams.Error[0].ToString()
                }
            } else {
                $powershell.Stop()
                $executionResult.Error = "スクリプト実行がタイムアウトしました"
            }
            
            $powershell.Dispose()
            $runspace.Close()
            
        } else {
            # 通常実行 (安全な文字列実行)
            $job = Start-Job -ScriptBlock {
                param($ScriptPath, $ParamString)
                # Invoke-Expressionの代わりに安全なドット呼び出しを使用
                & $ScriptPath @(if ($ParamString) { $ParamString.Split(' ') })
            } -ArgumentList $ScriptPath, $paramString
            
            $completed = Wait-Job -Job $job -Timeout $script:SecurityConfig.MaxExecutionTime
            
            if ($completed) {
                $executionResult.Output = Receive-Job -Job $job
                $executionResult.Success = $job.State -eq "Completed"
                
                if ($job.State -eq "Failed") {
                    $executionResult.Error = $job.ChildJobs[0].JobStateInfo.Reason.Message
                }
            } else {
                Stop-Job -Job $job
                $executionResult.Error = "スクリプト実行がタイムアウトしました"
            }
            
            Remove-Job -Job $job -Force
        }
        
        # 6. 実行ポリシー復元
        if ($ExecutionPolicy -and $ExecutionPolicy -ne $originalPolicy) {
            Set-ExecutionPolicy -ExecutionPolicy $originalPolicy -Scope Process -Force
        }
        
    } catch {
        $executionResult.Error = "スクリプト実行でエラーが発生しました: $($_.Exception.Message)"
        Write-LogMessage -Level "ERROR" -Message $executionResult.Error
    } finally {
        $executionResult.ExecutionTime = (Get-Date) - $startTime
        
        # 実行ログ記録
        Write-SecurityAuditLog -Action "POWERSHELL_EXECUTION" -ScriptPath $ScriptPath -Result $executionResult -ExecutionContext $ExecutionContext
    }
    
    return $executionResult
}

<#
.SYNOPSIS
    PowerShell実行のセキュリティ監査ログ記録

.PARAMETER Action
    実行されたアクション

.PARAMETER ScriptPath
    実行されたスクリプトのパス

.PARAMETER Result
    実行結果

.PARAMETER ExecutionContext
    実行コンテキスト
#>
function Write-SecurityAuditLog {
    param(
        [Parameter(Mandatory)]
        [string]$Action,
        
        [string]$ScriptPath,
        [hashtable]$Result,
        [string]$ExecutionContext
    )
    
    try {
        $logEntry = @{
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            Action = $Action
            ScriptPath = $ScriptPath
            ExecutionContext = $ExecutionContext
            Success = $Result.Success
            ExecutionTime = $Result.ExecutionTime.TotalSeconds
            SecurityRisk = $Result.SecurityInfo.RiskLevel
            User = $env:USERNAME
            Computer = $env:COMPUTERNAME
            ProcessId = $PID
        }
        
        if ($Result.Error) {
            $logEntry.Error = $Result.Error
        }
        
        $logJson = $logEntry | ConvertTo-Json -Compress
        
        # ログファイルに記録
        $logPath = $script:SecurityConfig.AuditLogPath
        if (-not (Test-Path (Split-Path $logPath))) {
            New-Item -Path (Split-Path $logPath) -ItemType Directory -Force | Out-Null
        }
        
        Add-Content -Path $logPath -Value $logJson -Encoding UTF8
        
        # 重要度が高い場合はイベントログにも記録
        if ($Result.SecurityInfo.RiskLevel -in @("High", "Critical")) {
            try {
                Write-EventLog -LogName "Application" -Source "ITSM-PowerShell" -EventId 1001 -EntryType Warning -Message "高リスクPowerShell実行: $ScriptPath"
            } catch {
                # イベントログ記録に失敗しても処理を継続
            }
        }
        
    } catch {
        Write-Warning "セキュリティ監査ログの記録に失敗しました: $($_.Exception.Message)"
    }
}

<#
.SYNOPSIS
    PowerShellモジュールのセキュリティ検証

.PARAMETER ModuleName
    検証するモジュール名
#>
function Test-ModuleSecurity {
    param(
        [Parameter(Mandatory)]
        [string]$ModuleName
    )
    
    # 許可されたモジュールかチェック
    if ($ModuleName -in $script:SecurityConfig.AllowedModules) {
        return @{
            IsAllowed = $true
            RiskLevel = "Low"
            Message = "許可されたモジュールです"
        }
    }
    
    # Microsoft製モジュールのチェック
    $module = Get-Module -Name $ModuleName -ListAvailable | Select-Object -First 1
    if ($module -and $module.CompanyName -like "*Microsoft*") {
        return @{
            IsAllowed = $true
            RiskLevel = "Low"
            Message = "Microsoft製モジュールです"
        }
    }
    
    return @{
        IsAllowed = $false
        RiskLevel = "High"
        Message = "許可されていないモジュールです"
    }
}

<#
.SYNOPSIS
    システムリソース使用量監視

.PARAMETER ProcessId
    監視対象プロセスID
#>
function Watch-SystemResources {
    param(
        [int]$ProcessId = $PID
    )
    
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($process) {
            $memoryUsage = $process.WorkingSet64
            $cpuTime = $process.TotalProcessorTime
            
            if ($memoryUsage -gt $script:SecurityConfig.MaxMemoryUsage) {
                Write-Warning "メモリ使用量が制限を超えています: $([math]::Round($memoryUsage/1MB, 2))MB"
                return $false
            }
            
            return $true
        }
        return $false
    } catch {
        Write-Warning "リソース監視でエラーが発生しました: $($_.Exception.Message)"
        return $false
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
    
    if ($script:SecurityConfig.AuditLogPath) {
        Add-Content -Path $script:SecurityConfig.AuditLogPath -Value $logMessage -Encoding UTF8
    }
    
    Write-Host $logMessage
}

# メイン実行ロジック
switch ($Action) {
    "TestSecurity" {
        $result = Test-ScriptSecurity -ScriptPath $ScriptPath -ScriptContent $ScriptContent
        $result | ConvertTo-Json -Depth 3
    }
    "ExecuteSecure" {
        $result = Invoke-SecurePowerShellScript -ScriptPath $ScriptPath -Parameters $Parameters -SandboxMode:$SandboxMode
        $result | ConvertTo-Json -Depth 3
    }
    "TestModule" {
        $result = Test-ModuleSecurity -ModuleName $Parameters.ModuleName
        $result | ConvertTo-Json -Depth 3
    }
    "WatchResources" {
        $result = Watch-SystemResources -ProcessId $Parameters.ProcessId
        @{ ResourcesOK = $result } | ConvertTo-Json
    }
    default {
        @{
            Error = "未対応のアクション: $Action"
            AvailableActions = @("TestSecurity", "ExecuteSecure", "TestModule", "WatchResources")
        } | ConvertTo-Json
    }
}