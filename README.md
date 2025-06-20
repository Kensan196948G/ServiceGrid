# ITSM準拠IT運用システムプラットフォーム

ITILフレームワークに準拠したITサービス管理（ITSM）プラットフォームです。

## 🚀 最新の改善点（2025年6月20日更新）

### 統合開発環境
- ✅ **tmux並列開発環境** - Feature別5ペイン同時開発（2x2+1レイアウト）
- ✅ **Claude Code統合** - AI支援開発環境
- ✅ **Feature-A統合リーダー** - 統合指示・品質監視システム
- ✅ **自動化されたワークフロー** - leader統合コマンドによる効率化

### セキュリティ強化
- ✅ JWT認証システム + セッション管理
- ✅ bcryptパスワードハッシュ化
- ✅ 環境変数によるセキュアなAPIキー管理
- ✅ レート制限・多層防御システム
- ✅ 包括的監査ログ・活動追跡

### アーキテクチャ改善  
- ✅ React 19 + TypeScript完全対応
- ✅ データベース接続プール（20並行接続）
- ✅ パフォーマンス最適化（応答時間2.5倍向上）
- ✅ コード分割・メモ化による高速化

### 機能拡張
- ✅ エンタープライズ級ITSM管理システム
- ✅ PowerShell統合・Windows API連携
- ✅ リアルタイム監視・アラートシステム
- ✅ SLA管理・コンプライアンス機能

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
- **React 19** + **TypeScript** - 最新React機能活用
- **Vite 6.2** - 高速開発・ビルド環境  
- **React Router v6** - SPAルーティング
- **Tailwind CSS** - ユーティリティファーストCSS
- **Recharts** - データ可視化・グラフ機能
- **Jest + React Testing Library** - 包括的テスト環境

### バックエンド
- **Node.js + Express** - RESTful API サーバー（本番対応）
- **PowerShell API群** - Windows統合・企業システム連携
- **SQLite** - 軽量高速データベース（接続プール対応）
- **JWT認証** - セキュアなトークンベース認証
- **bcrypt** - 業界標準パスワードハッシュ化

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
   ./start-development.sh  # 5ペイン並列開発環境（2x2+1）
   ```
   
   各ペインの役割:
   - **Pane 0**: 🎨 Feature-B (UI/テスト開発)
   - **Pane 1**: 🔧 Feature-C (API開発)  
   - **Pane 2**: 💻 Feature-D (PowerShell統合)
   - **Pane 3**: 🔒 Feature-E (非機能要件・セキュリティ)
   - **Pane 4**: 🎯 Feature-A-Leader (統合リーダー・品質監視)

5. **Claude Code統合指示** (Feature-A統合リーダーから)
   ```bash
   # leader統合コマンド（推奨）
   leader all "全チーム状況報告お願いします"
   leader ui "UIコンポーネントを最適化してください"
   leader api "APIエンドポイントを強化してください"
   leader ps "PowerShell APIを堅牢化してください"
   leader sec "セキュリティ監査を実行してください"
   
   # 高度なオプション
   leader all --files "src/**/*.tsx" --auto-approve "コード品質向上"
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

- **JWT認証システム** - セッション管理・トークン無効化機能
- **bcryptパスワードハッシュ化** - 業界標準の安全性
- **ロールベースアクセス制御 (RBAC)** - 4段階権限管理
- **包括的監査ログ** - 全操作・セキュリティイベント記録
- **レート制限** - 多層防御（一般・認証・管理者別）
- **入力検証** - SQLインジェクション・XSS完全防御
- **環境変数管理** - APIキー・機密情報の安全な管理

## 🚧 今後の予定

- [x] ~~Node.js/Express移行によるクロスプラットフォーム対応~~ ✅ 完了
- [x] ~~JWT認証・セキュリティ強化~~ ✅ 完了
- [x] ~~React 19・TypeScript最適化~~ ✅ 完了
- [x] ~~tmux並列開発環境構築~~ ✅ 完了
- [ ] Docker化・コンテナ対応
- [ ] HTTPS対応・SSL証明書
- [ ] レポート機能・CSV出力強化
- [ ] 外部システム連携API（AD・Microsoft 365）
- [ ] モバイル対応・PWA化
- [ ] Kubernetes対応・スケーリング機能

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
