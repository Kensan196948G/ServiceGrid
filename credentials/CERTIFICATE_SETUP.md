# 📄 証明書ファイル配置ガイド

## 🔐 必要なファイル

以下の証明書ファイルをこのフォルダに配置してください：

### 1. azure-cert.pfx
- **説明**: Azure AD App Registration用証明書（PKCS#12形式）
- **パスワード**: `armageddon2002`
- **用途**: Microsoft Graph API 証明書認証

### 2. azure-cert.cer （オプション）
- **説明**: 公開証明書（Base64形式）
- **用途**: 証明書情報確認・検証

## 📋 ファイル配置手順

1. **証明書ファイルを取得**
   - Azure Portal または証明書管理者から取得
   - `.pfx` ファイルと `.cer` ファイル

2. **ファイルを配置**
   ```bash
   # このフォルダに証明書ファイルをコピー
   cp /path/to/your/azure-cert.pfx ./credentials/
   cp /path/to/your/azure-cert.cer ./credentials/
   ```

3. **アクセス権限設定**
   ```bash
   # セキュリティのため適切な権限を設定
   chmod 600 ./credentials/azure-cert.pfx
   chmod 644 ./credentials/azure-cert.cer
   ```

## ✅ 設定確認

証明書ファイル配置後、以下のコマンドで確認：

```bash
# 認証設定テスト
node backend/scripts/simple-auth-test.js

# Microsoft Graph API統合テスト
node backend/scripts/test-graph-integration.js
```

## 🔒 セキュリティ注意事項

- **Git管理外**: このフォルダは`.gitignore`で除外されています
- **アクセス制限**: 必要最小限のユーザーのみアクセス許可
- **バックアップ**: 証明書は安全な場所に別途保管してください
- **有効期限**: 定期的に証明書の有効期限を確認してください

## 📞 サポート

証明書に関する問題が発生した場合：
1. Azure Portal で証明書の状態確認
2. [MICROSOFT365_SETUP.md](../MICROSOFT365_SETUP.md) 参照
3. システム管理者に連絡

---

**現在の設定状況**: 🔴 証明書ファイル未配置  
**必要なアクション**: azure-cert.pfx ファイルの配置