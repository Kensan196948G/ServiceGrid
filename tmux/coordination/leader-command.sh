#!/bin/bash

# Feature-A統合リーダー専用コマンドインターフェース
# ペイン4（Feature-A-Leader）から他のペインに指示を送信

SESSION="itsm-requirement"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_usage() {
    echo "🎯 Feature-A統合リーダー コマンドインターフェース"
    echo ""
    echo "使用方法:"
    echo "  $0 <command> [options] 'message'"
    echo ""
    echo "Commands:"
    echo "  all     - 全ペインに指示送信"
    echo "  ui      - Feature-B (UI/テスト) に指示"
    echo "  api     - Feature-C (API開発) に指示"
    echo "  ps      - Feature-D (PowerShell) に指示"
    echo "  sec     - Feature-E (非機能要件) に指示"
    echo "  demo    - 連携デモ実行"
    echo "  status  - 各ペインの状況確認"
    echo ""
    echo "🚀 WebUI自動修復コマンド:"
    echo "  webui-fix               - WebUI自動修復ループ統合開始"
    echo "  webui-fix-all           - 全Feature WebUI修復同時実行"
    echo "  webui-fix-ui            - Feature-B UI最適化ループ"
    echo "  webui-fix-api           - Feature-C API修復ループ"
    echo "  webui-fix-ps            - Feature-D PowerShell修復ループ"
    echo "  webui-fix-security      - Feature-E 品質監査ループ"
    echo "  webui-emergency         - WebUI緊急修復"
    echo "  webui-status            - WebUI修復進捗確認"
    echo "  webui-report            - WebUI修復レポート表示"
    echo "  webui-monitor           - WebUI品質リアルタイム監視"
    echo ""
    echo "Options (allコマンド用):"
    echo "  --files PATTERN       参照ファイル指定"
    echo "  --model MODEL         使用モデル指定"
    echo "  --auto-approve        自動承認モード"
    echo "  --at-claude           @claude指示形式を使用"
    echo ""
    echo "例:"
    echo "  $0 all 'プロジェクトの現状を報告してください'"
    echo "  $0 ui 'フロントエンドのテストを実行してください'"
    echo "  $0 api 'データベーススキーマを確認してください'"
    echo "  $0 all --files 'package.json,*.md' 'プロジェクト概要を確認'"
    echo "  $0 all --at-claude 'UIテストを実行してください'"
    echo "  $0 demo  # 連携デモ実行"
    echo ""
    echo "🚀 WebUI修復例:"
    echo "  $0 webui-fix                    # 統合WebUI修復開始"
    echo "  $0 webui-fix-all                # 全Feature同時修復"
    echo "  $0 webui-fix-ui                 # UI専門修復"
    echo "  $0 webui-status                 # 修復進捗確認"
    echo ""
}

# Feature-A-Leaderペインからの実行確認
check_leader_context() {
    # 現在のペインがFeature-A-Leaderかチェック
    local current_pane=$(tmux display-message -p "#{pane_index}")
    if [ "$current_pane" != "4" ]; then
        echo "⚠️  このコマンドはFeature-A-Leader (ペイン4) から実行してください"
        echo "💡 移動方法: Ctrl+b + 4"
        echo ""
    fi
}

# ペイン状況確認
check_pane_status() {
    echo "📊 各ペイン状況確認"
    echo "===================="
    
    local panes=(
        "0:Feature-B-UI:フロントエンド"
        "1:Feature-C-API:バックエンド"
        "2:Feature-D-PowerShell:PowerShell"
        "3:Feature-E-NonFunc:非機能要件"
        "4:Feature-A-Leader:統合リーダー"
    )
    
    for pane in "${panes[@]}"; do
        IFS=':' read -r num name desc <<< "$pane"
        
        if tmux list-panes -t "$SESSION" | grep -q "^$num:"; then
            echo "✅ ペイン$num: $name ($desc) - 動作中"
        else
            echo "❌ ペイン$num: $name ($desc) - 未検出"
        fi
    done
    echo ""
}

# 実行権限設定
setup_permissions() {
    chmod +x "$SCRIPT_DIR"/*.sh
}

# メイン処理
case "${1:-help}" in
    all)
        shift
        echo "🎯 Feature-A統合リーダーより全ペインに指示送信..."
        check_leader_context
        "$SCRIPT_DIR/send-to-all-fixed.sh" "$@"
        ;;
    ui|b)
        shift
        echo "🎨 Feature-A → Feature-B (UI/テスト) 指示送信..."
        check_leader_context
        "$SCRIPT_DIR/send-to-feature-b.sh" "$@"
        ;;
    api|c)
        shift
        echo "🔧 Feature-A → Feature-C (API開発) 指示送信..."
        check_leader_context
        "$SCRIPT_DIR/send-to-feature-c.sh" "$@"
        ;;
    ps|powershell|d)
        shift
        echo "💻 Feature-A → Feature-D (PowerShell) 指示送信..."
        check_leader_context
        "$SCRIPT_DIR/send-to-feature-d.sh" "$@"
        ;;
    sec|security|e)
        shift
        echo "🔒 Feature-A → Feature-E (非機能要件) 指示送信..."
        check_leader_context
        "$SCRIPT_DIR/send-to-feature-e.sh" "$@"
        ;;
    demo)
        echo "🎭 Feature-A統合リーダー連携デモ実行..."
        check_leader_context
        setup_permissions
        "$SCRIPT_DIR/integration-demo.sh"
        ;;
    webui-*)
        echo "🚀 WebUI自動修復システム実行..."
        check_leader_context
        "$SCRIPT_DIR/webui-leader-commands.sh" "$@"
        ;;
    status|check)
        check_pane_status
        ;;
    help|--help|*)
        show_usage
        ;;
esac