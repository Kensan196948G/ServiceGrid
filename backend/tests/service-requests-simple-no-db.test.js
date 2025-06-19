// DB非依存シンプルテスト
// ファイル存在・構造確認テスト

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

describe('サービス要求管理モジュール - ファイル構造テスト', () => {
    
    test('PowerShellファイルが存在する', () => {
        const workflowPath = path.join(__dirname, '../api/ServiceRequestWorkflow.ps1');
        const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
        
        assert.ok(fs.existsSync(workflowPath), 'ServiceRequestWorkflow.ps1が見つかりません');
        assert.ok(fs.existsSync(integrationPath), 'ServiceRequestIntegration.ps1が見つかりません');
        
        console.log('✅ PowerShellファイル存在確認');
    });
    
    test('PowerShellファイル内容確認', () => {
        const workflowPath = path.join(__dirname, '../api/ServiceRequestWorkflow.ps1');
        const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
        
        const workflowContent = fs.readFileSync(workflowPath, 'utf8');
        const integrationContent = fs.readFileSync(integrationPath, 'utf8');
        
        // 重要な関数が含まれているかチェック
        assert.ok(workflowContent.includes('Invoke-ServiceRequestApproval'), 'Invoke-ServiceRequestApproval関数が見つかりません');
        assert.ok(workflowContent.includes('Start-AutoProcessing'), 'Start-AutoProcessing関数が見つかりません');
        assert.ok(integrationContent.includes('New-ADUserFromServiceRequest'), 'New-ADUserFromServiceRequest関数が見つかりません');
        assert.ok(integrationContent.includes('Grant-ADGroupAccessFromRequest'), 'Grant-ADGroupAccessFromRequest関数が見つかりません');
        
        console.log('✅ PowerShellファイル内容確認完了');
    });
    
    test('スキーマファイルが存在する', () => {
        const schemaPath = path.join(__dirname, '../db/service-requests-enhanced-schema.sql');
        
        assert.ok(fs.existsSync(schemaPath), 'スキーマファイルが見つかりません');
        
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        assert.ok(schemaContent.includes('service_request_approvals'), 'service_request_approvalsテーブル定義が見つかりません');
        assert.ok(schemaContent.includes('windows_integration_jobs'), 'windows_integration_jobsテーブル定義が見つかりません');
        
        console.log('✅ スキーマファイル確認完了');
    });
    
    test('設計ドキュメントが存在する', () => {
        const designPath = path.join(__dirname, '../docs/ServiceRequestModule-PowerShell-Design.md');
        const summaryPath = path.join(__dirname, '../docs/Feature-D-PowerShell-ServiceRequest-Summary.md');
        
        assert.ok(fs.existsSync(designPath), '設計ドキュメントが見つかりません');
        assert.ok(fs.existsSync(summaryPath), 'サマリードキュメントが見つかりません');
        
        console.log('✅ 設計ドキュメント確認完了');
    });
    
    test('PowerShell関数構造確認', () => {
        const workflowPath = path.join(__dirname, '../api/ServiceRequestWorkflow.ps1');
        const workflowContent = fs.readFileSync(workflowPath, 'utf8');
        
        // 主要な設定・構造確認
        assert.ok(workflowContent.includes('$script:WorkflowConfig'), 'ワークフロー設定が見つかりません');
        assert.ok(workflowContent.includes('ApprovalLevels'), '承認レベル設定が見つかりません');
        assert.ok(workflowContent.includes('AutoProcessing'), '自動処理設定が見つかりません');
        assert.ok(workflowContent.includes('SLAHours'), 'SLA時間設定が見つかりません');
        
        console.log('✅ PowerShell設定構造確認完了');
    });
    
    test('Windows統合機能構造確認', () => {
        const integrationPath = path.join(__dirname, '../api/ServiceRequestIntegration.ps1');
        const integrationContent = fs.readFileSync(integrationPath, 'utf8');
        
        // 主要なWindows統合機能確認
        assert.ok(integrationContent.includes('New-ADUserFromServiceRequest'), 'ADユーザー作成機能が見つかりません');
        assert.ok(integrationContent.includes('Grant-ADGroupAccessFromRequest'), 'ADグループアクセス機能が見つかりません');
        assert.ok(integrationContent.includes('Install-SoftwareFromRequest'), 'ソフトウェアインストール機能が見つかりません');
        assert.ok(integrationContent.includes('Reset-UserPasswordFromRequest'), 'パスワードリセット機能が見つかりません');
        assert.ok(integrationContent.includes('New-TeamsChannelFromRequest'), 'Teams連携機能が見つかりません');
        
        console.log('✅ Windows統合機能構造確認完了');
    });
});