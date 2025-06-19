// PowerShellセキュリティ・パフォーマンステスト
// Node.js内蔵テストランナー対応 - 依存関係最適化版
const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { validatePowerShellFile, validateSQLFile, checkDangerousPatterns, validateFilePerformance, extendedAssert } = require('../utils/testHelpers');

describe('PowerShellセキュリティ・品質テスト', () => {
    
    describe('PowerShellファイル構造・品質確認', () => {
        test('PowerShellSecurityManager.ps1が存在し、適切な構造を持つ', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            assert.ok(fs.existsSync(securityManagerPath), 'PowerShellSecurityManager.ps1が見つかりません');
            
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // 重要な関数の存在確認
            assert.ok(content.includes('Test-ScriptSecurity'), 'Test-ScriptSecurity関数が見つかりません');
            assert.ok(content.includes('Invoke-SecurePowerShellScript'), 'Invoke-SecurePowerShellScript関数が見つかりません');
            assert.ok(content.includes('Write-SecurityAuditLog'), 'Write-SecurityAuditLog関数が見つかりません');
            assert.ok(content.includes('Test-ModuleSecurity'), 'Test-ModuleSecurity関数が見つかりません');
            
            // セキュリティ設定の確認
            assert.ok(content.includes('$script:SecurityConfig'), 'セキュリティ設定が見つかりません');
            assert.ok(content.includes('AllowedModules'), 'AllowedModules設定が見つかりません');
            assert.ok(content.includes('BlockedCommands'), 'BlockedCommands設定が見つかりません');
            
            console.log('✅ PowerShellSecurityManager.ps1構造確認完了');
        });
        
        test('PowerShellJobScheduler.ps1が存在し、適切な構造を持つ', () => {
            const schedulerPath = path.join(__dirname, '../api/PowerShellJobScheduler.ps1');
            assert.ok(fs.existsSync(schedulerPath), 'PowerShellJobScheduler.ps1が見つかりません');
            
            const content = fs.readFileSync(schedulerPath, 'utf8');
            
            // 重要な関数の存在確認
            assert.ok(content.includes('New-PowerShellJob'), 'New-PowerShellJob関数が見つかりません');
            assert.ok(content.includes('Start-QueuedJob'), 'Start-QueuedJob関数が見つかりません');
            assert.ok(content.includes('Invoke-JobExecution'), 'Invoke-JobExecution関数が見つかりません');
            assert.ok(content.includes('Add-JobToQueue'), 'Add-JobToQueue関数が見つかりません');
            
            // ジョブ管理設定の確認
            assert.ok(content.includes('$script:JobConfig'), 'ジョブ設定が見つかりません');
            assert.ok(content.includes('MaxConcurrentJobs'), 'MaxConcurrentJobs設定が見つかりません');
            assert.ok(content.includes('JobRetentionDays'), 'JobRetentionDays設定が見つかりません');
            
            console.log('✅ PowerShellJobScheduler.ps1構造確認完了');
        });
        
        test('サービス要求統合APIファイルが存在する', () => {
            const integrationPath = path.join(__dirname, '../api/ServiceRequestWorkflow.ps1');
            const windowsPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
            
            assert.ok(fs.existsSync(integrationPath), 'ServiceRequestWorkflow.ps1が見つかりません');
            assert.ok(fs.existsSync(windowsPath), 'ServiceRequestIntegration.ps1が見つかりません');
            
            const workflowContent = fs.readFileSync(integrationPath, 'utf8');
            const integrationContent = fs.readFileSync(windowsPath, 'utf8');
            
            // ワークフロー機能確認
            assert.ok(workflowContent.includes('Invoke-ServiceRequestApproval'), '承認機能が見つかりません');
            assert.ok(workflowContent.includes('Start-AutoProcessing'), '自動処理機能が見つかりません');
            
            // Windows統合機能確認
            assert.ok(integrationContent.includes('New-ADUserFromServiceRequest'), 'ADユーザー作成機能が見つかりません');
            assert.ok(integrationContent.includes('Grant-ADGroupAccessFromRequest'), 'ADグループアクセス機能が見つかりません');
            
            console.log('✅ サービス要求統合API確認完了');
        });
    });
    
    describe('PowerShellスクリプトセキュリティ検証', () => {
        test('危険なコマンドが含まれていない', () => {
            const psFiles = [
                '../api/PowerShellSecurityManager.ps1',
                '../api/PowerShellJobScheduler.ps1',
                '../api/ServiceRequestWorkflow.ps1',
                '../api/ServiceRequestIntegration.ps1'
            ];
            
            const dangerousPatterns = [
                /Invoke-Expression\s*\$[^.]/, // 変数を使ったInvoke-Expression（危険）
                /iex\s/i,
                /cmd\.exe/i,
                /powershell\.exe.*-enc/i,  // エンコードされたコマンド
                /DownloadString/i,
                /DownloadFile/i,
                /Reflection\.Assembly.*Load/i
            ];
            
            psFiles.forEach(relPath => {
                const fullPath = path.join(__dirname, relPath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const securityResult = checkDangerousPatterns(content, dangerousPatterns);
                    
                    extendedAssert.isSecure(securityResult, `セキュリティ問題検出 in ${relPath}`);
                }
            });
            
            console.log('✅ PowerShellセキュリティパターン検証完了');
        });
        
        test('適切なエラーハンドリングが実装されている', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // try-catch文の存在確認
            const tryCount = (content.match(/try\s*{/g) || []).length;
            const catchCount = (content.match(/}\s*catch\s*{/g) || []).length;
            
            assert.ok(tryCount > 0, 'try文が見つかりません');
            assert.ok(catchCount > 0, 'catch文が見つかりません');
            assert.ok(tryCount === catchCount, 'try-catch文の数が一致しません');
            
            // エラーログ記録の確認
            assert.ok(content.includes('Write-LogMessage'), 'ログ記録機能が見つかりません');
            assert.ok(content.includes('Write-SecurityAuditLog'), 'セキュリティ監査ログが見つかりません');
            
            console.log('✅ エラーハンドリング実装確認完了');
        });
    });
    
    describe('パフォーマンス・効率性テスト', () => {
        test('PowerShellファイルサイズが適切', () => {
            const psFiles = fs.readdirSync(path.join(__dirname, '../api'))
                .filter(file => file.endsWith('.ps1'))
                .map(file => path.join(__dirname, '../api', file));
            
            psFiles.forEach(filePath => {
                const perfResult = validateFilePerformance(filePath, {
                    maxSizeKB: 500,
                    minSizeKB: 1,
                    maxLines: 1000
                });
                
                extendedAssert.withinLimits(perfResult, `${path.basename(filePath)} パフォーマンス制限違反`);
            });
            
            console.log(`✅ PowerShellファイルサイズ確認完了 (${psFiles.length}ファイル)`);
        });
        
        test('メモリ効率的なコーディングパターン', () => {
            const securityManagerPath = path.join(__dirname, '../api/PowerShellSecurityManager.ps1');
            const content = fs.readFileSync(securityManagerPath, 'utf8');
            
            // メモリリーク防止パターンの確認
            assert.ok(content.includes('$runspace.Close()'), 'Runspaceクローズ処理が見つかりません');
            assert.ok(content.includes('Remove-Job'), 'ジョブクリーンアップが見つかりません');
            assert.ok(content.includes('Dispose()'), 'リソース解放処理が見つかりません');
            
            // 大量データ処理の最適化確認
            assert.ok(content.includes('MaxMemoryUsage'), 'メモリ使用量制限が見つかりません');
            assert.ok(content.includes('MaxExecutionTime'), '実行時間制限が見つかりません');
            
            console.log('✅ メモリ効率性パターン確認完了');
        });
    });
    
    describe('Windows統合機能テスト', () => {
        test('Active Directory統合コード品質', () => {
            const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
            const content = fs.readFileSync(integrationPath, 'utf8');
            
            // AD操作の安全性確認
            assert.ok(content.includes('Import-Module ActiveDirectory'), 'ADモジュールインポートが見つかりません');
            assert.ok(content.includes('Get-ADUser'), 'ADユーザー取得機能が見つかりません');
            assert.ok(content.includes('ErrorAction'), 'エラーアクション指定が見つかりません');
            
            // セキュリティ確認
            assert.ok(content.includes('Write-SecurityAuditLog'), 'AD操作監査ログが見つかりません');
            assert.ok(content.includes('Test-Path'), 'パス存在確認が見つかりません');
            
            console.log('✅ Active Directory統合品質確認完了');
        });
        
        test('Microsoft 365統合コード品質', () => {
            const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
            const content = fs.readFileSync(integrationPath, 'utf8');
            
            // Microsoft Graph統合確認
            assert.ok(content.includes('Microsoft.Graph') || content.includes('Connect-MgGraph'), 'Graph統合が見つかりません');
            assert.ok(content.includes('New-TeamsChannelFromRequest'), 'Teams統合機能が見つかりません');
            
            // エラー処理確認
            assert.ok(content.includes('try') && content.includes('catch'), 'エラーハンドリングが不十分です');
            
            console.log('✅ Microsoft 365統合品質確認完了');
        });
    });
    
    describe('統合システム互換性テスト', () => {
        test('Node.js統合モジュールとの互換性', () => {
            const integrationJsPath = path.join(__dirname, '../api/service-requests-integration.js');
            
            if (fs.existsSync(integrationJsPath)) {
                const content = fs.readFileSync(integrationJsPath, 'utf8');
                
                // PowerShell実行機能の確認
                assert.ok(content.includes('executePowerShellCommand'), 'PowerShell実行機能が見つかりません');
                assert.ok(content.includes('ServiceRequestIntegration'), '統合クラスが見つかりません');
                
                // エラー処理の確認
                assert.ok(content.includes('try') && content.includes('catch'), 'エラーハンドリングが見つかりません');
                
                console.log('✅ Node.js統合互換性確認完了');
            }
        });
        
        test('データベーススキーマとの整合性', () => {
            const schemaPath = path.join(__dirname, '../db/service-requests-enhanced-schema.sql');
            
            if (fs.existsSync(schemaPath)) {
                const content = fs.readFileSync(schemaPath, 'utf8');
                
                // PowerShell統合に必要なテーブル確認
                assert.ok(content.includes('windows_integration_jobs'), 'PowerShellジョブテーブルが見つかりません');
                assert.ok(content.includes('service_request_approvals'), '承認テーブルが見つかりません');
                assert.ok(content.includes('powershell_job_id'), 'PowerShellジョブID列が見つかりません');
                
                console.log('✅ データベーススキーマ整合性確認完了');
            }
        });
    });
});