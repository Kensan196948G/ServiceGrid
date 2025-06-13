# ITSM Platform - tmux並列開発環境

## 概要

VSCode + Claude Code + tmuxを使用した5ペイン並列開発環境です。
複数の開発タスクを同時進行し、効率的なITSMプラットフォーム開発を行います。

## 開発環境構成

### 5つの開発ペイン

| ペイン | 役割 | 担当範囲 |
|--------|------|----------|
| **Feature-A** | 統合リーダー | 設計統一・アーキテクチャ管理・調整 |
| **Feature-B** | UI/テスト | フロントエンド・Jest/RTL・自動修復 |
| **Feature-C** | API開発 | Node.js API・テスト通過ループ |
| **Feature-D** | PowerShell | PowerShell API・run-tests.sh修復 |
| **Feature-E** | 非機能要件 | SLA・ログ・セキュリティ実装 |

## ディレクトリ構成

```
tmux/
├── README.md                    # このファイル
├── session-config.conf          # tmuxセッション設定
├── start-development.sh         # 開発セッション開始
├── panes/                       # 各ペイン実行スクリプト
│   ├── feature-a-leader.sh      # 統合リーダー
│   ├── feature-b-ui.sh          # UI/テスト
│   ├── feature-c-api.sh         # API開発
│   ├── feature-d-powershell.sh  # PowerShell
│   └── feature-e-nonfunc.sh     # 非機能要件
├── docs/                        # 開発ドキュメント
│   ├── development-guide.md     # 開発ガイド
│   ├── architecture.md          # アーキテクチャ
│   └── testing-strategy.md      # テスト戦略
└── tools/                       # 共通ツール
    ├── test-runner.sh           # 統合テストランナー
    ├── lint-checker.sh          # Lintチェッカー
    └── build-validator.sh       # ビルド検証
```

## 使用方法

### 1. 開発セッション開始

```bash
cd /mnt/e/ServiceGrid/tmux
./start-development.sh
```

### 2. ペイン操作

```bash
# ペイン間移動
Ctrl-b + 矢印キー

# ペイン選択（番号）
Ctrl-b + 0-4

# ペイン分割表示切り替え
Ctrl-b + z (ズーム/解除)

# セッション終了
Ctrl-b + & (確認後終了)
```

### 3. 個別ペイン実行

```bash
# 統合リーダー（Feature-A）
./panes/feature-a-leader.sh

# UI/テスト（Feature-B）
./panes/feature-b-ui.sh

# API開発（Feature-C）
./panes/feature-c-api.sh

# PowerShell（Feature-D）
./panes/feature-d-powershell.sh

# 非機能要件（Feature-E）
./panes/feature-e-nonfunc.sh
```

## 開発フロー

### 1. Feature-A（統合リーダー）
- 全体設計の統一性確保
- 各ペインの作業調整
- アーキテクチャ監視
- コード品質管理

### 2. Feature-B（UI/テスト）
- React/TypeScript開発
- Jest/RTL テスト実行
- ESLint/TypeScript チェック
- UI不具合自動修復

### 3. Feature-C（API開発）
- Node.js/Express API開発
- REST APIエンドポイント実装
- API テスト通過まで自動ループ
- データベース連携

### 4. Feature-D（PowerShell）
- PowerShell API実装
- Windows環境対応
- run-tests.sh 成功まで修復
- バッチ処理・ジョブ実装

### 5. Feature-E（非機能要件）
- SLA管理実装
- 監査ログ・セキュリティ
- パフォーマンス最適化
- 運用監視機能

## 統合テスト

```bash
# 全体テスト実行
./tools/test-runner.sh

# Lintチェック
./tools/lint-checker.sh

# ビルド検証
./tools/build-validator.sh
```

## 開発スケジュール

### Phase 1: 基盤構築（Week 1-2）
- [ ] tmux環境セットアップ
- [ ] 各ペインスクリプト動作確認
- [ ] 統合テスト環境構築

### Phase 2: 並列開発（Week 3-8）
- [ ] Feature-A: 設計統一・調整
- [ ] Feature-B: UI実装・テスト
- [ ] Feature-C: API開発・テスト
- [ ] Feature-D: PowerShell実装
- [ ] Feature-E: 非機能要件実装

### Phase 3: 統合・最適化（Week 9-10）
- [ ] 全機能統合テスト
- [ ] パフォーマンス調整
- [ ] セキュリティ検証
- [ ] リリース準備

## トラブルシューティング

### よくある問題

1. **tmuxセッションが開始できない**
   ```bash
   # tmux再インストール
   sudo apt-get install tmux
   
   # 設定ファイル確認
   tmux source-file session-config.conf
   ```

2. **ペインでスクリプトが実行できない**
   ```bash
   # 実行権限付与
   chmod +x panes/*.sh tools/*.sh
   
   # パス確認
   which node npm pwsh
   ```

3. **PowerShellが見つからない**
   ```bash
   # PowerShell Core インストール
   sudo apt-get install powershell
   
   # 代替: Windows環境で実行
   ```

## 参考資料

- [ITSM Platform CLAUDE.md](../CLAUDE.md)
- [開発ガイド](docs/development-guide.md)
- [アーキテクチャ設計](docs/architecture.md)
- [テスト戦略](docs/testing-strategy.md)

---

**更新日**: 2025年6月14日  
**バージョン**: v1.0  
**作成者**: Claude Code AI Assistant