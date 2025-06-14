const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'itsm.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🚨 緊急API監査ログ解析開始');
console.log('================================');

// 1. 総ログ数とテーブル存在確認
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'", (err, table) => {
  if (err || !table) {
    console.log('❌ logsテーブルが見つかりません');
    
    // 代替：すべてのテーブルを確認
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (!err) {
        console.log('📋 利用可能なテーブル:', tables.map(t => t.name).join(', '));
      }
      db.close();
    });
    return;
  }
  
  console.log('✅ logsテーブル確認済み');
  
  // 2. 総ログ数
  db.get('SELECT COUNT(*) as total FROM logs', (err, result) => {
    if (err) {
      console.error('❌ ログ数取得エラー:', err.message);
      return;
    }
    
    const totalLogs = result?.total || 0;
    console.log('📊 総ログ数:', totalLogs);
    
    if (totalLogs === 0) {
      console.log('⚠️  ログデータが見つかりません');
      db.close();
      return;
    }
    
    // 3. 異常パターン検索
    const suspiciousQueries = [
      // SQLインジェクション検出
      "SELECT COUNT(*) as count FROM logs WHERE details LIKE '%SELECT%' OR details LIKE '%UNION%' OR details LIKE '%DROP%'",
      
      // 権限昇格の痕跡
      "SELECT COUNT(*) as count FROM logs WHERE details LIKE '%administrator%' AND action = 'Update'",
      
      // 大量データアクセス
      "SELECT COUNT(*) as count FROM logs WHERE action = 'Read' AND timestamp >= datetime('now', '-1 hour')",
      
      // 失敗したログイン試行
      "SELECT COUNT(*) as count FROM logs WHERE event_subtype = 'Login' AND details LIKE '%Failed%'",
      
      // 削除操作
      "SELECT COUNT(*) as count FROM logs WHERE action = 'Delete' AND timestamp >= datetime('now', '-24 hours')"
    ];
    
    const suspiciousLabels = [
      'SQLインジェクション疑い',
      '権限昇格試行',
      '過去1時間の大量読み取り',
      'ログイン失敗',
      '過去24時間の削除操作'
    ];
    
    let completedQueries = 0;
    const anomalies = [];
    
    suspiciousQueries.forEach((query, index) => {
      db.get(query, (err, result) => {
        if (err) {
          console.error(`❌ ${suspiciousLabels[index]} 検査エラー:`, err.message);
        } else {
          const count = result?.count || 0;
          console.log(`🔍 ${suspiciousLabels[index]}: ${count}件`);
          
          if (count > 0) {
            anomalies.push({
              type: suspiciousLabels[index],
              count: count,
              severity: count > 10 ? 'HIGH' : count > 5 ? 'MEDIUM' : 'LOW'
            });
          }
        }
        
        completedQueries++;
        if (completedQueries === suspiciousQueries.length) {
          // 4. 異常検知結果
          console.log('\n🚨 異常検知結果:');
          console.log('=================');
          
          if (anomalies.length === 0) {
            console.log('✅ 異常なパターンは検出されませんでした');
          } else {
            anomalies.forEach(anomaly => {
              console.log(`⚠️  ${anomaly.type}: ${anomaly.count}件 [${anomaly.severity}]`);
            });
            
            // 高リスクの場合の推奨アクション
            const hasHighRisk = anomalies.some(a => a.severity === 'HIGH');
            if (hasHighRisk) {
              console.log('\n🚨 緊急推奨アクション:');
              console.log('- データベースを読み取り専用モードに切り替え');
              console.log('- 管理者権限のアクセスを一時制限');
              console.log('- セキュリティ監査の実施');
            }
          }
          
          // 5. 最新のログ詳細
          db.all('SELECT timestamp, event_type, username, action, details FROM logs ORDER BY timestamp DESC LIMIT 5', (err, recentLogs) => {
            if (!err && recentLogs.length > 0) {
              console.log('\n📋 最新のログエントリ:');
              console.log('====================');
              recentLogs.forEach(log => {
                console.log(`[${log.timestamp}] ${log.event_type} - ${log.username || 'unknown'} - ${log.action}: ${log.details || 'no details'}`);
              });
            }
            
            db.close();
            console.log('\n✅ 緊急解析完了');
          });
        }
      });
    });
  });
});