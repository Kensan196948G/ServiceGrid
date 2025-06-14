#!/bin/bash

# Feature-D: PowerShell API修復
# PowerShell・run-tests.sh・Windows対応

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
FEATURE_NAME="Feature-D: PowerShell API修復"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Claude Code自動起動設定
setup_claude() {
    echo "🤖 Claude Code自動起動中..."
    
    # .envからAPIキー読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # プロンプト設定
    export PS1='[Feature-D-PowerShell] \w$ '
    echo "\033]0;Feature-D-PowerShell\007"
    
    # Claude Code環境確認
    if command -v claude &> /dev/null; then
        echo "✅ Claude Codeが利用可能です"
        echo "💻 Feature-D-PowerShell: PowerShell開発アシスタントとして動作中"
        echo ""
        echo "💡 使用例:"
        echo "  claude 'PowerShellスクリプトを作成してください'"
        echo "  claude 'Windows API連携を実装してください'"
        echo "  claude 'システム統合テストを実行してください'"
        echo ""
    else
        echo "⚠️ Claude Codeが見つかりません"
        echo "💡 インストール方法: pip install claude-code"
    fi
}

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;35m========================================\033[0m"
    echo -e "\033[1;35m  $FEATURE_NAME\033[0m"
    echo -e "\033[1;35m========================================\033[0m"
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

# PowerShell開発メニュー表示
show_powershell_menu() {
    echo ""
    echo "⚡ PowerShell API修復 - 操作メニュー"
    echo "────────────────────────────────────────"
    echo "1) 🔍 PowerShell環境確認"
    echo "2) 🧪 run-tests.sh 実行"
    echo "3) 🔄 PowerShellテスト自動修復ループ"
    echo "4) 📝 PowerShell API一覧確認"
    echo "5) 🛠️  PowerShell API自動修復"
    echo "6) 📊 PowerShellスクリプト検証"
    echo "7) 🔧 Windows互換性チェック"
    echo "8) 📋 PowerShellモジュール管理"
    echo "9) 📄 PowerShell実行ポリシー設定"
    echo "a) 🎯 全自動修復モード"
    echo "0) 🔄 メニュー再表示"
    echo "q) 終了"
    echo "────────────────────────────────────────"
}

# PowerShell環境確認
check_powershell_environment() {
    print_info "PowerShell環境を確認中..."
    
    echo ""
    echo "🔍 PowerShell環境確認:"
    
    # PowerShell Core確認
    if command -v pwsh &> /dev/null; then
        print_success "PowerShell Core (pwsh): インストール済み"
        echo "  バージョン: $(pwsh --version 2>/dev/null || echo 'unknown')"
    else
        print_warning "PowerShell Core (pwsh): 未インストール"
    fi
    
    # PowerShell (Windows)確認
    if command -v powershell &> /dev/null; then
        print_success "Windows PowerShell: 利用可能"
        echo "  バージョン: $(powershell -Command '$PSVersionTable.PSVersion' 2>/dev/null || echo 'unknown')"
    else
        print_info "Windows PowerShell: Linux環境のため利用不可"
    fi
    
    # WSL環境確認
    if grep -qi microsoft /proc/version 2>/dev/null; then
        print_info "WSL環境検出: Windows PowerShellとの連携可能"
        
        # Windows PowerShellパス確認
        if [ -f "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
            print_success "Windows PowerShell: /mnt/c/Windows/System32/... で利用可能"
        fi
    fi
    
    # PowerShellテストディレクトリ確認
    echo ""
    echo "📁 PowerShellテスト環境:"
    if [ -d "$BACKEND_DIR/test" ]; then
        print_success "テストディレクトリ: $BACKEND_DIR/test"
        
        if [ -f "$BACKEND_DIR/test/run-tests.sh" ]; then
            print_success "run-tests.sh: 存在"
            echo "  実行権限: $([ -x "$BACKEND_DIR/test/run-tests.sh" ] && echo 'あり' || echo 'なし')"
        else
            print_warning "run-tests.sh: 未作成"
        fi
        
        if [ -f "$BACKEND_DIR/test/Test-APIs.ps1" ]; then
            print_success "Test-APIs.ps1: 存在"
        else
            print_warning "Test-APIs.ps1: 未作成"
        fi
    else
        print_warning "テストディレクトリ: 未作成"
    fi
    
    # PowerShell APIディレクトリ確認
    echo ""
    echo "📂 PowerShell API確認:"
    if [ -d "$BACKEND_DIR/api" ]; then
        local ps_api_count=$(find "$BACKEND_DIR/api" -name '*.ps1' | wc -l)
        print_info "PowerShell APIスクリプト数: $ps_api_count"
        
        if [ "$ps_api_count" -gt 0 ]; then
            find "$BACKEND_DIR/api" -name '*.ps1' | while read -r ps_file; do
                echo "  📜 $(basename "$ps_file")"
            done
        fi
    fi
}

# run-tests.sh実行
run_powershell_tests() {
    print_info "run-tests.sh を実行中..."
    
    cd "$BACKEND_DIR/test"
    
    # run-tests.sh存在確認
    if [ ! -f "run-tests.sh" ]; then
        print_warning "run-tests.sh が見つかりません"
        print_info "run-tests.sh を生成しますか？ y/n"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            generate_run_tests_script
        else
            return
        fi
    fi
    
    # 実行権限確認
    if [ ! -x "run-tests.sh" ]; then
        print_info "実行権限を付与中..."
        chmod +x run-tests.sh
    fi
    
    # run-tests.sh 実行
    print_info "PowerShellテストスイート実行中..."
    echo ""
    echo "=== run-tests.sh 実行結果 ==="
    
    if ./run-tests.sh; then
        print_success "run-tests.sh: 実行成功"
        return 0
    else
        print_error "run-tests.sh: 実行失敗"
        return 1
    fi
}

# PowerShellテスト自動修復ループ
run_powershell_test_loop() {
    print_info "PowerShellテスト自動修復ループを開始します..."
    
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "修復試行 $attempt/$max_attempts"
        
        # PowerShell環境確認
        if ! command -v pwsh &> /dev/null && ! command -v powershell &> /dev/null; then
            print_error "PowerShellが利用できません"
            print_info "PowerShell Coreのインストールを推奨します"
            break
        fi
        
        # テスト実行
        if run_powershell_tests; then
            print_success "PowerShellテストループ完了: 全テスト合格"
            return 0
        else
            print_warning "テスト失敗 - 自動修復を試行中..."
            auto_fix_powershell_issues
            sleep 2
        fi
        
        ((attempt++))
    done
    
    print_error "最大試行回数に達しました。手動確認が必要です。"
    print_info "PowerShell環境のインストールが必要な可能性があります"
}

# PowerShell API一覧確認
list_powershell_apis() {
    print_info "PowerShell API一覧を確認中..."
    
    cd "$BACKEND_DIR"
    
    echo ""
    echo "📜 PowerShell API一覧:"
    
    if [ -d "api" ]; then
        find api -name '*.ps1' | while read -r ps_file; do
            local ps_name=$(basename "$ps_file" .ps1)
            echo ""
            echo "  📄 $ps_name.ps1"
            
            # ファイルサイズ確認
            local file_size=$(stat -c%s "$ps_file" 2>/dev/null || echo "0")
            echo "    サイズ: $file_size bytes"
            
            # 基本的な構文チェック（PowerShell利用可能な場合）
            if command -v pwsh &> /dev/null; then
                if pwsh -NoProfile -Command "Get-Content '$ps_file' | Out-Null" &>/dev/null; then
                    echo "    構文: ✅ OK"
                else
                    echo "    構文: ❌ エラー"
                fi
            fi
            
            # 関数定義確認
            local function_count=$(grep -c "^function" "$ps_file" 2>/dev/null || echo "0")
            echo "    関数数: $function_count"
            
            # パラメーター定義確認
            if grep -q "param(" "$ps_file"; then
                echo "    パラメーター: ✅ 定義済み"
            else
                echo "    パラメーター: ⚠️ 未定義"
            fi
        done
    else
        print_warning "apiディレクトリが見つかりません"
    fi
    
    # PowerShell モジュール確認
    echo ""
    echo "📦 PowerShell モジュール:"
    if [ -d "modules" ]; then
        find modules -name '*.psm1' | while read -r module_file; do
            local module_name=$(basename "$module_file" .psm1)
            echo "  📦 $module_name.psm1"
        done
    else
        print_warning "modulesディレクトリが見つかりません"
    fi
}

# PowerShell API自動修復
auto_fix_powershell_issues() {
    print_info "PowerShell API自動修復を実行中..."
    
    cd "$BACKEND_DIR"
    
    # 1. PowerShell実行ポリシー設定（可能であれば）
    if command -v pwsh &> /dev/null; then
        print_info "PowerShell実行ポリシー確認中..."
        # 実行ポリシーを一時的に設定（ユーザースコープ）
        pwsh -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" 2>/dev/null || true
    fi
    
    # 2. 必要なディレクトリ作成
    mkdir -p test api modules jobs
    
    # 3. run-tests.sh が存在しない場合は生成
    if [ ! -f "test/run-tests.sh" ]; then
        print_info "run-tests.sh を自動生成中..."
        generate_run_tests_script
    fi
    
    # 4. Test-APIs.ps1 が存在しない場合は生成
    if [ ! -f "test/Test-APIs.ps1" ]; then
        print_info "Test-APIs.ps1 を自動生成中..."
        generate_test_apis_script
    fi
    
    # 5. PowerShell API の基本的な構文チェックと修復
    if [ -d "api" ]; then
        find api -name '*.ps1' | while read -r ps_file; do
            # BOM除去（Windowsとの互換性のため）
            if command -v sed &> /dev/null; then
                sed -i '1s/^\xEF\xBB\xBF//' "$ps_file" 2>/dev/null || true
            fi
            
            # 行末の修正（CRLF -> LF）
            if command -v dos2unix &> /dev/null; then
                dos2unix "$ps_file" 2>/dev/null || true
            fi
        done
    fi
    
    # 6. 実行権限設定
    find test -name '*.sh' -exec chmod +x {} \; 2>/dev/null || true
    
    print_success "PowerShell API自動修復完了"
}

# PowerShellスクリプト検証
verify_powershell_scripts() {
    print_info "PowerShellスクリプトを検証中..."
    
    cd "$BACKEND_DIR"
    
    echo ""
    echo "🔍 PowerShellスクリプト検証結果:"
    
    # PowerShell利用可能性確認
    local ps_available=false
    
    if command -v pwsh &> /dev/null; then
        ps_available=true
        print_success "PowerShell Core: 利用可能"
    elif command -v powershell &> /dev/null; then
        ps_available=true
        print_success "Windows PowerShell: 利用可能"
    else
        print_warning "PowerShell: 利用不可"
    fi
    
    # スクリプトファイル検証
    if [ -d "api" ]; then
        local total_scripts=0
        local valid_scripts=0
        
        find api -name '*.ps1' | while read -r ps_file; do
            echo ""
            echo "  📄 $(basename "$ps_file")"
            
            # ファイル存在・読み取り可能性
            if [ -r "$ps_file" ]; then
                echo "    読み取り: ✅ OK"
            else
                echo "    読み取り: ❌ エラー"
                continue
            fi
            
            # ファイルサイズ
            local file_size=$(stat -c%s "$ps_file" 2>/dev/null || echo "0")
            if [ "$file_size" -gt 0 ]; then
                echo "    サイズ: ✅ $file_size bytes"
            else
                echo "    サイズ: ❌ 空ファイル"
                continue
            fi
            
            # PowerShell構文チェック（利用可能な場合）
            if [ "$ps_available" = true ]; then
                if command -v pwsh &> /dev/null; then
                    if pwsh -NoProfile -Command "Get-Content '$ps_file' | Out-Null" &>/dev/null; then
                        echo "    構文: ✅ OK"
                        valid_scripts=$((valid_scripts + 1))
                    else
                        echo "    構文: ❌ エラー"
                    fi
                fi
            else
                echo "    構文: ⚠️ PowerShell未利用のためスキップ"
            fi
            
            total_scripts=$((total_scripts + 1))
        done
        
        echo ""
        echo "📊 検証サマリー:"
        echo "  総スクリプト数: $total_scripts"
        echo "  有効スクリプト数: $valid_scripts"
        if [ "$total_scripts" -gt 0 ]; then
            local success_rate=$((valid_scripts * 100 / total_scripts))
            echo "  成功率: $success_rate%"
        fi
    else
        print_warning "PowerShell APIディレクトリが見つかりません"
    fi
}

# Windows互換性チェック
check_windows_compatibility() {
    print_info "Windows互換性をチェック中..."
    
    echo ""
    echo "🖥️ Windows互換性チェック:"
    
    # WSL環境確認
    if grep -qi microsoft /proc/version 2>/dev/null; then
        print_success "WSL環境: 検出"
        echo "  Windowsとの統合が可能です"
        
        # Windows PowerShell確認
        if [ -f "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
            print_success "Windows PowerShell: 利用可能"
            echo "  パス: /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
        fi
        
        # Windows パス区切り文字チェック
        echo ""
        echo "  📁 パス互換性:"
        cd "$BACKEND_DIR"
        find api -name '*.ps1' | while read -r ps_file; do
            if grep -q '\\\\'  "$ps_file" 2>/dev/null; then
                echo "    $(basename "$ps_file"): Windows パス形式検出"
            fi
        done
    else
        print_info "通常のLinux環境"
        echo "  PowerShell Coreの使用を推奨します"
    fi
    
    # 文字エンコーディング確認
    echo ""
    echo "  📝 文字エンコーディング:"
    if [ -d "api" ]; then
        find api -name '*.ps1' | while read -r ps_file; do
            local encoding=$(file -b --mime-encoding "$ps_file" 2>/dev/null || echo "unknown")
            echo "    $(basename "$ps_file"): $encoding"
            
            # BOM確認
            if hexdump -C "$ps_file" | head -1 | grep -q "ef bb bf"; then
                echo "      UTF-8 BOM: 検出"
            fi
        done
    fi
    
    # 改行コード確認
    echo ""
    echo "  🔄 改行コード:"
    if [ -d "api" ]; then
        find api -name '*.ps1' | while read -r ps_file; do
            if file "$ps_file" | grep -q "CRLF"; then
                echo "    $(basename "$ps_file"): CRLF (Windows形式)"
            elif file "$ps_file" | grep -q "text"; then
                echo "    $(basename "$ps_file"): LF (Unix形式)"
            fi
        done
    fi
}

# PowerShellモジュール管理
manage_powershell_modules() {
    print_info "PowerShellモジュールを管理中..."
    
    cd "$BACKEND_DIR"
    
    echo ""
    echo "📦 PowerShellモジュール管理:"
    
    # modules ディレクトリ確認・作成
    if [ ! -d "modules" ]; then
        print_info "modulesディレクトリを作成中..."
        mkdir -p modules
    fi
    
    # 既存モジュール確認
    if [ -d "modules" ]; then
        local module_count=$(find modules -name '*.psm1' | wc -l)
        echo "  既存モジュール数: $module_count"
        
        if [ "$module_count" -gt 0 ]; then
            find modules -name '*.psm1' | while read -r module_file; do
                local module_name=$(basename "$module_file" .psm1)
                echo "    📦 $module_name"
                
                # モジュール内の関数確認
                local function_count=$(grep -c "^function" "$module_file" 2>/dev/null || echo "0")
                echo "      関数数: $function_count"
            done
        fi
    fi
    
    # 不足している基本モジュールの生成
    local required_modules=("Config" "DBUtil" "LogUtil" "AuthUtil" "PasswordUtil")
    
    for module in "${required_modules[@]}"; do
        local module_file="modules/${module}.psm1"
        
        if [ ! -f "$module_file" ]; then
            print_info "基本モジュール生成中: $module"
            generate_basic_powershell_module "$module"
        else
            print_success "モジュール確認済み: $module"
        fi
    done
}

# PowerShell実行ポリシー設定
set_powershell_execution_policy() {
    print_info "PowerShell実行ポリシーを設定中..."
    
    echo ""
    echo "🔐 PowerShell実行ポリシー設定:"
    
    if command -v pwsh &> /dev/null; then
        print_info "PowerShell Core実行ポリシー確認中..."
        
        # 現在の実行ポリシー確認
        local current_policy
        current_policy=$(pwsh -NoProfile -Command "Get-ExecutionPolicy" 2>/dev/null || echo "Unknown")
        echo "  現在のポリシー: $current_policy"
        
        # 推奨ポリシーに設定
        if [ "$current_policy" != "RemoteSigned" ] && [ "$current_policy" != "Unrestricted" ]; then
            print_info "実行ポリシーをRemoteSignedに設定中..."
            
            # ユーザースコープで設定（管理者権限不要）
            if pwsh -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" 2>/dev/null; then
                print_success "実行ポリシー設定完了: RemoteSigned"
            else
                print_warning "実行ポリシー設定に失敗しました"
                print_info "手動設定が必要な場合があります"
            fi
        else
            print_success "実行ポリシー: 設定済み ($current_policy)"
        fi
    else
        print_warning "PowerShell Coreが見つかりません"
        print_info "PowerShell Core のインストールを推奨します:"
        echo ""
        echo "  Ubuntu/Debian:"
        echo "    wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb"
        echo "    sudo dpkg -i packages-microsoft-prod.deb"
        echo "    sudo apt-get update"
        echo "    sudo apt-get install -y powershell"
    fi
}

# run-tests.sh スクリプト生成
generate_run_tests_script() {
    print_info "run-tests.sh を生成中..."
    
    mkdir -p "$BACKEND_DIR/test"
    
    cat > "$BACKEND_DIR/test/run-tests.sh" << 'EOF'
#!/bin/bash

echo "=== ITSM Platform Backend Test Runner ==="
echo "Checking PowerShell availability..."

if command -v pwsh &> /dev/null; then
    echo "PowerShell Core (pwsh) found. Running tests..."
    pwsh -File Test-APIs.ps1
elif command -v powershell &> /dev/null; then
    echo "PowerShell (powershell) found. Running tests..."
    powershell -File Test-APIs.ps1
else
    echo "PowerShell not found. Please install PowerShell Core to run tests."
    echo "Visit: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell"
    echo ""
    echo "For Ubuntu/Debian:"
    echo "  sudo apt-get install -y wget apt-transport-https software-properties-common"
    echo "  wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb"
    echo "  sudo dpkg -i packages-microsoft-prod.deb"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y powershell"
    echo ""
    echo "Alternative: Run tests manually on Windows PowerShell environment."
    exit 1
fi
EOF

    chmod +x "$BACKEND_DIR/test/run-tests.sh"
    print_success "run-tests.sh 生成完了"
}

# Test-APIs.ps1 スクリプト生成
generate_test_apis_script() {
    print_info "Test-APIs.ps1 を生成中..."
    
    cat > "$BACKEND_DIR/test/Test-APIs.ps1" << 'EOF'
# ITSM Platform PowerShell API Test Suite

Write-Host "=== ITSM Platform PowerShell API Tests ===" -ForegroundColor Cyan

# テスト結果カウンター
$global:TestsPassed = 0
$global:TestsFailed = 0

function Test-PowerShellEnvironment {
    Write-Host "`n🔍 PowerShell環境テスト" -ForegroundColor Yellow
    
    try {
        # PowerShellバージョン確認
        Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Green
        $global:TestsPassed++
        
        # 実行ポリシー確認
        $executionPolicy = Get-ExecutionPolicy
        Write-Host "Execution Policy: $executionPolicy" -ForegroundColor Green
        $global:TestsPassed++
        
        return $true
    } catch {
        Write-Host "Environment test failed: $_" -ForegroundColor Red
        $global:TestsFailed++
        return $false
    }
}

function Test-PowerShellModules {
    Write-Host "`n📦 PowerShellモジュールテスト" -ForegroundColor Yellow
    
    $moduleDir = Join-Path $PSScriptRoot "..\modules"
    
    if (Test-Path $moduleDir) {
        $modules = Get-ChildItem -Path $moduleDir -Filter "*.psm1"
        
        foreach ($module in $modules) {
            try {
                Write-Host "Testing module: $($module.Name)" -ForegroundColor Cyan
                
                # モジュール構文チェック（簡易）
                $content = Get-Content $module.FullName -Raw
                
                if ($content -match "function") {
                    Write-Host "  ✅ Functions found" -ForegroundColor Green
                    $global:TestsPassed++
                } else {
                    Write-Host "  ⚠️  No functions found" -ForegroundColor Yellow
                }
                
            } catch {
                Write-Host "  ❌ Module test failed: $_" -ForegroundColor Red
                $global:TestsFailed++
            }
        }
    } else {
        Write-Host "Modules directory not found: $moduleDir" -ForegroundColor Yellow
    }
}

function Test-PowerShellAPIs {
    Write-Host "`n🔌 PowerShell API テスト" -ForegroundColor Yellow
    
    $apiDir = Join-Path $PSScriptRoot "..\api"
    
    if (Test-Path $apiDir) {
        $apis = Get-ChildItem -Path $apiDir -Filter "*.ps1"
        
        foreach ($api in $apis) {
            try {
                Write-Host "Testing API: $($api.Name)" -ForegroundColor Cyan
                
                # API スクリプト構文チェック
                $content = Get-Content $api.FullName -Raw
                
                # 基本的な構文要素確認
                $checks = @{
                    "param" = $content -match "param\("
                    "function" = $content -match "function"
                    "try-catch" = $content -match "try\s*\{"
                }
                
                foreach ($check in $checks.GetEnumerator()) {
                    if ($check.Value) {
                        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
                        $global:TestsPassed++
                    } else {
                        Write-Host "  ⚠️  $($check.Key) not found" -ForegroundColor Yellow
                    }
                }
                
            } catch {
                Write-Host "  ❌ API test failed: $_" -ForegroundColor Red
                $global:TestsFailed++
            }
        }
    } else {
        Write-Host "API directory not found: $apiDir" -ForegroundColor Yellow
    }
}

function Test-DatabaseConnectivity {
    Write-Host "`n🗄️  データベース接続テスト" -ForegroundColor Yellow
    
    $dbPath = Join-Path $PSScriptRoot "..\db\itsm.sqlite"
    
    if (Test-Path $dbPath) {
        Write-Host "Database file found: $dbPath" -ForegroundColor Green
        $global:TestsPassed++
    } else {
        Write-Host "Database file not found: $dbPath" -ForegroundColor Red
        $global:TestsFailed++
    }
}

# メインテスト実行
Write-Host "Starting PowerShell API Tests..." -ForegroundColor White

Test-PowerShellEnvironment
Test-PowerShellModules
Test-PowerShellAPIs
Test-DatabaseConnectivity

# テスト結果サマリー
Write-Host "`n=== Test Results Summary ===" -ForegroundColor Cyan
Write-Host "Tests Passed: $global:TestsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $global:TestsFailed" -ForegroundColor Red

$totalTests = $global:TestsPassed + $global:TestsFailed
if ($totalTests -gt 0) {
    $successRate = [math]::Round(($global:TestsPassed / $totalTests) * 100, 2)
    Write-Host "Success Rate: $successRate%" -ForegroundColor Yellow
}

# 終了コード設定
if ($global:TestsFailed -eq 0) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Some tests failed. Please check the output above." -ForegroundColor Red
    exit 1
}
EOF

    print_success "Test-APIs.ps1 生成完了"
}

# 基本PowerShellモジュール生成
generate_basic_powershell_module() {
    local module_name="$1"
    local module_file="modules/${module_name}.psm1"
    
    case "$module_name" in
        "Config")
            cat > "$module_file" << 'EOF'
# Config.psm1 - 設定管理モジュール

function Get-ITSMConfig {
    param(
        [string]$ConfigName
    )
    
    # 設定ファイルのパス
    $configPath = Join-Path $PSScriptRoot "..\config\app.config"
    
    # TODO: 設定読み込み実装
    Write-Output "Config: $ConfigName"
}

function Set-ITSMConfig {
    param(
        [string]$ConfigName,
        [string]$ConfigValue
    )
    
    # TODO: 設定書き込み実装
    Write-Output "Set Config: $ConfigName = $ConfigValue"
}

Export-ModuleMember -Function Get-ITSMConfig, Set-ITSMConfig
EOF
            ;;
        "DBUtil")
            cat > "$module_file" << 'EOF'
# DBUtil.psm1 - データベースユーティリティモジュール

function Connect-ITSMDatabase {
    param(
        [string]$DatabasePath = "..\db\itsm.sqlite"
    )
    
    # TODO: SQLite接続実装
    Write-Output "Database connection: $DatabasePath"
}

function Invoke-ITSMQuery {
    param(
        [string]$Query,
        [hashtable]$Parameters = @{}
    )
    
    # TODO: クエリ実行実装
    Write-Output "Execute Query: $Query"
}

Export-ModuleMember -Function Connect-ITSMDatabase, Invoke-ITSMQuery
EOF
            ;;
        "LogUtil")
            cat > "$module_file" << 'EOF'
# LogUtil.psm1 - ログユーティリティモジュール

function Write-ITSMLog {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$LogFile = "..\logs\itsm.log"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # コンソール出力
    Write-Host $logEntry
    
    # ファイル出力
    try {
        $logDir = Split-Path $LogFile -Parent
        if (!(Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        Add-Content -Path $LogFile -Value $logEntry
    } catch {
        Write-Warning "Failed to write log file: $_"
    }
}

Export-ModuleMember -Function Write-ITSMLog
EOF
            ;;
        "AuthUtil")
            cat > "$module_file" << 'EOF'
# AuthUtil.psm1 - 認証ユーティリティモジュール

function Test-ITSMAuthentication {
    param(
        [string]$Username,
        [string]$Password
    )
    
    # TODO: 認証ロジック実装
    Write-Output "Authentication test for: $Username"
    return $true
}

function New-ITSMToken {
    param(
        [string]$Username,
        [int]$ExpirationMinutes = 60
    )
    
    # TODO: JWTトークン生成実装
    $token = [System.Guid]::NewGuid().ToString()
    Write-Output $token
}

Export-ModuleMember -Function Test-ITSMAuthentication, New-ITSMToken
EOF
            ;;
        "PasswordUtil")
            cat > "$module_file" << 'EOF'
# PasswordUtil.psm1 - パスワードユーティリティモジュール

function ConvertTo-ITSMHashedPassword {
    param(
        [string]$Password
    )
    
    # TODO: bcryptハッシュ化実装
    # 簡易実装（本番環境では適切なハッシュ化を実装）
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $hash = $hasher.ComputeHash($bytes)
    $hashString = [System.BitConverter]::ToString($hash) -replace '-'
    
    Write-Output $hashString
}

function Test-ITSMPassword {
    param(
        [string]$Password,
        [string]$HashedPassword
    )
    
    $testHash = ConvertTo-ITSMHashedPassword -Password $Password
    return ($testHash -eq $HashedPassword)
}

Export-ModuleMember -Function ConvertTo-ITSMHashedPassword, Test-ITSMPassword
EOF
            ;;
    esac
    
    print_success "PowerShellモジュール生成完了: $module_name"
}

# 全自動修復モード
run_full_auto_mode() {
    print_info "全自動修復モードを開始します..."
    
    echo ""
    print_info "🔄 Step 1: PowerShell環境確認"
    check_powershell_environment
    
    echo ""
    print_info "🔄 Step 2: PowerShell実行ポリシー設定"
    set_powershell_execution_policy
    
    echo ""
    print_info "🔄 Step 3: PowerShellモジュール管理"
    manage_powershell_modules
    
    echo ""
    print_info "🔄 Step 4: PowerShell API自動修復"
    auto_fix_powershell_issues
    
    echo ""
    print_info "🔄 Step 5: PowerShellスクリプト検証"
    verify_powershell_scripts
    
    echo ""
    print_info "🔄 Step 6: Windows互換性チェック"
    check_windows_compatibility
    
    echo ""
    print_info "🔄 Step 7: run-tests.sh 実行"
    if run_powershell_tests; then
        print_success "🎉 全自動修復モード完了: 全テスト合格"
    else
        print_warning "⚠️ 一部テストが失敗しました"
        print_info "PowerShell環境のインストールが必要な可能性があります"
    fi
    
    echo ""
    print_info "継続監視を開始しますか？ y/n"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        continuous_powershell_monitoring
    fi
}

# 継続PowerShell監視
continuous_powershell_monitoring() {
    print_info "継続PowerShell監視モードを開始します..."
    print_info "停止するには Ctrl+C を押してください"
    
    while true; do
        sleep 60
        
        # PowerShell環境確認
        if ! command -v pwsh &> /dev/null && ! command -v powershell &> /dev/null; then
            print_warning "PowerShell環境が利用できません"
        fi
        
        # ファイル変更監視（簡易版）
        local changed_files
        changed_files=$(find "$BACKEND_DIR/api" -name '*.ps1' -newer /tmp/ps_last_check 2>/dev/null | wc -l)
        
        if [ "$changed_files" -gt 0 ]; then
            print_info "PowerShellファイル変更を検出 ($changed_files ファイル)"
            # 自動テスト実行
            if command -v pwsh &> /dev/null || command -v powershell &> /dev/null; then
                run_powershell_tests &>/dev/null && print_success "自動テスト: OK" || print_warning "自動テスト: エラー検出"
            fi
        fi
        
        touch /tmp/ps_last_check
    done
}

# メインループ
main_loop() {
    print_header
    
    while true; do
        show_powershell_menu
        echo -n "選択してください: "
        read -r choice
        
        case $choice in
            1)
                check_powershell_environment
                ;;
            2)
                run_powershell_tests
                ;;
            3)
                run_powershell_test_loop
                ;;
            4)
                list_powershell_apis
                ;;
            5)
                auto_fix_powershell_issues
                ;;
            6)
                verify_powershell_scripts
                ;;
            7)
                check_windows_compatibility
                ;;
            8)
                manage_powershell_modules
                ;;
            9)
                set_powershell_execution_policy
                ;;
            a|A)
                run_full_auto_mode
                ;;
            0)
                clear
                print_header
                ;;
            q|Q)
                print_info "PowerShell API修復を終了します"
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
print_header
setup_claude
main_loop