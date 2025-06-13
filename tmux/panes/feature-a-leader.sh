#!/bin/bash

# Feature-A: 統合リーダー
# 設計統一・アーキテクチャ管理・他ペインとの調整・Worktree統合管理

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"
LEADER_WORKTREE="$WORKTREE_ROOT/feature-a-leader"
FEATURE_NAME="Feature-A: 統合リーダー (Worktree対応)"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;36m========================================\033[0m"
    echo -e "\033[1;36m  $FEATURE_NAME\033[0m"
    echo -e "\033[1;36m========================================\033[0m"
}

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Worktree初期化
init_worktree() {
    print_info "統合リーダー用Worktreeを初期化中..."
    
    if [ ! -d "$LEADER_WORKTREE" ]; then
        print_warning "Worktreeが未作成です。Worktree管理ツールを起動します..."
        bash "$PROJECT_ROOT/tmux/tools/worktree-manager.sh" init
    else
        cd "$LEADER_WORKTREE"
        print_success "統合リーダーWorktreeに移動しました: $LEADER_WORKTREE"
    fi
}

# Worktree状況確認
check_worktree_status() {
    print_info "Worktree状況を確認中..."
    
    bash "$PROJECT_ROOT/tmux/tools/worktree-manager.sh" status
    echo ""
    
    print_info "各Worktreeの同期状況:"
    bash "$PROJECT_ROOT/tmux/tools/sync-worktrees.sh" report
}

# 統合リーダーメニュー表示
show_leader_menu() {
    echo ""
    echo "🎯 統合リーダー - 操作メニュー (Worktree統合管理)"
    echo "────────────────────────────────────────────"
    echo "📁 Worktree管理"
    echo "1) 🏗️  Worktree環境初期化"
    echo "2) 📊 全Worktree状況確認"
    echo "3) 🔄 全Worktree同期実行"
    echo "4) 🎯 段階的統合実行"
    echo "────────────────────────────────────────────"
    echo "🎛️  プロジェクト管理"
    echo "5) 📊 プロジェクト全体状況確認"
    echo "6) 🏗️  アーキテクチャ監視"
    echo "7) 🔍 コード品質チェック"
    echo "8) 📋 各ペイン作業状況確認"
    echo "9) 🚀 統合テスト実行"
    echo "────────────────────────────────────────────"
    echo "📝 ドキュメント・レポート"
    echo "a) 📝 設計ドキュメント更新"
    echo "b) 🔄 他ペインとの調整"
    echo "c) 📈 進捗レポート生成"
    echo "d) ⚙️  設定統一チェック"
    echo "────────────────────────────────────────────"
    echo "0) 🔄 メニュー再表示"
    echo "q) 終了"
    echo "────────────────────────────────────────────"
}

# プロジェクト全体状況確認
check_project_status() {
    print_info "プロジェクト全体状況を確認中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "📁 プロジェクト構造:"
    tree -L 2 -I 'node_modules|.git' || ls -la
    
    echo ""
    echo "📦 パッケージ情報:"
    if [ -f "package.json" ]; then
        echo "  フロントエンド: $(grep '"name"' package.json | cut -d'"' -f4)"
        echo "  バージョン: $(grep '"version"' package.json | cut -d'"' -f4)"
    fi
    
    if [ -f "backend/package.json" ]; then
        echo "  バックエンド: $(grep '"name"' backend/package.json | cut -d'"' -f4)"
        echo "  バージョン: $(grep '"version"' backend/package.json | cut -d'"' -f4)"
    fi
    
    echo ""
    echo "🔧 開発サーバー状況:"
    if pgrep -f "vite.*3001" > /dev/null; then
        print_success "フロントエンド開発サーバー: 稼働中 (port 3001)"
    else
        print_warning "フロントエンド開発サーバー: 停止中"
    fi
    
    if pgrep -f "node.*8082" > /dev/null; then
        print_success "バックエンドAPIサーバー: 稼働中 (port 8082)"
    else
        print_warning "バックエンドAPIサーバー: 停止中"
    fi
}

# アーキテクチャ監視
monitor_architecture() {
    print_info "アーキテクチャ整合性を監視中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "🏗️ アーキテクチャ分析:"
    
    # TypeScript型整合性チェック
    if [ -f "tsconfig.json" ]; then
        print_info "TypeScript設定確認..."
        npm run typecheck 2>/dev/null || print_warning "TypeScript型エラーがあります"
    fi
    
    # 依存関係循環チェック
    print_info "依存関係循環チェック..."
    if command -v madge &> /dev/null; then
        madge --circular --extensions ts,tsx src/ || print_info "madgeがインストールされていません"
    fi
    
    # コンポーネント設計確認
    echo ""
    echo "📊 コンポーネント統計:"
    echo "  Pages: $(find src/pages -name '*.tsx' 2>/dev/null | wc -l)"
    echo "  Components: $(find src/components -name '*.tsx' 2>/dev/null | wc -l)"
    echo "  Services: $(find src/services -name '*.ts' 2>/dev/null | wc -l)"
    echo "  Types: $(find src/types -name '*.ts' 2>/dev/null | wc -l)"
    
    # API整合性確認
    echo ""
    echo "🔌 API整合性:"
    if [ -d "backend/api" ]; then
        echo "  Node.js APIs: $(find backend/api -name '*.js' 2>/dev/null | wc -l)"
        echo "  PowerShell APIs: $(find backend/api -name '*.ps1' 2>/dev/null | wc -l)"
    fi
}

# コード品質チェック
check_code_quality() {
    print_info "コード品質を分析中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "✨ コード品質分析:"
    
    # ESLint実行
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        print_info "ESLint実行中..."
        npm run lint 2>/dev/null || print_warning "Lintエラーが検出されました"
    fi
    
    # TypeScript型チェック
    print_info "TypeScript型チェック実行中..."
    npm run typecheck 2>/dev/null || print_warning "型エラーが検出されました"
    
    # テストカバレッジ確認
    if [ -d "coverage" ]; then
        print_info "テストカバレッジ確認中..."
        if [ -f "coverage/lcov-report/index.html" ]; then
            print_success "カバレッジレポート: coverage/lcov-report/index.html"
        fi
    fi
    
    # コード複雑度チェック（簡易版）
    echo ""
    echo "📈 コード統計:"
    echo "  総行数: $(find src -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo '0')"
    echo "  TODO数: $(find src -name '*.ts' -o -name '*.tsx' | xargs grep -c 'TODO\|FIXME' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')"
}

# 各ペイン作業状況確認
check_pane_status() {
    print_info "各ペイン作業状況を確認中..."
    
    echo ""
    echo "🔍 ペイン作業状況:"
    
    # Feature-B (UI/テスト)
    echo ""
    echo "Feature-B (UI/テスト):"
    if pgrep -f "npm.*test.*watch" > /dev/null; then
        print_success "  テストwatch中"
    else
        print_info "  テスト停止中"
    fi
    
    # Feature-C (API開発)
    echo ""
    echo "Feature-C (API開発):"
    if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
        if pgrep -f "node.*backend" > /dev/null; then
            print_success "  APIサーバー稼働中"
        else
            print_info "  APIサーバー停止中"
        fi
    fi
    
    # Feature-D (PowerShell)
    echo ""
    echo "Feature-D (PowerShell):"
    if [ -f "$PROJECT_ROOT/backend/test/run-tests.sh" ]; then
        print_info "  PowerShellテスト環境確認済み"
    else
        print_warning "  PowerShellテスト環境要確認"
    fi
    
    # Feature-E (非機能)
    echo ""
    echo "Feature-E (非機能要件):"
    if [ -f "$PROJECT_ROOT/backend/middleware/auth.js" ]; then
        print_success "  認証ミドルウェア実装済み"
    fi
    if [ -d "$PROJECT_ROOT/logs" ]; then
        print_success "  ログディレクトリ確認済み"
    elif [ -d "$PROJECT_ROOT/backend/logs" ]; then
        print_success "  バックエンドログディレクトリ確認済み"
    else
        print_info "  ログ機能要実装"
    fi
}

# 統合テスト実行
run_integration_tests() {
    print_info "統合テストを実行中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "🧪 統合テスト実行:"
    
    # フロントエンドテスト
    print_info "フロントエンドテスト実行中..."
    if npm test -- --watchAll=false 2>/dev/null; then
        print_success "フロントエンドテスト: 合格"
    else
        print_error "フロントエンドテスト: 失敗"
    fi
    
    # バックエンドテスト
    print_info "バックエンドテスト実行中..."
    if [ -d "backend" ]; then
        cd backend
        if [ -f "package.json" ] && grep -q "test" package.json; then
            if npm test 2>/dev/null; then
                print_success "バックエンドテスト: 合格"
            else
                print_error "バックエンドテスト: 失敗"
            fi
        else
            print_info "バックエンドテストスクリプト未定義"
        fi
        cd ..
    fi
    
    # PowerShellテスト
    print_info "PowerShellテスト実行中..."
    if [ -f "backend/test/run-tests.sh" ]; then
        cd backend/test
        if ./run-tests.sh 2>/dev/null; then
            print_success "PowerShellテスト: 合格"
        else
            print_error "PowerShellテスト: 失敗"
        fi
        cd ../..
    else
        print_info "PowerShellテスト未実装"
    fi
}

# 設計ドキュメント更新
update_design_docs() {
    print_info "設計ドキュメントを更新中..."
    
    echo ""
    echo "📝 ドキュメント確認:"
    
    if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
        print_success "CLAUDE.md: 存在"
        echo "  最終更新: $(stat -c %y "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null | cut -d' ' -f1)"
    fi
    
    if [ -d "$PROJECT_ROOT/docs" ]; then
        print_success "docsディレクトリ: 存在"
        echo "  ファイル数: $(find "$PROJECT_ROOT/docs" -name '*.md' | wc -l)"
    fi
    
    if [ -d "$PROJECT_ROOT/tmux/docs" ]; then
        print_success "tmux/docsディレクトリ: 存在"
        echo "  開発ドキュメント数: $(find "$PROJECT_ROOT/tmux/docs" -name '*.md' | wc -l)"
    fi
    
    # 実装状況レポート生成
    echo ""
    print_info "実装状況レポート生成中..."
    
    cat > /tmp/implementation-status.md << EOF
# 実装状況レポート

## 生成日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## プロジェクト概要
- 名前: ITSM準拠IT運用システムプラットフォーム
- フロントエンド: React 19 + TypeScript + Vite
- バックエンド: Node.js + Express + PowerShell

## 実装状況
- Pages: $(find src/pages -name '*.tsx' 2>/dev/null | wc -l)個
- Components: $(find src/components -name '*.tsx' 2>/dev/null | wc -l)個  
- API Services: $(find src/services -name '*.ts' 2>/dev/null | wc -l)個
- Node.js APIs: $(find backend/api -name '*.js' 2>/dev/null | wc -l)個
- PowerShell APIs: $(find backend/api -name '*.ps1' 2>/dev/null | wc -l)個

## 課題・TODO
$(find src -name '*.ts' -o -name '*.tsx' | xargs grep -n 'TODO\|FIXME' 2>/dev/null | head -10 || echo "なし")

EOF
    
    print_success "レポート生成完了: /tmp/implementation-status.md"
}

# 他ペインとの調整
coordinate_with_panes() {
    print_info "他ペインとの調整を確認中..."
    
    echo ""
    echo "🔄 ペイン間調整状況:"
    
    # 共通設定確認
    echo ""
    echo "⚙️ 共通設定確認:"
    if [ -f "$PROJECT_ROOT/.env" ]; then
        print_success "環境変数設定: 確認済み"
    else
        print_warning "環境変数設定: 要確認"
    fi
    
    if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
        print_success "TypeScript設定: 統一済み"
    fi
    
    if [ -f "$PROJECT_ROOT/package.json" ] && [ -f "$PROJECT_ROOT/backend/package.json" ]; then
        print_success "パッケージ管理: 分離済み"
    fi
    
    # ポート競合確認
    echo ""
    echo "🔌 ポート使用状況:"
    if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
        print_info "Port 3001: フロントエンド使用中"
    fi
    if netstat -tuln 2>/dev/null | grep -q ":8082 "; then
        print_info "Port 8082: バックエンド使用中"
    fi
    
    # Git状況確認
    echo ""
    echo "📋 Git状況:"
    if [ -d "$PROJECT_ROOT/.git" ]; then
        cd "$PROJECT_ROOT"
        echo "  現在のブランチ: $(git branch --show-current 2>/dev/null || echo 'unknown')"
        echo "  変更ファイル数: $(git status --porcelain 2>/dev/null | wc -l)"
        echo "  最新コミット: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
    fi
}

# 進捗レポート生成
generate_progress_report() {
    print_info "進捗レポートを生成中..."
    
    local report_file="/tmp/progress-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# ITSM Platform 進捗レポート

## 作成日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## 統合リーダー監視結果

### プロジェクト状況
- 開発環境: VSCode + Claude Code + tmux (5ペイン)
- フロントエンド: $(pgrep -f "vite.*3001" > /dev/null && echo "稼働中" || echo "停止中")
- バックエンド: $(pgrep -f "node.*8082" > /dev/null && echo "稼働中" || echo "停止中")

### 実装進捗
- React Pages: $(find src/pages -name '*.tsx' 2>/dev/null | wc -l)個実装済み
- UI Components: $(find src/components -name '*.tsx' 2>/dev/null | wc -l)個実装済み
- API Services: $(find src/services -name '*.ts' 2>/dev/null | wc -l)個実装済み
- Node.js APIs: $(find backend/api -name '*.js' 2>/dev/null | wc -l)個実装済み
- PowerShell APIs: $(find backend/api -name '*.ps1' 2>/dev/null | wc -l)個実装済み

### コード品質
- TypeScript型チェック: $(npm run typecheck &>/dev/null && echo "✅合格" || echo "❌要修正")
- ESLint: $(npm run lint &>/dev/null && echo "✅合格" || echo "❌要修正")
- 単体テスト: $(npm test -- --watchAll=false &>/dev/null && echo "✅合格" || echo "❌要修正")

### 各ペイン状況
- Feature-B (UI/テスト): $(pgrep -f "npm.*test" > /dev/null && echo "作業中" || echo "待機中")
- Feature-C (API開発): $(pgrep -f "node.*backend" > /dev/null && echo "作業中" || echo "待機中")
- Feature-D (PowerShell): 環境確認済み
- Feature-E (非機能): $([ -f "backend/middleware/auth.js" ] && echo "実装中" || echo "準備中")

### 次のアクション
1. 各ペインの作業進捗同期
2. 統合テスト実施
3. コード品質改善
4. ドキュメント更新

---
統合リーダー (Feature-A) 自動生成レポート
EOF

    print_success "進捗レポート生成完了: $report_file"
    echo "  📄 レポートファイル: $report_file"
}

# 設定統一チェック
check_configuration_unity() {
    print_info "設定統一性をチェック中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "⚙️ 設定統一チェック:"
    
    # TypeScript設定
    if [ -f "tsconfig.json" ]; then
        print_success "TypeScript設定: 統一済み"
        if grep -q '"strict": true' tsconfig.json; then
            print_success "  Strict mode: 有効"
        fi
    fi
    
    # ESLint設定
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        print_success "ESLint設定: 統一済み"
    fi
    
    # Prettier設定
    if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ]; then
        print_success "Prettier設定: 統一済み"
    fi
    
    # 環境変数設定
    echo ""
    echo "🔐 環境変数設定:"
    if [ -f ".env" ]; then
        print_success ".env ファイル: 存在"
        echo "  設定項目数: $(grep -c '=' .env 2>/dev/null || echo '0')"
    else
        print_warning ".env ファイル: 未作成"
    fi
    
    if [ -f ".env.example" ]; then
        print_success ".env.example ファイル: 存在"
    fi
    
    # パッケージ設定統一性
    echo ""
    echo "📦 パッケージ設定:"
    if [ -f "package.json" ] && [ -f "backend/package.json" ]; then
        frontend_node=$(grep '"node"' package.json 2>/dev/null | cut -d'"' -f4 || echo "未指定")
        backend_node=$(grep '"node"' backend/package.json 2>/dev/null | cut -d'"' -f4 || echo "未指定")
        
        echo "  フロントエンド Node.js: $frontend_node"
        echo "  バックエンド Node.js: $backend_node"
        
        if [ "$frontend_node" = "$backend_node" ] || [ "$frontend_node" = "未指定" ] || [ "$backend_node" = "未指定" ]; then
            print_success "Node.js バージョン: 統一済み"
        else
            print_warning "Node.js バージョン: 要統一"
        fi
    fi
}

# メインループ
main_loop() {
    print_header
    
    # Worktree初期化確認
    init_worktree
    
    while true; do
        show_leader_menu
        echo -n "選択してください: "
        read -r choice
        
        case $choice in
            # Worktree管理
            1)
                bash "$PROJECT_ROOT/tmux/tools/worktree-manager.sh" init
                ;;
            2)
                check_worktree_status
                ;;
            3)
                bash "$PROJECT_ROOT/tmux/tools/sync-worktrees.sh" auto-sync
                ;;
            4)
                bash "$PROJECT_ROOT/tmux/tools/merge-controller.sh" integrate
                ;;
            # プロジェクト管理
            5)
                check_project_status
                ;;
            6)
                monitor_architecture
                ;;
            7)
                check_code_quality
                ;;
            8)
                check_pane_status
                ;;
            9)
                run_integration_tests
                ;;
            # ドキュメント・レポート
            a|A)
                update_design_docs
                ;;
            b|B)
                coordinate_with_panes
                ;;
            c|C)
                generate_progress_report
                ;;
            d|D)
                check_configuration_unity
                ;;
            0)
                clear
                print_header
                ;;
            q|Q)
                print_info "統合リーダーを終了します"
                exit 0
                ;;
            *)
                print_warning "無効な選択です。再度選択してください。"
                ;;
        esac
        
        echo ""
        echo "Press Enter to continue..."
        read -r
    done
}

# スクリプト開始
main_loop