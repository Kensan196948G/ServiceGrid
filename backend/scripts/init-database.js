const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

async function initDatabase() {
  try {
    // データベースディレクトリを作成
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 既存のデータベースファイルを削除（開発時のみ）
    if (fs.existsSync(DB_PATH)) {
      console.log('Removing existing database...');
      fs.unlinkSync(DB_PATH);
    }

    // スキーマファイルを読み取り
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // データベース接続
    const db = new sqlite3.Database(DB_PATH);

    // スキーマを実行
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // デフォルトユーザーのパスワードハッシュを生成
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const operatorPasswordHash = await bcrypt.hash('operator123', 12);

    // デフォルトユーザーを作成
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET 
         password_hash = ?, 
         password_salt = 'bcrypt_managed' 
         WHERE username = 'admin'`,
        [adminPasswordHash],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET 
         password_hash = ?, 
         password_salt = 'bcrypt_managed' 
         WHERE username = 'operator'`,
        [operatorPasswordHash],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // サンプルデータを挿入
    const sampleData = [
      // サンプルインシデント
      {
        table: 'incidents',
        data: [
          ['サーバーダウン', 'Webサーバーが応答しません', 'Open', 'High', 'admin', '2024-01-15'],
          ['ネットワーク接続エラー', 'オフィスのネットワークが不安定です', 'In Progress', 'Medium', 'operator', '2024-01-16']
        ],
        columns: 'title, description, status, priority, assignee, reported_date'
      },
      // サンプル資産（新しいスキーマに対応）
      {
        table: 'assets',
        data: [
          ['SRV-001', 'Webサーバー', 'プロダクション用Webサーバー', 'Server', 'Physical Server', 'Dell', 'PowerEdge R740', 'DL1234567890', 'データセンター A-1', 'IT部門', 'admin', 'admin', 'Active', '2023-01-15', 850000.00, '2026-01-15', '192.168.1.10', '00:1B:21:12:34:56', 'Ubuntu Server 22.04 LTS', '["Apache", "MySQL", "PHP"]', '{"cpu": "Intel Xeon", "ram": "32GB", "storage": "1TB SSD"}', '重要なプロダクションサーバー', '["production", "web", "critical"]', 'admin'],
          ['WS-001', '開発用ワークステーション', '開発者用デスクトップPC', 'Workstation', 'Desktop PC', 'HP', 'EliteDesk 800', 'HP9876543210', 'オフィス 3F-15', '開発部門', 'developer01', 'developer01', 'Active', '2023-03-20', 120000.00, '2026-03-20', '192.168.1.101', '00:1B:21:98:76:54', 'Windows 11 Pro', '["Visual Studio", "Docker", "Git"]', '{"cpu": "Intel i7", "ram": "16GB", "storage": "512GB SSD"}', '開発環境設定済み', '["development", "workstation"]', 'admin']
        ],
        columns: 'asset_tag, name, description, category, type, manufacturer, model, serial_number, location, department, owner, assigned_to, status, purchase_date, purchase_cost, warranty_expiry, ip_address, mac_address, operating_system, software_licenses, configuration, notes, tags, created_by'
      }
    ];

    for (const sample of sampleData) {
      const placeholders = sample.data[0].map(() => '?').join(', ');
      const query = `INSERT INTO ${sample.table} (${sample.columns}) VALUES (${placeholders})`;
      
      for (const row of sample.data) {
        await new Promise((resolve, reject) => {
          db.run(query, row, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }

    db.close();
    console.log('✅ Database initialized successfully');
    console.log(`📂 Database file: ${DB_PATH}`);
    console.log('👤 Default users created:');
    console.log('   - admin/admin123 (administrator)');
    console.log('   - operator/operator123 (operator)');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };