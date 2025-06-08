#!/bin/bash

# ITSM自動運用監視ループスクリプト
# 無停止・無確認で継続監視と自動修復を実行

echo "🤖 ITSM自動運用監視ループ開始 ($(date))"
echo "==============================================="

# 設定
CHECK_INTERVAL=30  # 30秒間隔での監視
FRONTEND_URL="http://localhost:3001"
BACKEND_URL="http://localhost:8082"
LOG_FILE="./logs/auto-monitoring.log"

# ログディレクトリ作成
mkdir -p ./logs

# 監視ループ関数
monitor_and_repair() {
    local check_count=0
    
    while true; do
        check_count=$((check_count + 1))
        echo "🔄 監視チェック #$check_count ($(date))" | tee -a $LOG_FILE
        
        # バックエンドヘルスチェック
        if ! curl -s "$BACKEND_URL/ping" > /dev/null 2>&1; then
            echo "❌ バックエンドAPIエラー検出 - 自動修復開始" | tee -a $LOG_FILE
            ./stop-all.sh -y > /dev/null 2>&1
            sleep 5
            ./start-all.sh -y > /dev/null 2>&1 &
            sleep 15
            echo "🔧 バックエンド修復完了" | tee -a $LOG_FILE
        else
            echo "✅ バックエンドAPI正常" | tee -a $LOG_FILE
        fi
        
        # フロントエンドヘルスチェック
        if ! curl -s -I "$FRONTEND_URL" | head -1 | grep "200" > /dev/null 2>&1; then
            echo "❌ フロントエンドエラー検出 - 自動修復開始" | tee -a $LOG_FILE
            pkill -f "simple-frontend-server.cjs" 2>/dev/null
            node simple-frontend-server.cjs > /dev/null 2>&1 &
            sleep 5
            echo "🔧 フロントエンド修復完了" | tee -a $LOG_FILE
        else
            echo "✅ フロントエンド正常" | tee -a $LOG_FILE
        fi
        
        # 認証APIテスト
        auth_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
        
        if echo "$auth_response" | grep -q "success.*true"; then
            echo "✅ 認証API正常" | tee -a $LOG_FILE
        else
            echo "❌ 認証APIエラー - データベース修復開始" | tee -a $LOG_FILE
            node backend/scripts/init-database.js --yes --force > /dev/null 2>&1
            echo "🔧 データベース修復完了" | tee -a $LOG_FILE
        fi
        
        # 資産管理APIテスト
        if auth_token=$(echo "$auth_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4); then
            assets_response=$(curl -s -H "Authorization: Bearer $auth_token" "$BACKEND_URL/api/assets" 2>/dev/null)
            if echo "$assets_response" | grep -q '"data":\['; then
                echo "✅ 資産管理API正常" | tee -a $LOG_FILE
            else
                echo "❌ 資産管理APIエラー - データベース修復開始" | tee -a $LOG_FILE
                node backend/scripts/init-assets-db.js --yes --force > /dev/null 2>&1
                echo "🔧 資産管理データベース修復完了" | tee -a $LOG_FILE
            fi
        fi
        
        echo "✅ 監視チェック #$check_count 完了 ($(date))" | tee -a $LOG_FILE
        echo "---" | tee -a $LOG_FILE
        
        sleep $CHECK_INTERVAL
    done
}

# シグナルハンドラー設定
trap 'echo "🛑 監視ループ停止"; exit 0' SIGTERM SIGINT

# 監視ループ開始
monitor_and_repair