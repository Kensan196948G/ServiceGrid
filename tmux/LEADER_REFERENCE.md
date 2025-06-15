# Feature-A-Leader 統合指示システム リファレンス

## 📋 コマンド一覧

### 基本コマンド

| コマンド | 説明 | 対象ペイン |
|---------|------|----------|
| `leader all "指示"` | 全ペインに指示送信 | 0,1,2,3 |
| `leader ui "指示"` | UI/テストペインに指示 | 0 (Feature-B) |
| `leader api "指示"` | API開発ペインに指示 | 1 (Feature-C) |
| `leader ps "指示"` | PowerShellペインに指示 | 2 (Feature-D) |
| `leader sec "指示"` | 非機能要件ペインに指示 | 3 (Feature-E) |
| `leader status` | 各ペイン状況確認 | - |
| `leader demo` | 連携デモ実行 | 0,1,2,3 |

### オプション

| オプション | 説明 | 使用例 |
|-----------|------|--------|
| `--files "PATTERN"` | 参照ファイル指定 | `--files "src/**/*.tsx,*.json"` |
| `--auto-approve` | 自動承認モード | `--auto-approve` |
| `--at-claude` | @claude形式指示 | `--at-claude` |
| `--model "MODEL"` | 使用モデル指定 | `--model claude-3-5-sonnet` |

## 🎯 実用的な使用例

### 1. プロジェクト分析・レビュー

```bash
# 全体分析
leader all --files "package.json,CLAUDE.md,src/**/*.tsx" \
"プロジェクト構造を分析して改善点を特定してください"

# コードレビュー
leader all --files "src/**/*.tsx,backend/**/*.js" \
"コード品質をレビューして改善提案をしてください"
```

### 2. 開発・実装作業

```bash
# 新機能開発
leader all "ユーザーダッシュボード機能を開発してください。各担当分野で実装をお願いします"

# バグ修正
leader all --auto-approve --files "src/**/*.tsx" \
"ESLintエラーとTypeScriptエラーを自動修正してください"
```

### 3. テスト・品質保証

```bash
# テスト実行
leader all --auto-approve "プロジェクト全体のテストを実行して結果を報告してください"

# 品質チェック
leader all --files "src/**/*.tsx,backend/**/*.js" \
"コードカバレッジとテスト品質を向上させてください"
```

### 4. 個別専門作業

```bash
# フロントエンド最適化
leader ui --files "src/components/**/*.tsx" \
"Reactコンポーネントのパフォーマンス最適化を実行してください"

# API強化
leader api --files "backend/api/**/*.js" \
"APIエンドポイントのエラーハンドリングとバリデーションを強化してください"

# PowerShell統合
leader ps --files "backend/**/*.ps1" \
"Windows環境でのPowerShell API連携を堅牢化してください"

# セキュリティ監査
leader sec --files "backend/middleware/**/*.js" \
"認証・認可システムのセキュリティ監査を実行してください"
```

### 5. 統合・デプロイ準備

```bash
# 統合テスト
leader all --auto-approve \
"全機能の統合テストを実行してデプロイ準備を整えてください"

# ドキュメント生成
leader all --files "src/**/*.tsx,backend/**/*.js" \
"APIドキュメントと開発者向けドキュメントを生成してください"
```

## 🔧 高度な使用パターン

### 段階的開発ワークフロー

```bash
# Phase 1: 分析
leader all --files "docs/**/*.md,package.json" \
"要件仕様を分析して実装計画を立ててください"

# Phase 2: 設計
leader all "Phase1の分析結果に基づいて詳細設計を行ってください"

# Phase 3: 実装
leader ui "UIコンポーネント実装を開始してください"
leader api "バックエンドAPI実装を開始してください"
leader ps "PowerShell統合実装を開始してください"
leader sec "セキュリティ機能実装を開始してください"

# Phase 4: テスト
leader all --auto-approve "実装した機能のテストを実行してください"

# Phase 5: 統合
leader all "全機能を統合してエンドツーエンドテストを実行してください"
```

### 自動修復ワークフロー

```bash
# 1. 問題検出
leader all "現在のコードベースの問題点を特定してください"

# 2. 自動修復実行
leader all --auto-approve --files "src/**/*.tsx,backend/**/*.js" \
"検出された問題を自動修復してください（最大7回試行）"

# 3. 結果確認
leader all "修復結果を確認してテストを実行してください"

# 4. 品質確認
leader all --files "**/*test*" \
"全テストを実行して品質を確認してください"
```

## ⚡ パフォーマンス最適化

### 効率的なファイル指定

```bash
# Good: 具体的なファイル指定
leader all --files "src/pages/AssetPage.tsx,backend/api/assets.js" \
"資産管理機能を最適化してください"

# Better: パターン指定
leader all --files "src/**/*.{tsx,ts},backend/**/*.{js,ps1}" \
"TypeScriptとJavaScript/PowerShellファイルを最適化してください"
```

### 並列処理活用

```bash
# 並列実行（各ペインで同時処理）
leader ui "UIテスト実行" &
leader api "APIテスト実行" &
leader ps "PowerShellテスト実行" &
leader sec "セキュリティテスト実行" &
wait  # 全て完了まで待機
```

## 🚨 注意事項

### 1. **実行ペイン**
- `leader`コマンドは**Feature-A-Leaderペイン（ペイン4）**から実行してください
- 他のペインから実行すると警告が表示されます

### 2. **指示の書き方**
- **具体的で明確な指示**を心がけてください
- **期待する成果物**を明記してください
- **制約条件**があれば明確に記述してください

### 3. **自動承認モード**
- `--auto-approve`は**慎重に使用**してください
- **重要なファイル**の変更前は手動確認を推奨します

### 4. **ファイル指定**
- **大量のファイル**を指定するとClaudeの処理に時間がかかります
- **必要最小限**のファイル指定を心がけてください

## 🔍 デバッグ・トラブルシューティング

### 状況確認
```bash
# ペイン状況確認
leader status

# tmuxセッション確認
tmux list-panes -t itsm-requirement

# Claude Code確認
claude --version
```

### 問題解決
```bash
# セッション再起動
tmux kill-session -t itsm-requirement
./start-development.sh

# 個別ペインテスト
tmux send-keys -t "itsm-requirement:0.0" "echo 'Test'" C-m
```

---
**作成日**: 2025年6月15日  
**バージョン**: v2.0  
**対象システム**: ITSM準拠IT運用システムプラットフォーム