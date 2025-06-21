# 🚀 YOLO MODE - 完全自動tmux並列開発環境

## 概要

**YOLO MODE**は、tmux上で全5ペインを**完全自動化**で一括起動し、各ペインでClaude Codeを自動起動させる積極的な自動実行モードです。

全ての確認プロンプトを削除し、1コマンドで完全な開発環境を自動構築します。

## 🎯 実装内容

### 1. 専用起動スクリプト
- **`start-yolo-mode.sh`** - 完全自動化専用スクリプト
- **`start-development.sh --yolo-mode`** - 既存スクリプトのYOLOオプション

### 2. 自動化機能
- ✅ 既存tmuxセッション自動終了・再作成
- ✅ 5ペイン環境自動構築（3段構成）
- ✅ 各ペインでClaude Code自動起動
- ✅ Feature-A-Leaderから初期指示自動送信
- ✅ 全ペインで並列開発自動開始
- ✅ 高速化された処理タイミング

### 3. 各ペインの自動実行内容

#### Feature-A-Leader（ペイン4）
- Worktree環境自動確認・初期化
- プロジェクト全体状況自動確認
- アーキテクチャ整合性自動監視
- コード品質自動チェック
- 統合テスト自動実行準備

#### Feature-B-UI（ペイン0）
- 開発サーバー自動起動
- TypeScript型チェック自動実行
- ESLint自動実行
- Jest テスト自動実行

#### Feature-C-API（ペイン1）
- APIサーバー自動起動
- データベース接続確認
- APIエンドポイント検証

#### Feature-D-PowerShell（ペイン2）
- PowerShell環境自動確認
- Windows統合機能テスト

#### Feature-E-NonFunc（ペイン3）
- セキュリティ監査自動実行
- 品質管理チェック

## 🚀 使用方法

### 方法1: 専用スクリプト
```bash
# 基本起動
./tmux/start-yolo-mode.sh

# 強制再作成・静音モード
./tmux/start-yolo-mode.sh --force --silent

# 初期タスク無効化
./tmux/start-yolo-mode.sh --no-auto-task
```

### 方法2: 既存スクリプトのオプション
```bash
# 既存スクリプトでYOLO MODE
./tmux/start-development.sh --yolo-mode

# または短縮形
./tmux/start-development.sh --yolo
```

## ⚙️ オプション

### start-yolo-mode.sh のオプション
- `--yolo` : 完全自動モード（デフォルト）
- `--force` : 既存セッション強制終了・再作成
- `--silent` : 最小限のログ出力
- `--no-auto-task` : 初期タスク自動実行を無効化
- `--help, -h` : ヘルプ表示

### start-development.sh のオプション
- `--yolo-mode, --yolo` : YOLO MODE（完全自動化）で起動
- `--help, -h` : ヘルプ表示

## 🎯 実行フロー

1. **環境チェック** - tmux、Node.js、プロジェクトディレクトリ確認
2. **セッション管理** - 既存セッション自動終了・クリーンアップ
3. **ペイン構築** - 5ペイン3段構成自動作成
4. **ペイン起動** - 各ペインで専用スクリプト自動実行
5. **統合指示** - Feature-A-Leaderから初期タスク自動送信
6. **セッションアタッチ** - 開発環境に自動接続

## 📊 ペイン構成（YOLO MODE）

```
┌─────────────────────────────────────┐
│ YOLO MODE 5ペイン 3段並列開発環境   │
│ ┌─────────────┬─────────────────────┤
│ │ 1段目（上段）                     │
│ │ 0:YOLO-B-UI │ 1:YOLO-C-API        │
│ │ 自動UI修復  │ 自動API開発         │
│ ├─────────────┼─────────────────────┤
│ │ 2段目（中段）                     │
│ │ 2:YOLO-D-PS │ 3:YOLO-E-Sec        │
│ │ PS自動修復  │ 自動品質監査        │
│ ├─────────────┴─────────────────────┤
│ │ 3段目（下段フル幅）               │
│ │ 4:YOLO-A-Leader (統合自動指示)    │
│ └─────────────────────────────────────┘
```

## 🔧 技術実装

### 環境変数
- `YOLO_MODE=true` : YOLO MODE有効化
- `AUTO_APPROVE=true` : 自動承認モード
- `PS1='[YOLO-Feature-X] \w$ '` : YOLO専用プロンプト

### 自動指示システム
```bash
# Feature-A-Leaderから自動送信される指示例
./leader-command.sh all --auto-approve "🚀 YOLO MODE: 初期環境セットアップを自動実行してください"
```

### Claude Code統合
- `claude --non-interactive` : 非対話型Claude起動
- 自動タスク実行モード
- エラー自動復旧機能

## ⚡ パフォーマンス最適化

- **高速化されたタイミング**: sleep 0.3秒（通常0.5秒）
- **並列処理**: 各ペイン同時起動
- **エラーハンドリング**: 自動復旧・継続実行
- **ログ最適化**: silent mode対応

## 🎮 操作方法

### tmuxペイン移動
- `Ctrl-b + 0-4` : 各ペインに移動
- `Ctrl-b + z` : ペインズーム
- `Ctrl-b + 矢印` : ペイン移動
- `Ctrl-b + &` : セッション終了

### 終了方法
```bash
# セッション終了
tmux kill-session -t itsm-requirement

# または tmux内で
Ctrl-b & → y
```

## 🚨 注意事項

1. **既存セッション**: `--force`オプション使用時は既存セッションが強制終了されます
2. **リソース**: 5ペイン並列実行のため、システムリソースを消費します
3. **Claude Code**: インストールされていない場合は各ペインで手動起動が必要です
4. **ポート競合**: 既存の開発サーバー（3001, 8082）との競合に注意

## 🔍 トラブルシューティング

### よくある問題

#### 1. tmuxセッション作成失敗
```bash
# セッション確認
tmux list-sessions

# 強制終了
tmux kill-session -t itsm-requirement
```

#### 2. Claude Code起動失敗
```bash
# Claude Codeインストール確認
which claude

# 手動起動
claude
```

#### 3. ペイン起動失敗
```bash
# 権限確認
chmod +x tmux/panes/*.sh
chmod +x tmux/coordination/*.sh
```

## 📚 関連ファイル

- `tmux/start-yolo-mode.sh` - 専用起動スクリプト
- `tmux/start-development.sh` - 既存スクリプト（YOLO対応）
- `tmux/panes/feature-*.sh` - 各ペインスクリプト（YOLO対応）
- `tmux/coordination/leader-command.sh` - 統合リーダーコマンド
- `CLAUDE.md` - プロジェクト全体ガイド

---

**更新日**: 2025年6月21日  
**バージョン**: v1.0  
**開発者**: Claude Code AI Assistant

🚀 **YOLO MODE で爆速開発を始めましょう！**