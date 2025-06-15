# tmux並列開発環境 - クイックスタートガイド

## 🚀 開始方法（3ステップ）

### 1. 環境起動
```bash
cd /mnt/e/ServiceGrid/tmux
./start-development.sh
```

### 2. セッション接続
```bash
tmux attach-session -t itsm-requirement
```

### 3. Feature-A-Leaderペイン（ペイン4）に移動
```
Ctrl+b + 4
```

## 🎯 3段レイアウト構成

```
┌─────────────┬─────────────┐
│ ペイン0     │ ペイン1     │ 1段目
│ Feature-B   │ Feature-C   │
│ UI/テスト   │ API開発     │
├─────────────┼─────────────┤
│ ペイン2     │ ペイン3     │ 2段目  
│ Feature-D   │ Feature-E   │
│ PowerShell  │ 非機能要件  │
├─────────────┴─────────────┤
│ ペイン4: Feature-A-Leader │ 3段目
│ 統合リーダー・指示送信    │
└───────────────────────────┘
```

## 📋 基本コマンド（Feature-A-Leaderから実行）

### 全ペインに指示送信
```bash
leader all "プロジェクト現状を分析してください"
```

### 個別ペインに指示
```bash
leader ui "Reactコンポーネントを最適化してください"
leader api "APIエンドポイントを強化してください"  
leader ps "PowerShell APIを堅牢化してください"
leader sec "セキュリティ監査を実行してください"
```

### 高度なオプション
```bash
# ファイル指定付き
leader all --files "src/**/*.tsx,backend/**/*.js" "コード品質向上を実行"

# 自動承認モード
leader all --auto-approve "ESLintエラーを修正してください"

# @claude形式（シンプル）
leader all --at-claude "UIテストを実行してください"
```

## ⌨️ tmux操作

### ペイン移動
- `Ctrl+b + 0` : Feature-B (UI/テスト)
- `Ctrl+b + 1` : Feature-C (API開発)
- `Ctrl+b + 2` : Feature-D (PowerShell)
- `Ctrl+b + 3` : Feature-E (非機能要件)
- `Ctrl+b + 4` : Feature-A-Leader (統合リーダー)

### その他の操作
- `Ctrl+b + q` : ペイン番号表示
- `Ctrl+b + z` : ペインズーム
- `Ctrl+b + &` : セッション終了

## 🔧 トラブルシューティング

### ペイン状況確認
```bash
leader status
```

### Claude Code動作確認
```bash
claude --version
claude "テストメッセージ"
```

### セッション再作成
```bash
tmux kill-session -t itsm-requirement
./start-development.sh
```

## 💡 使用例

### 1. プロジェクト全体分析
```bash
leader all --files "package.json,CLAUDE.md" "プロジェクト現状分析をお願いします"
```

### 2. 品質向上プロジェクト
```bash
leader all --auto-approve --files "src/**/*.tsx,backend/**/*.js" \
"ESLint・TypeScript・テスト全通過を目指して品質向上してください"
```

### 3. 段階的開発指示
```bash
# ステップ1: 分析
leader all "現状を分析して改善点を特定してください"

# ステップ2: 実装
leader ui "UIコンポーネント改善を実行してください"
leader api "API強化を実行してください"
leader ps "PowerShell堅牢化を実行してください"
leader sec "セキュリティ強化を実行してください"

# ステップ3: 統合
leader all --auto-approve "統合テストと品質チェックを実行してください"
```

## 📚 詳細情報

- **プロジェクト全体**: `/mnt/e/ServiceGrid/CLAUDE.md`
- **tmux設定**: `/mnt/e/ServiceGrid/tmux/docs/`
- **統合指示システム**: `/mnt/e/ServiceGrid/tmux/coordination/`

---
**更新日**: 2025年6月15日  
**バージョン**: v2.0 (2x2+1レイアウト対応)