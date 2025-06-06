const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// データベースファイルパス
const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');
const schemaPath = path.join(__dirname, '..', 'db', 'schema-enhanced.sql');

console.log('🔧 Applying enhanced database schema...');
console.log(`📁 Database: ${dbPath}`);
console.log(`📄 Schema: ${schemaPath}`);

// スキーマファイルを読み込み
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

// データベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// 外部キー制約を有効化
db.run('PRAGMA foreign_keys = ON');

// SQLステートメントを分割して実行
const statements = schemaSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

let executedCount = 0;
let errorCount = 0;

function executeStatement(index) {
  if (index >= statements.length) {
    console.log(`\n🎉 Schema application completed!`);
    console.log(`✅ Successfully executed: ${executedCount} statements`);
    if (errorCount > 0) {
      console.log(`⚠️  Warnings/Errors: ${errorCount} statements (likely table already exists)`);
    }
    
    // データベースを閉じる
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('🔒 Database connection closed');
      }
      process.exit(0);
    });
    return;
  }
  
  const statement = statements[index];
  
  db.run(statement, (err) => {
    if (err) {
      console.log(`⚠️  Statement ${index + 1}: ${err.message}`);
      errorCount++;
    } else {
      console.log(`✅ Statement ${index + 1}: Executed successfully`);
      executedCount++;
    }
    
    // 次のステートメントを実行
    executeStatement(index + 1);
  });
}

// スキーマ適用開始
console.log(`\n🚀 Starting schema application (${statements.length} statements)...\n`);
executeStatement(0);