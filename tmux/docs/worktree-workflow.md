# Git Worktree並列開発ワークフロー

## 概要

このドキュメントでは、ITSM PlatformにおけるGit Worktreeを活用した真の並列開発ワークフローについて説明します。

## Git Worktreeとは

Git Worktreeは、1つのリポジトリで複数の作業ディレクトリを同時に維持できるGitの機能です。各Worktreeは独立したブランチをチェックアウトでき、ファイル競合を完全に回避した並列開発を実現できます。

## 並列開発環境構成

### ディレクトリ構造

```
ServiceGrid/
├── .git/                         # Git管理ディレクトリ
├── package.json                  # メインプロジェクト
├── src/                          # メインプロジェクトソース
├── backend/                      # メインプロジェクトバックエンド
├── tmux/                         # 並列開発環境ツール
│   ├── tools/
│   │   ├── worktree-manager.sh   # Worktree管理
│   │   ├── sync-worktrees.sh     # 自動同期
│   │   └── merge-controller.sh   # 統合管理
│   └── panes/                    # ペイン別スクリプト
└── worktrees/                    # Worktree作業ディレクトリ
    ├── feature-a-leader/         # 統合リーダー専用
    ├── feature-b-ui/             # UI/テスト専用
    ├── feature-c-api/            # API開発専用
    ├── feature-d-ps/             # PowerShell専用
    └── feature-e-nonfunc/        # 非機能要件専用
```

### ブランチ戦略

| ブランチ | 担当ペイン | 作業内容 | マージ優先度 |
|----------|------------|----------|--------------|
| `main` | - | 統合済みコード | - |
| `feature-a-leader` | Feature-A | 統合管理・設計統一 | 最後 |
| `feature-e-nonfunc` | Feature-E | SLA・セキュリティ・監視 | 1位（最優先） |
| `feature-d-ps` | Feature-D | PowerShell API・Windows統合 | 2位 |
| `feature-c-api` | Feature-C | Node.js API・データベース | 3位 |
| `feature-b-ui` | Feature-B | React UI・テスト | 4位（最後） |

## 開発ワークフロー

### 1. 環境初期化

#### 初回セットアップ

```bash
# 並列開発環境起動
cd /mnt/e/ServiceGrid/tmux
./start-development.sh

# Worktree環境初期化（初回のみ）
./tools/worktree-manager.sh init
```

#### VSCode統合環境

```bash
# マルチルートワークスペースを開く
code .vscode/itsm-worktrees.code-workspace
```

### 2. 並列開発フロー

#### Phase 1: 独立開発

各ペインが専用Worktreeで独立して開発を進行：

```bash
# Feature-B (UI/テスト) の例
cd worktrees/feature-b-ui
# React コンポーネント開発
# テストケース作成
# ESLint自動修復
```

#### Phase 2: 定期同期

```bash
# 各ペインで変更を自動コミット・プッシュ
./tools/sync-worktrees.sh auto-sync

# または個別同期
./tools/sync-worktrees.sh sync feature-b-ui true
```

#### Phase 3: 段階的統合

```bash
# Feature-A統合リーダーが実行
./tools/merge-controller.sh integrate
```

### 3. 統合シーケンス

#### 自動統合順序

1. **Feature-E (非機能)** → main
   - セキュリティ・SLA・監視機能
   - 他機能への影響が最小限

2. **Feature-D (PowerShell)** → main
   - Windows統合・PowerShell API
   - バックエンド独立機能

3. **Feature-C (API)** → main
   - Node.js API・データベース
   - バックエンドコア機能

4. **Feature-B (UI)** → main
   - React UI・フロントエンド
   - 全体統合後の最終調整

#### 統合時の自動テスト

各統合段階で自動実行：
- 単体テスト
- 統合テスト
- セキュリティチェック
- ビルド検証

## Worktree管理コマンド

### 基本操作

```bash
# Worktree状況確認
./tools/worktree-manager.sh status

# 全Worktree同期
./tools/sync-worktrees.sh auto-sync

# 段階的統合実行
./tools/merge-controller.sh integrate

# 競合解決支援
./tools/merge-controller.sh conflicts feature-b-ui
```

### トラブルシューティング

```bash
# Worktree再作成
./tools/worktree-manager.sh remove feature-b-ui
./tools/worktree-manager.sh init

# 強制同期
./tools/sync-worktrees.sh sync feature-b-ui true

# ロールバック
./tools/merge-controller.sh rollback
```

## VSCode統合機能

### マルチルートワークスペース

- 全Worktreeを同時表示
- 統一設定適用
- 並列デバッグ対応

### タスク統合

| タスク | 説明 | ショートカット |
|--------|------|----------------|
| 🚀 Start All Development Servers | 全開発サーバー起動 | Ctrl+Shift+P |
| 🔄 Sync All Worktrees | 全Worktree同期 | Ctrl+Shift+P |
| 🎯 Staged Integration | 段階的統合実行 | Ctrl+Shift+P |
| 🏗️ Initialize Worktrees | Worktree初期化 | Ctrl+Shift+P |

### デバッグ設定

- フロントエンド・バックエンド並列デバッグ
- Worktree別ブレークポイント
- 統合テストデバッグ

## ベストプラクティス

### 並列開発のルール

1. **独立性の維持**
   - 各ペインは専用Worktreeで作業
   - ファイルレベルでの競合回避
   - 機能別責任分離

2. **定期同期**
   - 1時間毎の自動同期推奨
   - 大きな変更前後での手動同期
   - コンフリクト発生時の即座解決

3. **統合管理**
   - Feature-Aが統合タイミング決定
   - リスクの低い順序での段階的統合
   - 各段階での品質確認

### コミットメッセージ規約

```
Auto-commit [Feature]: [作業内容]: YYYY-MM-DD HH:MM:SS

[詳細説明]
- 変更内容1
- 変更内容2
- 変更内容3

🤖 Generated by Feature-[X] [ペイン名] pane
```

### ブランチ命名規約

| パターン | 用途 | 例 |
|----------|------|-----|
| `feature-[a-e]-*` | 基本ブランチ | `feature-b-ui` |
| `hotfix-*` | 緊急修正 | `hotfix-critical-bug` |
| `experiment-*` | 実験的機能 | `experiment-new-ui` |

## 監視・メトリクス

### 並列開発メトリクス

- **同期頻度**: 1時間あたりの同期回数
- **競合発生率**: 統合時の競合発生頻度
- **統合成功率**: 段階的統合の成功率
- **品質維持率**: テスト成功率

### パフォーマンス監視

```bash
# 同期状況レポート
./tools/sync-worktrees.sh report

# 統合状況レポート
./tools/merge-controller.sh report

# Worktree使用状況
./tools/worktree-manager.sh status
```

## 高度な使用法

### カスタムワークフロー

```bash
# 実験的ブランチの追加
git branch experiment-new-feature feature-b-ui
git worktree add ../experiments/new-feature experiment-new-feature

# 一時的な修正ブランチ
git branch hotfix-urgent-bug main
git worktree add ../hotfix/urgent-bug hotfix-urgent-bug
```

### 自動化スクリプト

```bash
# 継続的統合デーモン
./tools/sync-worktrees.sh daemon 300

# 自動品質チェック
watch -n 60 './tools/lint-checker.sh && ./tools/test-runner.sh'
```

### スクリプトカスタマイゼーション

各ツールスクリプトは設定セクションでカスタマイズ可能：

```bash
# worktree-manager.sh の設定例
declare -A CUSTOM_WORKTREE_CONFIG=(
    ["feature-f-mobile"]="モバイル対応"
    ["feature-g-analytics"]="アナリティクス"
)
```

## トラブルシューティング

### よくある問題と解決法

#### 1. Worktree作成エラー

**問題**: `fatal: 'feature-b-ui' is already checked out`

**解決**: 
```bash
git worktree remove worktrees/feature-b-ui --force
./tools/worktree-manager.sh init
```

#### 2. 同期競合

**問題**: マージ競合が発生

**解決**:
```bash
cd worktrees/feature-b-ui
git status
# 競合ファイルを手動編集
git add .
git commit
./tools/sync-worktrees.sh sync feature-b-ui
```

#### 3. 統合失敗

**問題**: 段階的統合でテスト失敗

**解決**:
```bash
./tools/merge-controller.sh rollback
# 各Worktreeで問題修正
./tools/test-runner.sh
./tools/merge-controller.sh integrate
```

#### 4. ディスク容量不足

**問題**: 複数Worktreeによる容量圧迫

**解決**:
```bash
# 不要なWorktree削除
./tools/worktree-manager.sh remove feature-experiment
git worktree prune

# ビルド成果物クリーンアップ
find worktrees/ -name node_modules -type d -exec rm -rf {} +
find worktrees/ -name dist -type d -exec rm -rf {} +
```

## セキュリティ考慮事項

### 認証情報管理

- 各Worktreeで共通の`.env`設定
- 認証トークンの適切な管理
- PowerShell実行ポリシーの統一

### アクセス制御

- ブランチ保護ルール適用
- リモートプッシュ権限管理
- 統合権限の制限

## 参考資料

### Git Worktree公式ドキュメント

- [Git Worktree - Git SCM](https://git-scm.com/docs/git-worktree)
- [Git Worktree Workflow](https://spin.atomicobject.com/2016/06/26/parallel-development-git-worktrees/)

### ITSM Platform関連

- [アーキテクチャ設計](architecture.md)
- [開発ガイド](development-guide.md)
- [テスト戦略](testing-strategy.md)

---

**更新日**: 2025年6月14日  
**バージョン**: v1.0  
**作成者**: Claude Code AI Assistant