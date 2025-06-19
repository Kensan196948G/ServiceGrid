// テスト用ヘルパー関数（form-data依存関係回避）
// Node.js内蔵テストランナー対応

const fs = require('fs');
const path = require('path');

/**
 * PowerShellファイルの存在と構造を確認
 * @param {string} filePath - ファイルパス
 * @param {string[]} requiredFunctions - 必須関数のリスト
 * @returns {object} 確認結果
 */
function validatePowerShellFile(filePath, requiredFunctions = []) {
    const result = {
        exists: false,
        content: null,
        functions: [],
        missingFunctions: [],
        isValid: false
    };
    
    try {
        result.exists = fs.existsSync(filePath);
        
        if (result.exists) {
            result.content = fs.readFileSync(filePath, 'utf8');
            
            // 関数定義を検索
            const functionMatches = result.content.match(/function\s+[\w-]+/g) || [];
            result.functions = functionMatches.map(match => 
                match.replace('function ', '').trim()
            );
            
            // 必須関数の確認
            result.missingFunctions = requiredFunctions.filter(func => 
                !result.content.includes(func)
            );
            
            result.isValid = result.missingFunctions.length === 0;
        }
        
        return result;
    } catch (error) {
        result.error = error.message;
        return result;
    }
}

/**
 * SQLファイルの構造確認
 * @param {string} filePath - SQLファイルパス
 * @param {string[]} requiredTables - 必須テーブルリスト
 * @returns {object} 確認結果
 */
function validateSQLFile(filePath, requiredTables = []) {
    const result = {
        exists: false,
        content: null,
        tables: [],
        missingTables: [],
        isValid: false
    };
    
    try {
        result.exists = fs.existsSync(filePath);
        
        if (result.exists) {
            result.content = fs.readFileSync(filePath, 'utf8');
            
            // テーブル定義を検索
            const tableMatches = result.content.match(/CREATE\s+TABLE\s+[\w_]+/gi) || [];
            result.tables = tableMatches.map(match => 
                match.replace(/CREATE\s+TABLE\s+/i, '').trim()
            );
            
            // 必須テーブルの確認
            result.missingTables = requiredTables.filter(table => 
                !result.content.includes(table)
            );
            
            result.isValid = result.missingTables.length === 0;
        }
        
        return result;
    } catch (error) {
        result.error = error.message;
        return result;
    }
}

/**
 * 危険なパターンの検査
 * @param {string} content - 検査対象コンテンツ
 * @param {RegExp[]} dangerousPatterns - 危険パターンのリスト
 * @returns {object} 検査結果
 */
function checkDangerousPatterns(content, dangerousPatterns = []) {
    const result = {
        isSecure: true,
        detectedPatterns: [],
        details: []
    };
    
    dangerousPatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
            result.isSecure = false;
            result.detectedPatterns.push(pattern);
            
            const matches = content.match(pattern);
            result.details.push({
                pattern: pattern.toString(),
                matches: matches ? matches.slice(0, 3) : [] // 最初の3件のみ
            });
        }
    });
    
    return result;
}

/**
 * ファイルサイズとパフォーマンス確認
 * @param {string} filePath - ファイルパス
 * @param {object} limits - 制限値
 * @returns {object} 確認結果
 */
function validateFilePerformance(filePath, limits = {}) {
    const defaultLimits = {
        maxSizeKB: 500,
        minSizeKB: 1,
        maxLines: 1000
    };
    
    const actualLimits = { ...defaultLimits, ...limits };
    const result = {
        exists: false,
        sizeKB: 0,
        lines: 0,
        isWithinLimits: false,
        violations: []
    };
    
    try {
        result.exists = fs.existsSync(filePath);
        
        if (result.exists) {
            const stats = fs.statSync(filePath);
            result.sizeKB = stats.size / 1024;
            
            const content = fs.readFileSync(filePath, 'utf8');
            result.lines = content.split('\n').length;
            
            // 制限チェック
            if (result.sizeKB > actualLimits.maxSizeKB) {
                result.violations.push(`ファイルサイズが大きすぎます: ${result.sizeKB.toFixed(2)}KB > ${actualLimits.maxSizeKB}KB`);
            }
            
            if (result.sizeKB < actualLimits.minSizeKB) {
                result.violations.push(`ファイルサイズが小さすぎます: ${result.sizeKB.toFixed(2)}KB < ${actualLimits.minSizeKB}KB`);
            }
            
            if (result.lines > actualLimits.maxLines) {
                result.violations.push(`行数が多すぎます: ${result.lines} > ${actualLimits.maxLines}`);
            }
            
            result.isWithinLimits = result.violations.length === 0;
        }
        
        return result;
    } catch (error) {
        result.error = error.message;
        return result;
    }
}

/**
 * Node.js内蔵テストランナー用アサーション拡張
 */
const assert = require('assert');

const extendedAssert = {
    ...assert,
    
    isSecure: (securityResult, message = 'Security check failed') => {
        assert.ok(securityResult.isSecure, `${message}: ${securityResult.detectedPatterns.join(', ')}`);
    },
    
    fileExists: (filePath, message = 'File does not exist') => {
        assert.ok(fs.existsSync(filePath), `${message}: ${filePath}`);
    },
    
    hasFunction: (content, functionName, message = 'Function not found') => {
        assert.ok(content.includes(functionName), `${message}: ${functionName}`);
    },
    
    withinLimits: (performanceResult, message = 'Performance limits violated') => {
        assert.ok(performanceResult.isWithinLimits, `${message}: ${performanceResult.violations.join(', ')}`);
    }
};

module.exports = {
    validatePowerShellFile,
    validateSQLFile,
    checkDangerousPatterns,
    validateFilePerformance,
    extendedAssert
};