#!/bin/bash

# ITSM Platform - 統合テストランナー
# 全ペインのテストを統合実行

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
TOOL_NAME="統合テストランナー"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;36m========================================\033[0m"
    echo -e "\033[1;36m  $TOOL_NAME\033[0m"
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

# テスト結果カウンター
total_tests=0
passed_tests=0
failed_tests=0

# テスト結果記録
record_test_result() {
    local test_name="$1"
    local result="$2"
    
    ((total_tests++))
    
    if [ "$result" = "PASS" ]; then
        ((passed_tests++))
        print_success "$test_name: 合格"
    else
        ((failed_tests++))
        print_error "$test_name: 失敗"
    fi
}

# フロントエンドテスト実行
run_frontend_tests() {
    print_info "フロントエンドテストを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # TypeScriptコンパイルチェック
    if npm run typecheck &>/dev/null; then
        record_test_result "TypeScript型チェック" "PASS"
    else
        record_test_result "TypeScript型チェック" "FAIL"
    fi
    
    # ESLintチェック
    if npm run lint &>/dev/null; then
        record_test_result "ESLint" "PASS"
    else
        record_test_result "ESLint" "FAIL"
    fi
    
    # Jest単体テスト
    if npm test -- --watchAll=false &>/dev/null; then
        record_test_result "Jest単体テスト" "PASS"
    else
        record_test_result "Jest単体テスト" "FAIL"
    fi
    
    # ビルドテスト
    if npm run build &>/dev/null; then
        record_test_result "プロダクションビルド" "PASS"
    else
        record_test_result "プロダクションビルド" "FAIL"
    fi
}

# バックエンドテスト実行
run_backend_tests() {
    print_info "バックエンドテストを実行中..."
    
    cd "$BACKEND_DIR"
    
    # API サーバー起動確認
    if pgrep -f "node.*8082" > /dev/null; then
        record_test_result "APIサーバー稼働確認" "PASS"
    else
        record_test_result "APIサーバー稼働確認" "FAIL"
        
        # サーバー起動試行
        print_info "APIサーバーを起動中..."
        PORT=8082 node secure-server.js &
        sleep 3
        
        if pgrep -f "node.*8082" > /dev/null; then
            record_test_result "APIサーバー自動起動" "PASS"
        else
            record_test_result "APIサーバー自動起動" "FAIL"
        fi
    fi
    
    # Node.js API テスト
    if [ -f "package.json" ] && grep -q "test" package.json; then
        if npm test &>/dev/null; then
            record_test_result "Node.js APIテスト" "PASS"
        else
            record_test_result "Node.js APIテスト" "FAIL"
        fi
    else
        print_warning "Node.js テストスクリプト未定義"
    fi
    
    # API統合テスト
    if [ -f "test-api.js" ]; then
        if node test-api.js &>/dev/null; then
            record_test_result "API統合テスト" "PASS"
        else
            record_test_result "API統合テスト" "FAIL"
        fi
    fi
    
    # 認証テスト
    if [ -f "test-login-direct.js" ]; then
        if node test-login-direct.js &>/dev/null; then
            record_test_result "認証テスト" "PASS"
        else
            record_test_result "認証テスト" "FAIL"
        fi
    fi
    
    # SLA テスト
    if [ -f "test-sla-api.js" ]; then
        if node test-sla-api.js &>/dev/null; then
            record_test_result "SLA APIテスト" "PASS"
        else
            record_test_result "SLA APIテスト" "FAIL"
        fi
    fi
}

# PowerShellテスト実行
run_powershell_tests() {
    print_info "PowerShellテストを実行中..."
    
    cd "$BACKEND_DIR/test"
    
    # run-tests.sh存在確認
    if [ -f "run-tests.sh" ]; then
        if [ -x "run-tests.sh" ]; then
            if ./run-tests.sh &>/dev/null; then
                record_test_result "PowerShell API テスト" "PASS"
            else
                record_test_result "PowerShell API テスト" "FAIL"
            fi
        else
            print_warning "run-tests.sh に実行権限がありません"
            record_test_result "PowerShell API テスト" "FAIL"
        fi
    else
        print_warning "run-tests.sh が見つかりません"
        record_test_result "PowerShell API テスト" "FAIL"
    fi
    
    # PowerShell環境確認
    if command -v pwsh &> /dev/null || command -v powershell &> /dev/null; then
        record_test_result "PowerShell環境" "PASS"
    else
        record_test_result "PowerShell環境" "FAIL"
    fi
    
    cd "$PROJECT_ROOT"
}

# データベーステスト実行
run_database_tests() {
    print_info "データベーステストを実行中..."
    
    cd "$BACKEND_DIR"
    
    # データベースファイル存在確認
    if [ -f "db/itsm.sqlite" ]; then
        record_test_result "データベースファイル存在" "PASS"
        
        # データベースサイズ確認
        local db_size=$(stat -c%s "db/itsm.sqlite" 2>/dev/null || echo "0")
        if [ "$db_size" -gt 0 ]; then
            record_test_result "データベース初期化" "PASS"
        else
            record_test_result "データベース初期化" "FAIL"
        fi
    else
        record_test_result "データベースファイル存在" "FAIL"
    fi
    
    # データベーススキーマ確認
    if [ -f "db/schema.sql" ]; then
        record_test_result "基本スキーマファイル" "PASS"
    else
        record_test_result "基本スキーマファイル" "FAIL"
    fi
    
    if [ -f "db/assets-schema.sql" ]; then
        record_test_result "資産管理スキーマ" "PASS"
    else
        record_test_result "資産管理スキーマ" "FAIL"
    fi
}

# 統合テスト実行
run_integration_tests() {
    print_info "統合テストを実行中..."
    
    # API エンドポイント接続テスト
    if command -v curl &> /dev/null; then
        # ヘルスチェック
        if curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
            record_test_result "API ヘルスチェック" "PASS"
        else
            record_test_result "API ヘルスチェック" "FAIL"
        fi
        
        # 認証エンドポイント
        if curl -s -X POST http://localhost:8082/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"admin123"}' > /dev/null 2>&1; then
            record_test_result "認証エンドポイント" "PASS"
        else
            record_test_result "認証エンドポイント" "FAIL"
        fi
        
        # 資産管理エンドポイント
        if curl -s http://localhost:8082/api/assets > /dev/null 2>&1; then
            record_test_result "資産管理エンドポイント" "PASS"
        else
            record_test_result "資産管理エンドポイント" "FAIL"
        fi
        
        # インシデント管理エンドポイント
        if curl -s http://localhost:8082/api/incidents > /dev/null 2>&1; then
            record_test_result "インシデント管理エンドポイント" "PASS"
        else
            record_test_result "インシデント管理エンドポイント" "FAIL"
        fi
    else
        print_warning "curl が見つかりません。API統合テストをスキップします。"
    fi
    
    # フロントエンド・バックエンド連携テスト
    if pgrep -f "vite.*3001" > /dev/null && pgrep -f "node.*8082" > /dev/null; then
        record_test_result "フロント・バック連携" "PASS"
    else
        record_test_result "フロント・バック連携" "FAIL"
    fi
}

# セキュリティテスト実行
run_security_tests() {
    print_info "セキュリティテストを実行中..."
    
    cd "$BACKEND_DIR"
    
    # 認証ミドルウェア確認
    if [ -f "middleware/auth.js" ]; then
        record_test_result "認証ミドルウェア" "PASS"
    else
        record_test_result "認証ミドルウェア" "FAIL"
    fi
    
    # JWT設定確認
    if grep -q "JWT_SECRET" ../.env 2>/dev/null || grep -q "process.env.JWT_SECRET" middleware/auth.js 2>/dev/null; then
        record_test_result "JWT設定" "PASS"
    else
        record_test_result "JWT設定" "FAIL"
    fi
    
    # パスワードハッシュ化確認
    if grep -q "bcrypt" api/auth.js 2>/dev/null; then
        record_test_result "パスワードハッシュ化" "PASS"
    else
        record_test_result "パスワードハッシュ化" "FAIL"
    fi
    
    # セキュリティヘッダー確認
    if grep -q "helmet" *.js 2>/dev/null; then
        record_test_result "セキュリティヘッダー" "PASS"
    else
        record_test_result "セキュリティヘッダー" "FAIL"
    fi
}

# テスト結果レポート生成
generate_test_report() {
    local report_file="/tmp/test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# ITSM Platform テスト実行レポート

## 実行日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## テスト結果サマリー
- **総テスト数**: $total_tests
- **合格**: $passed_tests
- **失敗**: $failed_tests
- **成功率**: $([ $total_tests -gt 0 ] && echo "scale=2; $passed_tests * 100 / $total_tests" | bc || echo "0")%

## 実行環境
- プロジェクト: $PROJECT_ROOT
- フロントエンド: React 19 + TypeScript + Vite
- バックエンド: Node.js + Express
- データベース: SQLite

## テスト詳細

### フロントエンドテスト
- TypeScript型チェック
- ESLint
- Jest単体テスト
- プロダクションビルド

### バックエンドテスト
- APIサーバー稼働確認
- Node.js APIテスト
- API統合テスト
- 認証テスト
- SLA APIテスト

### PowerShellテスト
- PowerShell環境確認
- PowerShell APIテスト

### データベーステスト
- データベースファイル存在確認
- データベース初期化確認
- スキーマファイル確認

### 統合テスト
- API エンドポイント接続テスト
- フロント・バック連携テスト

### セキュリティテスト
- 認証ミドルウェア確認
- JWT設定確認
- パスワードハッシュ化確認
- セキュリティヘッダー確認

## 推奨事項

$(if [ $failed_tests -gt 0 ]; then
    echo "### 失敗したテストへの対処"
    echo "- 失敗したテストを確認し、必要な修正を行ってください"
    echo "- 依存関係の確認とインストール"
    echo "- 設定ファイルの確認"
fi)

### 継続的改善
- テストカバレッジの向上
- 自動化テストの拡充
- セキュリティテストの強化

---
統合テストランナーによる自動生成レポート
EOF

    print_success "テストレポート生成完了: $report_file"
    echo "  📄 レポートファイル: $report_file"
}

# メイン実行関数
main() {
    print_header
    
    print_info "ITSM Platform 統合テストを開始します..."
    echo ""
    
    # 各テスト実行
    run_frontend_tests
    echo ""
    
    run_backend_tests
    echo ""
    
    run_powershell_tests
    echo ""
    
    run_database_tests
    echo ""
    
    run_integration_tests
    echo ""
    
    run_security_tests
    echo ""
    
    # 結果表示
    print_info "=== テスト実行結果 ==="
    print_info "総テスト数: $total_tests"
    print_success "合格: $passed_tests"
    if [ $failed_tests -gt 0 ]; then
        print_error "失敗: $failed_tests"
    else
        print_info "失敗: $failed_tests"
    fi
    
    if [ $total_tests -gt 0 ]; then
        local success_rate
        success_rate=$(echo "scale=2; $passed_tests * 100 / $total_tests" | bc 2>/dev/null || echo "0")
        print_info "成功率: $success_rate%"
    fi
    
    # レポート生成
    echo ""
    generate_test_report
    
    # 終了コード設定
    if [ $failed_tests -eq 0 ]; then
        echo ""
        print_success "🎉 全てのテストが完了しました！"
        exit 0
    else
        echo ""
        print_error "❌ 一部のテストが失敗しました。詳細を確認してください。"
        exit 1
    fi
}

# スクリプト実行
main "$@"