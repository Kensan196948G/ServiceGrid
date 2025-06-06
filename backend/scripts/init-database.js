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
      // サンプル資産
      {
        table: 'assets',
        data: [
          ['SRV001', 'Webサーバー', 'Server', 'IT部', 'データセンターA', 'Active', '2025-12-31'],
          ['PC001', '管理者用PC', 'Hardware', 'admin', 'オフィス1F', 'Active', '2024-12-31']
        ],
        columns: 'asset_no, name, type, user, location, status, warranty_end'
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