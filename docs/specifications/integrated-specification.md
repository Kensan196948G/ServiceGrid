## ITSM準拠IT運用システムプラットフォーム 統合仕様書

### バージョン: v2.1（統合版）

### 作成日: 2025年6月14日

### 作成者: Claude Code AI Assistant（基づく統合）

---

## 1. ドキュメント情報

* ファイル名: ITSM\_統合仕様書\_v2.1\_2025年6月14日.md
* ベース文書:

  * 初期版（v1.0）
  * 詳細仕様書（最新版2025年6月7日）
  * 詳細仕様書（最新版2025年6月8日）

---

## 2. システム概要・対象範囲

### 2.1 システムの目的

ServiceGridは、企業のITSM業務を一元管理するITIL準拠の運用プラットフォームです。資産・申請・障害・監査ログ・SLA等を包括的に扱います。

### 2.2 管理対象サービス

| サービス名             | 管理対象                 | API/連携可否 |
| ----------------- | -------------------- | -------- |
| Microsoft 365（E3） | ユーザー、OneDrive、Teams等 | 取得・連携可   |
| Entra ID          | ユーザー・グループ・サインインログ    | 取得・連携可   |
| Active Directory  | ユーザー・端末・認証ログ         | 取得・連携可   |
| ファイルサーバー          | フォルダ・アクセス権           | 取得・連携可   |
| HENNGE One等       | 仕様未取得                | 拡張予定     |

---

## 3. 技術スタック・構成

### 3.1 フロントエンド

* フレームワーク: React（TypeScript）
* スタイリング: Tailwind CSS
* 状態管理: Context API + Hooks
* 可視化: Recharts

### 3.2 バックエンド

* 実装: Node.js（開発用）／PowerShell 7（本番）
* データベース: SQLite
* 認証: JWT + bcrypt

### 3.3 アーキテクチャ

* マイクロサービス＋レイヤード構成
* RESTful API設計
* セキュリティファースト設計（CSP, Helmet, CORS）

---

## 4. 実装済み機能モジュール（主機能）

* 資産管理（CMDB）
* インシデント管理
* サービス要求管理（ワークフロー）
* 変更管理
* リリース管理
* 問題管理
* ナレッジ管理
* SLA管理
* 可用性・キャパシティ管理
* コンプライアンス・セキュリティ
* ユーザー・RBAC管理
* 監査ログ（全操作記録）

---

## 5. データベース設計（schema-enhanced.sql）

* 主テーブル：assets, incidents, service\_requests, changes, problems, releases, knowledge, users
* 管理系テーブル：slas, capacity, availability, compliance\_controls, logs
* リレーション：incident\_problem\_relationships等
* トリガー：資産更新ログ等（30以上）

---

## 6. API仕様（例）

### 6.1 資産管理API

* `GET /api/assets`
* `POST /api/assets`
* `PUT /api/assets/:id`
* `DELETE /api/assets/:id`

### 6.2 統一レスポンス形式

```json
{
  "success": true,
  "message": "操作が完了しました",
  "data": { /* 実データ */ }
}
```

---

## 7. フロントエンド構成

* 各画面：Login、Dashboard、Asset、Incident、ServiceRequest、SLA...
* UIコンポーネント：Button、Table、Modal、Form等（共通）
* フォームバリデーション：リアルタイム検証＋submit時
* CSV入出力機能：UTF-8 BOM対応、エラー検出

---

## 8. バックエンド構成

* PowerShell API: 各モジュール別スクリプト（Assets.ps1 等）
* DB操作：System.Data.SQLite／公式SQLiteモジュール
* バッチ処理：BackupJob、UserExpireCheck 等
* セキュリティ：try/catch＋ログ記録、RBAC

---

## 9. 認証・セキュリティ

* 認証：JWT + bcrypt（cost=12）
* 権限：administrator/operator/user/readonly
* セッション：sessionStorage
* セキュリティ: Helmet/CORS/SQLi対策/XSS対策

---

## 10. 非機能要件

* パフォーマンス：1秒以内の応答、同時10ユーザー
* 保守性：モジュール化、拡張性重視
* バックアップ：日次/週次スクリプトで対応

---

## 11. 運用・デプロイ

* 起動：`./start-all.sh`
* データ初期化：`init-database.js`
* .env設定：JWT/DB\_PATH/API\_BASE\_URLなど
* テスト：Jest設定（70%以上カバレッジ）

---

## 12. 今後の拡張予定

* PowerShell完全統合
* AD/M365自動連携
* 通知機能（Slack/Teams）
* Docker化／Kubernetes対応

---

## 13. 改訂履歴（統合版）

* v1.0：初期版仕様書（2025/05）
* v1.3：運用対象範囲明記（2025/06/07）
* v2.0：詳細仕様完成（2025/06/08）
* v2.1：統合仕様書作成（2025/06/14）
