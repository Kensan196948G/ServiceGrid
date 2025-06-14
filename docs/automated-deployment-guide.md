# ServiceGrid 自動デプロイメントガイド

**作成日**: 2025年6月14日  
**バージョン**: v1.0  
**対象**: 運用管理者・DevOpsエンジニア

---

## 概要

ServiceGrid ITSM準拠IT運用システムプラットフォームの自動デプロイメント、監視、およびメンテナンス手順を記載します。

## 前提条件

### システム要件
- **OS**: Windows Server 2019/2022 または Windows 10/11 Pro
- **メモリ**: 最小8GB、推奨16GB以上
- **ストレージ**: 100GB以上の空き容量
- **ネットワーク**: インターネット接続（パッケージダウンロード用）

### 必要なソフトウェア
- **Node.js**: v18.x 以上
- **PowerShell**: v7.x 以上
- **Git**: v2.30 以上
- **Windows管理者権限**

## 自動デプロイメント手順

### 1. 環境準備スクリプト

```powershell
# deploy/setup-environment.ps1
param(
    [string]$InstallPath = "C:\ServiceGrid",
    [string]$Environment = "production",
    [switch]$SkipDependencies = $false
)

Write-Host "🚀 ServiceGrid 環境セットアップ開始" -ForegroundColor Green
Write-Host "インストール先: $InstallPath" -ForegroundColor Yellow
Write-Host "環境: $Environment" -ForegroundColor Yellow

# 1. ディレクトリ作成
if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force
    Write-Host "✅ インストールディレクトリを作成: $InstallPath"
}

# 2. 依存関係のインストール
if (!$SkipDependencies) {
    Write-Host "📦 依存関係をインストール中..."
    
    # Node.js のインストール確認
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js インストール済み: $nodeVersion"
    }
    catch {
        Write-Error "❌ Node.js がインストールされていません"
        Write-Host "https://nodejs.org/ からダウンロードしてインストールしてください"
        exit 1
    }
    
    # PowerShell 7 のインストール確認
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        Write-Warning "⚠️ PowerShell 7.x 以上を推奨します"
        Write-Host "現在のバージョン: $($PSVersionTable.PSVersion)"
    }
}

# 3. アプリケーションファイルの配置
Write-Host "📁 アプリケーションファイルを配置中..."
$sourceFiles = @(
    "package.json",
    "src/",
    "backend/",
    "docs/",
    "start-all.sh",
    "stop-all.sh"
)

foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $InstallPath -Recurse -Force
        Write-Host "✅ コピー完了: $file"
    }
    else {
        Write-Warning "⚠️ ファイルが見つかりません: $file"
    }
}

# 4. 環境設定ファイルの作成
$envFile = @"
# ServiceGrid Environment Configuration
NODE_ENV=$Environment
PORT=8082
FRONTEND_PORT=3001

# JWT Settings
JWT_SECRET=$(New-Guid)
JWT_EXPIRES_IN=24h

# Database
DB_PATH=$InstallPath\backend\db\itsm.sqlite

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600

# Logging
LOG_LEVEL=info
LOG_PATH=$InstallPath\logs

# API Settings
API_BASE_URL=http://localhost:8082
VITE_API_BASE_URL=http://localhost:8082

# Performance
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
"@

$envFile | Out-File -FilePath "$InstallPath\.env" -Encoding UTF8
Write-Host "✅ 環境設定ファイルを作成: $InstallPath\.env"

# 5. ログディレクトリの作成
$logPath = "$InstallPath\logs"
if (!(Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force
    Write-Host "✅ ログディレクトリを作成: $logPath"
}

Write-Host "✅ 環境セットアップ完了" -ForegroundColor Green
```

### 2. 自動インストールスクリプト

```powershell
# deploy/install-servicegrid.ps1
param(
    [string]$InstallPath = "C:\ServiceGrid",
    [string]$ServiceName = "ServiceGrid-ITSM",
    [switch]$CreateService = $true
)

# 前の環境セットアップを実行
& "$PSScriptRoot\setup-environment.ps1" -InstallPath $InstallPath

Set-Location $InstallPath

Write-Host "🔧 ServiceGrid インストール開始" -ForegroundColor Green

# 1. NPM 依存関係のインストール
Write-Host "📦 フロントエンド依存関係をインストール中..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ フロントエンド依存関係のインストールに失敗"
    exit 1
}

Write-Host "📦 バックエンド依存関係をインストール中..."
Set-Location "backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ バックエンド依存関係のインストールに失敗"
    exit 1
}
Set-Location ..

# 2. データベース初期化
Write-Host "🗃️ データベースを初期化中..."
try {
    node backend/scripts/init-database.js
    node backend/scripts/init-assets-db.js
    Write-Host "✅ データベース初期化完了"
}
catch {
    Write-Error "❌ データベース初期化に失敗: $($_.Exception.Message)"
    exit 1
}

# 3. フロントエンドビルド
Write-Host "🏗️ フロントエンドをビルド中..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ フロントエンドビルドに失敗"
    exit 1
}

# 4. Windowsサービスとして登録
if ($CreateService) {
    Write-Host "🎯 Windowsサービスとして登録中..."
    
    # サービス用スクリプトを作成
    $serviceScript = @"
# ServiceGrid Service Script
Set-Location "$InstallPath"
& node backend/start-server.js
"@
    
    $serviceScript | Out-File -FilePath "$InstallPath\service-start.ps1" -Encoding UTF8
    
    # NSSM を使用してサービス登録（別途インストールが必要）
    try {
        nssm install $ServiceName powershell -ExecutionPolicy Bypass -File "$InstallPath\service-start.ps1"
        nssm set $ServiceName Description "ServiceGrid ITSM Platform"
        nssm set $ServiceName Start SERVICE_AUTO_START
        
        Write-Host "✅ Windowsサービス '$ServiceName' を登録しました"
        Write-Host "サービスを開始するには: Start-Service $ServiceName"
    }
    catch {
        Write-Warning "⚠️ Windowsサービスの登録に失敗しました"
        Write-Host "手動で以下のコマンドでアプリケーションを起動してください:"
        Write-Host "PowerShell: Set-Location '$InstallPath'; .\start-all.sh"
    }
}

# 5. ファイアウォール設定
Write-Host "🔒 ファイアウォール設定を構成中..."
try {
    New-NetFirewallRule -DisplayName "ServiceGrid Backend" -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow
    New-NetFirewallRule -DisplayName "ServiceGrid Frontend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
    Write-Host "✅ ファイアウォール設定完了"
}
catch {
    Write-Warning "⚠️ ファイアウォール設定に失敗しました。手動で設定してください。"
}

Write-Host "🎉 ServiceGrid インストール完了!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 次のステップ:"
Write-Host "1. サービス開始: Start-Service $ServiceName"
Write-Host "2. ブラウザでアクセス: http://localhost:3001"
Write-Host "3. 管理者アカウント: admin / admin123"
Write-Host ""
Write-Host "📖 詳細な使用方法は以下を参照:"
Write-Host "- ドキュメント: $InstallPath\docs\"
Write-Host "- 運用マニュアル: $InstallPath\docs\06_運用マニュアル.md"
```

## 自動監視・メンテナンス

### 1. ヘルスチェックスクリプト

```powershell
# monitoring/health-check.ps1
param(
    [string]$ServiceGridPath = "C:\ServiceGrid",
    [string]$LogPath = "C:\ServiceGrid\logs\health-check.log",
    [switch]$SendAlert = $false,
    [string]$AlertEmail = "admin@company.com"
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$healthStatus = @{
    Timestamp = $timestamp
    Overall = "Unknown"
    Services = @{}
    Resources = @{}
    Issues = @()
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    $logEntry | Out-File -FilePath $LogPath -Append -Encoding UTF8
}

Write-Log "🔍 ServiceGrid ヘルスチェック開始"

# 1. Webサービスの確認
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 10 -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        $healthStatus.Services.Frontend = "OK"
        Write-Log "✅ フロントエンドサービス正常"
    }
}
catch {
    $healthStatus.Services.Frontend = "FAIL"
    $healthStatus.Issues += "フロントエンドサービスにアクセスできません"
    Write-Log "❌ フロントエンドサービス異常: $($_.Exception.Message)" "ERROR"
}

try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8082/api/health" -TimeoutSec 10 -UseBasicParsing
    if ($backendResponse.StatusCode -eq 200) {
        $healthStatus.Services.Backend = "OK"
        Write-Log "✅ バックエンドサービス正常"
    }
}
catch {
    $healthStatus.Services.Backend = "FAIL"
    $healthStatus.Issues += "バックエンドサービスにアクセスできません"
    Write-Log "❌ バックエンドサービス異常: $($_.Exception.Message)" "ERROR"
}

# 2. システムリソースの確認
$cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
$cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)

$memory = Get-CimInstance Win32_OperatingSystem
$memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)

$disk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
$diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)

$healthStatus.Resources.CPU = $cpuUsage
$healthStatus.Resources.Memory = $memoryUsage
$healthStatus.Resources.Disk = $diskUsage

Write-Log "📊 CPU使用率: $cpuUsage%"
Write-Log "📊 メモリ使用率: $memoryUsage%"
Write-Log "📊 ディスク使用率: $diskUsage%"

# リソース警告レベルのチェック
if ($cpuUsage -gt 80) {
    $healthStatus.Issues += "CPU使用率が高い ($cpuUsage%)"
    Write-Log "⚠️ CPU使用率警告: $cpuUsage%" "WARNING"
}

if ($memoryUsage -gt 85) {
    $healthStatus.Issues += "メモリ使用率が高い ($memoryUsage%)"
    Write-Log "⚠️ メモリ使用率警告: $memoryUsage%" "WARNING"
}

if ($diskUsage -gt 90) {
    $healthStatus.Issues += "ディスク使用率が高い ($diskUsage%)"
    Write-Log "⚠️ ディスク使用率警告: $diskUsage%" "WARNING"
}

# 3. データベースファイルの確認
$dbPath = "$ServiceGridPath\backend\db\itsm.sqlite"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length / 1MB
    Write-Log "✅ データベースファイル正常 (サイズ: $([math]::Round($dbSize, 2)) MB)"
    $healthStatus.Resources.DatabaseSize = [math]::Round($dbSize, 2)
}
else {
    $healthStatus.Issues += "データベースファイルが見つかりません"
    Write-Log "❌ データベースファイル異常" "ERROR"
}

# 4. ログファイルの確認
$logFiles = Get-ChildItem "$ServiceGridPath\logs" -Filter "*.log" -ErrorAction SilentlyContinue
if ($logFiles) {
    $totalLogSize = ($logFiles | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Log "📄 ログファイル総サイズ: $([math]::Round($totalLogSize, 2)) MB"
    
    if ($totalLogSize -gt 1000) { # 1GB以上
        $healthStatus.Issues += "ログファイルサイズが大きい ($([math]::Round($totalLogSize, 2)) MB)"
        Write-Log "⚠️ ログファイル警告: サイズが大きい" "WARNING"
    }
}

# 5. 総合評価
if ($healthStatus.Issues.Count -eq 0) {
    $healthStatus.Overall = "HEALTHY"
    Write-Log "✅ 総合評価: 正常" "INFO"
}
elseif ($healthStatus.Issues.Count -le 2) {
    $healthStatus.Overall = "WARNING"
    Write-Log "⚠️ 総合評価: 警告" "WARNING"
}
else {
    $healthStatus.Overall = "CRITICAL"
    Write-Log "❌ 総合評価: 異常" "ERROR"
}

# 6. アラート送信（オプション）
if ($SendAlert -and $healthStatus.Overall -ne "HEALTHY") {
    try {
        $subject = "ServiceGrid ヘルスチェック警告 - $($healthStatus.Overall)"
        $body = @"
ServiceGrid システムのヘルスチェックで問題が検出されました。

実行時刻: $timestamp
総合評価: $($healthStatus.Overall)

検出された問題:
$($healthStatus.Issues | ForEach-Object { "- $_" } | Out-String)

システムリソース:
- CPU使用率: $($healthStatus.Resources.CPU)%
- メモリ使用率: $($healthStatus.Resources.Memory)%
- ディスク使用率: $($healthStatus.Resources.Disk)%

詳細は以下のログファイルを確認してください:
$LogPath
"@
        
        Send-MailMessage -To $AlertEmail -Subject $subject -Body $body -SmtpServer "localhost"
        Write-Log "📧 アラートメールを送信しました" "INFO"
    }
    catch {
        Write-Log "❌ アラートメール送信に失敗: $($_.Exception.Message)" "ERROR"
    }
}

# 7. 結果の出力
$healthStatus | ConvertTo-Json -Depth 3 | Out-File -FilePath "$ServiceGridPath\logs\last-health-check.json" -Encoding UTF8

Write-Log "🔍 ServiceGrid ヘルスチェック完了 - 総合評価: $($healthStatus.Overall)"

# 戻り値
if ($healthStatus.Overall -eq "HEALTHY") { exit 0 }
elseif ($healthStatus.Overall -eq "WARNING") { exit 1 }
else { exit 2 }
```

### 2. 自動メンテナンススクリプト

```powershell
# maintenance/auto-maintenance.ps1
param(
    [string]$ServiceGridPath = "C:\ServiceGrid",
    [switch]$DryRun = $false,
    [int]$LogRetentionDays = 30,
    [int]$BackupRetentionDays = 90
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "🔧 ServiceGrid 自動メンテナンス開始: $timestamp" -ForegroundColor Green

if ($DryRun) {
    Write-Host "📋 ドライランモード: 実際の変更は行いません" -ForegroundColor Yellow
}

# 1. ログファイルのローテーション
Write-Host "📄 ログファイルのメンテナンス中..."
$logPath = "$ServiceGridPath\logs"

if (Test-Path $logPath) {
    $oldLogs = Get-ChildItem $logPath -Filter "*.log" | Where-Object { 
        $_.LastWriteTime -lt (Get-Date).AddDays(-$LogRetentionDays) 
    }
    
    foreach ($log in $oldLogs) {
        if (!$DryRun) {
            Remove-Item $log.FullName -Force
        }
        Write-Host "🗑️ 古いログファイルを削除: $($log.Name)"
    }
    
    Write-Host "✅ ログファイル メンテナンス完了 ($($oldLogs.Count) ファイル処理)"
}

# 2. データベースバックアップ
Write-Host "💾 データベースバックアップ中..."
$dbPath = "$ServiceGridPath\backend\db\itsm.sqlite"
$backupPath = "$ServiceGridPath\backup"

if (!(Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force
}

if (Test-Path $dbPath) {
    $backupName = "itsm-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sqlite"
    $backupFullPath = "$backupPath\$backupName"
    
    if (!$DryRun) {
        Copy-Item $dbPath $backupFullPath
    }
    Write-Host "💾 データベースバックアップ作成: $backupName"
    
    # 古いバックアップの削除
    $oldBackups = Get-ChildItem $backupPath -Filter "itsm-backup-*.sqlite" | Where-Object { 
        $_.LastWriteTime -lt (Get-Date).AddDays(-$BackupRetentionDays) 
    }
    
    foreach ($backup in $oldBackups) {
        if (!$DryRun) {
            Remove-Item $backup.FullName -Force
        }
        Write-Host "🗑️ 古いバックアップを削除: $($backup.Name)"
    }
}

# 3. 一時ファイルのクリーンアップ
Write-Host "🧹 一時ファイルのクリーンアップ中..."
$tempPaths = @(
    "$ServiceGridPath\temp",
    "$ServiceGridPath\tmp",
    "$ServiceGridPath\logs\temp"
)

foreach ($path in $tempPaths) {
    if (Test-Path $path) {
        $tempFiles = Get-ChildItem $path -Recurse | Where-Object { 
            $_.LastWriteTime -lt (Get-Date).AddDays(-1) 
        }
        
        foreach ($file in $tempFiles) {
            if (!$DryRun) {
                Remove-Item $file.FullName -Force -Recurse
            }
            Write-Host "🗑️ 一時ファイルを削除: $($file.Name)"
        }
    }
}

# 4. パフォーマンス最適化
Write-Host "⚡ パフォーマンス最適化中..."

# SQLite データベースの VACUUM 実行
if ((Test-Path $dbPath) -and !$DryRun) {
    try {
        $sqlite3 = "sqlite3"
        & $sqlite3 $dbPath "VACUUM;"
        Write-Host "✅ データベース最適化 (VACUUM) 完了"
    }
    catch {
        Write-Host "⚠️ データベース最適化に失敗: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 5. システムリソースレポート
Write-Host "📊 システムリソースレポート生成中..."
$resourceReport = @{
    Timestamp = $timestamp
    CPU = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1).CounterSamples[0].CookedValue
    Memory = @{
        Total = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
        Available = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
    }
    Disk = @{
        Total = [math]::Round((Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }).Size / 1GB, 2)
        Free = [math]::Round((Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }).FreeSpace / 1GB, 2)
    }
}

$reportPath = "$ServiceGridPath\logs\maintenance-report-$(Get-Date -Format 'yyyyMMdd').json"
if (!$DryRun) {
    $resourceReport | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8
}
Write-Host "📄 リソースレポート保存: $reportPath"

Write-Host "🎉 ServiceGrid 自動メンテナンス完了: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
```

## タスクスケジューラー設定

### 1. ヘルスチェックの定期実行

```powershell
# 15分ごとのヘルスチェック
$action = New-ScheduledTaskAction -Execute "PowerShell" -Argument "-File C:\ServiceGrid\monitoring\health-check.ps1"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 15) -At (Get-Date) -Once
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName "ServiceGrid-HealthCheck" -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

### 2. 日次メンテナンスの設定

```powershell
# 毎日午前2時の自動メンテナンス
$action = New-ScheduledTaskAction -Execute "PowerShell" -Argument "-File C:\ServiceGrid\maintenance\auto-maintenance.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 02:00
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName "ServiceGrid-DailyMaintenance" -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

## トラブルシューティング

### よくある問題と解決策

#### 1. サービス起動失敗
```powershell
# ログの確認
Get-Content "C:\ServiceGrid\logs\*.log" | Select-Object -Last 50

# プロセスの確認
Get-Process -Name "node" -ErrorAction SilentlyContinue

# ポートの確認
netstat -an | findstr ":8082"
netstat -an | findstr ":3001"
```

#### 2. データベース接続エラー
```powershell
# データベースファイルの権限確認
Get-Acl "C:\ServiceGrid\backend\db\itsm.sqlite"

# SQLite の整合性チェック
sqlite3 "C:\ServiceGrid\backend\db\itsm.sqlite" "PRAGMA integrity_check;"
```

#### 3. パフォーマンス問題
```powershell
# パフォーマンス分析の実行
node "C:\ServiceGrid\performance-optimization.js"

# システムリソース監視
Get-Counter "\Process(node)\% Processor Time" -Continuous
```

## セキュリティ設定

### 1. ファイアウォール設定の確認

```powershell
# ServiceGrid 用ファイアウォールルールの確認
Get-NetFirewallRule -DisplayName "*ServiceGrid*"

# 必要に応じてルールを作成
New-NetFirewallRule -DisplayName "ServiceGrid Backend API" -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow
New-NetFirewallRule -DisplayName "ServiceGrid Frontend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### 2. アクセス権限の設定

```powershell
# ServiceGrid ディレクトリのアクセス権限設定
$acl = Get-Acl "C:\ServiceGrid"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl "C:\ServiceGrid" $acl
```

---

このガイドに従って ServiceGrid の自動デプロイメントと運用監視を実装することで、安定したITSMプラットフォームの運用が可能になります。