#!/usr/bin/env pwsh

# ITSM Platform - PowerShell版 5ペイン並列開発環境開始スクリプト
# Windows + WSL + tmux + Claude Code 統合開発環境

param(
    [switch]$YoloMode,
    [switch]$Help
)

# 設定
$SESSION_NAME = "itsm-requirement"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$TMUX_DIR = Join-Path $PROJECT_ROOT "tmux"
$WORKTREE_ROOT = Join-Path $PROJECT_ROOT "worktrees"

# 色付きメッセージ関数
function Write-InfoMessage {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-SuccessMessage {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-YoloMessage {
    param([string]$Message)
    Write-Host "[🚀 YOLO] $Message" -ForegroundColor Magenta
}

# 使用方法表示
function Show-Usage {
    Write-Host "🚀 ITSM Platform 5ペイン並列開発環境 (PowerShell版)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\start-development.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "オプション:"
    Write-Host "  -YoloMode         YOLO MODE（完全自動化）で起動"
    Write-Host "  -Help             このヘルプを表示"
    Write-Host ""
    Write-Host "実行例:"
    Write-Host "  .\start-development.ps1              # 通常モード"
    Write-Host "  .\start-development.ps1 -YoloMode    # YOLO MODE"
    Write-Host ""
    Write-Host "🎯 YOLO MODE機能:"
    Write-Host "  • 全ての確認プロンプトを自動承認"
    Write-Host "  • 各ペイン自動起動・並列実行"
    Write-Host "  • Claude Code自動起動"
    Write-Host "  • 統合リーダー自動指示送信"
    Write-Host "  • Windows最適化された処理"
}

# 環境チェック
function Test-Environment {
    Write-InfoMessage "環境をチェック中..."
    
    # PowerShell バージョン確認
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        Write-WarningMessage "PowerShell 7+ を推奨します。現在: $($PSVersionTable.PSVersion)"
    }
    
    # tmux確認
    $tmuxPath = Get-Command tmux -ErrorAction SilentlyContinue
    if (-not $tmuxPath) {
        Write-ErrorMessage "tmuxがインストールされていません"
        Write-InfoMessage "WSL/Linux環境でtmuxをインストールしてください:"
        Write-InfoMessage "  sudo apt-get install tmux"
        return $false
    }
    
    # Node.js確認
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-ErrorMessage "Node.jsがインストールされていません"
        return $false
    }
    
    # プロジェクトディレクトリ確認
    if (-not (Test-Path $PROJECT_ROOT)) {
        Write-ErrorMessage "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
        return $false
    }
    
    if (-not (Test-Path (Join-Path $PROJECT_ROOT "package.json"))) {
        Write-ErrorMessage "package.jsonが見つかりません。正しいプロジェクトディレクトリですか？"
        return $false
    }
    
    Write-SuccessMessage "環境チェック完了"
    return $true
}

# 既存セッション確認・終了
function Stop-ExistingSession {
    $sessionExists = & tmux has-session -t $SESSION_NAME 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-WarningMessage "既存セッション '$SESSION_NAME' を終了します"
        & tmux kill-session -t $SESSION_NAME
        Start-Sleep -Seconds 1
    }
}

# tmux設定適用
function Set-TmuxConfiguration {
    Write-InfoMessage "tmux設定を適用中..."
    
    $tmuxConfigPath = Join-Path $TMUX_DIR "session-config.conf"
    if (Test-Path $tmuxConfigPath) {
        $tmuxConfigDir = Join-Path $env:HOME ".config/tmux"
        if (-not (Test-Path $tmuxConfigDir)) {
            New-Item -ItemType Directory -Path $tmuxConfigDir -Force | Out-Null
        }
        Copy-Item $tmuxConfigPath (Join-Path $tmuxConfigDir "tmux.conf") -Force
        Write-SuccessMessage "tmux設定適用完了"
    } else {
        Write-WarningMessage "tmux設定ファイルが見つかりません: $tmuxConfigPath"
    }
}

# ペインスクリプト権限設定
function Set-PaneScriptPermissions {
    Write-InfoMessage "ペインスクリプトのセットアップ中..."
    
    $panesDir = Join-Path $TMUX_DIR "panes"
    $toolsDir = Join-Path $TMUX_DIR "tools"
    
    Get-ChildItem -Path $panesDir -Filter "*.sh" | ForEach-Object {
        & chmod +x $_.FullName
        Write-InfoMessage "実行権限付与: $($_.Name)"
    }
    
    Get-ChildItem -Path $toolsDir -Filter "*.sh" | ForEach-Object {
        & chmod +x $_.FullName
        Write-InfoMessage "実行権限付与: $($_.Name)"
    }
    
    Write-SuccessMessage "スクリプトセットアップ完了"
}

# 5ペインレイアウト作成
function New-PaneLayout {
    Write-InfoMessage "5ペイン開発環境を作成中..."
    
    # 新しいセッション作成
    & tmux new-session -d -s $SESSION_NAME -c $PROJECT_ROOT
    
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "tmuxセッションの作成に失敗しました"
        return $false
    }
    
    Write-InfoMessage "正確な3段構成作成中: 2x2+1レイアウト"
    
    # ペイン分割（3段構成）
    & tmux split-window -v -l 30% -t "$SESSION_NAME`:0" -c $PROJECT_ROOT
    & tmux split-window -v -l 50% -t "$SESSION_NAME`:0.0" -c $PROJECT_ROOT
    & tmux split-window -h -l 50% -t "$SESSION_NAME`:0.0" -c $PROJECT_ROOT
    & tmux split-window -h -l 50% -t "$SESSION_NAME`:0.2" -c $PROJECT_ROOT
    
    # ペイン配置確認
    Write-InfoMessage "最終ペイン配置確認:"
    & tmux list-panes -t "$SESSION_NAME`:0" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"
    
    $paneCount = (& tmux list-panes -t "$SESSION_NAME`:0").Count
    if ($paneCount -eq 5) {
        Write-SuccessMessage "5ペインレイアウト作成完了（3段構成）"
        Write-InfoMessage "構成: 1段目(0,1) + 2段目(2,3) + 3段目(4)"
    } else {
        Write-WarningMessage "期待される5ペインではなく${paneCount}ペインが作成されました"
    }
    
    return $true
}

# 各ペインコマンド設定
function Set-PaneCommands {
    if ($YoloMode) {
        Write-YoloMessage "YOLO MODE: 各ペイン自動起動設定中..."
    } else {
        Write-InfoMessage "各ペインにコマンドを設定中..."
    }
    
    # ペイン設定配列
    $paneConfigs = @(
        @{Index=0; Name="Feature-B-UI"; Description="UI/テスト自動修復"; Script="feature-b-ui.sh"; Details="React/TypeScript・Jest/RTL・ESLint"},
        @{Index=1; Name="Feature-C-API"; Description="API開発"; Script="feature-c-api.sh"; Details="Node.js・Express・テスト通過ループ"},
        @{Index=2; Name="Feature-D-PowerShell"; Description="PowerShell API"; Script="feature-d-powershell.sh"; Details="PowerShell・run-tests.sh・Windows対応"},
        @{Index=3; Name="Feature-E-NonFunc"; Description="非機能要件"; Script="feature-e-nonfunc.sh"; Details="SLA・ログ・セキュリティ・監視"},
        @{Index=4; Name="Feature-A-Leader"; Description="統合リーダー"; Script="feature-a-leader.sh"; Details="設計統一・アーキテクチャ管理・調整"}
    )
    
    foreach ($config in $paneConfigs) {
        $paneTarget = "$SESSION_NAME`:0.$($config.Index)"
        
        if ($YoloMode) {
            Write-YoloMessage "ペイン$($config.Index): $($config.Name) YOLO自動起動中..."
        } else {
            Write-InfoMessage "ペイン$($config.Index): $($config.Name) を設定中..."
        }
        
        # 基本設定
        & tmux send-keys -t $paneTarget "clear" C-m
        & tmux send-keys -t $paneTarget "cd `"$TMUX_DIR`"" C-m
        
        if ($YoloMode) {
            & tmux send-keys -t $paneTarget "export PS1='[YOLO-$($config.Name)] \w$ '" C-m
            & tmux send-keys -t $paneTarget "export YOLO_MODE=true" C-m
            & tmux send-keys -t $paneTarget "export AUTO_APPROVE=true" C-m
            & tmux send-keys -t $paneTarget "echo '🚀 YOLO MODE: $($config.Name) 自動起動完了'" C-m
        } else {
            & tmux send-keys -t $paneTarget "export PS1='[$($config.Name)] \w$ '" C-m
            & tmux send-keys -t $paneTarget "echo '=== $($config.Name) ==='" C-m
        }
        
        & tmux send-keys -t $paneTarget "echo '$($config.Details)'" C-m
        & tmux send-keys -t $paneTarget "echo ''" C-m
        
        # ペインタイトル設定
        if ($YoloMode) {
            & tmux select-pane -t $paneTarget -T "YOLO-$($config.Name)"
        } else {
            & tmux select-pane -t $paneTarget -T "$($config.Name)"
        }
        
        # スクリプト実行
        $scriptPath = Join-Path $TMUX_DIR "panes" $config.Script
        if (Test-Path $scriptPath) {
            & chmod +x $scriptPath 2>$null
            if ($YoloMode) {
                & tmux send-keys -t $paneTarget "YOLO_MODE=true AUTO_APPROVE=true ./panes/$($config.Script)" C-m
                Write-SuccessMessage "ペイン$($config.Index): $($config.Script) YOLO起動完了"
            } else {
                & tmux send-keys -t $paneTarget "./panes/$($config.Script)" C-m
                Write-SuccessMessage "ペイン$($config.Index): $($config.Script) 起動完了"
            }
        } else {
            & tmux send-keys -t $paneTarget "echo 'ERROR: $($config.Script) が見つかりません'" C-m
            Write-ErrorMessage "ペイン$($config.Index): $($config.Script) が見つかりません"
        }
        
        if ($YoloMode) {
            Start-Sleep -Milliseconds 300
        } else {
            Start-Sleep -Milliseconds 500
        }
    }
    
    Write-SuccessMessage "ペインコマンド設定完了"
}

# Claude Code環境設定
function Set-ClaudeEnvironment {
    if ($YoloMode) {
        Write-YoloMessage "Claude Code環境を自動設定中..."
    } else {
        Write-InfoMessage "Claude Code環境を設定中..."
    }
    
    $setupScript = Join-Path $TMUX_DIR "setup-claude-noninteractive.sh"
    if (Test-Path $setupScript) {
        & bash $setupScript both 2>$null
    }
}

# YOLO MODE自動タスク
function Start-YoloAutoTasks {
    if (-not $YoloMode) {
        return
    }
    
    Write-YoloMessage "YOLO MODE: 統合リーダー自動指示システム起動中..."
    
    Start-Sleep -Seconds 2
    
    Write-YoloMessage "初期タスク自動送信中..."
    
    $leaderPane = "$SESSION_NAME`:0.4"
    & tmux send-keys -t $leaderPane "cd `"$TMUX_DIR/coordination`"" C-m
    & tmux send-keys -t $leaderPane "./leader-command.sh all --auto-approve '🚀 YOLO MODE: 初期環境セットアップを自動実行してください。各ペインで開発準備を整えてください。'" C-m
    
    Start-Sleep -Seconds 1
    
    & tmux send-keys -t $leaderPane "./leader-command.sh status" C-m
    
    Write-SuccessMessage "YOLO MODE自動指示完了"
}

# 開発環境情報表示
function Show-DevelopmentInfo {
    Write-SuccessMessage "=========================================="
    Write-SuccessMessage "  ITSM Platform 5ペイン並列開発環境"
    Write-SuccessMessage "=========================================="
    Write-Host ""
    Write-Host "📋 セッション名: $SESSION_NAME" -ForegroundColor Cyan
    Write-Host "📁 プロジェクト: $PROJECT_ROOT" -ForegroundColor Cyan
    Write-Host "🔧 PowerShell版: Windows最適化" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 各ペイン構成 (3段構成):" -ForegroundColor Yellow
    Write-Host "  ┌─────────────────────────────────────┐"
    Write-Host "  │ 1段目（上段）                       │"
    Write-Host "  │ ┌─────────────┬─────────────────────┤"
    Write-Host "  │ │ 0:Feature-B │ 1:Feature-C         │"
    Write-Host "  │ │ UI/テスト   │ API開発             │"
    Write-Host "  │ ├─────────────┼─────────────────────┤"
    Write-Host "  │ │ 2段目（中段）                     │"
    Write-Host "  │ │ 2:Feature-D │ 3:Feature-E         │"
    Write-Host "  │ │ PowerShell  │ 非機能要件          │"
    Write-Host "  │ └─────────────┴─────────────────────┘"
    Write-Host "  ├─────────────────────────────────────┤"
    Write-Host "  │ 3段目（下段フル幅）                 │"
    Write-Host "  │ 4:Feature-A (統合リーダー)          │"
    Write-Host "  └─────────────────────────────────────┘"
    Write-Host ""
    Write-Host "⌨️ tmuxペイン操作:" -ForegroundColor Green
    Write-Host "  Ctrl-b + 0: 🎨 Feature-B-UI - 1段目左"
    Write-Host "  Ctrl-b + 1: 🔧 Feature-C-API - 1段目右"
    Write-Host "  Ctrl-b + 2: 💻 Feature-D-PowerShell - 2段目左"
    Write-Host "  Ctrl-b + 3: 🔒 Feature-E-NonFunc - 2段目右"
    Write-Host "  Ctrl-b + 4: 🎯 Feature-A-Leader - 3段目フル幅"
    Write-Host "  Ctrl-b + 矢印 : ペイン移動"
    Write-Host "  Ctrl-b + z    : ペインズーム"
    Write-Host "  Ctrl-b + &    : セッション終了"
    Write-Host ""
}

# メイン実行関数
function Main {
    if ($Help) {
        Show-Usage
        return
    }
    
    if ($YoloMode) {
        Write-YoloMessage "YOLO MODEが有効化されました"
        Write-YoloMessage "ITSM Platform YOLO MODE 5ペイン並列開発環境を開始します..."
    } else {
        Write-InfoMessage "ITSM Platform 5ペイン並列開発環境を開始します..."
    }
    
    # 環境チェック
    if (-not (Test-Environment)) {
        Write-ErrorMessage "環境チェックに失敗しました"
        return
    }
    
    # セッション管理
    Stop-ExistingSession
    
    # 環境セットアップ
    Set-TmuxConfiguration
    Set-PaneScriptPermissions
    
    # tmuxセッション作成
    if (-not (New-PaneLayout)) {
        Write-ErrorMessage "ペインレイアウト作成に失敗しました"
        return
    }
    
    Set-PaneCommands
    
    # Claude Code環境設定
    Set-ClaudeEnvironment
    
    # YOLO MODE自動タスク
    Start-YoloAutoTasks
    
    # 情報表示
    Show-DevelopmentInfo
    
    # セッション接続
    if ($YoloMode) {
        Write-YoloMessage "tmuxセッションにアタッチします..."
        Write-SuccessMessage "🚀 YOLO MODE起動完了！全ペインで自動並列開発が開始されました！"
    } else {
        Write-InfoMessage "tmuxセッションにアタッチします..."
        Write-InfoMessage "終了するには: Ctrl-b & (確認後 y)"
        Write-SuccessMessage "Claude Codeが各ペインで自動起動されました！"
    }
    
    # PowerShell環境でのtmux接続
    Write-Host "次のコマンドでセッションに接続してください:" -ForegroundColor Cyan
    Write-Host "tmux attach-session -t $SESSION_NAME" -ForegroundColor White
}

# スクリプト実行
Main