// Node.js 内蔵テストランナー用シンプルテスト
// サービス要求管理モジュール基本機能テスト

const { test, describe } = require('node:test');
const assert = require('node:assert');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../db/itsm.sqlite');

describe('サービス要求管理モジュール - 基本テスト', () => {
    
    test('データベースファイルが存在する', () => {
        assert.ok(fs.existsSync(DB_PATH), 'データベースファイルが見つかりません');
        console.log('✅ データベースファイル存在確認');
    });
    
    test('PowerShellファイルが存在する', () => {
        const workflowPath = path.join(__dirname, '../api/ServiceRequestWorkflow.ps1');
        const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
        
        assert.ok(fs.existsSync(workflowPath), 'ServiceRequestWorkflow.ps1が見つかりません');
        assert.ok(fs.existsSync(integrationPath), 'ServiceRequestIntegration.ps1が見つかりません');
        
        console.log('✅ PowerShellファイル存在確認');
    });
    
    test('データベーステーブル確認', async () => {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const expectedTables = [
                    'service_request_approvals',
                    'windows_integration_jobs',
                    'service_request_types'
                ];
                
                let checkedCount = 0;
                
                expectedTables.forEach(tableName => {
                    db.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                        [tableName],
                        (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            assert.ok(row, `テーブル ${tableName} が見つかりません`);
                            console.log(`✅ テーブル確認: ${tableName}`);
                            
                            checkedCount++;
                            if (checkedCount === expectedTables.length) {
                                db.close();
                                resolve();
                            }
                        }
                    );
                });
            });
        });
    });
    
    test('サービス要求種別マスタデータ確認', async () => {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                db.get(
                    "SELECT COUNT(*) as count FROM service_request_types",
                    (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        assert.ok(row.count > 0, 'サービス要求種別データが存在しません');
                        console.log(`✅ サービス要求種別: ${row.count}件確認`);
                        
                        db.close();
                        resolve();
                    }
                );
            });
        });
    });
    
    test('PowerShell統合対応種別確認', async () => {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                db.all(
                    "SELECT type_name FROM service_request_types WHERE powershell_integration = 1",
                    (err, rows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        assert.ok(rows.length > 0, 'PowerShell統合対応種別が存在しません');
                        
                        const typeNames = rows.map(row => row.type_name);
                        assert.ok(typeNames.includes('user_creation'), 'user_creation種別が見つかりません');
                        assert.ok(typeNames.includes('group_access'), 'group_access種別が見つかりません');
                        
                        console.log('✅ PowerShell統合対応種別:', typeNames);
                        
                        db.close();
                        resolve();
                    }
                );
            });
        });
    });
});