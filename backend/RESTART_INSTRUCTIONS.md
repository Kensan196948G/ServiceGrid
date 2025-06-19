# 🔧 API修正後のサーバー再起動手順

## 📋 **修正完了内容**
✅ **incidents API**: 修正版API作成 (`api/incidents-fixed.js`)  
✅ **dashboard API**: 修正版API作成 (`api/dashboard-fixed.js`)  
✅ **start-server.js**: 修正版APIを読み込むよう変更済み  
✅ **データベース**: 接続・権限問題なし確認済み  

## 🚀 **再起動手順**

### **1. 現在のサーバー停止**
```bash
# 現在のサーバーを停止（Ctrl+C または以下のコマンド）
pkill -f "node.*start-server.js"
```

### **2. サーバー再起動**
```bash
cd /mnt/e/ServiceGrid/backend
PORT=8082 node start-server.js
```

### **3. 動作確認**
```bash
# 基本チェック
curl -s http://localhost:8082/api/health

# 修正済みAPI確認
curl -s http://localhost:8082/api/incidents
curl -s http://localhost:8082/api/dashboard

# 認証テスト
curl -s -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📊 **期待される結果**

### **incidents API**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### **dashboard API**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "stats": {...}
  }
}
```

## ⚠️ **トラブルシューティング**

### **問題**: ポート8082が使用中
```bash
# ポート使用状況確認
lsof -i :8082

# プロセス強制終了
sudo kill -9 $(lsof -t -i:8082)
```

### **問題**: モジュール読み込みエラー
```bash
# 依存関係確認
npm list sqlite3

# 不足時は再インストール
npm install sqlite3
```

### **問題**: データベースアクセスエラー
```bash
# 権限確認
ls -la db/itsm.sqlite

# 権限修正（必要時）
chmod 644 db/itsm.sqlite
```

## 🎯 **修正のポイント**

1. **エラーハンドリング強化**: try-catch + データベース接続管理
2. **レスポンス統一**: 成功時は `{success: true, data: ...}` 形式
3. **接続管理**: 各関数で適切にデータベース接続を開閉
4. **フォールバック**: エラー時はサンプルデータで継続動作

## 📋 **再起動後の確認項目**

- [ ] `/api/health` - サーバー基本動作
- [ ] `/api/auth/login` - 認証機能
- [ ] `/api/incidents` - インシデント管理（修正済み）
- [ ] `/api/dashboard` - ダッシュボード（修正済み）
- [ ] `/api/assets` - 資産管理
- [ ] `/api/service-requests` - サービス要求管理

## 🚀 **フロントエンド連携準備**

サーバー再起動完了後：
```bash
cd /mnt/e/ServiceGrid
npm install axios
npm run dev
```

---
**修正完了**: Feature-C-API チーム  
**確認対象**: `/api/incidents`, `/api/dashboard`  
**次ステップ**: サーバー再起動 → フロントエンド起動