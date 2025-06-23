# ネットワークアクセス制御設定

## 概要

ServiceGrid ITSMプラットフォームは、セキュリティ強化のためにネットワークアクセス制御を実装しています。
本システムは**ローカルネットワークからのアクセスのみ**を許可し、グローバルIPアドレスからの接続を拒否します。

## 実装場所

- **設定ファイル**: `config/vite.config.ts`
- **実装方式**: Vite開発サーバーのカスタムミドルウェア

## 許可されるIPアドレス範囲

### ✅ 許可されるアクセス

1. **localhost**
   - `127.0.0.1` (IPv4 localhost)
   - `::1` (IPv6 localhost)
   - `localhost` (ホスト名)

2. **プライベートIPアドレス (RFC 1918)**
   - `10.0.0.0/8` (10.0.0.0 - 10.255.255.255)
   - `172.16.0.0/12` (172.16.0.0 - 172.31.255.255)
   - `192.168.0.0/16` (192.168.0.0 - 192.168.255.255)

3. **リンクローカルアドレス (RFC 3927)**
   - `169.254.0.0/16` (169.254.0.0 - 169.254.255.255)

4. **IPv6プライベートアドレス**
   - `fe80::/10` (リンクローカル)
   - `fd00::/8` (ユニークローカル)
   - `fc00::/7` (ユニークローカル)

### ❌ 拒否されるアクセス

- **グローバルIPアドレス**
- **パブリックIPアドレス**
- **外部ネットワークからの接続**

## アクセス拒否時の動作

### HTTP 403レスポンス

グローバルIPアドレスからのアクセス時、以下が実行されます：

1. **HTTPステータス**: `403 Forbidden`
2. **エラーページ表示**: 日本語でアクセス拒否理由を説明
3. **ログ出力**: `🚫 Access denied from IP: [IP ADDRESS] (not in allowed ranges)`

### エラーページ内容

```html
🔒 アクセス拒否

このServiceGrid ITSMシステムは、セキュリティ上の理由により
ローカルネットワークからのアクセスのみを許可しています。

あなたのIPアドレス: [CLIENT_IP]

許可されているアクセス範囲:
• localhost (127.0.0.1, ::1)
• プライベートIPアドレス (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
• リンクローカルアドレス (169.254.x.x)
```

## 技術実装詳細

### IPアドレス判定ロジック

```typescript
// クライアントIP取得
const clientIP = req.headers['x-forwarded-for'] || 
                req.connection?.remoteAddress || 
                req.socket?.remoteAddress ||
                req.ip;

// IPv6マップ形式からIPv4抽出
const actualIP = String(clientIP).replace(/^::ffff:/, '');

// 許可IP範囲チェック
const isLocalhost = actualIP === '127.0.0.1' || actualIP === '::1' || actualIP === 'localhost';
const isPrivateIPv4 = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(actualIP);
const isPrivateIPv6 = /^(fe80:|fd|fc)/.test(actualIP);
const isLinkLocal = /^169\.254\./.test(actualIP);
```

### ミドルウェア配置

```typescript
server.middlewares.use('/', (req, res, next) => {
  // IP制限ロジック
  if (isAllowedIP) {
    next(); // 許可されたIPは通過
  } else {
    // 拒否されたIPは403エラー
    res.statusCode = 403;
    res.end(errorPage);
  }
});
```

## セキュリティ効果

### ✅ 保護される脅威

1. **外部からの不正アクセス**
2. **インターネット経由の攻撃**
3. **グローバルIPスキャン攻撃**
4. **外部ネットワークからの侵入試行**

### 📊 アクセス例

```bash
# ✅ 許可されるアクセス
http://localhost:3001/           # localhost
http://127.0.0.1:3001/          # IPv4 localhost
http://192.168.1.100:3001/      # プライベートIP
http://10.0.0.50:3001/          # プライベートIP
http://172.16.0.10:3001/        # プライベートIP

# ❌ 拒否されるアクセス
http://8.8.8.8:3001/            # Google DNS (グローバルIP)
http://203.104.209.102:3001/    # 外部パブリックIP
http://global-server.com:3001/  # 外部ドメイン
```

## 運用・監視

### ログ監視

```bash
# アクセス拒否ログの確認
tail -f dev-server.log | grep "Access denied"
```

### アクセス統計

- 許可されたアクセス: カウンター実装可能
- 拒否されたアクセス: ログで追跡
- 異常なアクセスパターンの検知

## 設定変更方法

### IP制限の調整

`config/vite.config.ts` の以下部分を編集：

```typescript
// 新しいIP範囲を追加する場合
const isCustomRange = /^(カスタム正規表現)/.test(actualIP);

// 条件に追加
if (isLocalhost || isPrivateIPv4 || isPrivateIPv6 || isLinkLocal || isCustomRange) {
  next();
}
```

### 制限の無効化

**注意**: セキュリティリスクを理解した上で実行

```typescript
// すべてのアクセスを許可（非推奨）
server.middlewares.use('/', (req, res, next) => {
  next(); // 制限なし
});
```

## 緊急時対応

### 制限解除手順

1. **設定ファイル編集**: `config/vite.config.ts`
2. **サーバー再起動**: `npm run dev`
3. **アクセス確認**: 外部IPでテスト

### バックアップ設定

```bash
# 設定ファイルのバックアップ
cp config/vite.config.ts config/vite.config.ts.backup

# 元の設定に戻す
mv config/vite.config.ts.backup config/vite.config.ts
```

---

**セキュリティレベル**: 🔒 HIGH  
**最終更新**: 2025年06月23日  
**責任者**: ServiceGrid Security Team  
**承認**: システム管理者