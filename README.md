# ITSM準拠IT運用システムプラットフォーム

ITILフレームワークに準拠したITサービス管理（ITSM）プラットフォームです。

## 🚀 最新の改善点

### 統合開発環境
- ✅ **tmux並列開発環境** - Feature別4ペイン同時開発
- ✅ **Claude Code統合** - AI支援開発環境
- ✅ **Feature-A統合リーダー** - VSCode + Claude統合指示
- ✅ **自動化されたワークフロー** - 指示送信から実行まで自動化

### セキュリティ強化
- ✅ パスワードのハッシュ化実装 (SHA256 + Salt)
- ✅ APIキーの環境変数管理
- ✅ アカウントロック機能
- ✅ 詳細な監査ログ

### アーキテクチャ改善  
- ✅ React 19対応
- ✅ TypeScript strict mode
- ✅ Vite設定最適化
- ✅ パフォーマンス向上のためのコード分割

### 機能拡張
- ✅ 完全な変更管理システム
- ✅ ダッシュボード機能
- ✅ リアルタイムアラート
- ✅ SLA監視機能

## 📋 主要機能

### 💼 ITSMモジュール
- **インシデント管理**: 障害・問い合わせの受付、進捗管理、記録
- **サービス要求管理**: ユーザー申請、アカウント・権限変更等
- **変更管理**: 設定変更・申請の記録、承認フロー
- **構成管理**: 資産台帳管理、ライセンス・機器管理
- **リリース管理**: 新規サービス・システム変更時の計画・展開
- **問題管理**: 再発防止、恒久対策・原因分析の記録
- **ナレッジ管理**: 手順書・FAQのDB化・検索

### 📊 運用管理
- **サービスレベル管理**: SLA・KPI設定、実績記録、達成状況可視化
- **キャパシティ管理**: IT資源利用状況、拡張計画、閾値アラート
- **可用性管理**: システム稼働率、障害履歴、復旧対応管理
- **セキュリティ管理**: アクセス権・認証履歴、脆弱性・監査管理
- **コンプライアンス管理**: ISO/社内規定遵守の証跡、点検記録
- **監査証跡ログ管理**: 操作・変更の全履歴記録

### 🤖 AI機能
- **Gemini AI統合**: ナレッジベース検索、チャットサポート
- **インテリジェント分析**: パターン認識、予測分析

## 🛠 技術スタック

### フロントエンド
- **React 19** + **TypeScript** - モダンなUI開発
- **Vite** - 高速な開発・ビルド環境  
- **React Router v7** - SPAルーティング
- **Tailwind CSS** - ユーティリティファーストCSS
- **Recharts** - データ可視化
- **Google Gemini API** - AI機能統合

### バックエンド
- **PowerShell** - Windows環境でのスクリプト実行
- **SQLite** - 軽量データベース
- **REST API** - 標準的なWeb API

## 🔧 セットアップ

### 前提条件
- Node.js 18以上
- PowerShell 5.1以上 (Windows環境)
- SQLite
- **Claude Code** (AI支援開発用)
- tmux (Linux/WSL環境)

### インストール手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd ServiceGrid
   ```

2. **環境変数の設定**
   ```bash
   cp .env.example .env
   # .envファイルを編集してAPIキーを設定
   ```

3. **通常の起動方法**
   ```bash
   npm install
   npm run dev  # フロントエンド (port 3001)
   ```
   
   ```bash
   cd backend && npm start  # バックエンド (port 8082)
   ```
   
   または統合スクリプト:
   ```bash
   ./scripts/start-all.sh   # 全サービス同時起動
   ./scripts/stop-all.sh    # 全サービス停止
   ```

4. **🚀 tmux並列開発環境** (推奨)
   ```bash
   cd tmux
   ./start-development.sh  # 4ペイン並列開発環境
   ```
   
   各ペインの役割:
   - **Pane 0**: 🎨 Feature-B (UI/テスト)
   - **Pane 1**: 🔧 Feature-C (API開発)  
   - **Pane 2**: 💻 Feature-D (PowerShell)
   - **Pane 3**: 🔒 Feature-E (非機能要件)

5. **Claude Code統合指示** (Feature-A統合リーダーから)
   ```bash
   cd tmux/coordination
   ./send-to-all-fixed.sh "開発指示メッセージ"
   ./send-to-all-fixed.sh --files "package.json" --auto-approve "品質チェック実行"
   ```

6. **アクセス**
   - フロントエンド: http://localhost:3001
   - バックエンドAPI: http://localhost:8082

## 👥 デフォルトアカウント

- **管理者**: admin / admin123
- **オペレータ**: operator / operator123

## 📚 ドキュメント

### 📋 主要ガイド
- [開発ガイド](CLAUDE.md) - プロジェクト全体ガイド、開発環境詳細
- [はじめに](docs/getting-started.md) - クイックスタート手順
- [開発者ガイド](docs/development-guide.md) - 詳細な開発手順

### 📖 技術仕様
- [統合仕様書](docs/specifications/integrated-specification.md) - システム全体仕様
- [API仕様書](docs/03_API仕様書.md) - REST API仕様
- [運用マニュアル](docs/operations/運用マニュアル.md) - 運用・保守手順

### 🚀 開発環境
- [tmux並列開発](tmux/README.md) - Claude Code統合開発環境
- [設定ファイル](config/) - ビルド・テスト設定
- [スクリプト](scripts/) - 起動・デプロイスクリプト

### 📊 レポート・分析
- [機能レポート](docs/feature-reports/) - Feature別分析結果
- [パフォーマンス](docs/reports/) - 性能・セキュリティ監査

## 🔐 セキュリティ

- パスワードハッシュ化 (SHA256 + Salt)
- トークンベース認証
- ロールベースアクセス制御 (RBAC)
- 監査ログ機能
- アカウントロック機能

## 🚧 今後の予定

- [ ] Node.js/Express移行によるクロスプラットフォーム対応
- [ ] Docker化
- [ ] HTTPS対応
- [ ] レポート機能強化
- [ ] 外部システム連携API
- [ ] モバイル対応

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご確認ください。

## 🆘 サポート

問題が発生した場合は、[Issues](https://github.com/your-repo/ServiceGrid/issues)でご報告ください。
