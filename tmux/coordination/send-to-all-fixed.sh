#!/bin/bash

# Feature-A統合リーダーから全ペインに指示送信（拡張版）
# Claude Code ランチャーオプション対応

SESSION="itsm-requirement"

# デフォルト値
INSTRUCTION=""
CLAUDE_OPTIONS=""
FILES=""
MODEL=""
AUTO_APPROVE=false
USE_AT_CLAUDE=false

# 使用方法表示
show_usage() {
    echo "🎯 Feature-A統合指示スクリプト（拡張版）"
    echo ""
    echo "使用方法:"
    echo "  $0 '指示内容'"
    echo "  $0 [オプション] '指示内容'"
    echo ""
    echo "オプション:"
    echo "  --claude-options 'OPTIONS'  Claude Codeに渡すオプション"
    echo "  --files 'PATTERN'            参照ファイルパターン"
    echo "  --model 'MODEL_NAME'         使用モデル指定"
    echo "  --auto-approve               自動承認モード"
    echo "  --at-claude                  @claude指示形式を使用"
    echo "  --help                       このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 'コードレビューお願いします'"
    echo "  $0 --files 'package.json,src/**/*.tsx' 'レビューしてください'"
    echo "  $0 --auto-approve 'lintエラーを修正してください'"
    echo "  $0 --model claude-3-5-sonnet '詳細分析をお願いします'"
    echo "  $0 --at-claude 'UIテストを実行してください'"
    echo "  $0 --claude-options '--memory \"UI開発担当\"' 'React開発支援お願いします'"
}

# パラメータ解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --claude-options)
            CLAUDE_OPTIONS="$2"
            shift 2
            ;;
        --files)
            FILES="$2"
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --at-claude)
            USE_AT_CLAUDE=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        -*)
            echo "❌ 不明なオプション: $1"
            show_usage
            exit 1
            ;;
        *)
            INSTRUCTION="$1"
            shift
            ;;
    esac
done

# 指示内容チェック
if [ -z "$INSTRUCTION" ]; then
    echo "❌ 指示内容が指定されていません"
    show_usage
    exit 1
fi

# Claude Codeコマンド構築
build_claude_command() {
    local cmd
    
    # @claude形式 vs claude形式の選択
    if [ "$USE_AT_CLAUDE" = true ]; then
        cmd="@claude $INSTRUCTION"
    else
        cmd="claude"
        
        # モデル指定
        if [ -n "$MODEL" ]; then
            cmd="$cmd --model '$MODEL'"
        fi
        
        # 自動承認モード
        if [ "$AUTO_APPROVE" = true ]; then
            cmd="$cmd --auto-approve"
        fi
        
        # ファイル指定
        if [ -n "$FILES" ]; then
            # カンマ区切りのファイルパターンを処理
            IFS=',' read -ra FILE_ARRAY <<< "$FILES"
            for file_pattern in "${FILE_ARRAY[@]}"; do
                # 先頭・末尾の空白を削除
                file_pattern=$(echo "$file_pattern" | xargs)
                cmd="$cmd --file '$file_pattern'"
            done
        fi
        
        # 追加のClaude Codeオプション
        if [ -n "$CLAUDE_OPTIONS" ]; then
            cmd="$cmd $CLAUDE_OPTIONS"
        fi
        
        # 指示内容を追加
        cmd="$cmd '$INSTRUCTION'"
    fi
    
    echo "$cmd"
}

# オプション情報表示
echo "🎯 Feature-A統合指示を全ペインに送信中..."
echo "指示内容: $INSTRUCTION"

if [ -n "$MODEL" ]; then
    echo "🤖 使用モデル: $MODEL"
fi

if [ "$USE_AT_CLAUDE" = true ]; then
    echo "🔀 実行形式: @claude指示形式"
else
    echo "🔀 実行形式: claude コマンド形式"
fi

if [ "$AUTO_APPROVE" = true ]; then
    echo "⚡ 自動承認モード: 有効"
fi

if [ -n "$FILES" ]; then
    echo "📁 参照ファイル: $FILES"
fi

if [ -n "$CLAUDE_OPTIONS" ]; then
    echo "🔧 追加オプション: $CLAUDE_OPTIONS"
fi

echo ""

# Claude Codeコマンド構築
CLAUDE_CMD=$(build_claude_command)
echo "💻 実行コマンド: $CLAUDE_CMD"
echo ""

# 各ペインに指示送信（拡張版）
send_to_pane() {
    local pane_num=$1
    local feature_name=$2
    
    echo "📋 Pane $pane_num ($feature_name) に送信中..."
    tmux send-keys -t "$SESSION:0.$pane_num" "$CLAUDE_CMD"
    sleep 0.5
    tmux send-keys -t "$SESSION:0.$pane_num" C-m
}

# 各ペインに送信
send_to_pane 0 "Feature-B"
send_to_pane 1 "Feature-C" 
send_to_pane 2 "Feature-D"
send_to_pane 3 "Feature-E"

echo "✅ 全ペインに指示送信完了"
echo "💡 各ペインでClaude処理中..."
echo ""

# 送信されたコマンドの詳細表示
echo "📋 送信された詳細コマンド:"
echo "   $CLAUDE_CMD"
echo ""