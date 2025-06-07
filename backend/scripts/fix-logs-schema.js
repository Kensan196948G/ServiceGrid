/**
 * ログテーブルスキーマ修正スクリプト
 * 
 * logsテーブルに不足している列を追加します
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 ログテーブルスキーマ修正開始...');
console.log(`データベース: ${dbPath}`);

db.serialize(() => {
  // 現在のlogsテーブル構造を確認
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='logs'", (err, row) => {
    if (err) {
      console.error('エラー:', err);
      return;
    }

    console.log('現在のlogsテーブル構造:');
    console.log(row ? row.sql : 'テーブルが存在しません');

    // 不足している列を追加
    const alterQueries = [
      'ALTER TABLE logs ADD COLUMN event_subtype TEXT',
      'ALTER TABLE logs ADD COLUMN user_id INTEGER',
      'ALTER TABLE logs ADD COLUMN username TEXT',
      'ALTER TABLE logs ADD COLUMN source_ip TEXT',
      'ALTER TABLE logs ADD COLUMN user_agent TEXT',
      'ALTER TABLE logs ADD COLUMN session_id TEXT',
      'ALTER TABLE logs ADD COLUMN resource_type TEXT',
      'ALTER TABLE logs ADD COLUMN resource_id TEXT',
      'ALTER TABLE logs ADD COLUMN action TEXT',
      'ALTER TABLE logs ADD COLUMN target_table TEXT',
      'ALTER TABLE logs ADD COLUMN target_record_id INTEGER',
      'ALTER TABLE logs ADD COLUMN old_values TEXT',
      'ALTER TABLE logs ADD COLUMN new_values TEXT',
      'ALTER TABLE logs ADD COLUMN result TEXT DEFAULT "Success"',
      'ALTER TABLE logs ADD COLUMN error_message TEXT',
      'ALTER TABLE logs ADD COLUMN severity TEXT DEFAULT "Info"',
      'ALTER TABLE logs ADD COLUMN correlation_id TEXT'
    ];

    let completed = 0;
    let errors = 0;

    alterQueries.forEach((query, index) => {
      db.run(query, (err) => {
        completed++;
        if (err) {
          // 列が既に存在する場合はエラーになるが、それは正常
          if (err.message.includes('duplicate column name')) {
            console.log(`✅ 列は既に存在: ${query.split(' ')[4]}`);
          } else {
            console.error(`❌ エラー (${index + 1}): ${err.message}`);
            errors++;
          }
        } else {
          console.log(`✅ 列追加成功: ${query.split(' ')[4]}`);
        }

        if (completed === alterQueries.length) {
          // 制約を追加
          const constraintQueries = [
            `UPDATE logs SET action = 'Other' WHERE action IS NULL`,
            `UPDATE logs SET event_type = 'System' WHERE event_type IS NULL`,
            `UPDATE logs SET event_time = datetime('now') WHERE event_time IS NULL`
          ];

          let constraintCompleted = 0;
          constraintQueries.forEach(constraintQuery => {
            db.run(constraintQuery, (err) => {
              constraintCompleted++;
              if (err) {
                console.error(`制約更新エラー: ${err.message}`);
              } else {
                console.log('✅ 制約更新成功');
              }

              if (constraintCompleted === constraintQueries.length) {
                // 最終確認
                db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='logs'", (err, updatedRow) => {
                  if (err) {
                    console.error('確認エラー:', err);
                  } else {
                    console.log('\n更新後のlogsテーブル構造:');
                    console.log(updatedRow ? updatedRow.sql : 'テーブルが見つかりません');
                  }

                  console.log(`\n🎉 ログテーブルスキーマ修正完了!`);
                  console.log(`追加試行: ${alterQueries.length}件`);
                  console.log(`エラー: ${errors}件`);
                  
                  db.close();
                });
              }
            });
          });
        }
      });
    });
  });
});