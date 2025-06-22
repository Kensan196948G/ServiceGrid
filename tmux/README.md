# tmux並列開発環境 - Claude Code統合

## 🎯 概要

ITSM準拠IT運用システムプラットフォームの**tmux並列開発環境**は、Claude Codeと統合された革新的な開発環境です。

Feature別に4つのペインで同時開発を行い、Feature-A統合リーダーが全体を統括する協調開発システムです。

## 🚀 クイックスタート

```bash
cd /mnt/f/ServiceGrid-1/tmux  # プロジェクトルート/tmux
./start-development.sh        # 通常モード（5ペイン並列開発環境）
./start-development.sh --yolo-mode  # YOLO MODE（完全自動化）
tmux attach-session -t itsm-requirement  # セッション接続
```

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────┐
│ tmux 5ペイン3段並列開発環境          │
│ ┌─────────────┬─────────────────────┤
│ │ 1段目: Pane 0 │ Pane 1              │
│ │ 🎨 Feature-B  │ 🔧 Feature-C        │
│ │ UI/テスト     │ API開発             │
│ ├─────────────┼─────────────────────┤
│ │ 2段目: Pane 2 │ Pane 3              │
│ │ 💻 Feature-D  │ 🔒 Feature-E        │
│ │ PowerShell    │ 非機能要件          │
│ └─────────────┴─────────────────────┘
├─────────────────────────────────────┤
│ 3段目: Pane 4 (フル幅)              │
│ 🎯 Feature-A (統合リーダー)         │
└─────────────────────────────────────┘
```

## 📁 ディレクトリ構成

```
tmux/
├── README.md                     # このファイル
├── 運用操作マニュアル.md         # 詳細な運用・操作マニュアル
├── tmux仕様書.md                # 技術仕様書
│
├── 🚀 実行スクリプト
├── quick-connect.sh             # 完全自動起動（推奨）
├── simple-3tier.sh             # 3段レイアウト作成
├── auto-start-with-claude.sh   # Claude Code自動起動
├── auto-claude-setup.sh        # Claude環境設定
│
├── 🔧 設定・調整スクリプト
├── session-config.conf          # tmux設定ファイル
├── fix-pane-order.sh           # ペイン順序修正
├── rearrange-panes.sh          # レイアウト再配置
├── setup-all-panes-claude.sh  # ペイン別Claude設定
│
├── 📋 レガシー・補助スクリプト
├── ultra-simple-start.sh       # シンプル起動
├── force-5-panes.sh            # 強制5ペイン作成
├── manual-layout.sh            # 手動レイアウト調整
├── connect.sh                  # 基本接続
│
├── 📚 ドキュメント
├── docs/
│   ├── architecture.md         # アーキテクチャ設計
│   ├── development-guide.md    # 開発ガイド
│   ├── testing-strategy.md     # テスト戦略
│   └── worktree-workflow.md    # Worktreeワークフロー
│
├── 🔧 ペイン別設定
├── panes/
│   ├── feature-a-leader.sh     # Feature-A設定
│   ├── feature-b-ui.sh         # Feature-B設定
│   ├── feature-c-api.sh        # Feature-C設定
│   ├── feature-d-powershell.sh # Feature-D設定
│   └── feature-e-nonfunc.sh    # Feature-E設定
│
└── 🛠️ ツール・ユーティリティ
    └── tools/
        ├── build-validator.sh   # ビルド検証
        ├── lint-checker.sh     # コード品質チェック
        ├── merge-controller.sh # マージ制御
        ├── sync-worktrees.sh   # Worktree同期
        ├── test-runner.sh      # テスト実行
        └── worktree-manager.sh # Worktree管理
```

## 🎯 主要スクリプト

### 1. 完全自動起動 (推奨)
```bash
./quick-connect.sh
```
- tmuxセッション確認・作成
- 5ペイン3段レイアウト構築
- 全ペインでClaude Code環境設定 + ウェルカムメッセージ実行
- tmux hook設定 (attach時自動Claude Code起動)
- 開発環境への自動接続

### 2. 基本コンポーネント
```bash
./simple-3tier.sh              # 3段レイアウト作成
./auto-start-with-claude.sh    # Claude自動起動
./auto-claude-setup.sh         # Claude環境設定
```

### 3. トラブルシューティング
```bash
./fix-pane-order.sh            # ペイン順序修正
./rearrange-panes.sh           # レイアウト再配置
./ultra-simple-start.sh        # 最小構成起動
```

## 📖 ドキュメント

### メインドキュメント
- **[運用操作マニュアル.md](./運用操作マニュアル.md)**: 詳細な操作方法
- **[tmux仕様書.md](./tmux仕様書.md)**: 技術仕様・設計書

### 補助ドキュメント
- **[docs/3tier-layout-specification.md](./docs/3tier-layout-specification.md)**: 3段レイアウト仕様書
- **[docs/architecture.md](./docs/architecture.md)**: システム設計
- **[docs/development-guide.md](./docs/development-guide.md)**: 開発ガイド
- **[docs/testing-strategy.md](./docs/testing-strategy.md)**: テスト戦略

## 🎨 ペイン構成（3段レイアウト）

```
┌─────────────────────────────────────┐
│ 1段目: Feature-B │ Feature-C       │
│   (UI/テスト)    │  (API開発)      │
│   Ctrl+b + 0     │ Ctrl+b + 1      │
├─────────────────────────────────────┤
│ 2段目: Feature-D │ Feature-E       │
│  (PowerShell)    │ (非機能要件)    │
│   Ctrl+b + 2     │ Ctrl+b + 3      │
├─────────────────────────────────────┤
│ 3段目: Feature-A (統合リーダー)     │
│          Ctrl+b + 4                 │
└─────────────────────────────────────┘
```

## 🔧 開発ワークフロー

### 1. 環境起動
```bash
./start-development.sh --yolo-mode  # 完全自動化
# または
./start-development.sh             # 通常モード
```

### 2. Feature別並列開発
- **Feature-A**: 統括・調整・品質監視
- **Feature-B**: フロントエンド開発・テスト
- **Feature-C**: バックエンドAPI・データベース
- **Feature-D**: PowerShell統合・Windows対応
- **Feature-E**: セキュリティ・非機能要件

### 3. Claude Code活用例
```bash
# 各ペインで専門分野のClaude Codeが稼働

# Feature-B-UI (フロントエンド)
claude "コンポーネントのテストを作成してください"
claude "ReactのESLintエラーを修正してください"

# Feature-C-API (バックエンド)
claude "新しいAPIエンドポイントを作成してください"
claude "データベーススキーマを確認してください"

# Feature-D-PowerShell
claude "PowerShellスクリプトを作成してください"

# Feature-E-NonFunc (非機能要件)
claude "セキュリティ監査を実行してください"

# Feature-A-Leader (統合リーダー)
claude "プロジェクトの全体状況を確認してください"
```

### 4. Claude Code手動起動
```bash
# 非対話型Claude Code環境設定
./setup-claude-noninteractive.sh setup

# Claude Codeテスト実行
./setup-claude-noninteractive.sh test

# 環境設定 + テスト実行
./setup-claude-noninteractive.sh both

# ペインリセット (問題がある場合)
./reset-claude-panes.sh both
```

## ⚠️ 重要な注意事項

### セキュリティ
- `.env`ファイルのAPIキーは機密情報です
- `.gitignore`にAPIキー関連ファイルが除外設定済み
- セッション終了時は環境変数がクリアされます

### パフォーマンス
- 推奨メモリ: 4GB以上
- 推奨CPU: 4コア以上
- Claude API応答時間: 1-5秒

### 互換性
- OS: WSL2 Ubuntu 20.04+
- tmux: 3.0+
- Node.js: 18.0+
- PowerShell: 7.0+

## 🆘 トラブルシューティング

### よくある問題

**Q: セッションが見つからない**
```bash
tmux list-sessions              # セッション一覧確認
./quick-connect.sh             # 新規作成
```

**Q: ペイン配置が崩れた**
```bash
./simple-3tier.sh             # 配置リセット
```

**Q: Claude Codeが応答しない**
```bash
echo $ANTHROPIC_API_KEY             # API キー確認
source /mnt/f/ServiceGrid-1/.env   # 環境変数再読み込み
```

## 📞 サポート

### 問い合わせ先
- 技術的問題: 開発チーム
- 設定変更: システム管理者
- 新機能要望: プロジェクトマネージャー

### 関連リソース
- [CLAUDE.md](../CLAUDE.md): プロジェクト全体ガイド
- [プロジェクトREADME](../README.md): システム概要
- [バックエンドAPI](../backend/README.md): API仕様

---

**📝 最終更新**: 2025年6月15日  
**バージョン**: v1.1 - 3段レイアウト対応  
**作成者**: Claude Code AI Assistant