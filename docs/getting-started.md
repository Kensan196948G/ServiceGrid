# 🚀 ITSM Platform 統合開発環境 スタートガイド

## クイックスタート

### 方法1: 完全統合環境（推奨）

```bash
# 統合開発環境起動
cd /mnt/e/ServiceGrid/tmux
./start-vscode-integrated.sh
```

### 方法2: VSCode + 手動tmux

```bash
# 1. VSCode マルチルートワークスペース起動
code .vscode/itsm-worktrees.code-workspace

# 2. 別ターミナルでtmux並列開発環境起動
cd tmux
./start-development.sh
```

### 方法3: VSCodeタスクから起動

1. VSCode開いた状態で `Ctrl+Shift+P`
2. `Tasks: Run Task` → `🎯 Launch Integrated Development Environment`

## トラブルシューティング

### Claude Codeが起動しない場合

```bash
# Claude Code拡張機能インストール確認
code --list-extensions | grep claude

# 拡張機能が見つからない場合
# 1. VSCode拡張機能マーケットプレース
# 2. "Claude Dev" で検索
# 3. Anthropic製拡張機能をインストール
```

### 並列開発ペインが開始されない場合

```bash
# Worktree環境確認
git worktree list

# Worktree未作成の場合
./tmux/tools/worktree-manager.sh init

# tmuxセッション確認
tmux list-sessions

# セッション接続
tmux attach-session -t itsm-dev
```

### 各ペインメニューが表示されない場合

```bash
# 手動でペインスクリプト実行
./tmux/panes/feature-a-leader.sh     # 統合リーダー
./tmux/panes/feature-b-ui.sh         # UI/テスト
./tmux/panes/feature-c-api.sh        # API開発
./tmux/panes/feature-d-powershell.sh # PowerShell
./tmux/panes/feature-e-nonfunc.sh    # 非機能要件
```

## 次のステップ

1. **VSCode**: Claude Codeでチャット開始
2. **tmux**: 各ペインで並列開発開始
3. **統合**: Feature-Aペインで全体調整
4. **同期**: 定期的なWorktree同期実行

## 📚 詳細ドキュメント

- [Worktreeワークフロー](tmux/docs/worktree-workflow.md)
- [開発ガイド](tmux/docs/development-guide.md)
- [アーキテクチャ](tmux/docs/architecture.md)
- [テスト戦略](tmux/docs/testing-strategy.md)

## 🔧 ツールコマンド

```bash
# Worktree管理
./tmux/tools/worktree-manager.sh status

# 自動同期
./tmux/tools/sync-worktrees.sh auto-sync

# 統合管理
./tmux/tools/merge-controller.sh integrate
```