/**
 * クイック統合テスト - Jest不要版
 * Node.js標準機能のみ使用
 */
const { ServiceRequestIntegration } = require('../api/service-requests-integration');
const path = require('path');

async function runQuickTests() {
    console.log('🚀 Quick Integration Test Started');
    console.log('================================');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    function test(name, testFn) {
        results.total++;
        console.log(`\n🧪 Running: ${name}`);
        
        try {
            const result = testFn();
            if (result === true || result === undefined) {
                console.log(`✅ PASSED: ${name}`);
                results.passed++;
            } else {
                console.log(`❌ FAILED: ${name} - ${result}`);
                results.failed++;
                results.errors.push(`${name}: ${result}`);
            }
        } catch (error) {
            console.log(`💥 ERROR: ${name} - ${error.message}`);
            results.failed++;
            results.errors.push(`${name}: ${error.message}`);
        }
    }
    
    function testAsync(name, testFn) {
        results.total++;
        console.log(`\n🧪 Running: ${name}`);
        
        return testFn()
            .then(result => {
                if (result === true || result === undefined) {
                    console.log(`✅ PASSED: ${name}`);
                    results.passed++;
                } else {
                    console.log(`❌ FAILED: ${name} - ${result}`);
                    results.failed++;
                    results.errors.push(`${name}: ${result}`);
                }
            })
            .catch(error => {
                console.log(`💥 ERROR: ${name} - ${error.message}`);
                results.failed++;
                results.errors.push(`${name}: ${error.message}`);
            });
    }
    
    // テスト実行
    let integration;
    
    try {
        // 1. インスタンス作成テスト
        test('ServiceRequestIntegration インスタンス作成', () => {
            integration = new ServiceRequestIntegration();
            return integration !== null;
        });
        
        // 2. データベース接続テスト
        await testAsync('データベース接続テスト', async () => {
            const userInfo = await integration.getLocalUserInfo('admin');
            return userInfo !== null;
        });
        
        // 3. PowerShell環境チェック
        await testAsync('PowerShell環境チェック', async () => {
            try {
                const result = await integration.executePowerShellCommand('Test-PowerShellIntegration');
                return true;
            } catch (error) {
                console.log(`⚠️  PowerShell環境なし (${error.message})`);
                results.skipped++;
                return 'SKIPPED - PowerShell環境なし';
            }
        });
        
        // 4. スキーマ適用確認
        await testAsync('スキーマ適用確認', async () => {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./db/itsm.sqlite');
            
            return new Promise((resolve) => {
                db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'service_request%'", (err, rows) => {
                    db.close();
                    if (err) {
                        resolve(false);
                    } else {
                        const expectedTables = ['service_requests', 'service_request_approvals', 'service_request_types'];
                        const actualTables = rows.map(row => row.name);
                        const hasAllTables = expectedTables.every(table => actualTables.includes(table));
                        resolve(hasAllTables);
                    }
                });
            });
        });
        
        // 5. API統合機能テスト
        await testAsync('API統合機能テスト', async () => {
            const testResults = await integration.runIntegrationTest();
            return testResults !== null;
        });
        
        // 6. Windows統合機能テスト（環境依存）
        await testAsync('Windows統合機能テスト', async () => {
            try {
                if (process.platform === 'win32') {
                    const result = await integration.configureFileShareAccess(999, 'testuser', '\\\\server\\share', 'ReadOnly');
                    return result.Status === 200;
                } else {
                    console.log(`⚠️  Windows環境ではないためスキップ`);
                    results.skipped++;
                    return 'SKIPPED - 非Windows環境';
                }
            } catch (error) {
                console.log(`⚠️  Windows統合機能利用不可 (${error.message})`);
                results.skipped++;
                return 'SKIPPED - Windows統合機能利用不可';
            }
        });
        
    } finally {
        if (integration) {
            integration.close();
        }
    }
    
    // 結果サマリー
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / (results.total - results.skipped)) * 100)}%`);
    
    if (results.errors.length > 0) {
        console.log('\n💥 Errors:');
        results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🏁 Quick Integration Test Completed');
    
    return results;
}

if (require.main === module) {
    runQuickTests().catch(console.error);
}

module.exports = { runQuickTests };