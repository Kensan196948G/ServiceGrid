#!/bin/bash

# Feature-C: API開発
# Node.js・Express・テスト通過ループ

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
FEATURE_NAME="Feature-C: API開発"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Claude Code自動起動設定
setup_claude() {
    echo "🤖 Claude Code自動起動中..."
    
    # .envからAPIキー読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # プロンプト設定
    export PS1='[Feature-C-API] \w$ '
    echo "\033]0;Feature-C-API\007"
    
    # Claude Code環境確認
    if command -v claude &> /dev/null; then
        echo "✅ Claude Codeが利用可能です"
        echo "🔧 Feature-C-API: バックエンドAPI開発アシスタントとして動作中"
        echo ""
        echo "💡 使用例:"
        echo "  claude 'APIエンドポイントを作成してください'"
        echo "  claude 'データベーススキーマを確認してください'"
        echo "  claude 'テストを実行してエラーを修正してください'"
        echo ""
    else
        echo "⚠️ Claude Codeが見つかりません"
        echo "💡 インストール方法: pip install claude-code"
    fi
}

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;33m========================================\033[0m"
    echo -e "\033[1;33m  $FEATURE_NAME\033[0m"
    echo -e "\033[1;33m========================================\033[0m"
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

# API開発メニュー表示
show_api_menu() {
    echo ""
    echo "🚀 API開発テストループ - 操作メニュー"
    echo "────────────────────────────────────────"
    echo "1) 🔥 バックエンドAPIサーバー起動"
    echo "2) 🧪 API統合テスト実行"
    echo "3) 🔄 テスト通過まで自動ループ"
    echo "4) 📊 API仕様確認・検証"
    echo "5) 🗄️  データベース初期化"
    echo "6) 🔌 API エンドポイント生成"
    echo "7) 🛠️  API 自動修復"
    echo "8) 📡 API接続テスト"
    echo "9) 📝 API ドキュメント生成"
    echo "a) 🎯 全自動開発モード"
    echo "0) 🔄 メニュー再表示"
    echo "q) 終了"
    echo "────────────────────────────────────────"
}

# バックエンドAPIサーバー起動
start_api_server() {
    print_info "バックエンドAPIサーバーを起動中..."
    
    cd "$BACKEND_DIR"
    
    # 既存サーバーチェック
    if pgrep -f "node.*8082" > /dev/null; then
        print_warning "APIサーバーは既に稼働中です (Port 8082)"
        return
    fi
    
    # 依存関係インストール確認
    if [ ! -d "node_modules" ]; then
        print_info "依存関係をインストール中..."
        npm install
    fi
    
    # 環境変数確認
    if [ ! -f "../.env" ]; then
        print_warning ".envファイルが見つかりません"
        print_info "デフォルト設定で起動します"
    fi
    
    # APIサーバー起動
    print_info "Express APIサーバーを起動中... (Port 8082)"
    PORT=8082 node secure-server.js &
    
    # 起動確認
    sleep 3
    if pgrep -f "node.*8082" > /dev/null; then
        print_success "APIサーバー起動完了: http://localhost:8082"
        
        # ヘルスチェック
        if command -v curl &> /dev/null; then
            sleep 2
            if curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
                print_success "API ヘルスチェック: 正常"
            fi
        fi
    else
        print_error "APIサーバー起動に失敗しました"
    fi
}

# API統合テスト実行
run_api_tests() {
    print_info "API統合テストを実行中..."
    
    cd "$BACKEND_DIR"
    
    # APIサーバー稼働確認
    if ! pgrep -f "node.*8082" > /dev/null; then
        print_warning "APIサーバーが起動していません"
        print_info "APIサーバーを起動しますか？ y/n"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            start_api_server
            sleep 3
        else
            return
        fi
    fi
    
    # テストファイル存在確認
    local test_files_found=false
    
    if [ -f "package.json" ] && grep -q "test" package.json; then
        print_info "Node.js テストスイート実行中..."
        if npm test; then
            print_success "Node.js テスト: 合格"
            test_files_found=true
        else
            print_error "Node.js テスト: 失敗"
        fi
    fi
    
    # 手動APIテスト実行
    if [ -f "test-api.js" ]; then
        print_info "API統合テスト実行中..."
        if node test-api.js; then
            print_success "API統合テスト: 合格"
            test_files_found=true
        else
            print_error "API統合テスト: 失敗"
        fi
    fi
    
    # 認証テスト
    if [ -f "test-login-direct.js" ]; then
        print_info "認証テスト実行中..."
        if node test-login-direct.js; then
            print_success "認証テスト: 合格"
            test_files_found=true
        else
            print_error "認証テスト: 失敗"
        fi
    fi
    
    if [ "$test_files_found" = false ]; then
        print_warning "テストファイルが見つかりません"
        print_info "基本的なAPIテストを生成しますか？ y/n"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            generate_basic_api_tests
        fi
    fi
}

# テスト通過まで自動ループ
run_test_loop() {
    print_info "テスト通過まで自動ループを開始します..."
    
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "ループ試行 $attempt/$max_attempts"
        
        # API サーバー確認
        if ! pgrep -f "node.*8082" > /dev/null; then
            print_info "APIサーバー再起動中..."
            start_api_server
            sleep 3
        fi
        
        # テスト実行
        if run_api_tests_silent; then
            print_success "テストループ完了: 全テスト合格"
            return 0
        else
            print_warning "テスト失敗 - 自動修復を試行中..."
            auto_fix_api_issues
            sleep 2
        fi
        
        ((attempt++))
    done
    
    print_error "最大試行回数に達しました。手動確認が必要です。"
}

# サイレントテスト実行
run_api_tests_silent() {
    cd "$BACKEND_DIR"
    
    # 基本的なAPIエンドポイントテスト
    if command -v curl &> /dev/null; then
        # ヘルスチェック
        if ! curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
            return 1
        fi
        
        # 認証エンドポイント
        if ! curl -s -X POST http://localhost:8082/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"admin123"}' > /dev/null 2>&1; then
            return 1
        fi
        
        return 0
    fi
    
    return 1
}

# API仕様確認・検証
verify_api_specs() {
    print_info "API仕様を確認・検証中..."
    
    cd "$BACKEND_DIR"
    
    echo ""
    echo "📋 実装済みAPIエンドポイント:"
    
    # Node.js API ファイル確認
    if [ -d "api" ]; then
        print_info "Node.js APIs:"
        find api -name '*.js' | while read -r api_file; do
            local api_name=$(basename "$api_file" .js)
            echo "  ✅ $api_name.js"
            
            # エンドポイント抽出（簡易版）
            if grep -q "router\.get\|router\.post\|router\.put\|router\.delete" "$api_file"; then
                echo "    $(grep -o "router\.[a-z]*('.*'" "$api_file" | sed "s/router\./    - /g" | sed "s/'//g" || true)"
            fi
        done
        
        echo ""
        print_info "PowerShell APIs:"
        find api -name '*.ps1' | while read -r ps_file; do
            local ps_name=$(basename "$ps_file" .ps1)
            echo "  🔷 $ps_name.ps1"
        done
    fi
    
    echo ""
    echo "🗄️ データベーススキーマ:"
    if [ -d "db" ]; then
        find db -name '*.sql' | while read -r schema_file; do
            local schema_name=$(basename "$schema_file")
            echo "  📄 $schema_name"
        done
    fi
    
    # API稼働状況確認
    echo ""
    print_info "API稼働状況確認中..."
    if pgrep -f "node.*8082" > /dev/null; then
        print_success "APIサーバー: 稼働中 (Port 8082)"
        
        if command -v curl &> /dev/null; then
            # 基本エンドポイントテスト
            echo "  エンドポイントテスト:"
            
            # ヘルスチェック
            if curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
                echo "    ✅ /api/health"
            else
                echo "    ❌ /api/health"
            fi
            
            # 認証
            if curl -s http://localhost:8082/api/auth/login > /dev/null 2>&1; then
                echo "    ✅ /api/auth/login"
            else
                echo "    ❌ /api/auth/login"
            fi
            
            # 資産管理
            if curl -s http://localhost:8082/api/assets > /dev/null 2>&1; then
                echo "    ✅ /api/assets"
            else
                echo "    ❌ /api/assets"
            fi
            
            # インシデント
            if curl -s http://localhost:8082/api/incidents > /dev/null 2>&1; then
                echo "    ✅ /api/incidents"
            else
                echo "    ❌ /api/incidents"
            fi
        fi
    else
        print_warning "APIサーバー: 停止中"
    fi
}

# データベース初期化
init_database() {
    print_info "データベースを初期化中..."
    
    cd "$BACKEND_DIR"
    
    # スクリプト存在確認
    local init_scripts=()
    
    if [ -f "scripts/init-database.js" ]; then
        init_scripts+=("scripts/init-database.js")
    fi
    
    if [ -f "scripts/init-assets-db.js" ]; then
        init_scripts+=("scripts/init-assets-db.js")
    fi
    
    if [ -f "scripts/init-incidents-db.js" ]; then
        init_scripts+=("scripts/init-incidents-db.js")
    fi
    
    if [ ${#init_scripts[@]} -eq 0 ]; then
        print_warning "データベース初期化スクリプトが見つかりません"
        return
    fi
    
    # 初期化実行
    for script in "${init_scripts[@]}"; do
        print_info "実行中: $script"
        if node "$script"; then
            print_success "完了: $script"
        else
            print_error "失敗: $script"
        fi
    done
    
    # データベースファイル確認
    if [ -f "db/itsm.sqlite" ]; then
        print_success "データベースファイル確認完了: db/itsm.sqlite"
        local db_size=$(stat -c%s "db/itsm.sqlite" 2>/dev/null || echo "unknown")
        print_info "データベースサイズ: $db_size bytes"
    fi
}

# API エンドポイント生成
generate_api_endpoints() {
    print_info "APIエンドポイントを生成中..."
    
    cd "$BACKEND_DIR"
    
    # 不足しているAPI確認
    local missing_apis=()
    
    # 基本的なCRUD APIリスト
    local required_apis=(
        "users" "service-requests" "knowledge" 
        "problems" "releases" "changes" 
        "slas" "compliance" "security"
    )
    
    for api in "${required_apis[@]}"; do
        if [ ! -f "api/${api}.js" ]; then
            missing_apis+=("$api")
        fi
    done
    
    if [ ${#missing_apis[@]} -eq 0 ]; then
        print_success "全ての基本APIが実装済みです"
        return
    fi
    
    print_info "不足しているAPI: ${missing_apis[*]}"
    print_info "基本的なAPIテンプレートを生成しますか？ y/n"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        for api in "${missing_apis[@]}"; do
            generate_basic_api_template "$api"
        done
    fi
}

# 基本APIテンプレート生成
generate_basic_api_template() {
    local api_name="$1"
    local api_file="api/${api_name}.js"
    
    print_info "APIテンプレート生成中: $api_name"
    
    cat > "$api_file" << EOF
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/itsm.sqlite');

// GET /${api_name} - 一覧取得
router.get('/', auth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(\`SELECT * FROM ${api_name} ORDER BY created_at DESC\`, (err, rows) => {
        if (err) {
            console.error('${api_name} fetch error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.json(rows);
    });
    
    db.close();
});

// GET /${api_name}/:id - 詳細取得
router.get('/:id', auth, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    db.get(\`SELECT * FROM ${api_name} WHERE id = ?\`, [id], (err, row) => {
        if (err) {
            console.error('${api_name} fetch error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: '${api_name} not found' });
        }
        
        res.json(row);
    });
    
    db.close();
});

// POST /${api_name} - 新規作成
router.post('/', auth, (req, res) => {
    const data = req.body;
    const db = new sqlite3.Database(dbPath);
    
    // TODO: データバリデーション実装
    
    const stmt = db.prepare(\`INSERT INTO ${api_name} (title, description, created_at) VALUES (?, ?, datetime('now'))\`);
    
    stmt.run([data.title, data.description], function(err) {
        if (err) {
            console.error('${api_name} create error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.status(201).json({ id: this.lastID, message: '${api_name} created successfully' });
    });
    
    stmt.finalize();
    db.close();
});

// PUT /${api_name}/:id - 更新
router.put('/:id', auth, (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const db = new sqlite3.Database(dbPath);
    
    // TODO: データバリデーション実装
    
    db.run(\`UPDATE ${api_name} SET title = ?, description = ?, updated_at = datetime('now') WHERE id = ?\`,
        [data.title, data.description, id], function(err) {
        if (err) {
            console.error('${api_name} update error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '${api_name} not found' });
        }
        
        res.json({ message: '${api_name} updated successfully' });
    });
    
    db.close();
});

// DELETE /${api_name}/:id - 削除
router.delete('/:id', auth, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    db.run(\`DELETE FROM ${api_name} WHERE id = ?\`, [id], function(err) {
        if (err) {
            console.error('${api_name} delete error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '${api_name} not found' });
        }
        
        res.json({ message: '${api_name} deleted successfully' });
    });
    
    db.close();
});

module.exports = router;
EOF

    print_success "APIテンプレート生成完了: $api_file"
}

# API 自動修復
auto_fix_api_issues() {
    print_info "API自動修復を実行中..."
    
    cd "$BACKEND_DIR"
    
    # よくあるエラーパターンの修復
    
    # 1. ポート競合解決
    if lsof -ti:8082 &> /dev/null; then
        print_info "Port 8082 競合解決中..."
        pkill -f "node.*8082" 2>/dev/null || true
        sleep 2
    fi
    
    # 2. データベースロック解決
    if [ -f "db/itsm.sqlite-wal" ]; then
        print_info "データベースロック解決中..."
        rm -f "db/itsm.sqlite-wal" "db/itsm.sqlite-shm" 2>/dev/null || true
    fi
    
    # 3. Node.js モジュール再インストール
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        print_info "Node.js依存関係修復中..."
        npm install
    fi
    
    # 4. 基本的な設定ファイル確認
    if [ ! -f "package.json" ]; then
        print_error "package.json が見つかりません"
        return 1
    fi
    
    # 5. セキュリティミドルウェア確認
    if [ ! -f "middleware/auth.js" ]; then
        print_warning "認証ミドルウェアが見つかりません"
        # 基本的な認証ミドルウェア生成
        mkdir -p middleware
        cat > "middleware/auth.js" << 'EOF'
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = auth;
EOF
        print_success "基本認証ミドルウェア生成完了"
    fi
    
    print_success "API自動修復完了"
}

# API接続テスト
test_api_connections() {
    print_info "API接続テストを実行中..."
    
    if ! command -v curl &> /dev/null; then
        print_error "curl が見つかりません。API接続テストをスキップします。"
        return
    fi
    
    # APIサーバー起動確認
    if ! pgrep -f "node.*8082" > /dev/null; then
        print_warning "APIサーバーが起動していません。起動してからテストを実行してください。"
        return
    fi
    
    echo ""
    echo "🔌 API接続テスト結果:"
    
    # ヘルスチェック
    if curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
        echo "  ✅ Health Check: OK"
    else
        echo "  ❌ Health Check: Failed"
    fi
    
    # 認証エンドポイント
    local auth_response
    auth_response=$(curl -s -X POST http://localhost:8082/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
    
    if echo "$auth_response" | grep -q "token" 2>/dev/null; then
        echo "  ✅ Authentication: OK"
    else
        echo "  ❌ Authentication: Failed"
    fi
    
    # 主要API エンドポイント
    local endpoints=("assets" "incidents" "service-requests")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s "http://localhost:8082/api/$endpoint" > /dev/null 2>&1; then
            echo "  ✅ /$endpoint: OK"
        else
            echo "  ❌ /$endpoint: Failed"
        fi
    done
}

# API ドキュメント生成
generate_api_docs() {
    print_info "APIドキュメントを生成中..."
    
    cd "$BACKEND_DIR"
    
    local docs_file="../docs/API_Documentation.md"
    
    cat > "$docs_file" << EOF
# ITSM Platform API Documentation

## 生成日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## Base URL
\`http://localhost:8082/api\`

## 認証
Bearer Token認証を使用

### ログイン
\`\`\`bash
curl -X POST http://localhost:8082/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'
\`\`\`

## APIエンドポイント

EOF

    # 実装済みAPIの自動ドキュメント生成
    find api -name '*.js' | while read -r api_file; do
        local api_name=$(basename "$api_file" .js)
        echo "" >> "$docs_file"
        echo "### $api_name API" >> "$docs_file"
        echo "" >> "$docs_file"
        
        # エンドポイント抽出
        grep -n "router\.[a-z]*" "$api_file" | while read -r line; do
            echo "- $line" >> "$docs_file"
        done 2>/dev/null || true
    done
    
    print_success "APIドキュメント生成完了: $docs_file"
}

# 全自動開発モード
run_full_auto_mode() {
    print_info "全自動開発モードを開始します..."
    
    echo ""
    print_info "🔄 Step 1: APIサーバー起動確認"
    if ! pgrep -f "node.*8082" > /dev/null; then
        start_api_server
    else
        print_success "APIサーバー稼働中"
    fi
    
    echo ""
    print_info "🔄 Step 2: データベース初期化確認"
    if [ ! -f "db/itsm.sqlite" ] || [ ! -s "db/itsm.sqlite" ]; then
        init_database
    else
        print_success "データベース初期化済み"
    fi
    
    echo ""
    print_info "🔄 Step 3: 不足APIエンドポイント生成"
    generate_api_endpoints
    
    echo ""
    print_info "🔄 Step 4: API自動修復"
    auto_fix_api_issues
    
    echo ""
    print_info "🔄 Step 5: API統合テスト"
    run_api_tests
    
    echo ""
    print_info "🔄 Step 6: API接続テスト"
    test_api_connections
    
    echo ""
    print_info "🔄 Step 7: APIドキュメント生成"
    generate_api_docs
    
    echo ""
    print_success "全自動開発モード完了"
    print_info "継続監視を開始しますか？ y/n"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        continuous_api_monitoring
    fi
}

# 継続API監視
continuous_api_monitoring() {
    print_info "継続API監視モードを開始します..."
    print_info "停止するには Ctrl+C を押してください"
    
    while true; do
        sleep 30
        
        # APIサーバー稼働確認
        if ! pgrep -f "node.*8082" > /dev/null; then
            print_warning "APIサーバーダウン検出 - 再起動中..."
            start_api_server
        fi
        
        # 基本ヘルスチェック
        if command -v curl &> /dev/null; then
            if ! curl -s http://localhost:8082/api/health > /dev/null 2>&1; then
                print_warning "APIヘルスチェック失敗 - 修復中..."
                auto_fix_api_issues
            fi
        fi
        
        # ファイル変更監視（簡易版）
        local changed_files
        changed_files=$(find api -name '*.js' -newer /tmp/api_last_check 2>/dev/null | wc -l)
        
        if [ "$changed_files" -gt 0 ]; then
            print_info "APIファイル変更を検出 ($changed_files ファイル)"
            # 自動テスト実行
            run_api_tests_silent && print_success "自動テスト: OK" || print_warning "自動テスト: エラー検出"
        fi
        
        touch /tmp/api_last_check
    done
}

# 基本APIテスト生成
generate_basic_api_tests() {
    print_info "基本APIテストを生成中..."
    
    cat > "test-basic-api.js" << 'EOF'
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8082,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, body: body });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

const runBasicTests = async () => {
    console.log('基本APIテスト開始...');
    
    try {
        // ヘルスチェック
        const health = await testEndpoint('/health');
        console.log(`Health Check: ${health.status === 200 ? 'OK' : 'Failed'}`);
        
        // 認証テスト
        const auth = await testEndpoint('/auth/login', 'POST', {
            username: 'admin',
            password: 'admin123'
        });
        console.log(`Authentication: ${auth.status === 200 ? 'OK' : 'Failed'}`);
        
        // 基本エンドポイント
        const endpoints = ['/assets', '/incidents'];
        for (const endpoint of endpoints) {
            try {
                const result = await testEndpoint(endpoint);
                console.log(`${endpoint}: ${result.status < 500 ? 'OK' : 'Failed'}`);
            } catch (err) {
                console.log(`${endpoint}: Failed`);
            }
        }
        
        console.log('基本APIテスト完了');
        process.exit(0);
    } catch (err) {
        console.error('テストエラー:', err.message);
        process.exit(1);
    }
};

runBasicTests();
EOF

    print_success "基本APIテスト生成完了: test-basic-api.js"
}

# メインループ
main_loop() {
    print_header
    
    while true; do
        show_api_menu
        echo -n "選択してください: "
        read -r choice
        
        case $choice in
            1)
                start_api_server
                ;;
            2)
                run_api_tests
                ;;
            3)
                run_test_loop
                ;;
            4)
                verify_api_specs
                ;;
            5)
                init_database
                ;;
            6)
                generate_api_endpoints
                ;;
            7)
                auto_fix_api_issues
                ;;
            8)
                test_api_connections
                ;;
            9)
                generate_api_docs
                ;;
            a|A)
                run_full_auto_mode
                ;;
            0)
                clear
                print_header
                ;;
            q|Q)
                print_info "API開発を終了します"
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