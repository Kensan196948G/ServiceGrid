#!/bin/bash

# ==================================================================
# Feature-A統合リーダー WebUI修復ループ専用コマンド v1.0
# leader コマンド拡張 - WebUI自動修復システム統合
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly TOOLS_DIR="$PROJECT_ROOT/tmux/tools"
readonly TMUX_SESSION="itsm-requirement"

# ペイン設定
readonly FEATURE_A_PANE=4  # 統合リーダー
readonly FEATURE_B_PANE=0  # UI/テスト
readonly FEATURE_C_PANE=1  # API開発
readonly FEATURE_D_PANE=2  # PowerShell
readonly FEATURE_E_PANE=3  # 非機能要件

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# =========================
# WebUI修復ループ開始 (統合指示)
# =========================

webui_fix_all() {
    echo -e "${BOLD}${BLUE}🚀 WebUI自動修復ループ統合開始${NC}"
    
    # Feature-A から全ペインに統合指示送信
    local integrated_instruction="WebUI自動修復ループを開始してください。src/ディレクトリ内の全ファイルを対象に、最大20回の修復サイクルを実行し、React 19最適化・TypeScript強化・パフォーマンス向上・セキュリティ強化を並行実行してください。"
    
    # 統合指示実行
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "echo '=== Feature-A統合リーダー: WebUI自動修復ループ開始 ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $PROJECT_ROOT/tmux" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./coordination/send-to-all-fixed.sh '$integrated_instruction'" Enter
    
    # メイン修復ループ実行
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $TOOLS_DIR" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./auto-webui-fixer.sh &" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./progress-monitor.sh monitor" Enter
    
    echo -e "${GREEN}✅ WebUI自動修復ループ統合開始完了${NC}"
}

# =========================
# Feature別専門指示送信
# =========================

webui_fix_feature_b() {
    local instruction="React 19コンポーネント自動最適化ループ（最大20回）を実行。memo化・Hook最適化・再描画削減・アクセシビリティ改善を継続実行してください。"
    
    echo -e "${BOLD}${CYAN}🎨 Feature-B UI最適化ループ開始${NC}"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "echo '=== Feature-B UI自動最適化ループ開始 ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "cd $TOOLS_DIR" Enter
    
    local feature_b_cmd="claude '$instruction

🎯 実行詳細:
1. src/components/ 内React 19コンポーネント最適化
2. React.memo、useCallback、useMemo適用
3. 再描画問題の検出・修正
4. アクセシビリティ属性追加・WCAG 2.1 AA準拠
5. パフォーマンス問題の自動検出・修正

📊 対象ファイル:
- CommonUI.tsx（13コンポーネント）
- AnimatedComponents.tsx
- Layout.tsx、ErrorBoundary.tsx
- Toast、Modal、Table系コンポーネント

🔄 継続実行: 最大20回ループで品質85%達成まで'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "$feature_b_cmd" Enter
    
    echo -e "${GREEN}✅ Feature-B UI最適化指示送信完了${NC}"
}

webui_fix_feature_c() {
    local instruction="APIサービス・型定義自動修復ループ（最大20回）を実行。async/await最適化・エラーハンドリング強化・TypeScript型安全性向上を継続実行してください。"
    
    echo -e "${BOLD}${GREEN}🔧 Feature-C API修復ループ開始${NC}"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "echo '=== Feature-C API自動修復ループ開始 ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "cd $TOOLS_DIR" Enter
    
    local feature_c_cmd="claude '$instruction

🎯 実行詳細:
1. src/services/ 内APIサービス分析・最適化
2. src/types/ 内TypeScript型定義強化
3. async/await エラーハンドリング改善
4. API レスポンス型安全性向上
5. 非同期処理パフォーマンス最適化

📊 対象ファイル:
- authApiService.ts（認証API）
- assetApiService.ts（資産管理API）
- incidentApiService.ts（インシデント管理API）
- apiUtils.ts（共通ユーティリティ）
- 全型定義ファイル（asset.ts, incident.ts等）

🔄 継続実行: 最大20回ループで型安全性100%達成まで'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "$feature_c_cmd" Enter
    
    echo -e "${GREEN}✅ Feature-C API修復指示送信完了${NC}"
}

webui_fix_feature_d() {
    local instruction="PowerShell統合自動修復ループ（最大20回）を実行。Windows API連携・セキュリティ強化・エラーハンドリング向上を継続実行してください。"
    
    echo -e "${BOLD}${YELLOW}💻 Feature-D PowerShell修復ループ開始${NC}"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "echo '=== Feature-D PowerShell自動修復ループ開始 ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "cd $TOOLS_DIR" Enter
    
    local feature_d_cmd="claude '$instruction

🎯 実行詳細:
1. backend/api/*.ps1 PowerShell APIファイル最適化
2. backend/modules/ PowerShell共通モジュール強化
3. WebUI-PowerShell間データ交換最適化
4. Windows API連携・COM操作改善
5. セキュリティポリシー・認証機能強化

📊 対象ファイル:
- Assets.ps1（資産管理PowerShell API）
- 全PowerShell APIファイル
- PowerShell共通モジュール
- Windows統合機能スクリプト

🔄 継続実行: 最大20回ループでPowerShell統合100%完成まで'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "$feature_d_cmd" Enter
    
    echo -e "${GREEN}✅ Feature-D PowerShell修復指示送信完了${NC}"
}

webui_fix_feature_e() {
    local instruction="品質セキュリティ自動監査ループ（最大20回）を実行。ESLint修復・セキュリティ脆弱性スキャン・パフォーマンス最適化を継続実行してください。"
    
    echo -e "${BOLD}${RED}🔒 Feature-E 品質監査ループ開始${NC}"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "echo '=== Feature-E 品質セキュリティ自動監査ループ開始 ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "cd $TOOLS_DIR" Enter
    
    local feature_e_cmd="claude '$instruction

🎯 実行詳細:
1. ESLint・Prettier設定最適化・全エラー修復
2. セキュリティ脆弱性スキャン・OWASP基準準拠
3. アクセシビリティ監査・WCAG 2.1 AA 100%準拠
4. パフォーマンス最適化・Web Vitals改善
5. コード品質メトリクス測定・継続改善

📊 監査範囲:
- 全TypeScript/JSXファイル品質チェック
- 依存関係セキュリティ監査（npm audit + snyk）
- バンドルサイズ・パフォーマンス分析
- アクセシビリティ自動テスト
- API セキュリティ検証

🔄 継続実行: 最大20回ループで品質スコア95%達成まで'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "$feature_e_cmd" Enter
    
    echo -e "${GREEN}✅ Feature-E 品質監査指示送信完了${NC}"
}

# =========================
# WebUI修復状況確認
# =========================

webui_status() {
    echo -e "${BOLD}${PURPLE}📊 WebUI修復進捗状況確認${NC}"
    
    # 進捗監視スクリプト実行
    if [[ -f "$TOOLS_DIR/progress-monitor.sh" ]]; then
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $TOOLS_DIR" Enter
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./progress-monitor.sh status" Enter
    else
        echo -e "${RED}❌ 進捗監視スクリプトが見つかりません${NC}"
    fi
    
    echo -e "${GREEN}✅ WebUI修復状況確認実行${NC}"
}

# =========================
# WebUI修復レポート表示
# =========================

webui_report() {
    echo -e "${BOLD}${BLUE}📋 WebUI修復レポート表示${NC}"
    
    # レポート表示スクリプト実行
    if [[ -f "$TOOLS_DIR/auto-webui-fixer.sh" ]]; then
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $TOOLS_DIR" Enter
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./auto-webui-fixer.sh --report" Enter
    fi
    
    # 分析レポート表示
    if [[ -f "$TOOLS_DIR/repair-analyzer.sh" ]]; then
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./repair-analyzer.sh report" Enter
    fi
    
    echo -e "${GREEN}✅ WebUI修復レポート表示実行${NC}"
}

# =========================
# WebUI品質監視開始
# =========================

webui_monitor() {
    echo -e "${BOLD}${CYAN}📡 WebUI品質リアルタイム監視開始${NC}"
    
    # 品質監視スクリプト実行
    if [[ -f "$TOOLS_DIR/progress-monitor.sh" ]]; then
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $TOOLS_DIR" Enter
        tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./progress-monitor.sh monitor" Enter
    else
        echo -e "${RED}❌ 品質監視スクリプトが見つかりません${NC}"
    fi
    
    echo -e "${GREEN}✅ WebUI品質監視開始完了${NC}"
}

# =========================
# 統合WebUI修復実行（全Feature同時）
# =========================

webui_fix_all_features() {
    echo -e "${BOLD}${PURPLE}⚡ 全Feature WebUI修復同時実行${NC}"
    
    # 各Feature並列実行
    webui_fix_feature_b &
    sleep 2
    webui_fix_feature_c &
    sleep 2
    webui_fix_feature_d &
    sleep 2
    webui_fix_feature_e &
    
    # 統合監視開始
    sleep 5
    webui_monitor
    
    echo -e "${GREEN}✅ 全Feature WebUI修復同時実行完了${NC}"
}

# =========================
# WebUI緊急修復（高優先度問題のみ）
# =========================

webui_emergency_fix() {
    echo -e "${BOLD}${RED}🚨 WebUI緊急修復実行${NC}"
    
    # Critical・High優先度問題のみ修復
    local emergency_instruction="緊急修復モード: Critical・High優先度問題のみを対象に、最大5回の高速修復サイクルを実行してください。TypeScriptエラー・ビルド阻害要因・セキュリティ脆弱性を最優先で修復してください。"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "cd $PROJECT_ROOT/tmux" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "./coordination/send-to-all-fixed.sh '$emergency_instruction'" Enter
    
    echo -e "${GREEN}✅ WebUI緊急修復指示送信完了${NC}"
}

# =========================
# ヘルプ表示
# =========================

show_webui_help() {
    echo -e "${BOLD}${BLUE}WebUI修復 leader コマンド拡張 v1.0${NC}"
    echo ""
    echo -e "${YELLOW}利用可能なコマンド:${NC}"
    echo ""
    echo -e "${GREEN}🚀 基本WebUI修復コマンド:${NC}"
    echo "  webui-fix                      - WebUI自動修復ループ統合開始"
    echo "  webui-fix-all                  - 全Feature WebUI修復同時実行"
    echo "  webui-emergency                - WebUI緊急修復（高優先度のみ）"
    echo ""
    echo -e "${CYAN}🎯 Feature別WebUI修復:${NC}"
    echo "  webui-fix-ui                   - Feature-B UI最適化ループ"
    echo "  webui-fix-api                  - Feature-C API修復ループ"
    echo "  webui-fix-ps                   - Feature-D PowerShell修復ループ"
    echo "  webui-fix-security             - Feature-E 品質監査ループ"
    echo ""
    echo -e "${PURPLE}📊 監視・レポートコマンド:${NC}"
    echo "  webui-status                   - WebUI修復進捗確認"
    echo "  webui-report                   - WebUI修復レポート表示"
    echo "  webui-monitor                  - WebUI品質リアルタイム監視"
    echo ""
    echo -e "${YELLOW}使用例:${NC}"
    echo "  leader all --auto-approve webui-fix"
    echo "  leader ui webui-fix-ui"
    echo "  leader all webui-status"
}

# =========================
# メイン実行部
# =========================

case "${1:-help}" in
    "webui-fix"|"fix")
        webui_fix_all
        ;;
    "webui-fix-all"|"fix-all")
        webui_fix_all_features
        ;;
    "webui-fix-ui"|"fix-ui")
        webui_fix_feature_b
        ;;
    "webui-fix-api"|"fix-api")
        webui_fix_feature_c
        ;;
    "webui-fix-ps"|"fix-ps")
        webui_fix_feature_d
        ;;
    "webui-fix-security"|"fix-security")
        webui_fix_feature_e
        ;;
    "webui-emergency"|"emergency")
        webui_emergency_fix
        ;;
    "webui-status"|"status")
        webui_status
        ;;
    "webui-report"|"report")
        webui_report
        ;;
    "webui-monitor"|"monitor")
        webui_monitor
        ;;
    "help"|"-h"|"--help")
        show_webui_help
        ;;
    *)
        echo -e "${RED}❌ 不明なWebUIコマンド: $1${NC}"
        show_webui_help
        exit 1
        ;;
esac