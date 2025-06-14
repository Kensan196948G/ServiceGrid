# tmux 3段レイアウト仕様書

## 📋 概要

ITSM準拠IT運用システムプラットフォームの**tmux 3段レイアウト**は、5つのペインを3段階に配置した効率的な並列開発環境です。

このレイアウトは、2x2グリッド（上部2段）＋フル幅ペイン（下部1段）の構成で、Feature別チーム開発を最適化します。

## 🎯 レイアウト構造

### 視覚的構造図

```
┌─────────────────────────────────────────────────────────────┐
│                    tmux 3段レイアウト                       │
├─────────────────────────────────────────────────────────────┤
│ 1段目（上段）                                               │
│ ┌─────────────────────────┬─────────────────────────────────┤
│ │ ペイン0: Feature-B      │ ペイン1: Feature-C              │
│ │ UI/テスト自動修復       │ API開発                         │
│ │ React・TypeScript・Jest │ Node.js・Express・テスト        │
│ │ サイズ: 40x5            │ サイズ: 39x5                    │
│ │ 位置: (0,1)             │ 位置: (41,1)                    │
│ ├─────────────────────────┼─────────────────────────────────┤
│ │ 2段目（中段）                                             │
│ │ ペイン2: Feature-D      │ ペイン3: Feature-E              │
│ │ PowerShell API開発      │ 非機能要件                      │
│ │ PowerShell・Windows対応 │ SLA・ログ・セキュリティ・監視   │
│ │ サイズ: 40x5            │ サイズ: 39x5                    │
│ │ 位置: (0,7)             │ 位置: (41,7)                    │
│ └─────────────────────────┴─────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│ 3段目（下段フル幅）                                         │
│ ペイン4: Feature-A (統合リーダー)                           │
│ 設計統一・アーキテクチャ管理・調整                          │
│ サイズ: 80x11                                               │
│ 位置: (0,13)                                                │
└─────────────────────────────────────────────────────────────┘
```

### ペイン詳細仕様

| ペイン | Feature | 位置 | サイズ | 担当領域 | 技術スタック |
|--------|---------|------|--------|----------|-------------|
| **0** | Feature-B | (0,1) | 40x5 | UI/テスト | React・TypeScript・Jest・RTL・ESLint |
| **1** | Feature-C | (41,1) | 39x5 | API開発 | Node.js・Express・SQLite・テスト |
| **2** | Feature-D | (0,7) | 40x5 | PowerShell | PowerShell・Windows API・run-tests.sh |
| **3** | Feature-E | (41,7) | 39x5 | 非機能要件 | SLA・ログ・セキュリティ・監視 |
| **4** | Feature-A | (0,13) | 80x11 | 統合リーダー | 設計統一・アーキテクチャ管理・調整 |

## 🔧 技術実装

### tmuxコマンド実装

```bash
# セッション作成
tmux new-session -d -s itsm-requirement -c /mnt/e/ServiceGrid

# Step 1: 基本縦分割（上部・下部分離）
tmux split-window -v -t itsm-requirement:0

# Step 2: 上部を2段に分割
tmux split-window -v -t itsm-requirement:0.0

# Step 3: 1段目を左右分割（ペイン0とペイン1）
tmux split-window -h -t itsm-requirement:0.0

# Step 4: 2段目を左右分割（ペイン2とペイン3）
tmux split-window -h -t itsm-requirement:0.2
```

### レイアウト検証コマンド

```bash
# ペイン配置確認
tmux list-panes -t itsm-requirement -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ#{pane_width}x#{pane_height}"

# 期待結果
# ペイン0: 位置(0,1) サイズ40x5
# ペイン1: 位置(41,1) サイズ39x5
# ペイン2: 位置(0,7) サイズ40x5
# ペイン3: 位置(41,7) サイズ39x5
# ペイン4: 位置(0,13) サイズ80x11
```

## 🎨 ペイン操作

### キーバインド一覧

| キー操作 | 機能 | 対象ペイン |
|----------|------|-----------|
| `Ctrl+b + 0` | 1段目左に移動 | ペイン0: Feature-B (UI/テスト) |
| `Ctrl+b + 1` | 1段目右に移動 | ペイン1: Feature-C (API開発) |
| `Ctrl+b + 2` | 2段目左に移動 | ペイン2: Feature-D (PowerShell) |
| `Ctrl+b + 3` | 2段目右に移動 | ペイン3: Feature-E (非機能要件) |
| `Ctrl+b + 4` | 3段目に移動 | ペイン4: Feature-A (統合リーダー) |
| `Ctrl+b + 矢印` | ペイン間を矢印で移動 | 全ペイン |
| `Ctrl+b + z` | ペインをズーム/復元 | アクティブペイン |
| `Ctrl+b + &` | セッション終了 | 全体 |

### ペイン設定コマンド

```bash
# Feature-B (UI/テスト)
tmux send-keys -t itsm-requirement:0.0 "echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m

# Feature-C (API開発)
tmux send-keys -t itsm-requirement:0.1 "echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m

# Feature-D (PowerShell)
tmux send-keys -t itsm-requirement:0.2 "echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m

# Feature-E (非機能要件)
tmux send-keys -t itsm-requirement:0.3 "echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m

# Feature-A (統合リーダー)
tmux send-keys -t itsm-requirement:0.4 "echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m
```

## 🚀 自動化スクリプト

### 実装済みスクリプト

1. **start-development.sh**: メインの開発環境起動スクリプト
2. **quick-connect.sh**: 統合起動・接続スクリプト
3. **setup-all-panes-claude.sh**: Claude Code自動設定

### スクリプト実行フロー

```bash
# 完全自動化実行
cd /mnt/e/ServiceGrid/tmux
./quick-connect.sh

# 手動実行の場合
./start-development.sh
tmux attach-session -t itsm-requirement
```

## 📊 レイアウト最適化

### 画面サイズ対応

- **最小推奨サイズ**: 80x25文字
- **推奨サイズ**: 120x30文字以上
- **最適サイズ**: 160x40文字以上

### レスポンシブ設計

```bash
# 画面サイズ取得
tmux display-message -p "#{window_width}x#{window_height}"

# 小画面対応（80x25未満）
if [ $(tmux display-message -p "#{window_width}") -lt 80 ]; then
    echo "画面が小さすぎます。80x25以上を推奨します。"
fi
```

## 🔄 Feature別ワークフロー

### 1段目: フロントエンド・バックエンド連携

```
ペイン0 (Feature-B) ←→ ペイン1 (Feature-C)
  UI/テスト                API開発
    ↓                        ↓
React・TypeScript      Node.js・Express
Jest・RTL              SQLite・テスト
ESLint                 API Endpoints
```

### 2段目: インフラ・品質保証

```
ペイン2 (Feature-D) ←→ ペイン3 (Feature-E)
  PowerShell            非機能要件
    ↓                        ↓
Windows API           SLA・監視
PowerShell Scripts    セキュリティ
システム統合         ログ管理
```

### 3段目: 統合管理

```
ペイン4 (Feature-A): 統合リーダー
           ↑
    設計統一・調整
アーキテクチャ管理
品質監視・統括
```

## 🛠️ トラブルシューティング

### よくある問題と対処法

#### 1. ペイン配置が崩れる

**症状**: ペイン番号と位置が一致しない

**原因**: tmux分割順序の問題

**対処法**:
```bash
# セッション再作成
tmux kill-session -t itsm-requirement
./start-development.sh
```

#### 2. 画面サイズが合わない

**症状**: ペインが重なる・表示が崩れる

**対処法**:
```bash
# 画面サイズ確認
tmux display-message -p "#{window_width}x#{window_height}"

# レイアウト再配置
tmux select-layout tiled
# 手動で再配置
./start-development.sh
```

#### 3. ペイン番号の混乱

**症状**: Ctrl+b + 数字でのペイン移動ができない

**対処法**:
```bash
# ペイン一覧確認
tmux list-panes -t itsm-requirement

# ペイン番号修正（必要に応じて）
tmux move-pane -t itsm-requirement:0.0
```

## 📈 パフォーマンス特性

### 推奨システム要件

| 項目 | 最小要件 | 推奨要件 |
|------|----------|----------|
| CPU | 2コア | 4コア以上 |
| メモリ | 2GB | 4GB以上 |
| ディスク | 1GB | 5GB以上 |
| ターミナル | 80x25 | 120x30以上 |

### リソース使用量

```bash
# tmux プロセス確認
ps aux | grep tmux

# メモリ使用量
free -h

# ディスク使用量
df -h /mnt/e/ServiceGrid
```

## 🔗 関連ドキュメント

- [メインREADME](../README.md): tmux環境全体概要
- [architecture.md](./architecture.md): システム設計
- [development-guide.md](./development-guide.md): 開発ガイド
- [CLAUDE.md](../../CLAUDE.md): プロジェクト全体ガイド

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-06-15 | 初版作成・3段レイアウト仕様確定 |

---

**📋 ドキュメント情報**
- **作成日**: 2025年6月15日
- **最終更新**: 2025年6月15日
- **バージョン**: v1.0
- **作成者**: Claude Code AI Assistant
- **レビュー**: 要望仕様準拠