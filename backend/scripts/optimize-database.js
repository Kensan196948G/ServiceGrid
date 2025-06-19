/**
 * データベース最適化スクリプト
 * インデックス作成・パフォーマンス設定・統計更新
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

console.log('データベース最適化を開始します...');
console.log(`対象: ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    process.exit(1);
  }
  console.log('✅ データベースに接続しました');
});

// 最適化クエリの配列
const optimizationQueries = [
  // === パフォーマンス設定 ===
  {
    name: 'WAL モード設定',
    sql: 'PRAGMA journal_mode = WAL',
    description: 'Write-Ahead Logging で同時アクセス改善'
  },
  {
    name: '同期設定最適化',
    sql: 'PRAGMA synchronous = NORMAL',
    description: '安全性とパフォーマンスのバランス'
  },
  {
    name: 'キャッシュサイズ拡大',
    sql: 'PRAGMA cache_size = 20000',
    description: 'メモリキャッシュ 20MB に拡大'
  },
  {
    name: 'テンポラリストレージ設定',
    sql: 'PRAGMA temp_store = MEMORY',
    description: 'テンポラリデータをメモリに保存'
  },
  {
    name: 'メモリマップサイズ設定',
    sql: 'PRAGMA mmap_size = 536870912',
    description: 'メモリマップサイズ 512MB に設定'
  },
  
  // === インシデント管理最適化 ===
  {
    name: 'インシデント ステータスインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)',
    description: 'ステータス検索の高速化'
  },
  {
    name: 'インシデント 優先度インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority)',
    description: '優先度検索の高速化'
  },
  {
    name: 'インシデント 作成日インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_created_date ON incidents(created_date)',
    description: '作成日ソートの高速化'
  },
  {
    name: 'インシデント 担当者インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_assignee ON incidents(assignee)',
    description: '担当者検索の高速化'
  },
  {
    name: 'インシデント 複合インデックス（ステータス+優先度）',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_status_priority ON incidents(status, priority)',
    description: 'ステータス+優先度検索の高速化'
  },
  {
    name: 'インシデント タイトル検索インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_title ON incidents(title)',
    description: 'タイトル検索の高速化'
  },
  
  // === 資産管理最適化 ===
  {
    name: '資産 タグインデックス（ユニーク）',
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag)',
    description: '資産タグの一意性とパフォーマンス'
  },
  {
    name: '資産 ステータスインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)',
    description: '資産ステータス検索の高速化'
  },
  {
    name: '資産 種類インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type)',
    description: '資産種類検索の高速化'
  },
  {
    name: '資産 場所インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location)',
    description: '資産場所検索の高速化'
  },
  {
    name: '資産 所有者インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner)',
    description: '資産所有者検索の高速化'
  },
  {
    name: '資産 複合インデックス（種類+ステータス）',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_type_status ON assets(type, status)',
    description: '種類+ステータス検索の高速化'
  },
  
  // === ユーザー管理最適化 ===
  {
    name: 'ユーザー名インデックス（ユニーク）',
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    description: 'ユーザー名の一意性とログイン高速化'
  },
  {
    name: 'ユーザー 役割インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    description: '役割検索の高速化'
  },
  {
    name: 'ユーザー アクティブインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)',
    description: 'アクティブユーザー検索の高速化'
  },
  
  // === サービスリクエスト最適化 ===
  {
    name: 'サービスリクエスト ステータスインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status)',
    description: 'サービスリクエストステータス検索の高速化'
  },
  {
    name: 'サービスリクエスト 要求者インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_service_requests_requester ON service_requests(requester_id)',
    description: '要求者検索の高速化'
  },
  {
    name: 'サービスリクエスト 作成日インデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at)',
    description: '作成日ソートの高速化'
  },
  
  // === 変更管理最適化 ===
  {
    name: '変更管理 ステータスインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status)',
    description: '変更ステータス検索の高速化'
  },
  {
    name: '変更管理 リスクレベルインデックス',
    sql: 'CREATE INDEX IF NOT EXISTS idx_changes_risk_level ON changes(risk_level)',
    description: 'リスクレベル検索の高速化'
  },
  
  // === 統計更新 ===
  {
    name: '統計情報更新',
    sql: 'ANALYZE',
    description: 'インデックス統計の更新でクエリ最適化'
  },
  
  // === データベース最適化 ===
  {
    name: 'データベース整理',
    sql: 'VACUUM',
    description: 'データベースファイルの最適化と断片化解消'
  }
];

// 最適化実行
async function runOptimization() {
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`\n🔧 ${optimizationQueries.length} 項目の最適化を実行中...\n`);
  
  for (const [index, query] of optimizationQueries.entries()) {
    try {
      await new Promise((resolve, reject) => {
        db.run(query.sql, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      console.log(`✅ [${index + 1}/${optimizationQueries.length}] ${query.name}`);
      console.log(`   ${query.description}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ [${index + 1}/${optimizationQueries.length}] ${query.name}`);
      console.error(`   エラー: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 最適化結果:`);
  console.log(`   ✅ 成功: ${successCount} 項目`);
  console.log(`   ❌ 失敗: ${errorCount} 項目`);
  
  // データベース統計情報取得
  console.log(`\n📈 データベース統計情報:`);
  
  try {
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          (SELECT COUNT(*) FROM incidents) as incidents_count,
          (SELECT COUNT(*) FROM assets) as assets_count,
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM service_requests) as service_requests_count
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });
    
    console.log(`   インシデント: ${stats.incidents_count} 件`);
    console.log(`   資産: ${stats.assets_count} 件`);
    console.log(`   ユーザー: ${stats.users_count} 件`);
    console.log(`   サービスリクエスト: ${stats.service_requests_count} 件`);
    
  } catch (error) {
    console.error(`   統計情報取得エラー: ${error.message}`);
  }
  
  // インデックス一覧表示
  try {
    const indexes = await new Promise((resolve, reject) => {
      db.all(`
        SELECT name, tbl_name, sql 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n📋 作成されたインデックス一覧 (${indexes.length} 件):`);
    const tableGroups = {};
    
    indexes.forEach(idx => {
      if (!tableGroups[idx.tbl_name]) {
        tableGroups[idx.tbl_name] = [];
      }
      tableGroups[idx.tbl_name].push(idx.name);
    });
    
    Object.keys(tableGroups).forEach(table => {
      console.log(`   ${table}: ${tableGroups[table].join(', ')}`);
    });
    
  } catch (error) {
    console.error(`   インデックス情報取得エラー: ${error.message}`);
  }
}

// 実行
runOptimization()
  .then(() => {
    console.log('\n🎉 データベース最適化が完了しました!');
    db.close((err) => {
      if (err) {
        console.error('データベースクローズエラー:', err.message);
      } else {
        console.log('✅ データベース接続を終了しました');
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('\n💥 最適化中にエラーが発生しました:', error);
    db.close();
    process.exit(1);
  });