#!/bin/bash

# ==================================================================
# 並列ペイン専用WebUI修復コマンドシステム v1.0
# Feature別の特化修復コマンド集
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
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
# Feature-B: UI/テスト専用コマンド
# =========================

feature_b_ui_optimization() {
    local instruction="${1:-React UIコンポーネント最適化を実行}"
    echo -e "${BOLD}${BLUE}🎨 Feature-B UI最適化実行: $instruction${NC}"
    
    local cmd="claude 'Feature-B UI最適化タスク: $instruction

🎯 実行内容:
1. src/components/ 内のReact 19 TSXコンポーネント分析
2. React.memo、useCallback、useMemo最適化適用
3. アクセシビリティ属性追加・WCAG 2.1 AA準拠
4. TypeScript型安全性向上・strict mode対応
5. パフォーマンス問題自動検出・修正

📊 対象範囲:
- CommonUI.tsx (13コンポーネント)
- Layout.tsx、ErrorBoundary.tsx
- AnimatedComponents.tsx
- Toast、Modal、Table系コンポーネント

🧪 品質確認:
- ESLint React/React Hooks ルール適用
- Jest + React Testing Library テスト実行
- Accessibility audit実行

最大5ファイルまで同時処理で効率的に実行してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-B UIコマンド送信完了${NC}"
}

feature_b_test_enhancement() {
    local test_type="${1:-comprehensive}"
    echo -e "${BOLD}${CYAN}🧪 Feature-B テスト強化: $test_type${NC}"
    
    local cmd="claude 'Feature-B テスト強化タスク: $test_type テスト実装

🎯 実行内容:
1. Jest + React Testing Library テストカバレッジ向上
2. コンポーネント単体テスト追加
3. インテグレーションテスト実装
4. アクセシビリティテスト追加
5. パフォーマンステスト追加

📊 対象テスト:
- src/components/__tests__/ 内のテストファイル強化
- src/hooks/__tests__/ カスタムフックテスト
- src/utils/__tests__/ ユーティリティテスト
- E2Eテストシナリオ追加

🔧 技術要件:
- Jest 29.7.0 + jsdom環境
- @testing-library/react 14.3.1
- @testing-library/user-event 14.5.2
- カバレッジ85%以上目標

テスト品質と実行効率を両立してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-B テストコマンド送信完了${NC}"
}

# =========================
# Feature-C: API開発専用コマンド
# =========================

feature_c_api_enhancement() {
    local api_focus="${1:-services}"
    echo -e "${BOLD}${GREEN}🔧 Feature-C API強化: $api_focus${NC}"
    
    local cmd="claude 'Feature-C API強化タスク: $api_focus 最適化

🎯 実行内容:
1. src/services/ 内のAPIサービス分析・リファクタリング
2. TypeScript型定義強化・strict mode対応
3. async/await エラーハンドリング改善
4. API レスポンス型安全性向上
5. パフォーマンス最適化・キャッシュ機能追加

📊 対象ファイル:
- authApiService.ts (認証API)
- assetApiService.ts (資産管理API)
- incidentApiService.ts (インシデント管理API)
- apiUtils.ts (共通ユーティリティ)
- src/types/ 内の型定義ファイル

🔧 技術改善:
- fetch → axios移行検討
- エラーレスポンス統一
- リクエスト/レスポンス型定義強化
- 自動リトライ機能追加
- API呼び出し監視・ログ機能

最大3サービスファイル同時処理で効率化してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-C APIコマンド送信完了${NC}"
}

feature_c_type_safety() {
    local strictness="${1:-enhanced}"
    echo -e "${BOLD}${PURPLE}📝 Feature-C 型安全性強化: $strictness${NC}"
    
    local cmd="claude 'Feature-C TypeScript型安全性強化: $strictness レベル

🎯 実行内容:
1. src/types/ 内の型定義ファイル強化
2. APIレスポンス型の厳密化
3. Union Types、Literal Types活用
4. Generic Types による再利用性向上
5. TypeScript strict設定段階的導入

📊 対象領域:
- asset.ts, incident.ts, user.ts
- API レスポンス型定義
- コンポーネントProps型定義
- サービス関数戻り値型
- エラーハンドリング型定義

🔧 品質向上:
- 型推論の最適化
- any型の段階的排除
- 型ガード関数追加
- ランタイム型チェック導入
- 型テストケース追加

型安全性とコード可読性を両立してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-C 型安全性コマンド送信完了${NC}"
}

# =========================
# Feature-D: PowerShell統合専用コマンド
# =========================

feature_d_powershell_integration() {
    local integration_type="${1:-webui}"
    echo -e "${BOLD}${YELLOW}💻 Feature-D PowerShell統合: $integration_type${NC}"
    
    local cmd="claude 'Feature-D PowerShell統合最適化: $integration_type 連携強化

🎯 実行内容:
1. WebUI-PowerShell連携コードレビュー・改善
2. バックエンドAPI接続最適化
3. エラーハンドリング・ログ機能強化
4. セキュリティ設定・認証機能チェック
5. Windows統合機能・COM連携改善

📊 対象領域:
- backend/api/*.ps1 PowerShell APIファイル
- backend/modules/ PowerShell共通モジュール
- WebUI-PowerShell間データ交換
- 認証・セッション管理
- ファイル・レジストリ操作

🔧 技術改善:
- PowerShell 7.x 対応
- JSON データ交換最適化
- エラー情報詳細化
- 非同期処理改善
- セキュリティポリシー強化

PowerShell関連ファイルを集中修復してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-D PowerShellコマンド送信完了${NC}"
}

feature_d_windows_integration() {
    local windows_feature="${1:-system}"
    echo -e "${BOLD}${CYAN}🪟 Feature-D Windows統合: $windows_feature${NC}"
    
    local cmd="claude 'Feature-D Windows統合機能強化: $windows_feature 機能

🎯 実行内容:
1. Windows システム情報取得機能改善
2. Active Directory連携強化
3. WMI・CIM操作最適化
4. レジストリ操作・設定管理改善
5. Windows Service・Task統合

📊 対象機能:
- システム監視・ヘルスチェック
- ユーザー・グループ管理
- ファイル・フォルダー操作
- ネットワーク設定管理
- セキュリティポリシー管理

🔧 技術強化:
- PowerShell DSC活用
- Windows API呼び出し最適化
- COM オブジェクト操作改善
- イベントログ管理強化
- 自動化スクリプト最適化

Windows環境での運用効率を向上させてください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-D Windows統合コマンド送信完了${NC}"
}

# =========================
# Feature-E: 品質・セキュリティ専用コマンド
# =========================

feature_e_quality_audit() {
    local audit_scope="${1:-comprehensive}"
    echo -e "${BOLD}${RED}🔒 Feature-E 品質監査: $audit_scope${NC}"
    
    local cmd="claude 'Feature-E 包括的品質・セキュリティ監査: $audit_scope スコープ

🎯 実行内容:
1. ESLint・Prettier設定最適化・ルール強化
2. セキュリティ脆弱性スキャン・修復
3. アクセシビリティ監査・WCAG 2.1 AA準拠確認
4. パフォーマンス最適化・Web Vitals改善
5. コード品質メトリクス測定・改善提案

📊 監査対象:
- 全TypeScript/JSXファイル品質チェック
- 依存関係セキュリティ監査
- アクセシビリティ自動テスト
- バンドルサイズ・パフォーマンス分析
- API セキュリティ検証

🔧 品質基準:
- ESLint: 0エラー、0警告
- TypeScript: strict mode完全対応
- Accessibility: WCAG 2.1 AA 100%準拠
- Performance: Core Web Vitals Good範囲
- Security: OWASP基準準拠

総合的な品質向上を実施してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-E 品質監査コマンド送信完了${NC}"
}

feature_e_security_scan() {
    local security_level="${1:-enterprise}"
    echo -e "${BOLD}${PURPLE}🛡️ Feature-E セキュリティスキャン: $security_level${NC}"
    
    local cmd="claude 'Feature-E セキュリティスキャン・強化: $security_level レベル

🎯 実行内容:
1. 依存関係脆弱性スキャン・パッチ適用
2. XSS・CSRF・SQLインジェクション対策確認
3. 認証・認可機能セキュリティ監査
4. 機密情報漏洩チェック・暗号化強化
5. OWASP Top 10対策実装状況確認

📊 スキャン範囲:
- npm audit + snyk による依存関係監査
- 認証トークン・セッション管理
- フロントエンド・バックエンド通信
- データベース接続・クエリ
- ファイルアップロード・ダウンロード

🔧 セキュリティ強化:
- CSP (Content Security Policy) 設定
- HTTPS強制・HSTS設定
- 入力検証・サニタイゼーション
- レート制限・DDoS対策
- 監査ログ・セキュリティイベント記録

エンタープライズレベルのセキュリティを実現してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "$cmd" Enter
    echo -e "${GREEN}✅ Feature-E セキュリティコマンド送信完了${NC}"
}

# =========================
# 統合指示コマンド
# =========================

send_integrated_command() {
    local instruction="$1"
    echo -e "${BOLD}${CYAN}🎯 全Feature統合指示送信: $instruction${NC}"
    
    # Feature-A (統合リーダー) から全ペインに指示送信
    local integrated_cmd="cd /mnt/e/ServiceGrid/tmux && ./coordination/send-to-all-fixed.sh '$instruction'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_A_PANE" "$integrated_cmd" Enter
    echo -e "${GREEN}✅ 統合指示送信完了${NC}"
}

# =========================
# 並列実行コマンド
# =========================

parallel_feature_execution() {
    local task_type="${1:-optimization}"
    echo -e "${BOLD}${PURPLE}⚡ 並列Feature実行: $task_type${NC}"
    
    case "$task_type" in
        "optimization")
            feature_b_ui_optimization "React最適化" &
            feature_c_api_enhancement "API強化" &
            feature_d_powershell_integration "PowerShell統合" &
            feature_e_quality_audit "品質監査" &
            ;;
        "testing")
            feature_b_test_enhancement "comprehensive" &
            feature_c_type_safety "enhanced" &
            feature_d_windows_integration "system" &
            feature_e_security_scan "enterprise" &
            ;;
        *)
            echo -e "${RED}❌ 不明なタスクタイプ: $task_type${NC}"
            return 1
            ;;
    esac
    
    wait
    echo -e "${GREEN}✅ 並列Feature実行完了${NC}"
}

# =========================
# クイックアクションコマンド
# =========================

quick_ui_fix() {
    feature_b_ui_optimization "緊急UI修復"
}

quick_api_fix() {
    feature_c_api_enhancement "緊急API修復"
}

quick_quality_check() {
    feature_e_quality_audit "緊急品質チェック"
}

quick_full_repair() {
    parallel_feature_execution "optimization"
}

# =========================
# ヘルプ・使用方法
# =========================

show_help() {
    echo -e "${BOLD}${BLUE}並列ペイン専用WebUI修復コマンドシステム v1.0${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 [コマンド] [オプション]"
    echo ""
    echo -e "${YELLOW}Feature-B (UI/テスト) コマンド:${NC}"
    echo "  feature-b-ui [instruction]     - UIコンポーネント最適化"
    echo "  feature-b-test [type]          - テスト強化"
    echo ""
    echo -e "${YELLOW}Feature-C (API開発) コマンド:${NC}"
    echo "  feature-c-api [focus]          - API強化"
    echo "  feature-c-types [strictness]   - 型安全性強化"
    echo ""
    echo -e "${YELLOW}Feature-D (PowerShell) コマンド:${NC}"
    echo "  feature-d-ps [type]            - PowerShell統合"
    echo "  feature-d-win [feature]        - Windows統合"
    echo ""
    echo -e "${YELLOW}Feature-E (品質) コマンド:${NC}"
    echo "  feature-e-quality [scope]      - 品質監査"
    echo "  feature-e-security [level]     - セキュリティスキャン"
    echo ""
    echo -e "${YELLOW}統合・並列コマンド:${NC}"
    echo "  integrated [instruction]       - 全Feature統合指示"
    echo "  parallel [task_type]           - 並列実行"
    echo ""
    echo -e "${YELLOW}クイックアクション:${NC}"
    echo "  quick-ui                       - 緊急UI修復"
    echo "  quick-api                      - 緊急API修復"
    echo "  quick-quality                  - 緊急品質チェック"
    echo "  quick-full                     - 全Feature修復"
}

# =========================
# メイン実行部
# =========================

main() {
    case "${1:-help}" in
        "feature-b-ui")
            feature_b_ui_optimization "${2:-React UIコンポーネント最適化}"
            ;;
        "feature-b-test")
            feature_b_test_enhancement "${2:-comprehensive}"
            ;;
        "feature-c-api")
            feature_c_api_enhancement "${2:-services}"
            ;;
        "feature-c-types")
            feature_c_type_safety "${2:-enhanced}"
            ;;
        "feature-d-ps")
            feature_d_powershell_integration "${2:-webui}"
            ;;
        "feature-d-win")
            feature_d_windows_integration "${2:-system}"
            ;;
        "feature-e-quality")
            feature_e_quality_audit "${2:-comprehensive}"
            ;;
        "feature-e-security")
            feature_e_security_scan "${2:-enterprise}"
            ;;
        "integrated")
            send_integrated_command "${2:-WebUI品質向上作業を開始してください}"
            ;;
        "parallel")
            parallel_feature_execution "${2:-optimization}"
            ;;
        "quick-ui")
            quick_ui_fix
            ;;
        "quick-api")
            quick_api_fix
            ;;
        "quick-quality")
            quick_quality_check
            ;;
        "quick-full")
            quick_full_repair
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 不明なコマンド: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi