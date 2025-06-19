// サービス要求管理モジュール - データベーススキーマ適用スクリプト
// PowerShell統合対応版

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db/itsm.sqlite');
const SCHEMA_PATH = path.join(__dirname, '../db/service-requests-enhanced-schema.sql');

console.log('🚀 サービス要求管理モジュール - スキーマ適用開始');
console.log(`DB Path: ${DB_PATH}`);
console.log(`Schema Path: ${SCHEMA_PATH}`);

// データベース接続
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ データベース接続エラー:', err.message);
        process.exit(1);
    }
    console.log('✅ データベースに接続しました');
});

// スキーマファイル読み込み
let schemaSQL;
try {
    schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log('✅ スキーマファイルを読み込みました');
} catch (err) {
    console.error('❌ スキーマファイル読み込みエラー:', err.message);
    db.close();
    process.exit(1);
}

// SQLステートメントを分割実行
const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

console.log(`📊 実行予定SQLステートメント数: ${statements.length}`);

let executedCount = 0;
let errorCount = 0;

// シリアル実行関数
function executeStatement(index) {
    if (index >= statements.length) {
        // 全て完了
        console.log(`\n🎉 スキーマ適用完了！`);
        console.log(`✅ 成功: ${executedCount}件`);
        console.log(`❌ エラー: ${errorCount}件`);
        
        // テーブル存在確認
        verifyTables();
        return;
    }
    
    const statement = statements[index].trim();
    if (statement.length === 0) {
        executeStatement(index + 1);
        return;
    }
    
    db.run(statement + ';', (err) => {
        if (err) {
            if (err.message.includes('duplicate column name') || 
                err.message.includes('table') && err.message.includes('already exists')) {
                console.log(`⚠️  スキップ (既存): ${statement.substring(0, 50)}...`);
            } else {
                console.error(`❌ エラー: ${err.message}`);
                console.error(`   SQL: ${statement.substring(0, 100)}...`);
                errorCount++;
            }
        } else {
            console.log(`✅ 実行完了: ${statement.substring(0, 50)}...`);
            executedCount++;
        }
        
        executeStatement(index + 1);
    });
}

// テーブル存在確認
function verifyTables() {
    const expectedTables = [
        'service_request_approvals',
        'windows_integration_jobs', 
        'service_request_types'
    ];
    
    console.log('\n🔍 テーブル存在確認:');
    
    let verifiedCount = 0;
    
    expectedTables.forEach(tableName => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) {
                console.error(`❌ ${tableName}: 確認エラー - ${err.message}`);
            } else if (row) {
                console.log(`✅ ${tableName}: 存在確認`);
            } else {
                console.log(`❌ ${tableName}: 見つかりません`);
            }
            
            verifiedCount++;
            if (verifiedCount === expectedTables.length) {
                // 初期データ確認
                verifyInitialData();
            }
        });
    });
}

// 初期データ確認
function verifyInitialData() {
    console.log('\n📋 初期データ確認:');
    
    db.all('SELECT COUNT(*) as count FROM service_request_types', (err, rows) => {
        if (err) {
            console.error('❌ 初期データ確認エラー:', err.message);
        } else {
            const count = rows[0].count;
            console.log(`✅ service_request_types: ${count}件のデータが投入されています`);
        }
        
        // サンプルデータ表示
        db.all('SELECT type_name, display_name, powershell_integration FROM service_request_types LIMIT 3', (err, rows) => {
            if (err) {
                console.error('❌ サンプルデータ取得エラー:', err.message);
            } else {
                console.log('\n📄 サンプルデータ:');
                rows.forEach(row => {
                    console.log(`   ${row.type_name}: ${row.display_name} (PS統合: ${row.powershell_integration ? 'Yes' : 'No'})`);
                });
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ データベース切断エラー:', err.message);
                } else {
                    console.log('\n✅ データベース切断完了');
                    console.log('🎯 スキーマ適用プロセス正常終了');
                }
            });
        });
    });
}

// 実行開始
executeStatement(0);