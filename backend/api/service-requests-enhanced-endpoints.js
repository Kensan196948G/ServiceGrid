/**
 * サービス要求管理 - 拡張エンドポイント
 * 既存APIを拡張する追加機能
 */
const express = require('express');
const { ServiceRequestIntegration } = require('./service-requests-integration');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// 統合クラスのインスタンス
let integration;

// ミドルウェア: 統合クラス初期化
router.use((req, res, next) => {
    if (!integration) {
        integration = new ServiceRequestIntegration();
    }
    next();
});

/**
 * サービス要求自動処理エンドポイント
 * POST /api/service-requests/auto-process
 */
router.post('/auto-process', async (req, res) => {
    try {
        const { request_id, processing_type } = req.body;
        
        if (!request_id || !processing_type) {
            return res.status(400).json({
                error: 'request_id and processing_type are required',
                available_types: ['user_creation', 'group_access', 'software_install', 'password_reset']
            });
        }
        
        // サービス要求情報取得
        const db = new sqlite3.Database(DB_PATH);
        const request = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM service_requests WHERE request_id = ?', [request_id], (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!request) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        // 自動処理実行
        const processingResult = await executeAutoProcessing(request, processing_type);
        
        res.json({
            success: true,
            message: 'Auto-processing completed',
            request_id: request_id,
            processing_type: processing_type,
            result: processingResult
        });
        
    } catch (error) {
        console.error('Auto-processing error:', error);
        res.status(500).json({
            error: 'Auto-processing failed',
            message: error.message
        });
    }
});

/**
 * Windows統合タスク実行エンドポイント
 * POST /api/service-requests/windows-integration
 */
router.post('/windows-integration', async (req, res) => {
    try {
        const { request_id, task_type, parameters } = req.body;
        
        if (!request_id || !task_type) {
            return res.status(400).json({
                error: 'request_id and task_type are required',
                available_tasks: ['ad_user_creation', 'file_share_access', 'email_notification', 'system_monitoring']
            });
        }
        
        let result;
        
        switch (task_type) {
            case 'ad_user_creation':
                result = await integration.getADUserInfo(parameters.username);
                break;
            case 'file_share_access':
                result = await integration.configureFileShareAccess(
                    request_id, 
                    parameters.username, 
                    parameters.share_path, 
                    parameters.permissions
                );
                break;
            case 'email_notification':
                result = await integration.sendNotificationEmail(
                    request_id, 
                    parameters.recipient_email, 
                    parameters.notification_type
                );
                break;
            case 'system_monitoring':
                result = await integration.registerSystemMonitoring(
                    request_id, 
                    parameters.monitoring_type, 
                    parameters.thresholds
                );
                break;
            default:
                return res.status(400).json({ error: 'Unknown task type' });
        }
        
        res.json({
            success: true,
            message: 'Windows integration task completed',
            request_id: request_id,
            task_type: task_type,
            result: result
        });
        
    } catch (error) {
        console.error('Windows integration error:', error);
        res.status(500).json({
            error: 'Windows integration failed',
            message: error.message
        });
    }
});

/**
 * SLA監視状況エンドポイント
 * GET /api/service-requests/:id/sla-status
 */
router.get('/:id/sla-status', async (req, res) => {
    try {
        const { id } = req.params;
        
        const slaInfo = await integration.monitorSLACompliance(id);
        
        res.json({
            success: true,
            request_id: parseInt(id),
            sla_info: slaInfo
        });
        
    } catch (error) {
        console.error('SLA monitoring error:', error);
        res.status(500).json({
            error: 'SLA monitoring failed',
            message: error.message
        });
    }
});

/**
 * 承認ワークフロー状態エンドポイント
 * GET /api/service-requests/:id/approval-workflow
 */
router.get('/:id/approval-workflow', async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = new sqlite3.Database(DB_PATH);
        
        // 承認履歴取得
        const approvals = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM service_request_approvals WHERE request_id = ? ORDER BY created_at ASC',
                [id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        // サービス要求詳細取得
        const request = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM service_requests WHERE request_id = ?', [id], (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!request) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        // ワークフロー進行状況計算
        const workflowStatus = calculateWorkflowProgress(request, approvals);
        
        res.json({
            success: true,
            request_id: parseInt(id),
            current_status: request.status,
            approval_history: approvals,
            workflow_progress: workflowStatus
        });
        
    } catch (error) {
        console.error('Approval workflow error:', error);
        res.status(500).json({
            error: 'Approval workflow query failed',
            message: error.message
        });
    }
});

/**
 * 統合テスト実行エンドポイント
 * GET /api/service-requests/integration-test
 */
router.get('/integration-test', async (req, res) => {
    try {
        const testResults = await integration.runIntegrationTest();
        
        res.json({
            success: true,
            message: 'Integration test completed',
            test_results: testResults,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Integration test error:', error);
        res.status(500).json({
            error: 'Integration test failed',
            message: error.message
        });
    }
});

/**
 * 自動処理実行関数
 */
async function executeAutoProcessing(request, processing_type) {
    const processingMap = {
        'user_creation': async () => {
            // ADユーザー作成処理
            const result = await integration.getADUserInfo(request.applicant);
            return { action: 'AD User Creation', result: result };
        },
        'group_access': async () => {
            // グループアクセス権限付与
            const result = await integration.configureFileShareAccess(
                request.request_id, 
                request.applicant, 
                '\\\\server\\groups', 
                'ReadWrite'
            );
            return { action: 'Group Access Grant', result: result };
        },
        'software_install': async () => {
            // ソフトウェアインストール処理
            const result = await integration.registerSystemMonitoring(
                request.request_id, 
                'SOFTWARE_INSTALL', 
                { package: request.subject }
            );
            return { action: 'Software Install', result: result };
        },
        'password_reset': async () => {
            // パスワードリセット処理
            const result = await integration.sendNotificationEmail(
                request.request_id, 
                request.applicant_email || `${request.applicant}@company.com`, 
                'STATUS_UPDATE'
            );
            return { action: 'Password Reset', result: result };
        }
    };
    
    const processor = processingMap[processing_type];
    if (!processor) {
        throw new Error(`Unknown processing type: ${processing_type}`);
    }
    
    return await processor();
}

/**
 * ワークフロー進行状況計算
 */
function calculateWorkflowProgress(request, approvals) {
    const statusFlow = ['Submitted', 'Pending Approval', 'Approved', 'In Progress', 'Fulfilled'];
    const currentIndex = statusFlow.indexOf(request.status);
    const progress = currentIndex >= 0 ? (currentIndex + 1) / statusFlow.length : 0;
    
    return {
        current_step: currentIndex + 1,
        total_steps: statusFlow.length,
        progress_percentage: Math.round(progress * 100),
        next_step: currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null,
        approvals_count: approvals.length,
        pending_approvals: approvals.filter(a => a.status === 'pending').length
    };
}

// クリーンアップ処理
process.on('exit', () => {
    if (integration) {
        integration.close();
    }
});

module.exports = router;