# 🔐 Microsoft 365統合認証情報管理

> **重要**: このフォルダには機密情報が含まれています。Git管理外に設定されており、適切なアクセス権限で保護してください。

## 📁 ファイル構成

### 証明書ファイル
- `azure-cert.pfx` - Azure AD App Registration用証明書（PKCS#12形式）
- `azure-cert.cer` - 公開証明書（Base64形式）

### 認証情報
- **Tenant ID**: `a7232f7a-a9e5-4f71-9372-dc8b1c6645ea`
- **Client ID**: `22e5d6e4-805f-4516-af09-ff09c7c224c4`
- **Admin UPN**: `admin@miraiconst.onmicrosoft.com`
- **証明書パスワード**: `armageddon2002`

## 🔒 セキュリティガイドライン

### ファイルアクセス権限
```bash
# 推奨アクセス権限設定
chmod 600 azure-cert.pfx    # 所有者のみ読み書き
chmod 644 azure-cert.cer    # 所有者読み書き、その他読み取り
chmod 700 credentials/      # 所有者のみアクセス
```

### 環境変数設定
証明書ファイルは環境変数で参照されます：
```env
AZURE_CERT_PATH=./credentials/azure-cert.pfx
AZURE_CERT_PASSWORD=armageddon2002
```

## 📋 証明書管理

### 有効期限確認
```bash
# 証明書情報確認（OpenSSL使用）
openssl pkcs12 -info -in azure-cert.pfx -noout

# 証明書有効期限確認
openssl x509 -in azure-cert.cer -text -noout | grep "Not After"
```

### 証明書更新
1. Azure Portal → App registrations
2. 対象アプリケーション選択
3. Certificates & secrets → Upload certificate
4. 新しい証明書をアップロード
5. 古い証明書を削除

## ⚠️ 重要な注意事項

1. **Git管理外**: このフォルダは`.gitignore`で除外されています
2. **バックアップ**: 証明書ファイルは安全な場所に別途バックアップしてください
3. **アクセス制限**: 必要最小限の権限でアクセスしてください
4. **定期確認**: 証明書有効期限を定期的に確認してください
5. **ログ監視**: 認証関連のログを定期的に確認してください

## 🔄 更新履歴

- **2025-06-20**: 初期セットアップ
  - Azure AD App Registration証明書配置
  - セキュリティガイドライン策定

---

**作成者**: ITSM Development Team  
**最終更新**: 2025年6月20日