const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'incidents-schema.sql');

async function initIncidentsDatabase() {
  try {
    console.log('🔧 インシデント管理データベースを初期化中...');
    
    // データベースディレクトリを作成
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 データベースディレクトリを作成しました');
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

    db.close();
    
    console.log('✅ インシデント管理データベースの初期化が完了しました');
    console.log(`📂 データベースファイル: ${DB_PATH}`);
    console.log('📊 サンプルデータが挿入されました');
    console.log('');
    console.log('🧪 テスト用インシデント:');
    console.log('   - Webサーバーダウン (Critical)');
    console.log('   - メール送信不具合 (High)');
    console.log('   - ログイン画面表示遅延 (Medium)');
    console.log('   - プリンター接続エラー (Low)');
    console.log('   - データベース接続タイムアウト (High)');

  } catch (error) {
    console.error('❌ データベース初期化に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  initIncidentsDatabase();
}

module.exports = { initIncidentsDatabase };