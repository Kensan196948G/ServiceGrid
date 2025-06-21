# 🚀 YOLO MODE クイックスタートガイド

## 概要

**YOLO MODE**は、1コマンドでtmux上の5ペイン並列開発環境を完全自動構築するシステムです。

従来の手動セットアップ（15分）を30秒に短縮し、即座に並列開発を開始できます。

## 📋 事前準備

### 必須要件確認
```bash
# 1. tmux確認
tmux -V
# → tmux 2.8以上が必要

# 2. Node.js確認
node --version
# → v18以上が必要

# 3. プロジェクトディレクトリ確認
ls /mnt/f/ServiceGrid/
# → package.json等が存在することを確認
```

### Claude Code（オプション）
```bash
# インストール確認
which claude

# 未インストールの場合
pip install claude-code
```

## 🚀 基本使用方法

### 最速起動（推奨）
```bash
cd /mnt/f/ServiceGrid/tmux
./start-yolo-mode.sh
```

**これだけで完了！** 30秒後には5ペイン並列開発環境が起動します。

### 代替起動方法
```bash
# 既存スクリプトのYOLOオプション
./start-development.sh --yolo-mode
```

## 🎯 起動後の操作

### ペイン移動
```bash
Ctrl-b + 0    # Feature-B-UI (フロントエンド)
Ctrl-b + 1    # Feature-C-API (バックエンド)  
Ctrl-b + 2    # Feature-D-PowerShell
Ctrl-b + 3    # Feature-E-Security
Ctrl-b + 4    # Feature-A-Leader (統合リーダー)
```

### 統合リーダーから指示送信
```bash
# Feature-A-Leaderペイン（ペイン4）で実行
./leader-command.sh all "プロジェクトの現状を報告してください"
./leader-command.sh ui "Reactコンポーネントを最適化してください"
./leader-command.sh status  # 各ペイン状況確認
```

### 終了方法
```bash
# 方法1: tmux内で
Ctrl-b + &

# 方法2: 外部から
tmux kill-session -t itsm-requirement
```

## ⚙️ よく使うオプション

### 強制再作成
```bash
./start-yolo-mode.sh --force
# 既存セッションを強制終了して新規作成
```

### 静音モード
```bash
./start-yolo-mode.sh --silent
# 最小限のログ出力で高速起動
```

### 初期タスクなし
```bash
./start-yolo-mode.sh --no-auto-task
# 環境構築のみ、自動タスク実行をスキップ
```

## 🔧 トラブル時の対処

### よくある問題

#### 1. セッション作成失敗
```bash
# 既存セッション確認・削除
tmux list-sessions
tmux kill-session -t itsm-requirement

# 強制再作成
./start-yolo-mode.sh --force
```

#### 2. ポート競合エラー
```bash
# 使用中ポート確認
netstat -tuln | grep :3001
netstat -tuln | grep :8082

# プロセス終了
pkill -f "vite.*3001"
pkill -f "node.*8082"
```

#### 3. 権限エラー
```bash
# 実行権限付与
chmod +x tmux/start-yolo-mode.sh
chmod +x tmux/panes/*.sh
chmod +x tmux/coordination/*.sh
```

## 📊 構築される環境

```
┌─────────────────────────────────────┐
│ YOLO MODE 5ペイン並列開発環境        │
│ ┌─────────────┬─────────────────────┤
│ │ 0:UI/テスト │ 1:API開発           │
│ ├─────────────┼─────────────────────┤
│ │ 2:PowerShell│ 3:品質・セキュリティ│
│ ├─────────────┴─────────────────────┤
│ │ 4:統合リーダー（指示送信）        │
│ └─────────────────────────────────────┘
```

## 🎯 各ペインの自動実行内容

- **ペイン0 (UI)**: 開発サーバー起動・TypeScript・ESLint・Jest実行
- **ペイン1 (API)**: APIサーバー起動・データベース確認
- **ペイン2 (PowerShell)**: PowerShell環境確認・テスト実行
- **ペイン3 (Security)**: セキュリティ監査・品質チェック
- **ペイン4 (Leader)**: 統合管理・各ペインへの指示送信

## 🆘 ヘルプ・詳細情報

### ヘルプ表示
```bash
./start-yolo-mode.sh --help
./start-development.sh --help
```

### 詳細ドキュメント
- `tmux/YOLO-MODE-完全ガイド.md` - 完全技術仕様
- `tmux/README.md` - tmux環境全般ガイド
- `../CLAUDE.md` - プロジェクト全体ガイド

## 🚀 今すぐ開始

```bash
# 1. ディレクトリ移動
cd /mnt/f/ServiceGrid/tmux

# 2. YOLO MODE起動
./start-yolo-mode.sh

# 3. 開発開始！
# 30秒後には全ペインで並列開発が可能です
```

**🎉 お疲れさまでした！YOLO MODEで爆速開発をお楽しみください！**

---

*最終更新: 2025年6月21日*