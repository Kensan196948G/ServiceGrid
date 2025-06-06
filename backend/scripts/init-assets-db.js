const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'assets-schema.sql');

async function initAssetsDatabase() {
  try {
    console.log('🔧 資産管理データベースを初期化中...');
    
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
    
    console.log('✅ 資産管理データベースの初期化が完了しました');
    console.log(`📂 データベースファイル: ${DB_PATH}`);
    console.log('📊 サンプルデータが挿入されました');
    console.log('');
    console.log('🧪 テスト用資産:');
    console.log('   - SRV-001: メインWebサーバー (Active)');
    console.log('   - WS-001: 開発用ワークステーション (Active)');
    console.log('   - NW-001: メインスイッチ (Active)');
    console.log('   - LAP-001: ノートPC (Active)');
    console.log('   - PR-001: オフィスプリンター (Active)');
    console.log('   - DB-001: データベースサーバー (Active)');
    console.log('   - MON-001: 液晶モニター (Active)');
    console.log('   - FIRE-001: ファイアウォール (Active)');

  } catch (error) {
    console.error('❌ データベース初期化に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  initAssetsDatabase();
}

module.exports = { initAssetsDatabase };