-- 改良されたインシデント管理テーブル
-- 既存テーブルの更新用SQL

-- 既存テーブルを削除（開発環境のみ）
DROP TABLE IF EXISTS incidents;

-- 新しいインシデントテーブル作成
CREATE TABLE incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Pending')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    category TEXT DEFAULT 'General',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    closed_at DATETIME,
    
    -- 追加フィールド
    impact TEXT CHECK (impact IN ('Low', 'Medium', 'High')),
    urgency TEXT CHECK (urgency IN ('Low', 'Medium', 'High')),
    resolution TEXT,
    workaround TEXT,
    related_assets TEXT, -- JSON形式で関連資産ID保存
    tags TEXT -- JSON形式でタグ保存
);

-- インデックス作成
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_category ON incidents(category);

-- トリガー作成（更新日時自動更新）
CREATE TRIGGER update_incidents_timestamp 
    AFTER UPDATE ON incidents
    FOR EACH ROW
BEGIN
    UPDATE incidents SET updated_at = CURRENT_TIMESTAMP WHERE incident_id = NEW.incident_id;
END;

-- サンプルデータ挿入
INSERT INTO incidents (
    title, description, reported_by, assigned_to, status, priority, category
) VALUES 
    ('Webサーバーダウン', 'メインWebサーバー（srv-web-01）が応答しません。HTTP 500エラーが発生しています。', 'user01', 'admin', 'Open', 'Critical', 'Infrastructure'),
    ('メール送信不具合', 'ユーザーからメールが送信できないとの報告があります。SMTP設定を確認してください。', 'user02', 'operator', 'In Progress', 'High', 'Email'),
    ('ログイン画面表示遅延', 'ログイン画面の表示に10秒以上かかる現象が発生しています。', 'user03', NULL, 'Open', 'Medium', 'Performance'),
    ('プリンター接続エラー', 'オフィス3Fのプリンター（PR-003）に接続できません。', 'user04', 'operator', 'Resolved', 'Low', 'Hardware'),
    ('データベース接続タイムアウト', '顧客管理システムでデータベース接続タイムアウトが頻発しています。', 'user05', 'admin', 'In Progress', 'High', 'Database');