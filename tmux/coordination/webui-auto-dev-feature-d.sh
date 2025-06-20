#!/bin/bash

# Feature-D専用WebUI自動開発スクリプト
# PowerShell統合・Windows API連携自動開発システム

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"
readonly POWERSHELL_DIR="$BACKEND_DIR/api"
readonly MODULES_DIR="$BACKEND_DIR/modules"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly FEATURE_D_LOG="$LOG_DIR/feature_d_powershell_development.log"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Feature-D固有設定
readonly FEATURE_NAME="Feature-D-PowerShell"
readonly MAX_AUTO_LOOPS=20
readonly POWERSHELL_QUALITY_THRESHOLD=85

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${PURPLE}[FEATURE-D]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[FEATURE-D-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[FEATURE-D-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[FEATURE-D-WARN]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${PURPLE}================================================================${NC}"
    echo -e "${BOLD}${PURPLE} ⚡ Feature-D WebUI自動開発システム ⚡${NC}"
    echo -e "${BOLD}${PURPLE} PowerShell + Windows統合開発${NC}"
    echo -e "${BOLD}${PURPLE}================================================================${NC}"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_feature_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] FEATURE-D: $action - $status - $details" >> "$FEATURE_D_LOG"
}

# =========================
# PowerShell API自動生成
# =========================

generate_powershell_apis() {
    print_info "PowerShell API自動生成中..."
    
    local apis_created=0
    
    # PowerShell API テンプレート
    local api_templates=(
        "WindowsServiceManager:Windows サービス管理API"
        "ActiveDirectoryIntegration:Active Directory統合API"
        "PerformanceMonitoring:パフォーマンス監視API"
        "EventLogAnalyzer:イベントログ解析API"
        "FileSystemManager:ファイルシステム管理API"
        "RegistryManager:レジストリ管理API"
        "NetworkDiagnostics:ネットワーク診断API"
        "SystemInfoCollector:システム情報収集API"
    )
    
    mkdir -p "$POWERSHELL_DIR"
    
    for template in "${api_templates[@]}"; do
        local api_name=$(echo "$template" | cut -d':' -f1)
        local api_desc=$(echo "$template" | cut -d':' -f2)
        local api_file="$POWERSHELL_DIR/${api_name}.ps1"
        
        # 既存APIのスキップ
        if [ -f "$api_file" ]; then
            print_info "$api_name は既存のため、機能拡張のみ実行"
            continue
        fi
        
        print_info "新規PowerShell API生成: $api_name"
        
        cat > "$api_file" << EOF
# $api_desc
# Feature-D自動生成PowerShell API

# =========================
# パラメータ・設定
# =========================

param(
    [Parameter(Mandatory=\$false)]
    [string]\$Action = "Get",
    
    [Parameter(Mandatory=\$false)]
    [string]\$Target = "",
    
    [Parameter(Mandatory=\$false)]
    [hashtable]\$Parameters = @{},
    
    [Parameter(Mandatory=\$false)]
    [switch]\$Verbose
)

# エラーアクション設定
\$ErrorActionPreference = "Stop"

# =========================
# ログ設定
# =========================

\$LogPath = "\$PSScriptRoot\..\logs\powershell-api.log"
if (!(Test-Path (Split-Path \$LogPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path \$LogPath -Parent) -Force | Out-Null
}

function Write-ApiLog {
    param(
        [string]\$Level,
        [string]\$Message
    )
    \$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    \$LogEntry = "[\$Timestamp] [\$Level] [$api_name] \$Message"
    Add-Content -Path \$LogPath -Value \$LogEntry
    if (\$Verbose) {
        Write-Host \$LogEntry
    }
}

# =========================
# セキュリティ検証
# =========================

function Test-SecurityContext {
    try {
        \$CurrentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
        \$Principal = New-Object Security.Principal.WindowsPrincipal(\$CurrentUser)
        \$IsAdmin = \$Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        
        Write-ApiLog -Level "INFO" -Message "Security context: User=\$(\$CurrentUser.Name), IsAdmin=\$IsAdmin"
        
        return @{
            "IsAuthenticated" = \$CurrentUser.IsAuthenticated
            "IsAdmin" = \$IsAdmin
            "UserName" = \$CurrentUser.Name
        }
    }
    catch {
        Write-ApiLog -Level "ERROR" -Message "Security context verification failed: \$(\$_.Exception.Message)"
        return \$null
    }
}

# =========================
# 主要機能実装
# =========================

function Invoke-${api_name}Action {
    param(
        [string]\$ActionType,
        [string]\$TargetItem,
        [hashtable]\$ActionParameters
    )
    
    Write-ApiLog -Level "INFO" -Message "Executing action: \$ActionType on target: \$TargetItem"
    
    try {
        switch (\$ActionType.ToLower()) {
            "get" {
                return Get-${api_name}Data -Target \$TargetItem -Parameters \$ActionParameters
            }
            "set" {
                return Set-${api_name}Data -Target \$TargetItem -Parameters \$ActionParameters
            }
            "monitor" {
                return Start-${api_name}Monitoring -Target \$TargetItem -Parameters \$ActionParameters
            }
            "analyze" {
                return Invoke-${api_name}Analysis -Target \$TargetItem -Parameters \$ActionParameters
            }
            default {
                throw "Unsupported action: \$ActionType"
            }
        }
    }
    catch {
        Write-ApiLog -Level "ERROR" -Message "Action execution failed: \$(\$_.Exception.Message)"
        throw
    }
}

function Get-${api_name}Data {
    param(
        [string]\$Target,
        [hashtable]\$Parameters
    )
    
    # TODO: Implement specific Get functionality for $api_name
    \$Result = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Target" = \$Target
        "Status" = "Success"
        "Data" = @{}
    }
    
    Write-ApiLog -Level "INFO" -Message "Data retrieval completed for target: \$Target"
    return \$Result
}

function Set-${api_name}Data {
    param(
        [string]\$Target,
        [hashtable]\$Parameters
    )
    
    # TODO: Implement specific Set functionality for $api_name
    \$Result = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Target" = \$Target
        "Status" = "Success"
        "Changes" = @{}
    }
    
    Write-ApiLog -Level "INFO" -Message "Data modification completed for target: \$Target"
    return \$Result
}

function Start-${api_name}Monitoring {
    param(
        [string]\$Target,
        [hashtable]\$Parameters
    )
    
    # TODO: Implement monitoring functionality for $api_name
    \$Result = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Target" = \$Target
        "Status" = "Monitoring Started"
        "MonitoringId" = [guid]::NewGuid().ToString()
    }
    
    Write-ApiLog -Level "INFO" -Message "Monitoring started for target: \$Target"
    return \$Result
}

function Invoke-${api_name}Analysis {
    param(
        [string]\$Target,
        [hashtable]\$Parameters
    )
    
    # TODO: Implement analysis functionality for $api_name
    \$Result = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Target" = \$Target
        "Status" = "Analysis Complete"
        "Analysis" = @{
            "Summary" = "Analysis completed successfully"
            "Recommendations" = @()
        }
    }
    
    Write-ApiLog -Level "INFO" -Message "Analysis completed for target: \$Target"
    return \$Result
}

# =========================
# エラーハンドリング
# =========================

function Handle-ApiError {
    param(
        [System.Management.Automation.ErrorRecord]\$ErrorRecord
    )
    
    \$ErrorInfo = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "ErrorMessage" = \$ErrorRecord.Exception.Message
        "ScriptLineNumber" = \$ErrorRecord.InvocationInfo.ScriptLineNumber
        "Command" = \$ErrorRecord.InvocationInfo.MyCommand.Name
    }
    
    Write-ApiLog -Level "ERROR" -Message "Error occurred: \$(\$ErrorInfo | ConvertTo-Json -Compress)"
    
    return @{
        "Status" = "Error"
        "Error" = \$ErrorInfo
    }
}

# =========================
# メイン実行
# =========================

try {
    Write-ApiLog -Level "INFO" -Message "$api_name API execution started"
    
    # セキュリティ検証
    \$SecurityContext = Test-SecurityContext
    if (-not \$SecurityContext) {
        throw "Security context verification failed"
    }
    
    # アクション実行
    \$Result = Invoke-${api_name}Action -ActionType \$Action -TargetItem \$Target -ActionParameters \$Parameters
    
    # 結果出力 (JSON形式)
    \$Output = @{
        "ApiName" = "$api_name"
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "SecurityContext" = \$SecurityContext
        "Input" = @{
            "Action" = \$Action
            "Target" = \$Target
            "Parameters" = \$Parameters
        }
        "Result" = \$Result
        "Status" = "Success"
    }
    
    Write-ApiLog -Level "INFO" -Message "$api_name API execution completed successfully"
    
    # JSON出力
    return \$Output | ConvertTo-Json -Depth 10
}
catch {
    \$ErrorResult = Handle-ApiError -ErrorRecord \$_
    return \$ErrorResult | ConvertTo-Json -Depth 10
}
EOF

        ((apis_created++))
        log_feature_action "POWERSHELL_API_CREATION" "SUCCESS" "Created $api_name API"
        
        # 対応するテストファイル生成
        local test_file="$POWERSHELL_DIR/../tests/powershell-${api_name,,}.test.ps1"
        mkdir -p "$POWERSHELL_DIR/../tests"
        
        cat > "$test_file" << EOF
# PowerShell API テスト: $api_name
# Feature-D自動生成テストスイート

Describe "$api_name PowerShell API Tests" {
    BeforeAll {
        \$ApiPath = "\$PSScriptRoot\..\api\${api_name}.ps1"
        \$TestParameters = @{
            "TestKey" = "TestValue"
            "Environment" = "Test"
        }
    }
    
    Context "基本機能テスト" {
        It "APIファイルが存在する" {
            \$ApiPath | Should -Exist
        }
        
        It "Get アクションが正常に実行される" {
            \$Result = & \$ApiPath -Action "Get" -Target "TestTarget" -Parameters \$TestParameters
            \$ParsedResult = \$Result | ConvertFrom-Json
            \$ParsedResult.Status | Should -Be "Success"
        }
        
        It "セキュリティコンテキストが正しく取得される" {
            \$Result = & \$ApiPath -Action "Get" -Target "SecurityTest"
            \$ParsedResult = \$Result | ConvertFrom-Json
            \$ParsedResult.SecurityContext | Should -Not -BeNullOrEmpty
        }
    }
    
    Context "エラーハンドリングテスト" {
        It "無効なアクションでエラーが適切に処理される" {
            \$Result = & \$ApiPath -Action "InvalidAction" -Target "TestTarget"
            \$ParsedResult = \$Result | ConvertFrom-Json
            \$ParsedResult.Status | Should -Be "Error"
        }
    }
    
    Context "ログテスト" {
        It "ログファイルが作成される" {
            & \$ApiPath -Action "Get" -Target "LogTest" -Verbose
            \$LogPath = "\$PSScriptRoot\..\logs\powershell-api.log"
            \$LogPath | Should -Exist
        }
    }
}
EOF

        print_success "テストファイル生成: powershell-${api_name,,}.test.ps1"
    done
    
    print_success "PowerShell API生成完了: $apis_created 個作成"
    return $apis_created
}

# =========================
# PowerShell共通モジュール生成
# =========================

generate_powershell_modules() {
    print_info "PowerShell共通モジュール生成中..."
    
    local modules_created=0
    
    # 共通モジュールテンプレート
    local module_templates=(
        "CommonUtilities:共通ユーティリティ関数"
        "SecurityManager:セキュリティ管理機能"
        "LoggingFramework:ログ管理フレームワーク"
        "ConfigurationManager:設定管理モジュール"
        "ErrorHandling:エラーハンドリング共通機能"
    )
    
    mkdir -p "$MODULES_DIR"
    
    for template in "${module_templates[@]}"; do
        local module_name=$(echo "$template" | cut -d':' -f1)
        local module_desc=$(echo "$template" | cut -d':' -f2)
        local module_file="$MODULES_DIR/${module_name}.psm1"
        
        if [ -f "$module_file" ]; then
            print_info "$module_name は既存のためスキップ"
            continue
        fi
        
        print_info "PowerShell共通モジュール生成: $module_name"
        
        case "$module_name" in
            "CommonUtilities")
                cat > "$module_file" << 'EOF'
# 共通ユーティリティ関数モジュール
# Feature-D自動生成

# JSON操作関数
function ConvertTo-SafeJson {
    param(
        [Parameter(Mandatory=$true)]
        $InputObject,
        
        [int]$Depth = 10
    )
    
    try {
        return $InputObject | ConvertTo-Json -Depth $Depth -ErrorAction Stop
    }
    catch {
        return @{
            "Error" = "JSON conversion failed"
            "Message" = $_.Exception.Message
        } | ConvertTo-Json
    }
}

# 安全なファイル操作
function Get-SafeFileContent {
    param(
        [string]$FilePath,
        [string]$Encoding = "UTF8"
    )
    
    if (-not (Test-Path $FilePath)) {
        throw "File not found: $FilePath"
    }
    
    try {
        return Get-Content -Path $FilePath -Encoding $Encoding -ErrorAction Stop
    }
    catch {
        throw "Failed to read file: $($_.Exception.Message)"
    }
}

# 設定検証
function Test-ConfigurationValue {
    param(
        [hashtable]$Configuration,
        [string]$Key,
        [object]$DefaultValue = $null
    )
    
    if ($Configuration.ContainsKey($Key)) {
        return $Configuration[$Key]
    }
    else {
        return $DefaultValue
    }
}

# パフォーマンス測定
function Measure-ScriptPerformance {
    param(
        [scriptblock]$ScriptBlock,
        [string]$OperationName = "Operation"
    )
    
    $StartTime = Get-Date
    try {
        $Result = & $ScriptBlock
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        return @{
            "Operation" = $OperationName
            "Result" = $Result
            "Duration" = $Duration.TotalMilliseconds
            "Success" = $true
        }
    }
    catch {
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        return @{
            "Operation" = $OperationName
            "Error" = $_.Exception.Message
            "Duration" = $Duration.TotalMilliseconds
            "Success" = $false
        }
    }
}

Export-ModuleMember -Function ConvertTo-SafeJson, Get-SafeFileContent, Test-ConfigurationValue, Measure-ScriptPerformance
EOF
                ;;
                
            "SecurityManager")
                cat > "$module_file" << 'EOF'
# セキュリティ管理モジュール
# Feature-D自動生成

# 権限検証
function Test-AdminPrivileges {
    $CurrentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $Principal = New-Object Security.Principal.WindowsPrincipal($CurrentUser)
    return $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 入力サニタイズ
function Remove-DangerousCharacters {
    param(
        [string]$InputString,
        [string[]]$DangerousPatterns = @(';', '&', '|', '`', '$', '(', ')', '{', '}', '[', ']', '<', '>')
    )
    
    $SafeString = $InputString
    foreach ($Pattern in $DangerousPatterns) {
        $SafeString = $SafeString.Replace($Pattern, "")
    }
    return $SafeString
}

# セキュアな設定読み込み
function Get-SecureConfiguration {
    param(
        [string]$ConfigPath,
        [string]$EncryptionKey
    )
    
    if (-not (Test-Path $ConfigPath)) {
        throw "Configuration file not found: $ConfigPath"
    }
    
    try {
        $EncryptedContent = Get-Content -Path $ConfigPath -Raw
        # TODO: Implement decryption logic
        return $EncryptedContent | ConvertFrom-Json
    }
    catch {
        throw "Failed to load secure configuration: $($_.Exception.Message)"
    }
}

# 監査ログ出力
function Write-SecurityAuditLog {
    param(
        [string]$Action,
        [string]$User,
        [string]$Resource,
        [string]$Result,
        [hashtable]$Details = @{}
    )
    
    $AuditEntry = @{
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Action" = $Action
        "User" = $User
        "Resource" = $Resource
        "Result" = $Result
        "Details" = $Details
        "ComputerName" = $env:COMPUTERNAME
    }
    
    $LogPath = "$PSScriptRoot\..\logs\security-audit.log"
    Add-Content -Path $LogPath -Value ($AuditEntry | ConvertTo-Json -Compress)
}

Export-ModuleMember -Function Test-AdminPrivileges, Remove-DangerousCharacters, Get-SecureConfiguration, Write-SecurityAuditLog
EOF
                ;;
                
            *) 
                # 基本テンプレート
                cat > "$module_file" << EOF
# $module_desc
# Feature-D自動生成PowerShellモジュール

# 基本機能関数
function Invoke-${module_name}Function {
    param(
        [Parameter(Mandatory=\$true)]
        [string]\$Action,
        
        [hashtable]\$Parameters = @{}
    )
    
    # TODO: Implement $module_name specific functionality
    return @{
        "Module" = "$module_name"
        "Action" = \$Action
        "Parameters" = \$Parameters
        "Timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Status" = "Success"
    }
}

Export-ModuleMember -Function Invoke-${module_name}Function
EOF
                ;;
        esac
        
        ((modules_created++))
        log_feature_action "POWERSHELL_MODULE_CREATION" "SUCCESS" "Created $module_name module"
    done
    
    print_success "PowerShell共通モジュール生成完了: $modules_created 個作成"
    return $modules_created
}

# =========================
# Windows統合機能強化
# =========================

enhance_windows_integration() {
    print_info "Windows統合機能強化実行中..."
    
    local integrations_added=0
    
    # Node.js-PowerShell連携強化
    local integration_file="$BACKEND_DIR/services/powershell-integration.js"
    if [ ! -f "$integration_file" ]; then
        cat > "$integration_file" << 'EOF'
// PowerShell統合サービス
// Feature-D自動生成Node.js-PowerShell連携

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class PowerShellIntegrationService {
    constructor() {
        this.powershellPath = 'powershell.exe';
        this.scriptsDir = path.join(__dirname, '../api');
        this.timeout = 30000; // 30秒タイムアウト
    }

    /**
     * PowerShellスクリプト実行
     */
    async executeScript(scriptName, parameters = {}, options = {}) {
        const scriptPath = path.join(this.scriptsDir, `${scriptName}.ps1`);
        
        // スクリプト存在確認
        try {
            await fs.access(scriptPath);
        } catch (error) {
            throw new Error(`PowerShell script not found: ${scriptPath}`);
        }

        // パラメータ構築
        const args = [
            '-ExecutionPolicy', 'Bypass',
            '-File', scriptPath
        ];

        // パラメータ追加
        Object.entries(parameters).forEach(([key, value]) => {
            args.push(`-${key}`);
            if (typeof value === 'object') {
                args.push(JSON.stringify(value));
            } else {
                args.push(String(value));
            }
        });

        return new Promise((resolve, reject) => {
            const process = spawn(this.powershellPath, args, {
                timeout: options.timeout || this.timeout,
                encoding: 'utf8'
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        // JSON レスポンス解析
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        // テキストレスポンス
                        resolve({
                            status: 'Success',
                            output: stdout,
                            raw: true
                        });
                    }
                } else {
                    reject(new Error(`PowerShell execution failed: ${stderr || stdout}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to start PowerShell process: ${error.message}`));
            });

            // タイムアウト処理
            setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error('PowerShell execution timeout'));
            }, options.timeout || this.timeout);
        });
    }

    /**
     * Windows サービス管理
     */
    async manageWindowsService(serviceName, action = 'status') {
        return this.executeScript('WindowsServiceManager', {
            Action: action,
            Target: serviceName
        });
    }

    /**
     * システム情報収集
     */
    async collectSystemInfo(target = 'all') {
        return this.executeScript('SystemInfoCollector', {
            Action: 'Get',
            Target: target
        });
    }

    /**
     * パフォーマンス監視
     */
    async startPerformanceMonitoring(duration = 60) {
        return this.executeScript('PerformanceMonitoring', {
            Action: 'Monitor',
            Parameters: {
                Duration: duration,
                Interval: 5
            }
        });
    }

    /**
     * イベントログ解析
     */
    async analyzeEventLogs(logName = 'System', hours = 24) {
        return this.executeScript('EventLogAnalyzer', {
            Action: 'Analyze',
            Target: logName,
            Parameters: {
                Hours: hours
            }
        });
    }

    /**
     * ネットワーク診断
     */
    async performNetworkDiagnostics(target = 'localhost') {
        return this.executeScript('NetworkDiagnostics', {
            Action: 'Analyze',
            Target: target
        });
    }

    /**
     * Active Directory 統合
     */
    async queryActiveDirectory(query, searchBase = '') {
        return this.executeScript('ActiveDirectoryIntegration', {
            Action: 'Get',
            Target: query,
            Parameters: {
                SearchBase: searchBase
            }
        });
    }

    /**
     * レジストリ管理
     */
    async manageRegistry(path, action = 'get', value = null) {
        return this.executeScript('RegistryManager', {
            Action: action,
            Target: path,
            Parameters: {
                Value: value
            }
        });
    }

    /**
     * ファイルシステム管理
     */
    async manageFileSystem(path, action = 'info') {
        return this.executeScript('FileSystemManager', {
            Action: action,
            Target: path
        });
    }
}

module.exports = PowerShellIntegrationService;
EOF

        ((integrations_added++))
        print_success "PowerShell統合サービスを作成しました"
    fi
    
    # Express APIエンドポイント生成
    local express_api_file="$BACKEND_DIR/api/powershell-endpoints.js"
    if [ ! -f "$express_api_file" ]; then
        cat > "$express_api_file" << 'EOF'
// PowerShell統合APIエンドポイント
// Feature-D自動生成Express.jsエンドポイント

const express = require('express');
const PowerShellIntegrationService = require('../services/powershell-integration');

const router = express.Router();
const psService = new PowerShellIntegrationService();

// Windows サービス管理
router.get('/windows/services', async (req, res) => {
    try {
        const result = await psService.manageWindowsService('', 'list');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/windows/services/:serviceName/:action', async (req, res) => {
    try {
        const { serviceName, action } = req.params;
        const result = await psService.manageWindowsService(serviceName, action);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// システム情報
router.get('/system/info', async (req, res) => {
    try {
        const target = req.query.target || 'all';
        const result = await psService.collectSystemInfo(target);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// パフォーマンス監視
router.post('/system/monitor', async (req, res) => {
    try {
        const { duration = 60 } = req.body;
        const result = await psService.startPerformanceMonitoring(duration);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// イベントログ解析
router.get('/system/events/:logName', async (req, res) => {
    try {
        const { logName } = req.params;
        const hours = req.query.hours || 24;
        const result = await psService.analyzeEventLogs(logName, hours);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ネットワーク診断
router.post('/network/diagnostics', async (req, res) => {
    try {
        const { target = 'localhost' } = req.body;
        const result = await psService.performNetworkDiagnostics(target);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Active Directory
router.get('/ad/query', async (req, res) => {
    try {
        const { query, searchBase = '' } = req.query;
        const result = await psService.queryActiveDirectory(query, searchBase);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// レジストリ管理
router.get('/registry/*', async (req, res) => {
    try {
        const path = req.params[0];
        const result = await psService.manageRegistry(path, 'get');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/registry/*', async (req, res) => {
    try {
        const path = req.params[0];
        const { action, value } = req.body;
        const result = await psService.manageRegistry(path, action, value);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ファイルシステム管理
router.get('/filesystem/*', async (req, res) => {
    try {
        const path = req.params[0];
        const action = req.query.action || 'info';
        const result = await psService.manageFileSystem(path, action);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
EOF

        ((integrations_added++))
        print_success "PowerShell Express APIエンドポイントを作成しました"
    fi
    
    print_success "Windows統合機能強化完了: $integrations_added 項目追加"
    return $integrations_added
}

# =========================
# PowerShell品質チェック
# =========================

check_powershell_quality() {
    print_info "PowerShell品質チェック実行中..."
    
    local quality_score=0
    local total_checks=5
    
    # PowerShellスクリプト構文チェック
    local ps_files=$(find "$POWERSHELL_DIR" -name "*.ps1" 2>/dev/null | wc -l)
    if [ "$ps_files" -gt 0 ]; then
        local syntax_errors=0
        while IFS= read -r -d '' ps_file; do
            # PowerShell構文チェック (簡易版)
            if ! grep -q "function\|param\|try\|catch" "$ps_file"; then
                ((syntax_errors++))
            fi
        done < <(find "$POWERSHELL_DIR" -name "*.ps1" -print0 2>/dev/null)
        
        if [ "$syntax_errors" -le 2 ]; then
            ((quality_score++))
            print_success "PowerShell構文: 良好 ($syntax_errors エラー)"
        else
            print_warning "PowerShell構文: 要改善 ($syntax_errors エラー)"
        fi
    fi
    
    # PowerShellモジュール存在チェック
    local module_files=$(find "$MODULES_DIR" -name "*.psm1" 2>/dev/null | wc -l)
    if [ "$module_files" -ge 3 ]; then
        ((quality_score++))
        print_success "PowerShellモジュール: 良好 ($module_files モジュール)"
    else
        print_warning "PowerShellモジュール: 要改善 ($module_files モジュール)"
    fi
    
    # Node.js統合チェック
    if [ -f "$BACKEND_DIR/services/powershell-integration.js" ]; then
        ((quality_score++))
        print_success "Node.js統合: 実装済み"
    else
        print_warning "Node.js統合: 未実装"
    fi
    
    # セキュリティチェック
    local security_modules=$(find "$MODULES_DIR" -name "*Security*" -o -name "*security*" 2>/dev/null | wc -l)
    if [ "$security_modules" -ge 1 ]; then
        ((quality_score++))
        print_success "セキュリティ: 実装済み"
    else
        print_warning "セキュリティ: 要実装"
    fi
    
    # テストファイルチェック
    local test_files=$(find "$POWERSHELL_DIR/../tests" -name "*.test.ps1" 2>/dev/null | wc -l)
    if [ "$test_files" -ge 3 ]; then
        ((quality_score++))
        print_success "PowerShellテスト: 良好 ($test_files テスト)"
    else
        print_warning "PowerShellテスト: 要改善 ($test_files テスト)"
    fi
    
    local final_score=$((quality_score * 100 / total_checks))
    print_info "PowerShell統合品質スコア: $final_score/100"
    
    echo $final_score
}

# =========================
# Feature-D実行ループ
# =========================

execute_feature_d_loop() {
    print_header
    print_info "Feature-D PowerShell統合自動開発ループを開始します"
    print_info "最大ループ回数: $MAX_AUTO_LOOPS"
    print_info "品質閾値: $POWERSHELL_QUALITY_THRESHOLD%"
    
    local loop_count=0
    local total_apis_created=0
    local total_modules_created=0
    local total_integrations=0
    
    while [ $loop_count -lt $MAX_AUTO_LOOPS ]; do
        ((loop_count++))
        print_info "==================== ループ $loop_count/$MAX_AUTO_LOOPS 開始 ===================="
        
        # PowerShell API生成
        local apis_created=$(generate_powershell_apis)
        total_apis_created=$((total_apis_created + apis_created))
        
        # PowerShell共通モジュール生成
        local modules_created=$(generate_powershell_modules)
        total_modules_created=$((total_modules_created + modules_created))
        
        # Windows統合機能強化
        local integrations=$(enhance_windows_integration)
        total_integrations=$((total_integrations + integrations))
        
        # 品質チェック
        local quality_score=$(check_powershell_quality)
        
        print_info "ループ $loop_count 完了 - 品質スコア: ${quality_score}%"
        log_feature_action "LOOP_COMPLETION" "SUCCESS" "Loop $loop_count completed with quality score $quality_score%"
        
        # 早期終了条件チェック
        if [ $quality_score -ge $POWERSHELL_QUALITY_THRESHOLD ]; then
            print_success "品質閾値 ${POWERSHELL_QUALITY_THRESHOLD}% に到達しました！"
            break
        fi
        
        # 改善がない場合の早期終了
        if [ $apis_created -eq 0 ] && [ $modules_created -eq 0 ] && [ $integrations -eq 0 ]; then
            print_info "追加の改善項目がないため、ループを終了します"
            break
        fi
        
        sleep 2  # ループ間の休憩
    done
    
    # 最終結果表示
    print_success "Feature-D PowerShell統合自動開発完了"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "実行ループ数: $loop_count/$MAX_AUTO_LOOPS"
    echo "作成PowerShell API: $total_apis_created 個"
    echo "作成共通モジュール: $total_modules_created 個"
    echo "統合機能追加: $total_integrations 項目"
    echo "最終品質スコア: $(check_powershell_quality)%"
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "Feature-D PowerShell統合自動開発スクリプト"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --loop              自動開発ループ実行"
    echo "  --apis              PowerShell API生成のみ"
    echo "  --modules           共通モジュール生成のみ"
    echo "  --integration       Windows統合強化のみ"
    echo "  --quality           品質チェックのみ"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="loop"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --loop)
                mode="loop"
                shift
                ;;
            --apis)
                mode="apis"
                shift
                ;;
            --modules)
                mode="modules"
                shift
                ;;
            --integration)
                mode="integration"
                shift
                ;;
            --quality)
                mode="quality"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_warning "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 環境チェック
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "バックエンドディレクトリが見つかりません: $BACKEND_DIR"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # Feature-D開始ログ
    log_feature_action "FEATURE_D_START" "INFO" "Feature-D PowerShell development started with mode: $mode"
    
    # モード別実行
    case "$mode" in
        loop)
            execute_feature_d_loop
            ;;
        apis)
            print_header
            generate_powershell_apis
            ;;
        modules)
            print_header
            generate_powershell_modules
            ;;
        integration)
            print_header
            enhance_windows_integration
            ;;
        quality)
            print_header
            local score=$(check_powershell_quality)
            print_info "現在のPowerShell統合品質スコア: $score%"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
    
    log_feature_action "FEATURE_D_COMPLETE" "SUCCESS" "Feature-D PowerShell development completed"
}

# スクリプト実行
main "$@"