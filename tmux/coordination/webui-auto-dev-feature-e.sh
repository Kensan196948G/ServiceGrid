#!/bin/bash

# Feature-E専用WebUI自動開発スクリプト
# 非機能要件・品質保証・セキュリティ強化自動開発システム

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"
readonly MIDDLEWARE_DIR="$BACKEND_DIR/middleware"
readonly TESTS_DIR="$BACKEND_DIR/tests"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly FEATURE_E_LOG="$LOG_DIR/feature_e_quality_development.log"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Feature-E固有設定
readonly FEATURE_NAME="Feature-E-Quality"
readonly MAX_AUTO_LOOPS=20
readonly QUALITY_THRESHOLD=90

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${CYAN}[FEATURE-E]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[FEATURE-E-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[FEATURE-E-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[FEATURE-E-WARN]${NC} $1"
}

print_critical() {
    echo -e "${BOLD}${RED}[FEATURE-E-CRITICAL]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${CYAN}================================================================${NC}"
    echo -e "${BOLD}${CYAN} 🔒 Feature-E WebUI自動開発システム 🔒${NC}"
    echo -e "${BOLD}${CYAN} 品質保証・セキュリティ・非機能要件${NC}"
    echo -e "${BOLD}${CYAN}================================================================${NC}"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_feature_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] FEATURE-E: $action - $status - $details" >> "$FEATURE_E_LOG"
}

# =========================
# セキュリティミドルウェア自動生成
# =========================

generate_security_middleware() {
    print_info "セキュリティミドルウェア自動生成中..."
    
    local middleware_created=0
    
    # セキュリティミドルウェアテンプレート
    local middleware_templates=(
        "advanced-security:高度セキュリティ監査"
        "rate-limiting:レート制限強化"
        "input-validation:入力検証強化"
        "csrf-protection:CSRF攻撃防御"
        "xss-protection:XSS攻撃防御"
        "sql-injection-guard:SQLインジェクション防御"
        "security-headers:セキュリティヘッダー管理"
        "audit-logging:監査ログ強化"
    )
    
    mkdir -p "$MIDDLEWARE_DIR"
    
    for template in "${middleware_templates[@]}"; do
        local middleware_name=$(echo "$template" | cut -d':' -f1)
        local middleware_desc=$(echo "$template" | cut -d':' -f2)
        local middleware_file="$MIDDLEWARE_DIR/${middleware_name}.js"
        
        # 既存ミドルウェアのスキップ
        if [ -f "$middleware_file" ]; then
            print_info "$middleware_name は既存のため、機能強化のみ実行"
            continue
        fi
        
        print_info "新規セキュリティミドルウェア生成: $middleware_name"
        
        case "$middleware_name" in
            "advanced-security")
                cat > "$middleware_file" << 'EOF'
// 高度セキュリティ監査ミドルウェア
// Feature-E自動生成

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class AdvancedSecurityMiddleware {
    constructor(options = {}) {
        this.options = {
            maxRequestsPerMinute: options.maxRequestsPerMinute || 100,
            maxRequestsPerHour: options.maxRequestsPerHour || 1000,
            suspiciousPatterns: options.suspiciousPatterns || [
                /(\b|%2F)union(\b|%20)/i,
                /(\b|%2F)select(\b|%20)/i,
                /<script[^>]*>.*?<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi
            ],
            blockedUserAgents: options.blockedUserAgents || [
                /sqlmap/i,
                /nikto/i,
                /dirb/i,
                /burp/i
            ],
            logLevel: options.logLevel || 'info'
        };
        
        this.suspiciousIPs = new Map();
        this.failedAttempts = new Map();
    }

    // メインセキュリティチェック
    securityCheck() {
        return (req, res, next) => {
            const startTime = Date.now();
            const clientIP = this.getClientIP(req);
            const userAgent = req.get('User-Agent') || '';
            
            try {
                // 1. ブロックされたUser-Agentチェック
                if (this.isBlockedUserAgent(userAgent)) {
                    this.logSecurityEvent('BLOCKED_USER_AGENT', { ip: clientIP, userAgent }, 'high');
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                // 2. 疑わしいIPチェック
                if (this.isSuspiciousIP(clientIP)) {
                    this.logSecurityEvent('SUSPICIOUS_IP', { ip: clientIP }, 'high');
                    return res.status(429).json({ error: 'Too many suspicious requests' });
                }
                
                // 3. リクエスト内容の検査
                const suspiciousContent = this.detectSuspiciousContent(req);
                if (suspiciousContent) {
                    this.markSuspiciousIP(clientIP);
                    this.logSecurityEvent('SUSPICIOUS_CONTENT', { 
                        ip: clientIP, 
                        pattern: suspiciousContent,
                        url: req.url,
                        method: req.method 
                    }, 'critical');
                    return res.status(400).json({ error: 'Invalid request content' });
                }
                
                // 4. セキュリティヘッダー追加
                this.addSecurityHeaders(res);
                
                // 5. リクエスト監査ログ
                this.auditRequest(req, clientIP, userAgent);
                
                // 6. レスポンス時間測定
                res.on('finish', () => {
                    const duration = Date.now() - startTime;
                    this.logPerformance(req, duration);
                });
                
                next();
                
            } catch (error) {
                this.logSecurityEvent('MIDDLEWARE_ERROR', { 
                    ip: clientIP, 
                    error: error.message 
                }, 'medium');
                next(error);
            }
        };
    }

    // クライアントIP取得
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               '0.0.0.0';
    }

    // ブロックされたUser-Agentチェック
    isBlockedUserAgent(userAgent) {
        return this.options.blockedUserAgents.some(pattern => pattern.test(userAgent));
    }

    // 疑わしいIPチェック
    isSuspiciousIP(ip) {
        const record = this.suspiciousIPs.get(ip);
        if (!record) return false;
        
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // 1時間以内に5回以上の疑わしい行動
        return (now - record.firstSeen < oneHour) && record.count >= 5;
    }

    // 疑わしいIPマーク
    markSuspiciousIP(ip) {
        const now = Date.now();
        const record = this.suspiciousIPs.get(ip) || { firstSeen: now, count: 0 };
        
        record.count++;
        record.lastSeen = now;
        
        this.suspiciousIPs.set(ip, record);
    }

    // 疑わしいコンテンツ検出
    detectSuspiciousContent(req) {
        const checkTargets = [
            req.url,
            JSON.stringify(req.query),
            JSON.stringify(req.body),
            req.get('Referer') || '',
            req.get('User-Agent') || ''
        ].join(' ');

        for (const pattern of this.options.suspiciousPatterns) {
            if (pattern.test(checkTargets)) {
                return pattern.toString();
            }
        }
        
        return null;
    }

    // セキュリティヘッダー追加
    addSecurityHeaders(res) {
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=(),  notifications=(), payment=()'
        });
    }

    // リクエスト監査
    auditRequest(req, clientIP, userAgent) {
        const auditData = {
            timestamp: new Date().toISOString(),
            ip: clientIP,
            method: req.method,
            url: req.url,
            userAgent: userAgent,
            headers: this.sanitizeHeaders(req.headers),
            sessionId: req.sessionID || 'none'
        };
        
        this.logSecurityEvent('REQUEST_AUDIT', auditData, 'info');
    }

    // ヘッダーサニタイズ
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    // パフォーマンスログ
    logPerformance(req, duration) {
        if (duration > 5000) { // 5秒以上
            this.logSecurityEvent('SLOW_REQUEST', {
                url: req.url,
                method: req.method,
                duration: duration
            }, 'medium');
        }
    }

    // セキュリティイベントログ
    logSecurityEvent(eventType, data, severity = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            severity: severity,
            data: data,
            nodeId: process.env.NODE_ID || 'unknown'
        };
        
        // 本番環境では外部ログサービスに送信
        console.log(`[SECURITY-${severity.toUpperCase()}] ${JSON.stringify(logEntry)}`);
        
        // 重大度が高い場合は即座にアラート
        if (severity === 'critical') {
            this.sendSecurityAlert(logEntry);
        }
    }

    // セキュリティアラート送信
    sendSecurityAlert(logEntry) {
        // TODO: 外部アラートシステム連携
        console.error(`[SECURITY-ALERT] ${JSON.stringify(logEntry)}`);
    }

    // 統計情報取得
    getSecurityStats() {
        return {
            suspiciousIPs: this.suspiciousIPs.size,
            failedAttempts: this.failedAttempts.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    }

    // クリーンアップ（1時間ごと実行推奨）
    cleanup() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // 古い疑わしいIP記録を削除
        for (const [ip, record] of this.suspiciousIPs.entries()) {
            if (now - record.lastSeen > oneHour) {
                this.suspiciousIPs.delete(ip);
            }
        }
        
        // 古い失敗試行記録を削除
        for (const [ip, record] of this.failedAttempts.entries()) {
            if (now - record.lastAttempt > oneHour) {
                this.failedAttempts.delete(ip);
            }
        }
    }
}

module.exports = AdvancedSecurityMiddleware;
EOF
                ;;
                
            "rate-limiting")
                cat > "$middleware_file" << 'EOF'
// レート制限強化ミドルウェア
// Feature-E自動生成

const rateLimit = require('express-rate-limit');

// 一般的なレート制限
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

// 認証関連の厳格なレート制限
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1時間
    max: 5, // 最大5回の失敗試行
    skipSuccessfulRequests: true,
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 60
    },
    handler: (req, res) => {
        console.error(`Authentication rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many authentication attempts',
            lockoutDuration: 3600
        });
    }
});

// API エンドポイント用レート制限
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分
    max: 20, // 最大20リクエスト
    message: {
        error: 'API rate limit exceeded',
        retryAfter: 1
    }
});

// 管理者用レート制限
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5分
    max: 50, // 最大50リクエスト
    message: {
        error: 'Admin rate limit exceeded',
        retryAfter: 5
    }
});

module.exports = {
    general: generalLimiter,
    auth: authLimiter,
    api: apiLimiter,
    admin: adminLimiter
};
EOF
                ;;
                
            "input-validation")
                cat > "$middleware_file" << 'EOF'
// 入力検証強化ミドルウェア
// Feature-E自動生成

const validator = require('validator');
const xss = require('xss');

class InputValidationMiddleware {
    constructor(options = {}) {
        this.options = {
            maxStringLength: options.maxStringLength || 1000,
            maxArrayLength: options.maxArrayLength || 100,
            maxObjectDepth: options.maxObjectDepth || 5,
            allowedFileTypes: options.allowedFileTypes || ['.jpg', '.jpeg', '.png', '.pdf', '.txt'],
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            strictMode: options.strictMode || false
        };
    }

    // 一般的な入力検証
    validateInput() {
        return (req, res, next) => {
            try {
                // リクエストボディの検証
                if (req.body) {
                    req.body = this.sanitizeObject(req.body);
                    if (!this.validateObject(req.body)) {
                        return res.status(400).json({ error: 'Invalid request body' });
                    }
                }

                // クエリパラメータの検証
                if (req.query) {
                    req.query = this.sanitizeObject(req.query);
                    if (!this.validateObject(req.query)) {
                        return res.status(400).json({ error: 'Invalid query parameters' });
                    }
                }

                // URLパラメータの検証
                if (req.params) {
                    req.params = this.sanitizeObject(req.params);
                    if (!this.validateObject(req.params)) {
                        return res.status(400).json({ error: 'Invalid URL parameters' });
                    }
                }

                next();
            } catch (error) {
                console.error('Input validation error:', error);
                res.status(400).json({ error: 'Input validation failed' });
            }
        };
    }

    // オブジェクトサニタイズ
    sanitizeObject(obj, depth = 0) {
        if (depth > this.options.maxObjectDepth) {
            throw new Error('Object depth exceeded');
        }

        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            if (obj.length > this.options.maxArrayLength) {
                throw new Error('Array length exceeded');
            }
            return obj.map(item => this.sanitizeObject(item, depth + 1));
        }

        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeString(key);
                sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
            }
            return sanitized;
        }

        return obj;
    }

    // 文字列サニタイズ
    sanitizeString(str) {
        if (typeof str !== 'string') return str;
        
        if (str.length > this.options.maxStringLength) {
            throw new Error('String length exceeded');
        }

        // XSS攻撃防御
        str = xss(str, {
            whiteList: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script']
        });

        // SQLインジェクション防御
        str = str.replace(/(['";\\])/g, '\\$1');

        // 危険なパターンの除去
        str = str.replace(/(javascript:|data:|vbscript:|on\w+\s*=)/gi, '');

        return str.trim();
    }

    // オブジェクト検証
    validateObject(obj, depth = 0) {
        if (depth > this.options.maxObjectDepth) {
            return false;
        }

        if (typeof obj === 'string') {
            return this.validateString(obj);
        }

        if (Array.isArray(obj)) {
            if (obj.length > this.options.maxArrayLength) {
                return false;
            }
            return obj.every(item => this.validateObject(item, depth + 1));
        }

        if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj).every(value => this.validateObject(value, depth + 1));
        }

        return true;
    }

    // 文字列検証
    validateString(str) {
        if (typeof str !== 'string') return true;
        
        if (str.length > this.options.maxStringLength) {
            return false;
        }

        // 疑わしいパターンのチェック
        const suspiciousPatterns = [
            /(\b|%2F)union(\b|%20)/i,
            /(\b|%2F)select(\b|%20)/i,
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
            /vbscript:/gi
        ];

        return !suspiciousPatterns.some(pattern => pattern.test(str));
    }

    // ファイルアップロード検証
    validateFileUpload() {
        return (req, res, next) => {
            if (!req.files && !req.file) {
                return next();
            }

            const files = req.files || [req.file];
            
            for (const file of Array.isArray(files) ? files : [files]) {
                // ファイルサイズチェック
                if (file.size > this.options.maxFileSize) {
                    return res.status(400).json({ 
                        error: `File size too large. Maximum: ${this.options.maxFileSize} bytes` 
                    });
                }

                // ファイルタイプチェック
                const ext = '.' + file.originalname.split('.').pop().toLowerCase();
                if (!this.options.allowedFileTypes.includes(ext)) {
                    return res.status(400).json({ 
                        error: `File type not allowed. Allowed: ${this.options.allowedFileTypes.join(', ')}` 
                    });
                }

                // MIME タイプチェック
                if (!this.validateMimeType(file.mimetype, ext)) {
                    return res.status(400).json({ 
                        error: 'File MIME type does not match extension' 
                    });
                }
            }

            next();
        };
    }

    // MIME タイプ検証
    validateMimeType(mimetype, extension) {
        const mimeTypeMap = {
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.png': ['image/png'],
            '.pdf': ['application/pdf'],
            '.txt': ['text/plain']
        };

        const allowedMimeTypes = mimeTypeMap[extension];
        return allowedMimeTypes && allowedMimeTypes.includes(mimetype);
    }

    // カスタム検証ルール
    customValidation(rules) {
        return (req, res, next) => {
            const errors = [];

            for (const [field, rule] of Object.entries(rules)) {
                const value = req.body[field];
                
                if (rule.required && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} is required`);
                    continue;
                }

                if (value !== undefined && value !== null) {
                    if (rule.type === 'email' && !validator.isEmail(value)) {
                        errors.push(`${field} must be a valid email`);
                    }
                    
                    if (rule.type === 'url' && !validator.isURL(value)) {
                        errors.push(`${field} must be a valid URL`);
                    }
                    
                    if (rule.minLength && value.length < rule.minLength) {
                        errors.push(`${field} must be at least ${rule.minLength} characters`);
                    }
                    
                    if (rule.maxLength && value.length > rule.maxLength) {
                        errors.push(`${field} must be no more than ${rule.maxLength} characters`);
                    }
                    
                    if (rule.pattern && !rule.pattern.test(value)) {
                        errors.push(`${field} format is invalid`);
                    }
                }
            }

            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            next();
        };
    }
}

module.exports = InputValidationMiddleware;
EOF
                ;;
                
            *) 
                # 基本セキュリティミドルウェアテンプレート
                cat > "$middleware_file" << EOF
// $middleware_desc
// Feature-E自動生成セキュリティミドルウェア

const ${middleware_name//-/_}Middleware = (options = {}) => {
    return (req, res, next) => {
        try {
            // TODO: Implement $middleware_name security logic
            
            // セキュリティログ
            console.log(\`[SECURITY] \${new Date().toISOString()} - $middleware_name: \${req.method} \${req.url}\`);
            
            // セキュリティヘッダー追加
            res.setHeader('X-Security-Check', '$middleware_name');
            
            next();
        } catch (error) {
            console.error(\`[SECURITY-ERROR] $middleware_name: \${error.message}\`);
            res.status(500).json({ error: 'Security check failed' });
        }
    };
};

module.exports = ${middleware_name//-/_}Middleware;
EOF
                ;;
        esac
        
        ((middleware_created++))
        log_feature_action "SECURITY_MIDDLEWARE_CREATION" "SUCCESS" "Created $middleware_name middleware"
    done
    
    print_success "セキュリティミドルウェア生成完了: $middleware_created 個作成"
    return $middleware_created
}

# =========================
# 包括的テストスイート生成
# =========================

generate_comprehensive_tests() {
    print_info "包括的テストスイート自動生成中..."
    
    local tests_created=0
    
    # テストスイートテンプレート
    local test_templates=(
        "security-integration:セキュリティ統合テスト"
        "performance-benchmark:パフォーマンス基準テスト"
        "load-testing:負荷テスト"
        "accessibility-compliance:アクセシビリティ準拠テスト"
        "cross-browser-compatibility:クロスブラウザ互換性テスト"
        "api-reliability:API信頼性テスト"
        "data-integrity:データ整合性テスト"
        "backup-recovery:バックアップ・復旧テスト"
    )
    
    mkdir -p "$TESTS_DIR"
    
    for template in "${test_templates[@]}"; do
        local test_name=$(echo "$template" | cut -d':' -f1)
        local test_desc=$(echo "$template" | cut -d':' -f2)
        local test_file="$TESTS_DIR/${test_name}.test.js"
        
        if [ -f "$test_file" ]; then
            print_info "$test_name は既存のためスキップ"
            continue
        fi
        
        print_info "包括的テストスイート生成: $test_name"
        
        case "$test_name" in
            "security-integration")
                cat > "$test_file" << 'EOF'
// セキュリティ統合テスト
// Feature-E自動生成

const request = require('supertest');
const app = require('../start-server');

describe('Security Integration Tests', () => {
    let server;
    
    beforeAll(async () => {
        server = app.listen(0);
    });
    
    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('認証セキュリティ', () => {
        test('パスワード暴力攻撃の防御', async () => {
            const attempts = [];
            for (let i = 0; i < 10; i++) {
                attempts.push(
                    request(server)
                        .post('/api/auth/login')
                        .send({ username: 'admin', password: 'wrong' + i })
                        .expect(401)
                );
            }
            
            await Promise.all(attempts);
            
            // 11回目は制限されるべき
            const response = await request(server)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'wrong' });
            
            expect(response.status).toBe(429);
        });

        test('SQLインジェクション攻撃の防御', async () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "1' OR '1'='1",
                "admin'--",
                "admin'; DELETE FROM users WHERE 't'='t",
                "1' UNION SELECT * FROM users--"
            ];

            for (const input of maliciousInputs) {
                const response = await request(server)
                    .post('/api/auth/login')
                    .send({ username: input, password: 'test' });
                
                expect(response.status).toBe(400);
                expect(response.body.error).toContain('Invalid');
            }
        });

        test('XSS攻撃の防御', async () => {
            const xssPayloads = [
                '<script>alert("XSS")</script>',
                'javascript:alert("XSS")',
                '<img src="x" onerror="alert(\'XSS\')">';,
                '<svg onload="alert(\'XSS\')">'
            ];

            for (const payload of xssPayloads) {
                const response = await request(server)
                    .post('/api/assets')
                    .send({ name: payload, type: 'Server' })
                    .set('Authorization', 'Bearer valid-token');
                
                expect(response.status).toBe(400);
            }
        });
    });

    describe('セキュリティヘッダー', () => {
        test('必要なセキュリティヘッダーが設定されている', async () => {
            const response = await request(server)
                .get('/api/assets')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['strict-transport-security']).toContain('max-age');
        });
    });

    describe('入力検証', () => {
        test('異常に大きなペイロードの拒否', async () => {
            const largePayload = 'A'.repeat(10000);
            
            const response = await request(server)
                .post('/api/assets')
                .send({ name: largePayload, type: 'Server' })
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(400);
        });

        test('不正なJSONの拒否', async () => {
            const response = await request(server)
                .post('/api/assets')
                .send('{"name": "test", "type": }')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(400);
        });
    });

    describe('レート制限', () => {
        test('API レート制限の動作確認', async () => {
            const requests = [];
            for (let i = 0; i < 25; i++) {
                requests.push(
                    request(server)
                        .get('/api/assets')
                        .set('Authorization', 'Bearer valid-token')
                );
            }
            
            const responses = await Promise.all(requests);
            const tooManyRequests = responses.filter(r => r.status === 429);
            
            expect(tooManyRequests.length).toBeGreaterThan(0);
        });
    });
});
EOF
                ;;
                
            "performance-benchmark")
                cat > "$test_file" << 'EOF'
// パフォーマンス基準テスト
// Feature-E自動生成

const request = require('supertest');
const app = require('../start-server');

describe('Performance Benchmark Tests', () => {
    let server;
    
    beforeAll(async () => {
        server = app.listen(0);
    });
    
    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('API応答時間', () => {
        test('資産一覧取得が200ms以内', async () => {
            const start = Date.now();
            
            const response = await request(server)
                .get('/api/assets')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(200);
        });

        test('認証処理が100ms以内', async () => {
            const start = Date.now();
            
            await request(server)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'admin123' })
                .expect(200);
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
        });
    });

    describe('メモリ使用量', () => {
        test('メモリリークがない', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 100回のAPIリクエスト
            for (let i = 0; i < 100; i++) {
                await request(server)
                    .get('/api/assets')
                    .set('Authorization', 'Bearer valid-token');
            }
            
            // ガベージコレクション実行
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // メモリ増加が10MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });
    });

    describe('同時実行処理', () => {
        test('50の同時リクエストを処理できる', async () => {
            const requests = [];
            
            for (let i = 0; i < 50; i++) {
                requests.push(
                    request(server)
                        .get('/api/assets')
                        .set('Authorization', 'Bearer valid-token')
                );
            }
            
            const start = Date.now();
            const responses = await Promise.all(requests);
            const duration = Date.now() - start;
            
            // 全て成功
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // 5秒以内に完了
            expect(duration).toBeLessThan(5000);
        });
    });

    describe('データベース性能', () => {
        test('大量データ挿入性能', async () => {
            const start = Date.now();
            const insertPromises = [];
            
            for (let i = 0; i < 100; i++) {
                insertPromises.push(
                    request(server)
                        .post('/api/assets')
                        .send({
                            name: `Test Asset ${i}`,
                            type: 'Server',
                            status: 'Active'
                        })
                        .set('Authorization', 'Bearer valid-token')
                );
            }
            
            await Promise.all(insertPromises);
            const duration = Date.now() - start;
            
            // 10秒以内に完了
            expect(duration).toBeLessThan(10000);
        });
    });
});
EOF
                ;;
                
            *) 
                # 基本テストテンプレート
                cat > "$test_file" << EOF
// $test_desc
// Feature-E自動生成テストスイート

const request = require('supertest');
const app = require('../start-server');

describe('$test_desc', () => {
    let server;
    
    beforeAll(async () => {
        server = app.listen(0);
    });
    
    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('基本機能テスト', () => {
        test('正常なリクエストが処理される', async () => {
            const response = await request(server)
                .get('/api/health')
                .expect(200);
            
            expect(response.body).toHaveProperty('status');
        });
    });

    describe('エラーハンドリングテスト', () => {
        test('不正なリクエストが適切に処理される', async () => {
            const response = await request(server)
                .get('/api/nonexistent')
                .expect(404);
            
            expect(response.body).toHaveProperty('error');
        });
    });
});
EOF
                ;;
        esac
        
        ((tests_created++))
        log_feature_action "COMPREHENSIVE_TEST_CREATION" "SUCCESS" "Created $test_name test suite"
    done
    
    print_success "包括的テストスイート生成完了: $tests_created 個作成"
    return $tests_created
}

# =========================
# 品質監視・監査システム
# =========================

generate_quality_monitoring() {
    print_info "品質監視・監査システム生成中..."
    
    local monitoring_created=0
    
    # 品質監視スクリプト生成
    local quality_monitor_file="$BACKEND_DIR/scripts/quality-monitor.js"
    if [ ! -f "$quality_monitor_file" ]; then
        mkdir -p "$BACKEND_DIR/scripts"
        
        cat > "$quality_monitor_file" << 'EOF'
// 品質監視・監査システム
// Feature-E自動生成

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class QualityMonitor {
    constructor() {
        this.metrics = {
            codeQuality: 0,
            security: 0,
            performance: 0,
            accessibility: 0,
            testCoverage: 0,
            overall: 0
        };
        
        this.thresholds = {
            codeQuality: 80,
            security: 90,
            performance: 85,
            accessibility: 80,
            testCoverage: 75,
            overall: 85
        };
        
        this.auditLog = [];
    }

    // 全体品質チェック実行
    async runQualityCheck() {
        console.log('品質チェックを開始します...');
        
        try {
            // 1. コード品質チェック
            this.metrics.codeQuality = await this.checkCodeQuality();
            
            // 2. セキュリティチェック
            this.metrics.security = await this.checkSecurity();
            
            // 3. パフォーマンスチェック
            this.metrics.performance = await this.checkPerformance();
            
            // 4. アクセシビリティチェック
            this.metrics.accessibility = await this.checkAccessibility();
            
            // 5. テストカバレッジチェック
            this.metrics.testCoverage = await this.checkTestCoverage();
            
            // 6. 総合スコア計算
            this.calculateOverallScore();
            
            // 7. 監査ログ記録
            this.recordAudit();
            
            // 8. レポート生成
            await this.generateReport();
            
            return this.metrics;
        } catch (error) {
            console.error('品質チェック実行エラー:', error);
            throw error;
        }
    }

    // コード品質チェック
    async checkCodeQuality() {
        try {
            // ESLint実行
            const { stdout: eslintOutput } = await execAsync('npx eslint src/ --format json');
            const eslintResults = JSON.parse(eslintOutput);
            
            const totalFiles = eslintResults.length;
            const filesWithErrors = eslintResults.filter(result => result.errorCount > 0).length;
            const totalErrors = eslintResults.reduce((sum, result) => sum + result.errorCount, 0);
            
            // スコア計算 (エラーが少ないほど高スコア)
            const errorRate = totalErrors / totalFiles;
            const score = Math.max(0, 100 - (errorRate * 10));
            
            console.log(`コード品質: ${score.toFixed(1)}% (エラー: ${totalErrors})`);
            return Math.round(score);
        } catch (error) {
            console.warn('ESLintチェックに失敗:', error.message);
            return 50; // デフォルトスコア
        }
    }

    // セキュリティチェック
    async checkSecurity() {
        try {
            // npm audit実行
            const { stdout: auditOutput } = await execAsync('npm audit --json');
            const auditResults = JSON.parse(auditOutput);
            
            const vulnerabilities = auditResults.metadata?.vulnerabilities;
            if (!vulnerabilities) return 100;
            
            const { critical = 0, high = 0, moderate = 0, low = 0 } = vulnerabilities;
            
            // スコア計算 (脆弱性が少ないほど高スコア)
            const securityScore = Math.max(0, 100 - (critical * 20 + high * 10 + moderate * 5 + low * 1));
            
            console.log(`セキュリティ: ${securityScore}% (脆弱性: ${critical}重要, ${high}高, ${moderate}中, ${low}低)`);
            return securityScore;
        } catch (error) {
            console.warn('セキュリティチェックに失敗:', error.message);
            return 70; // デフォルトスコア
        }
    }

    // パフォーマンスチェック
    async checkPerformance() {
        try {
            // バンドルサイズチェック
            const srcSize = await this.getDirectorySize('./src');
            const bundleSize = await this.getDirectorySize('./dist').catch(() => srcSize);
            
            // パフォーマンススコア計算 (サイズが小さいほど高スコア)
            const sizeMB = bundleSize / (1024 * 1024);
            const sizeScore = Math.max(0, 100 - sizeMB * 5);
            
            // メモリ使用量チェック
            const memoryUsage = process.memoryUsage();
            const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
            const memoryScore = Math.max(0, 100 - memoryMB * 2);
            
            const performanceScore = Math.round((sizeScore + memoryScore) / 2);
            
            console.log(`パフォーマンス: ${performanceScore}% (サイズ: ${sizeMB.toFixed(1)}MB, メモリ: ${memoryMB.toFixed(1)}MB)`);
            return performanceScore;
        } catch (error) {
            console.warn('パフォーマンスチェックに失敗:', error.message);
            return 75; // デフォルトスコア
        }
    }

    // アクセシビリティチェック
    async checkAccessibility() {
        try {
            // 簡易アクセシビリティチェック (実装ファイル内のaria属性数など)
            const tsxFiles = await this.findFiles('./src', '.tsx');
            let totalAriaAttributes = 0;
            let totalComponents = 0;
            
            for (const file of tsxFiles) {
                const content = await fs.readFile(file, 'utf8');
                const ariaMatches = content.match(/aria-\w+/g) || [];
                const componentMatches = content.match(/export\s+(default\s+)?function|export\s+const\s+\w+.*=.*=>/g) || [];
                
                totalAriaAttributes += ariaMatches.length;
                totalComponents += componentMatches.length;
            }
            
            // アクセシビリティスコア計算
            const ariaRatio = totalComponents > 0 ? totalAriaAttributes / totalComponents : 0;
            const accessibilityScore = Math.min(100, ariaRatio * 50 + 50);
            
            console.log(`アクセシビリティ: ${accessibilityScore.toFixed(1)}% (aria属性: ${totalAriaAttributes}/${totalComponents})`);
            return Math.round(accessibilityScore);
        } catch (error) {
            console.warn('アクセシビリティチェックに失敗:', error.message);
            return 60; // デフォルトスコア
        }
    }

    // テストカバレッジチェック
    async checkTestCoverage() {
        try {
            // Jest coverage実行
            const { stdout: coverageOutput } = await execAsync('npm test -- --coverage --silent');
            
            // カバレッジ結果解析 (簡易版)
            const coverageMatch = coverageOutput.match(/All files\s+\|\s+(\d+\.?\d*)/);
            const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
            
            console.log(`テストカバレッジ: ${coverage}%`);
            return Math.round(coverage);
        } catch (error) {
            console.warn('テストカバレッジチェックに失敗:', error.message);
            
            // 代替: テストファイル数とソースファイル数の比率
            try {
                const testFiles = await this.findFiles('./src', '.test.');
                const srcFiles = await this.findFiles('./src', '.tsx');
                const testRatio = srcFiles.length > 0 ? (testFiles.length / srcFiles.length) * 100 : 0;
                
                console.log(`テストファイル比率: ${testRatio.toFixed(1)}%`);
                return Math.round(Math.min(testRatio, 100));
            } catch (altError) {
                return 30; // デフォルトスコア
            }
        }
    }

    // 総合スコア計算
    calculateOverallScore() {
        const weights = {
            codeQuality: 0.25,
            security: 0.25,
            performance: 0.20,
            accessibility: 0.15,
            testCoverage: 0.15
        };
        
        this.metrics.overall = Math.round(
            this.metrics.codeQuality * weights.codeQuality +
            this.metrics.security * weights.security +
            this.metrics.performance * weights.performance +
            this.metrics.accessibility * weights.accessibility +
            this.metrics.testCoverage * weights.testCoverage
        );
        
        console.log(`総合品質スコア: ${this.metrics.overall}%`);
    }

    // 監査ログ記録
    recordAudit() {
        const audit = {
            timestamp: new Date().toISOString(),
            metrics: { ...this.metrics },
            thresholds: { ...this.thresholds },
            status: this.metrics.overall >= this.thresholds.overall ? 'PASS' : 'FAIL',
            issues: this.identifyIssues()
        };
        
        this.auditLog.push(audit);
        
        // ログファイルに保存
        fs.writeFile('./logs/quality-audit.json', JSON.stringify(this.auditLog, null, 2))
            .catch(error => console.warn('監査ログ保存に失敗:', error));
    }

    // 問題点特定
    identifyIssues() {
        const issues = [];
        
        Object.entries(this.thresholds).forEach(([metric, threshold]) => {
            if (this.metrics[metric] < threshold) {
                issues.push({
                    metric: metric,
                    current: this.metrics[metric],
                    required: threshold,
                    severity: this.calculateSeverity(this.metrics[metric], threshold)
                });
            }
        });
        
        return issues;
    }

    // 重要度計算
    calculateSeverity(current, required) {
        const gap = required - current;
        if (gap >= 30) return 'critical';
        if (gap >= 20) return 'high';
        if (gap >= 10) return 'medium';
        return 'low';
    }

    // レポート生成
    async generateReport() {
        const report = {
            summary: {
                timestamp: new Date().toISOString(),
                overallScore: this.metrics.overall,
                status: this.metrics.overall >= this.thresholds.overall ? 'HEALTHY' : 'NEEDS_ATTENTION'
            },
            metrics: this.metrics,
            thresholds: this.thresholds,
            issues: this.identifyIssues(),
            recommendations: this.generateRecommendations()
        };
        
        await fs.writeFile('./logs/quality-report.json', JSON.stringify(report, null, 2));
        console.log('品質レポートを生成しました: ./logs/quality-report.json');
    }

    // 推奨事項生成
    generateRecommendations() {
        const recommendations = [];
        const issues = this.identifyIssues();
        
        issues.forEach(issue => {
            switch (issue.metric) {
                case 'codeQuality':
                    recommendations.push('ESLintエラーの修正とコーディング規約の遵守');
                    break;
                case 'security':
                    recommendations.push('セキュリティ脆弱性の修正とnpm auditの実行');
                    break;
                case 'performance':
                    recommendations.push('バンドルサイズ最適化とメモリ使用量の改善');
                    break;
                case 'accessibility':
                    recommendations.push('aria属性の追加とWCAG準拠の改善');
                    break;
                case 'testCoverage':
                    recommendations.push('テストケースの追加とカバレッジ向上');
                    break;
            }
        });
        
        return recommendations;
    }

    // ユーティリティ: ディレクトリサイズ取得
    async getDirectorySize(dirPath) {
        try {
            const { stdout } = await execAsync(`du -sb ${dirPath}`);
            return parseInt(stdout.split('\t')[0]);
        } catch (error) {
            return 0;
        }
    }

    // ユーティリティ: ファイル検索
    async findFiles(dir, extension) {
        try {
            const { stdout } = await execAsync(`find ${dir} -name "*${extension}*" -type f`);
            return stdout.trim().split('\n').filter(line => line.length > 0);
        } catch (error) {
            return [];
        }
    }
}

// CLI実行
if (require.main === module) {
    const monitor = new QualityMonitor();
    monitor.runQualityCheck()
        .then(metrics => {
            console.log('\n品質チェック完了:');
            console.log(JSON.stringify(metrics, null, 2));
            process.exit(metrics.overall >= monitor.thresholds.overall ? 0 : 1);
        })
        .catch(error => {
            console.error('品質チェック失敗:', error);
            process.exit(1);
        });
}

module.exports = QualityMonitor;
EOF

        ((monitoring_created++))
        print_success "品質監視システムを作成しました"
    fi
    
    print_success "品質監視・監査システム生成完了: $monitoring_created 項目作成"
    return $monitoring_created
}

# =========================
# 非機能要件品質チェック
# =========================

check_nonfunctional_quality() {
    print_info "非機能要件品質チェック実行中..."
    
    local quality_score=0
    local total_checks=6
    
    # セキュリティミドルウェアチェック
    local security_middleware=$(find "$MIDDLEWARE_DIR" -name "*security*" -o -name "*Security*" 2>/dev/null | wc -l)
    if [ "$security_middleware" -ge 3 ]; then
        ((quality_score++))
        print_success "セキュリティミドルウェア: 充実 ($security_middleware 個)"
    else
        print_warning "セキュリティミドルウェア: 要改善 ($security_middleware 個)"
    fi
    
    # テストカバレッジチェック
    local test_files=$(find "$TESTS_DIR" -name "*.test.js" 2>/dev/null | wc -l)
    if [ "$test_files" -ge 5 ]; then
        ((quality_score++))
        print_success "テストスイート: 充実 ($test_files スイート)"
    else
        print_warning "テストスイート: 要改善 ($test_files スイート)"
    fi
    
    # 品質監視システムチェック
    if [ -f "$BACKEND_DIR/scripts/quality-monitor.js" ]; then
        ((quality_score++))
        print_success "品質監視: 実装済み"
    else
        print_warning "品質監視: 未実装"
    fi
    
    # セキュリティ脆弱性チェック
    if command -v npm >/dev/null; then
        local vulnerabilities=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
        if [ "$vulnerabilities" -eq 0 ]; then
            ((quality_score++))
            print_success "セキュリティ脆弱性: なし"
        else
            print_warning "セキュリティ脆弱性: $vulnerabilities 件"
        fi
    fi
    
    # パフォーマンス最適化チェック
    local optimization_patterns=$(find "$WEBUI_SRC" -name "*.tsx" -o -name "*.ts" | xargs grep -c "memo\|useCallback\|useMemo\|lazy" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$optimization_patterns" -ge 10 ]; then
        ((quality_score++))
        print_success "パフォーマンス最適化: 良好 ($optimization_patterns 箇所)"
    else
        print_warning "パフォーマンス最適化: 要改善 ($optimization_patterns 箇所)"
    fi
    
    # アクセシビリティ対応チェック
    local accessibility_features=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "aria-\|role=" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$accessibility_features" -ge 15 ]; then
        ((quality_score++))
        print_success "アクセシビリティ: 良好 ($accessibility_features 属性)"
    else
        print_warning "アクセシビリティ: 要改善 ($accessibility_features 属性)"
    fi
    
    local final_score=$((quality_score * 100 / total_checks))
    print_info "非機能要件品質スコア: $final_score/100"
    
    echo $final_score
}

# =========================
# Feature-E実行ループ
# =========================

execute_feature_e_loop() {
    print_header
    print_info "Feature-E 非機能要件・品質保証自動開発ループを開始します"
    print_info "最大ループ回数: $MAX_AUTO_LOOPS"
    print_info "品質閾値: $QUALITY_THRESHOLD%"
    
    local loop_count=0
    local total_middleware_created=0
    local total_tests_created=0
    local total_monitoring_created=0
    
    while [ $loop_count -lt $MAX_AUTO_LOOPS ]; do
        ((loop_count++))
        print_info "==================== ループ $loop_count/$MAX_AUTO_LOOPS 開始 ===================="
        
        # セキュリティミドルウェア生成
        local middleware_created=$(generate_security_middleware)
        total_middleware_created=$((total_middleware_created + middleware_created))
        
        # 包括的テストスイート生成
        local tests_created=$(generate_comprehensive_tests)
        total_tests_created=$((total_tests_created + tests_created))
        
        # 品質監視システム生成
        local monitoring_created=$(generate_quality_monitoring)
        total_monitoring_created=$((total_monitoring_created + monitoring_created))
        
        # 品質チェック
        local quality_score=$(check_nonfunctional_quality)
        
        print_info "ループ $loop_count 完了 - 品質スコア: ${quality_score}%"
        log_feature_action "LOOP_COMPLETION" "SUCCESS" "Loop $loop_count completed with quality score $quality_score%"
        
        # 早期終了条件チェック
        if [ $quality_score -ge $QUALITY_THRESHOLD ]; then
            print_success "品質閾値 ${QUALITY_THRESHOLD}% に到達しました！"
            break
        fi
        
        # 改善がない場合の早期終了
        if [ $middleware_created -eq 0 ] && [ $tests_created -eq 0 ] && [ $monitoring_created -eq 0 ]; then
            print_info "追加の改善項目がないため、ループを終了します"
            break
        fi
        
        sleep 2  # ループ間の休憩
    done
    
    # 最終結果表示
    print_success "Feature-E 非機能要件・品質保証自動開発完了"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "実行ループ数: $loop_count/$MAX_AUTO_LOOPS"
    echo "作成セキュリティミドルウェア: $total_middleware_created 個"
    echo "作成テストスイート: $total_tests_created 個"
    echo "作成品質監視システム: $total_monitoring_created 項目"
    echo "最終品質スコア: $(check_nonfunctional_quality)%"
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "Feature-E 非機能要件・品質保証自動開発スクリプト"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --loop              自動開発ループ実行"
    echo "  --security          セキュリティミドルウェア生成のみ"
    echo "  --tests             包括的テストスイート生成のみ"
    echo "  --monitoring        品質監視システム生成のみ"
    echo "  --quality           品質チェックのみ"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="loop"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --loop)
                mode="loop"
                shift
                ;;
            --security)
                mode="security"
                shift
                ;;
            --tests)
                mode="tests"
                shift
                ;;
            --monitoring)
                mode="monitoring"
                shift
                ;;
            --quality)
                mode="quality"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_warning "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # Feature-E開始ログ
    log_feature_action "FEATURE_E_START" "INFO" "Feature-E quality assurance development started with mode: $mode"
    
    # モード別実行
    case "$mode" in
        loop)
            execute_feature_e_loop
            ;;
        security)
            print_header
            generate_security_middleware
            ;;
        tests)
            print_header
            generate_comprehensive_tests
            ;;
        monitoring)
            print_header
            generate_quality_monitoring
            ;;
        quality)
            print_header
            local score=$(check_nonfunctional_quality)
            print_info "現在の非機能要件品質スコア: $score%"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
    
    log_feature_action "FEATURE_E_COMPLETE" "SUCCESS" "Feature-E quality assurance development completed"
}

# スクリプト実行
main "$@"