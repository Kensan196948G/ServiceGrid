# ITSM開発環境 - tmux詳細仕様書

## 📋 システム概要

### プロジェクト名
**ITSM準拠IT運用システムプラットフォーム - 5ペイン並列Claude Code開発環境**

### 技術構成
- **ターミナルマルチプレクサ**: tmux 3.x
- **AI開発支援**: Claude Code (claude-sonnet-4-20250514)
- **開発環境**: WSL2 Ubuntu + Node.js + PowerShell
- **セッション管理**: 永続化セッション対応

## 🏗️ アーキテクチャ設計

### システム構成図
```
┌─────────────────────────────────────────────────────────────┐
│                    tmux Session: itsm-dev                   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┬─────────────────┐ Window 0: main        │
│ │   Pane 1        │   Pane 2        │ Layout: 5-pane-3-tier │
│ │ Feature-B       │ Feature-C       │ Size: Dynamic         │
│ │ (UI/テスト)     │ (API開発)       │                       │
│ │ Claude: 起動済み │ Claude: 起動済み │                       │
│ ├─────────────────┼─────────────────┤                       │
│ │   Pane 3        │   Pane 4        │                       │
│ │ Feature-D       │ Feature-E       │                       │
│ │ (PowerShell)    │ (非機能要件)    │                       │
│ │ Claude: 起動済み │ Claude: 起動済み │                       │
│ ├─────────────────┴─────────────────┤                       │
│ │            Pane 5                 │                       │
│ │      Feature-A (統合リーダー)      │                       │
│ │        Claude: 起動済み           │                       │
│ └───────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### ペイン詳細仕様

#### Pane 1: Feature-B (UI/テスト)
```yaml
pane_id: 1
feature_name: "Feature-B"
feature_role: "UI/テスト"
work_directory: "/mnt/e/ServiceGrid"
position:
  tier: 1 (top)
  side: left
  coordinates: "Y≤10"
dimensions:
  width: "50% of window"
  height: "33% of window"
claude_config:
  model: "claude-sonnet-4-20250514"
  role: "フロントエンド・テスト専門Claude"
  auto_start: true
  greeting: "Feature-B（UI/テスト）担当Claude起動"
environment:
  node_env: "development"
  npm_scripts: ["dev", "test", "build", "lint"]
  frameworks: ["React 19", "TypeScript", "Vite", "Tailwind CSS"]
```

#### Pane 2: Feature-C (API開発)
```yaml
pane_id: 2
feature_name: "Feature-C"
feature_role: "API開発"
work_directory: "/mnt/e/ServiceGrid/backend"
position:
  tier: 1 (top)
  side: right
  coordinates: "Y≤10"
dimensions:
  width: "50% of window"
  height: "33% of window"
claude_config:
  model: "claude-sonnet-4-20250514"
  role: "バックエンド・API専門Claude"
  auto_start: true
  greeting: "Feature-C（API開発）担当Claude起動"
environment:
  node_env: "development"
  database: "SQLite"
  frameworks: ["Node.js", "Express", "JWT", "bcrypt"]
  api_port: 8082
```

#### Pane 3: Feature-D (PowerShell)
```yaml
pane_id: 3
feature_name: "Feature-D"
feature_role: "PowerShell"
work_directory: "/mnt/e/ServiceGrid/backend"
position:
  tier: 2 (middle)
  side: left
  coordinates: "10<Y≤20"
dimensions:
  width: "50% of window"
  height: "33% of window"
claude_config:
  model: "claude-sonnet-4-20250514"
  role: "PowerShell・Windows専門Claude"
  auto_start: true
  greeting: "Feature-D（PowerShell）担当Claude起動"
environment:
  shell: ["bash", "pwsh"]
  powershell_version: "7.x"
  integration: "Node.js ↔ PowerShell"
```

#### Pane 4: Feature-E (非機能要件)
```yaml
pane_id: 4
feature_name: "Feature-E"
feature_role: "非機能要件"
work_directory: "/mnt/e/ServiceGrid"
position:
  tier: 2 (middle)
  side: right
  coordinates: "10<Y≤20"
dimensions:
  width: "50% of window"
  height: "33% of window"
claude_config:
  model: "claude-sonnet-4-20250514"
  role: "セキュリティ・品質専門Claude"
  auto_start: true
  greeting: "Feature-E（非機能要件）担当Claude起動"
environment:
  tools: ["ESLint", "TypeScript", "Jest", "npm audit"]
  focus: ["security", "performance", "quality"]
```

#### Pane 5: Feature-A (統合リーダー)
```yaml
pane_id: 5
feature_name: "Feature-A"
feature_role: "統合リーダー"
work_directory: "/mnt/e/ServiceGrid"
position:
  tier: 3 (bottom)
  side: full_width
  coordinates: "Y>20"
dimensions:
  width: "100% of window"
  height: "34% of window"
claude_config:
  model: "claude-sonnet-4-20250514"
  role: "統括・アーキテクチャ専門Claude"
  auto_start: true
  greeting: "Feature-A（統合リーダー）担当Claude起動"
environment:
  scope: "project_wide"
  responsibilities: ["architecture", "coordination", "quality_control"]
```

## 🔧 設定ファイル仕様

### tmux設定 (session-config.conf)
```bash
# セッション基本設定
session_name="itsm-dev"
base-index=0
pane-base-index=0
default-shell=/bin/bash
default-terminal="screen-256color"

# マウス・キーバインド設定
mouse=on
prefix=C-b
repeat-time=1000
escape-time=10ms

# 表示設定
status=on
status-bg=colour235
status-fg=colour136
pane-border-style="fg=colour8"
pane-active-border-style="fg=colour4"

# 履歴・パフォーマンス
history-limit=10000
display-time=3000
```

### 環境変数設定 (.env)
```bash
# Claude API設定
ANTHROPIC_API_KEY=sk-ant-api03-***
ANTHROPIC_MODEL=claude-sonnet-4-20250514
CLAUDE_API_KEY=sk-ant-api03-***

# プロジェクト設定
VITE_API_BASE_URL=http://localhost:8082
VITE_APP_NAME=ITSM運用システムプラットフォーム
VITE_ENV=development

# セキュリティ設定
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# データベース設定
DB_PATH=./backend/db/itsm.sqlite
```

## 🚀 スクリプト仕様

### 主要スクリプト一覧

#### 1. quick-connect.sh
```bash
# 目的: 完全自動起動スクリプト
# 機能:
#   - セッション存在確認
#   - 必要に応じて新規作成
#   - Claude Code全ペイン起動
#   - 自動接続
# 実行時間: 約10秒
# 依存関係: simple-3tier.sh, auto-start-with-claude.sh
```

#### 2. simple-3tier.sh
```bash
# 目的: 3段レイアウト作成スクリプト
# 機能:
#   - 既存セッション削除
#   - 5ペイン段階的分割
#   - レイアウト調整
#   - ペイン役割設定
# 実行時間: 約5秒
# 出力: 5ペイン3段構成
```

#### 3. auto-start-with-claude.sh
```bash
# 目的: Claude Code自動起動スクリプト
# 機能:
#   - 全ペインでClaude実行
#   - 専門分野別メッセージ送信
#   - 起動完了確認
# 実行時間: 約5秒（API応答時間含む）
# 依存関係: 有効なAPIキー
```

#### 4. auto-claude-setup.sh
```bash
# 目的: Claude環境設定スクリプト
# 機能:
#   - 環境変数読み込み
#   - ペイン別ディレクトリ設定
#   - コマンド例表示
# 実行時間: 約3秒
# 用途: 初期環境構築
```

## 📐 レイアウト仕様

### 3段階レイアウトロジック
```bash
# レイアウト計算式
WINDOW_WIDTH=$(tmux display-message -p "#{window_width}")
WINDOW_HEIGHT=$(tmux display-message -p "#{window_height}")

# 段階別高さ配分
TIER1_HEIGHT=$((WINDOW_HEIGHT / 3))      # 33%
TIER2_HEIGHT=$((WINDOW_HEIGHT / 3))      # 33%
TIER3_HEIGHT=$((WINDOW_HEIGHT - TIER1_HEIGHT - TIER2_HEIGHT))  # 34%

# 段階別幅配分（1段目・2段目）
LEFT_WIDTH=$((WINDOW_WIDTH / 2))         # 50%
RIGHT_WIDTH=$((WINDOW_WIDTH - LEFT_WIDTH))  # 50%

# 3段目幅
TIER3_WIDTH=$WINDOW_WIDTH                # 100%
```

### ペイン分割順序
```bash
# Step 1: 縦3分割 (3段作成)
tmux split-window -t session.1 -v    # ペイン2作成 (2段目)
tmux split-window -t session.2 -v    # ペイン3作成 (3段目)

# Step 2: 1段目横分割
tmux split-window -t session.1 -h    # ペイン4作成 (1段目右)

# Step 3: 2段目横分割
tmux split-window -t session.2 -h    # ペイン5作成 (2段目右)

# Step 4: レイアウト調整
tmux select-layout tiled
```

## 🔄 プロセス管理

### セッション生存管理
```bash
# セッション確認
has_session() {
    tmux has-session -t "itsm-dev" 2>/dev/null
}

# 安全な終了
safe_kill() {
    tmux confirm-before -p "Kill session? (y/n)" kill-session
}

# 自動復旧
auto_recover() {
    if ! has_session; then
        ./quick-connect.sh
    fi
}
```

### ペイン監視
```bash
# ペイン生存確認
check_panes() {
    local expected_panes=5
    local current_panes=$(tmux list-panes | wc -l)
    
    if [ $current_panes -ne $expected_panes ]; then
        echo "⚠️ ペイン数異常: $current_panes (期待値: $expected_panes)"
        return 1
    fi
}

# Claude稼働確認
check_claude() {
    for pane in {1..5}; do
        # Claude応答性テスト
        tmux send-keys -t "itsm-dev.$pane" "echo 'Claude確認中...'" C-m
    done
}
```

## 🛡️ セキュリティ仕様

### APIキー保護
```bash
# 環境変数暗号化（推奨）
export ANTHROPIC_API_KEY=$(echo $ENCRYPTED_KEY | base64 -d)

# セッション終了時クリア
cleanup_session() {
    unset ANTHROPIC_API_KEY
    unset CLAUDE_API_KEY
    tmux kill-session -t itsm-dev
}

# 権限管理
chmod 600 .env                    # 所有者のみ読み書き
chown $USER:$USER .env            # 所有者設定
```

### アクセス制御
```bash
# tmuxセッション保護
tmux set-option -g @session-user "$USER"
tmux set-option -g @allowed-users "project-team"

# ログ記録
tmux_audit_log="/var/log/tmux/itsm-dev.log"
tmux set-option -g @log-file "$tmux_audit_log"
```

## 📊 パフォーマンス仕様

### リソース使用量
```yaml
memory_usage:
  tmux_session: "~50MB"
  claude_instances: "~200MB (5ペイン)"
  total_estimated: "~250MB"

cpu_usage:
  idle: "1-2%"
  active_development: "10-15%"
  claude_processing: "20-30% (一時的)"

disk_usage:
  logs: "~10MB/day"
  session_backup: "~5MB"
  total: "~15MB/day"
```

### 応答時間
```yaml
startup_time:
  session_creation: "2-3秒"
  layout_setup: "1-2秒"
  claude_startup: "3-5秒"
  total: "6-10秒"

operation_time:
  pane_switch: "<100ms"
  claude_response: "1-5秒"
  command_execution: "即座"
```

## 🔍 監視・ログ仕様

### 健全性チェック
```bash
# システム監視
health_check() {
    echo "🔍 ITSM開発環境健全性チェック"
    
    # tmuxセッション確認
    if tmux has-session -t itsm-dev; then
        echo "✅ tmuxセッション: 正常"
    else
        echo "❌ tmuxセッション: 異常"
    fi
    
    # ペイン数確認
    local pane_count=$(tmux list-panes -t itsm-dev | wc -l)
    if [ $pane_count -eq 5 ]; then
        echo "✅ ペイン数: 正常 ($pane_count)"
    else
        echo "❌ ペイン数: 異常 ($pane_count/5)"
    fi
    
    # Claude稼働確認
    if [ ! -z "$ANTHROPIC_API_KEY" ]; then
        echo "✅ Claude API: 設定済み"
    else
        echo "❌ Claude API: 未設定"
    fi
}
```

### ログ管理
```bash
# ログファイル構成
logs/
├── tmux-session.log         # セッション操作ログ
├── claude-interactions.log  # Claude対話ログ
├── system-events.log        # システムイベント
└── error.log               # エラーログ

# ログローテーション
logrotate_config="
/mnt/e/ServiceGrid/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}"
```

## 🔧 カスタマイズ仕様

### ペイン数変更
```bash
# 6ペイン構成への拡張例
modify_to_6_panes() {
    # simple-3tier.sh編集
    # - ペイン分割ロジック追加
    # - auto-start-with-claude.sh編集
    # - 新Feature-F追加
}
```

### Claude設定変更
```bash
# モデル変更
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"  # 別モデル使用

# カスタムプロンプト
CLAUDE_CUSTOM_PROMPT="あなたは${FEATURE_NAME}専門のエンジニアです..."
```

## 📋 運用チェックリスト

### 日次チェック項目
- [ ] セッション稼働確認
- [ ] 全ペインClaude応答確認
- [ ] ログファイル容量確認
- [ ] バックアップ実行

### 週次チェック項目
- [ ] パフォーマンス監視
- [ ] セキュリティ監査
- [ ] 設定ファイル整合性
- [ ] ドキュメント更新

### 月次チェック項目
- [ ] システム全体見直し
- [ ] 新機能検討
- [ ] チーム利用状況分析
- [ ] 改善提案検討

---

**📝 仕様書情報**
- **作成日**: 2025年6月14日
- **バージョン**: v1.0
- **対象システム**: ITSM開発環境
- **メンテナンス**: Claude Code AI Assistant
- **次回レビュー**: 2025年7月14日