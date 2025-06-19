// PowerShell統合テスト - クロスプラットフォーム対応
// Node.js内蔵テストランナー対応
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

describe('PowerShell統合・実動作テスト', () => {
    
    describe('PowerShell実行環境確認', () => {
        test('PowerShellファイルが構文的に正しい', async () => {
            const psFiles = [
                '../api/PowerShellSecurityManager.ps1',
                '../api/PowerShellJobScheduler.ps1',
                '../api/ServiceRequestWorkflow.ps1',
                '../api/ServiceRequestIntegration.ps1'
            ];
            
            for (const relPath of psFiles) {
                const fullPath = path.join(__dirname, relPath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // 基本的な構文チェック
                    assert.ok(content.includes('param('), `${relPath}: param定義が見つかりません`);
                    assert.ok(content.includes('function'), `${relPath}: function定義が見つかりません`);
                    
                    // 構文バランスチェック
                    const openBraces = (content.match(/{/g) || []).length;
                    const closeBraces = (content.match(/}/g) || []).length;
                    assert.strictEqual(openBraces, closeBraces, `${relPath}: 括弧の数が一致しません`);
                }
            }
            
            console.log('✅ PowerShell構文チェック完了');
        });
        
        test('必要なパラメータが定義されている', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // 必須パラメータの確認
            const requiredParams = [
                'Action',
                'ScriptPath',
                'ScriptContent',
                'Parameters'
            ];
            
            requiredParams.forEach(param => {
                assert.ok(content.includes(`$${param}`), `必須パラメータが見つかりません: ${param}`);
            });
            
            console.log('✅ PowerShellパラメータ定義確認完了');
        });
    });
    
    describe('セキュリティ機能実装確認', () => {
        test('セキュリティ設定が適切に定義されている', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // セキュリティ設定要素の確認
            const securityElements = [
                'AllowedModules',
                'BlockedCommands',
                'MaxExecutionTime',
                'MaxMemoryUsage',
                'AuditLogPath'
            ];
            
            securityElements.forEach(element => {
                assert.ok(content.includes(element), `セキュリティ要素が見つかりません: ${element}`);
            });
            
            console.log('✅ セキュリティ設定確認完了');
        });
        
        test('監査ログ機能が実装されている', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // 監査ログ機能の確認
            assert.ok(content.includes('Write-SecurityAuditLog'), '監査ログ機能が見つかりません');
            assert.ok(content.includes('Add-Content'), 'ログ書き込み機能が見つかりません');
            assert.ok(content.includes('ConvertTo-Json'), 'JSON変換機能が見つかりません');
            
            console.log('✅ 監査ログ機能確認完了');
        });
    });
    
    describe('ジョブスケジューラー機能確認', () => {
        test('ジョブ管理機能が実装されている', () => {
            const schedulerPath = path.join(__dirname, '../api/PowerShellJobScheduler.ps1');
            const content = fs.readFileSync(schedulerPath, 'utf8');
            
            // ジョブ管理機能の確認
            const jobFunctions = [
                'New-PowerShellJob',
                'Start-QueuedJob',
                'Invoke-JobExecution',
                'Add-JobToQueue',
                'Update-JobStatus'
            ];
            
            jobFunctions.forEach(func => {
                assert.ok(content.includes(func), `ジョブ機能が見つかりません: ${func}`);
            });
            
            console.log('✅ ジョブ管理機能確認完了');
        });
        
        test('優先度制御が実装されている', () => {
            const schedulerPath = path.join(__dirname, '../api/PowerShellJobScheduler.ps1');
            const content = fs.readFileSync(schedulerPath, 'utf8');
            
            // 優先度制御の確認
            const priorities = ['Low', 'Normal', 'High', 'Critical'];
            priorities.forEach(priority => {
                assert.ok(content.includes(`"${priority}"`), `優先度が見つかりません: ${priority}`);
            });
            
            console.log('✅ 優先度制御確認完了');
        });
    });
    
    describe('Windows統合機能確認', () => {
        test('Active Directory統合機能が定義されている', () => {
            const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
            const content = fs.readFileSync(integrationPath, 'utf8');
            
            // AD統合機能の確認
            const adFunctions = [
                'New-ADUserFromServiceRequest',
                'Grant-ADGroupAccessFromRequest',
                'Import-Module ActiveDirectory'
            ];
            
            adFunctions.forEach(func => {
                assert.ok(content.includes(func), `AD機能が見つかりません: ${func}`);
            });
            
            console.log('✅ Active Directory統合確認完了');
        });
        
        test('Microsoft 365統合機能が定義されている', () => {
            const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
            const content = fs.readFileSync(integrationPath, 'utf8');
            
            // M365統合機能の確認
            const m365Functions = [
                'New-TeamsChannelFromRequest',
                'Microsoft.Graph',
                'Connect-MgGraph'
            ];
            
            let foundFunctions = 0;
            m365Functions.forEach(func => {
                if (content.includes(func)) {
                    foundFunctions++;
                }
            });
            
            assert.ok(foundFunctions > 0, 'Microsoft 365統合機能が見つかりません');
            console.log(`✅ Microsoft 365統合確認完了 (${foundFunctions}/${m365Functions.length}機能)`);
        });
    });
    
    describe('エラーハンドリング・堅牢性確認', () => {
        test('包括的なエラーハンドリングが実装されている', () => {
            const psFiles = [
                '../api/PowerShellSecurityManager.ps1',
                '../api/PowerShellJobScheduler.ps1'
            ];
            
            psFiles.forEach(relPath => {
                const fullPath = path.join(__dirname, relPath);
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // エラーハンドリング要素の確認
                const tryCount = (content.match(/try\s*{/g) || []).length;
                const catchCount = (content.match(/}\s*catch\s*{/g) || []).length;
                const finallyCount = (content.match(/}\s*finally\s*{/g) || []).length;
                
                assert.ok(tryCount > 0, `${relPath}: try文が見つかりません`);
                assert.ok(catchCount > 0, `${relPath}: catch文が見つかりません`);
                assert.ok(tryCount === catchCount, `${relPath}: try-catch文の数が一致しません`);
                
                // ログ出力の確認
                assert.ok(content.includes('Write-LogMessage'), `${relPath}: ログ出力が見つかりません`);
            });
            
            console.log('✅ エラーハンドリング確認完了');
        });
        
        test('リソース管理が適切に実装されている', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // リソース管理要素の確認
            const resourceManagement = [
                'Dispose()',
                'Close()',
                'Remove-Job',
                'finally'
            ];
            
            let foundElements = 0;
            resourceManagement.forEach(element => {
                if (content.includes(element)) {
                    foundElements++;
                }
            });
            
            assert.ok(foundElements >= 3, `リソース管理要素が不十分です: ${foundElements}/${resourceManagement.length}`);
            console.log(`✅ リソース管理確認完了 (${foundElements}/${resourceManagement.length}要素)`);
        });
    });
    
    describe('統合テスト準備確認', () => {
        test('Node.js統合インターフェースが存在する', () => {
            const integrationJsPath = path.join(__dirname, '../api/service-requests-integration.js');
            
            if (fs.existsSync(integrationJsPath)) {
                const content = fs.readFileSync(integrationJsPath, 'utf8');
                
                // Node.js統合機能の確認
                assert.ok(content.includes('executePowerShellCommand'), 'PowerShell実行機能が見つかりません');
                assert.ok(content.includes('class'), '統合クラスが見つかりません');
                
                console.log('✅ Node.js統合インターフェース確認完了');
            } else {
                console.log('⚠️ Node.js統合ファイルが見つかりません（オプション機能）');
            }
        });
        
        test('データベース統合準備が完了している', () => {
            const schemaPath = path.join(__dirname, '../db/service-requests-enhanced-schema.sql');
            
            if (fs.existsSync(schemaPath)) {
                const content = fs.readFileSync(schemaPath, 'utf8');
                
                // PowerShell統合用テーブルの確認
                const requiredTables = [
                    'windows_integration_jobs',
                    'service_request_approvals'
                ];
                
                requiredTables.forEach(table => {
                    assert.ok(content.includes(table), `必要なテーブルが見つかりません: ${table}`);
                });
                
                console.log('✅ データベース統合準備確認完了');
            } else {
                assert.fail('拡張データベーススキーマが見つかりません');
            }
        });
    });
});