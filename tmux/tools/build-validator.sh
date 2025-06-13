#!/bin/bash

# ITSM Platform - ビルド検証ツール
# プロダクションビルド・デプロイメント検証

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
BACKEND_DIR="$PROJECT_ROOT/backend"
TOOL_NAME="ビルド検証ツール"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;32m========================================\033[0m"
    echo -e "\033[1;32m  $TOOL_NAME\033[0m"
    echo -e "\033[1;32m========================================\033[0m"
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

# ビルド結果カウンター
total_validations=0
passed_validations=0
failed_validations=0

# ビルド検証結果記録
record_validation_result() {
    local validation_name="$1"
    local result="$2"
    local message="$3"
    
    ((total_validations++))
    
    if [ "$result" = "PASS" ]; then
        ((passed_validations++))
        print_success "$validation_name: 合格"
        if [ -n "$message" ]; then
            echo "  📋 $message"
        fi
    else
        ((failed_validations++))
        print_error "$validation_name: 失敗"
        if [ -n "$message" ]; then
            echo "  ❌ $message"
        fi
    fi
}

# 前提条件チェック
check_prerequisites() {
    print_info "前提条件をチェック中..."
    
    cd "$PROJECT_ROOT"
    
    # Node.js バージョンチェック
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node --version | cut -d'v' -f2)
        record_validation_result "Node.js環境" "PASS" "バージョン: $node_version"
    else
        record_validation_result "Node.js環境" "FAIL" "Node.jsがインストールされていません"
        return 1
    fi
    
    # npm バージョンチェック
    if command -v npm &> /dev/null; then
        local npm_version
        npm_version=$(npm --version)
        record_validation_result "npm環境" "PASS" "バージョン: $npm_version"
    else
        record_validation_result "npm環境" "FAIL" "npmがインストールされていません"
        return 1
    fi
    
    # package.json 存在チェック
    if [ -f "package.json" ]; then
        record_validation_result "package.json" "PASS"
    else
        record_validation_result "package.json" "FAIL" "package.jsonが見つかりません"
        return 1
    fi
    
    # 依存関係インストール状況
    if [ -d "node_modules" ]; then
        record_validation_result "依存関係インストール" "PASS"
    else
        print_info "依存関係をインストール中..."
        if npm install; then
            record_validation_result "依存関係インストール" "PASS" "自動インストール完了"
        else
            record_validation_result "依存関係インストール" "FAIL" "自動インストールに失敗"
            return 1
        fi
    fi
}

# フロントエンドビルド検証
validate_frontend_build() {
    print_info "フロントエンドビルドを検証中..."
    
    cd "$PROJECT_ROOT"
    
    # TypeScript型チェック
    if npm run typecheck &>/dev/null; then
        record_validation_result "TypeScript型チェック" "PASS"
    else
        record_validation_result "TypeScript型チェック" "FAIL" "型エラーが存在します"
    fi
    
    # ESLintチェック
    if npm run lint &>/dev/null; then
        record_validation_result "ESLintチェック" "PASS"
    else
        record_validation_result "ESLintチェック" "FAIL" "Lintエラーが存在します"
    fi
    
    # 既存のdistディレクトリクリーンアップ
    if [ -d "dist" ]; then
        print_info "既存のビルドファイルをクリーンアップ中..."
        rm -rf dist
    fi
    
    # プロダクションビルド実行
    print_info "プロダクションビルドを実行中..."
    local build_start_time=$(date +%s)
    
    if npm run build; then
        local build_end_time=$(date +%s)
        local build_duration=$((build_end_time - build_start_time))
        record_validation_result "プロダクションビルド" "PASS" "ビルド時間: ${build_duration}秒"
    else
        record_validation_result "プロダクションビルド" "FAIL" "ビルドエラーが発生しました"
        return 1
    fi
    
    # ビルド成果物検証
    if [ -d "dist" ]; then
        record_validation_result "ビルド成果物存在" "PASS"
        
        # ビルドファイルサイズチェック
        local dist_size
        dist_size=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
        record_validation_result "ビルドサイズ" "PASS" "サイズ: $dist_size"
        
        # 主要ファイル存在チェック
        if [ -f "dist/index.html" ]; then
            record_validation_result "index.html" "PASS"
        else
            record_validation_result "index.html" "FAIL" "index.htmlが生成されていません"
        fi
        
        # JavaScriptファイル確認
        local js_files
        js_files=$(find dist -name "*.js" | wc -l)
        if [ "$js_files" -gt 0 ]; then
            record_validation_result "JavaScriptファイル" "PASS" "$js_files個のJSファイル"
        else
            record_validation_result "JavaScriptファイル" "FAIL" "JavaScriptファイルが見つかりません"
        fi
        
        # CSSファイル確認
        local css_files
        css_files=$(find dist -name "*.css" | wc -l)
        if [ "$css_files" -gt 0 ]; then
            record_validation_result "CSSファイル" "PASS" "$css_files個のCSSファイル"
        else
            record_validation_result "CSSファイル" "PASS" "CSSファイルなし（Tailwind CSS使用）"
        fi
    else
        record_validation_result "ビルド成果物存在" "FAIL" "distディレクトリが作成されていません"
    fi
}

# バックエンドビルド検証
validate_backend_build() {
    print_info "バックエンドビルドを検証中..."
    
    cd "$BACKEND_DIR"
    
    # バックエンドpackage.json確認
    if [ -f "package.json" ]; then
        record_validation_result "バックエンドpackage.json" "PASS"
    else
        record_validation_result "バックエンドpackage.json" "FAIL" "package.jsonが見つかりません"
        return
    fi
    
    # バックエンド依存関係確認
    if [ -d "node_modules" ]; then
        record_validation_result "バックエンド依存関係" "PASS"
    else
        print_info "バックエンド依存関係をインストール中..."
        if npm install; then
            record_validation_result "バックエンド依存関係" "PASS" "自動インストール完了"
        else
            record_validation_result "バックエンド依存関係" "FAIL" "依存関係インストールに失敗"
        fi
    fi
    
    # 主要APIファイル確認
    local api_files
    api_files=$(find api -name "*.js" | wc -l)
    if [ "$api_files" -gt 0 ]; then
        record_validation_result "Node.js APIファイル" "PASS" "$api_files個のAPIファイル"
    else\n        record_validation_result \"Node.js APIファイル\" \"FAIL\" \"APIファイルが見つかりません\"\n    fi\n    \n    # PowerShell APIファイル確認\n    local ps_files\n    ps_files=$(find api -name \"*.ps1\" | wc -l)\n    if [ \"$ps_files\" -gt 0 ]; then\n        record_validation_result \"PowerShell APIファイル\" \"PASS\" \"$ps_files個のPowerShellファイル\"\n    else\n        record_validation_result \"PowerShell APIファイル\" \"FAIL\" \"PowerShellファイルが見つかりません\"\n    fi\n    \n    # データベーススキーマ確認\n    if [ -d \"db\" ]; then\n        local schema_files\n        schema_files=$(find db -name \"*.sql\" | wc -l)\n        if [ \"$schema_files\" -gt 0 ]; then\n            record_validation_result \"データベーススキーマ\" \"PASS\" \"$schema_files個のスキーマファイル\"\n        else\n            record_validation_result \"データベーススキーマ\" \"FAIL\" \"スキーマファイルが見つかりません\"\n        fi\n    else\n        record_validation_result \"データベースディレクトリ\" \"FAIL\" \"dbディレクトリが見つかりません\"\n    fi\n}\n\n# 統合ビルド検証\nvalidate_integration() {\n    print_info \"統合ビルド検証を実行中...\"\n    \n    cd \"$PROJECT_ROOT\"\n    \n    # フロントエンド・バックエンド連携確認\n    local frontend_api_calls\n    frontend_api_calls=$(find src -name \"*.ts\" -o -name \"*.tsx\" | xargs grep -c \"localhost:8082\\|/api/\" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')\n    \n    if [ \"$frontend_api_calls\" -gt 0 ]; then\n        record_validation_result \"フロント・バック連携\" \"PASS\" \"$frontend_api_calls個のAPI呼び出し\"\n    else\n        record_validation_result \"フロント・バック連携\" \"FAIL\" \"API呼び出しが見つかりません\"\n    fi\n    \n    # 環境変数設定確認\n    if [ -f \".env\" ]; then\n        record_validation_result \"環境変数ファイル\" \"PASS\"\n        \n        # 必要な環境変数確認\n        local required_vars=(\"JWT_SECRET\" \"DB_PATH\" \"VITE_API_BASE_URL\")\n        local missing_vars=()\n        \n        for var in \"${required_vars[@]}\"; do\n            if ! grep -q \"$var\" .env; then\n                missing_vars+=(\"$var\")\n            fi\n        done\n        \n        if [ ${#missing_vars[@]} -eq 0 ]; then\n            record_validation_result \"必要な環境変数\" \"PASS\"\n        else\n            record_validation_result \"必要な環境変数\" \"FAIL\" \"不足: ${missing_vars[*]}\"\n        fi\n    else\n        record_validation_result \"環境変数ファイル\" \"FAIL\" \".envファイルが見つかりません\"\n    fi\n    \n    # ビルド成果物の構造確認\n    if [ -d \"dist\" ]; then\n        # アセットファイル確認\n        local asset_files\n        asset_files=$(find dist -name \"assets\" -type d | wc -l)\n        \n        if [ \"$asset_files\" -gt 0 ]; then\n            record_validation_result \"アセットディレクトリ\" \"PASS\"\n        else\n            record_validation_result \"アセットディレクトリ\" \"FAIL\" \"assetsディレクトリが見つかりません\"\n        fi\n        \n        # ソースマップ確認\n        local sourcemap_files\n        sourcemap_files=$(find dist -name \"*.map\" | wc -l)\n        \n        if [ \"$sourcemap_files\" -gt 0 ]; then\n            record_validation_result \"ソースマップ\" \"PASS\" \"$sourcemap_files個のマップファイル\"\n        else\n            record_validation_result \"ソースマップ\" \"PASS\" \"ソースマップなし（本番設定）\"\n        fi\n    fi\n}\n\n# パフォーマンス検証\nvalidate_performance() {\n    print_info \"パフォーマンス検証を実行中...\"\n    \n    cd \"$PROJECT_ROOT\"\n    \n    if [ -d \"dist\" ]; then\n        # バンドルサイズ分析\n        local total_js_size\n        total_js_size=$(find dist -name \"*.js\" -exec stat -c%s {} \\; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')\n        \n        # KB変換\n        local js_size_kb=$((total_js_size / 1024))\n        \n        if [ \"$js_size_kb\" -lt 1000 ]; then  # 1MB未満\n            record_validation_result \"JavaScriptバンドルサイズ\" \"PASS\" \"${js_size_kb}KB\"\n        elif [ \"$js_size_kb\" -lt 2000 ]; then  # 2MB未満\n            record_validation_result \"JavaScriptバンドルサイズ\" \"PASS\" \"${js_size_kb}KB（やや大きめ）\"\n        else\n            record_validation_result \"JavaScriptバンドルサイズ\" \"FAIL\" \"${js_size_kb}KB（最適化が必要）\"\n        fi\n        \n        # HTMLファイルサイズ\n        if [ -f \"dist/index.html\" ]; then\n            local html_size\n            html_size=$(stat -c%s \"dist/index.html\" 2>/dev/null || echo \"0\")\n            local html_size_kb=$((html_size / 1024))\n            \n            if [ \"$html_size_kb\" -lt 50 ]; then  # 50KB未満\n                record_validation_result \"HTMLファイルサイズ\" \"PASS\" \"${html_size_kb}KB\"\n            else\n                record_validation_result \"HTMLファイルサイズ\" \"FAIL\" \"${html_size_kb}KB（大きすぎます）\"\n            fi\n        fi\n        \n        # ファイル数チェック\n        local total_files\n        total_files=$(find dist -type f | wc -l)\n        \n        if [ \"$total_files\" -lt 100 ]; then\n            record_validation_result \"ビルドファイル数\" \"PASS\" \"$total_files個のファイル\"\n        else\n            record_validation_result \"ビルドファイル数\" \"FAIL\" \"$total_files個のファイル（多すぎます）\"\n        fi\n    fi\n}\n\n# セキュリティ検証\nvalidate_security() {\n    print_info \"セキュリティ検証を実行中...\"\n    \n    cd \"$PROJECT_ROOT\"\n    \n    # ビルド成果物のセキュリティチェック\n    if [ -d \"dist\" ]; then\n        # .env ファイルがビルドに含まれていないかチェック\n        if find dist -name \".env*\" | grep -q \".\"; then\n            record_validation_result \"環境変数漏洩チェック\" \"FAIL\" \".envファイルがビルドに含まれています\"\n        else\n            record_validation_result \"環境変数漏洩チェック\" \"PASS\"\n        fi\n        \n        # node_modules がビルドに含まれていないかチェック\n        if find dist -name \"node_modules\" | grep -q \".\"; then\n            record_validation_result \"node_modules漏洩チェック\" \"FAIL\" \"node_modulesがビルドに含まれています\"\n        else\n            record_validation_result \"node_modules漏洩チェック\" \"PASS\"\n        fi\n        \n        # ソースマップの機密情報チェック\n        local sourcemap_count\n        sourcemap_count=$(find dist -name \"*.map\" | wc -l)\n        \n        if [ \"$sourcemap_count\" -eq 0 ]; then\n            record_validation_result \"ソースマップセキュリティ\" \"PASS\" \"本番環境用設定\"\n        else\n            record_validation_result \"ソースマップセキュリティ\" \"FAIL\" \"本番環境でソースマップが有効です\"\n        fi\n    fi\n    \n    # 依存関係セキュリティ監査\n    if npm audit --audit-level=high &>/dev/null; then\n        record_validation_result \"依存関係セキュリティ監査\" \"PASS\"\n    else\n        local vuln_count\n        vuln_count=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo \"unknown\")\n        record_validation_result \"依存関係セキュリティ監査\" \"FAIL\" \"$vuln_count個の脆弱性を発見\"\n    fi\n}\n\n# デプロイメント準備チェック\nvalidate_deployment_readiness() {\n    print_info \"デプロイメント準備状況を確認中...\"\n    \n    cd \"$PROJECT_ROOT\"\n    \n    # 必要なファイル存在確認\n    local required_files=(\"package.json\" \"README.md\")\n    \n    for file in \"${required_files[@]}\"; do\n        if [ -f \"$file\" ]; then\n            record_validation_result \"$file存在確認\" \"PASS\"\n        else\n            record_validation_result \"$file存在確認\" \"FAIL\" \"$fileが見つかりません\"\n        fi\n    done\n    \n    # Git状態確認\n    if [ -d \".git\" ]; then\n        record_validation_result \"Git初期化\" \"PASS\"\n        \n        # 未コミット変更確認\n        if git diff --quiet 2>/dev/null; then\n            record_validation_result \"Git変更状況\" \"PASS\" \"未コミット変更なし\"\n        else\n            record_validation_result \"Git変更状況\" \"FAIL\" \"未コミットの変更があります\"\n        fi\n        \n        # ブランチ確認\n        local current_branch\n        current_branch=$(git branch --show-current 2>/dev/null || echo \"unknown\")\n        record_validation_result \"現在のブランチ\" \"PASS\" \"$current_branch\"\n    else\n        record_validation_result \"Git初期化\" \"FAIL\" \"Gitリポジトリが初期化されていません\"\n    fi\n    \n    # .gitignore確認\n    if [ -f \".gitignore\" ]; then\n        record_validation_result \".gitignore\" \"PASS\"\n        \n        # 重要なファイルがignoreされているか確認\n        local ignored_items=(\"node_modules\" \".env\" \"dist\")\n        local missing_ignores=()\n        \n        for item in \"${ignored_items[@]}\"; do\n            if ! grep -q \"$item\" .gitignore; then\n                missing_ignores+=(\"$item\")\n            fi\n        done\n        \n        if [ ${#missing_ignores[@]} -eq 0 ]; then\n            record_validation_result \".gitignore設定\" \"PASS\"\n        else\n            record_validation_result \".gitignore設定\" \"FAIL\" \"不足: ${missing_ignores[*]}\"\n        fi\n    else\n        record_validation_result \".gitignore\" \"FAIL\" \".gitignoreファイルが見つかりません\"\n    fi\n}\n\n# ビルド検証レポート生成\ngenerate_build_report() {\n    local report_file=\"/tmp/build-validation-report-$(date +%Y%m%d-%H%M%S).md\"\n    \n    cat > \"$report_file\" << EOF\n# ITSM Platform ビルド検証レポート\n\n## 実行日時\n$(date '+%Y年%m月%d日 %H:%M:%S')\n\n## ビルド検証結果サマリー\n- **総検証項目数**: $total_validations\n- **合格**: $passed_validations\n- **失敗**: $failed_validations\n- **成功率**: $([ $total_validations -gt 0 ] && echo \"scale=2; $passed_validations * 100 / $total_validations\" | bc || echo \"0\")%\n\n## 検証項目\n\n### 前提条件チェック\n- Node.js環境確認\n- npm環境確認\n- package.json存在確認\n- 依存関係インストール状況\n\n### フロントエンドビルド検証\n- TypeScript型チェック\n- ESLintチェック\n- プロダクションビルド実行\n- ビルド成果物確認\n- ファイルサイズ検証\n\n### バックエンドビルド検証\n- バックエンド依存関係確認\n- Node.js APIファイル確認\n- PowerShell APIファイル確認\n- データベーススキーマ確認\n\n### 統合ビルド検証\n- フロント・バック連携確認\n- 環境変数設定確認\n- ビルド成果物構造確認\n\n### パフォーマンス検証\n- JavaScriptバンドルサイズ分析\n- HTMLファイルサイズ確認\n- ビルドファイル数確認\n\n### セキュリティ検証\n- 環境変数漏洩チェック\n- node_modules漏洩チェック\n- ソースマップセキュリティ\n- 依存関係セキュリティ監査\n\n### デプロイメント準備チェック\n- 必要ファイル存在確認\n- Git状態確認\n- .gitignore設定確認\n\n## 実行環境情報\n- プロジェクト: $PROJECT_ROOT\n- Node.js: $(node --version 2>/dev/null || echo 'unknown')\n- npm: $(npm --version 2>/dev/null || echo 'unknown')\n- Git: $(git --version 2>/dev/null || echo 'unknown')\n\n## ビルド成果物情報\n$(if [ -d \"$PROJECT_ROOT/dist\" ]; then\n    echo \"- ビルドディレクトリ: dist/\"\n    echo \"- ビルドサイズ: $(du -sh \"$PROJECT_ROOT/dist\" 2>/dev/null | cut -f1 || echo 'unknown')\"\n    echo \"- ファイル数: $(find \"$PROJECT_ROOT/dist\" -type f | wc -l)\"\nelse\n    echo \"- ビルド成果物: 未生成\"\nfi)\n\n## 推奨事項\n\n$(if [ $failed_validations -gt 0 ]; then\n    echo \"### 修正が必要な項目\"\n    echo \"- 失敗した検証項目を確認し、修正してください\"\n    echo \"- セキュリティ関連の問題は優先的に対応してください\"\n    echo \"- パフォーマンスの問題がある場合は最適化を検討してください\"\nelse\n    echo \"### ビルド品質向上\"\n    echo \"- 全ての検証項目に合格しています\"\n    echo \"- 継続的インテグレーション(CI)への統合を検討してください\"\nfi)\n\n### 継続的改善\n- 自動ビルド検証の CI/CD パイプライン統合\n- パフォーマンス監視の自動化\n- セキュリティ監査の定期実行\n- ビルド最適化の継続的な改善\n\n### デプロイメント手順\n1. 全てのビルド検証が合格していることを確認\n2. 環境変数を本番環境用に設定\n3. ビルド成果物を本番サーバーにデプロイ\n4. ヘルスチェックでサービス稼働確認\n5. 監視・ログ確認\n\n---\nビルド検証ツールによる自動生成レポート\nEOF\n\n    print_success \"ビルド検証レポート生成完了: $report_file\"\n    echo \"  📄 レポートファイル: $report_file\"\n}\n\n# メイン実行関数\nmain() {\n    print_header\n    \n    print_info \"ITSM Platform ビルド検証を開始します...\"\n    echo \"\"\n    \n    # 各検証実行\n    if check_prerequisites; then\n        echo \"\"\n        validate_frontend_build\n        echo \"\"\n        \n        validate_backend_build\n        echo \"\"\n        \n        validate_integration\n        echo \"\"\n        \n        validate_performance\n        echo \"\"\n        \n        validate_security\n        echo \"\"\n        \n        validate_deployment_readiness\n        echo \"\"\n    else\n        print_error \"前提条件チェックに失敗しました。修正後に再実行してください。\"\n        exit 1\n    fi\n    \n    # 結果表示\n    print_info \"=== ビルド検証結果 ===\"\n    print_info \"総検証項目数: $total_validations\"\n    print_success \"合格: $passed_validations\"\n    if [ $failed_validations -gt 0 ]; then\n        print_error \"失敗: $failed_validations\"\n    else\n        print_info \"失敗: $failed_validations\"\n    fi\n    \n    if [ $total_validations -gt 0 ]; then\n        local success_rate\n        success_rate=$(echo \"scale=2; $passed_validations * 100 / $total_validations\" | bc 2>/dev/null || echo \"0\")\n        print_info \"成功率: $success_rate%\"\n    fi\n    \n    # レポート生成\n    echo \"\"\n    generate_build_report\n    \n    # 終了コード設定\n    if [ $failed_validations -eq 0 ]; then\n        echo \"\"\n        print_success \"🎉 ビルド検証が完了しました！デプロイ準備完了です。\"\n        \n        # ビルド成果物情報表示\n        if [ -d \"$PROJECT_ROOT/dist\" ]; then\n            echo \"\"\n            print_info \"📦 ビルド成果物情報:\"\n            echo \"  📁 ディレクトリ: dist/\"\n            echo \"  📏 サイズ: $(du -sh \"$PROJECT_ROOT/dist\" 2>/dev/null | cut -f1 || echo 'unknown')\"\n            echo \"  📄 ファイル数: $(find \"$PROJECT_ROOT/dist\" -type f | wc -l)\"\n        fi\n        \n        exit 0\n    else\n        echo \"\"\n        print_error \"❌ 一部のビルド検証が失敗しました。修正が必要です。\"\n        exit 1\n    fi\n}\n\n# スクリプト実行\nmain \"$@\"