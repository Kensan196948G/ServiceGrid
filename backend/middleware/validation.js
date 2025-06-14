/**
 * APIバリデーション関数とミドルウェア
 * ITSM準拠IT運用システムプラットフォーム
 * 
 * 全APIエンドポイントで統一されたバリデーション機能を提供します。
 */

const { sendValidationError } = require('./responseHandler');

/**
 * 必須フィールドのバリデーション
 * @param {Array} requiredFields - 必須フィールド名の配列
 * @returns {Function} Express middleware
 */
const validateRequired = (requiredFields) => {
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query, ...req.params };
    
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors[field] = `${field}は必須項目です`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, '必須フィールドが不足しています');
    }
    
    next();
  };
};

/**
 * 文字列長のバリデーション
 * @param {Object} fieldLimits - {fieldName: {min: number, max: number}}
 * @returns {Function} Express middleware
 */
const validateStringLength = (fieldLimits) => {
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };
    
    Object.entries(fieldLimits).forEach(([field, limits]) => {
      if (data[field] !== undefined && data[field] !== null) {
        const value = String(data[field]);
        
        if (limits.min && value.length < limits.min) {
          errors[field] = `${field}は${limits.min}文字以上で入力してください`;
        }
        
        if (limits.max && value.length > limits.max) {
          errors[field] = `${field}は${limits.max}文字以内で入力してください`;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, '文字列長の制限に違反しています');
    }
    
    next();
  };
};

/**
 * 列挙値のバリデーション
 * @param {Object} fieldEnums - {fieldName: [validValues]}
 * @returns {Function} Express middleware
 */
const validateEnum = (fieldEnums) => {
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };
    
    Object.entries(fieldEnums).forEach(([field, validValues]) => {
      if (data[field] !== undefined && data[field] !== null && !validValues.includes(data[field])) {
        errors[field] = `${field}の値が無効です。有効な値: ${validValues.join(', ')}`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, '無効な列挙値が指定されています');
    }
    
    next();
  };
};

/**
 * 数値範囲のバリデーション
 * @param {Object} fieldRanges - {fieldName: {min: number, max: number}}
 * @returns {Function} Express middleware
 */
const validateNumericRange = (fieldRanges) => {
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };
    
    Object.entries(fieldRanges).forEach(([field, range]) => {
      if (data[field] !== undefined && data[field] !== null) {
        const value = Number(data[field]);
        
        if (isNaN(value)) {
          errors[field] = `${field}は数値である必要があります`;
          return;
        }
        
        if (range.min !== undefined && value < range.min) {
          errors[field] = `${field}は${range.min}以上である必要があります`;
        }
        
        if (range.max !== undefined && value > range.max) {
          errors[field] = `${field}は${range.max}以下である必要があります`;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, '数値範囲の制限に違反しています');
    }
    
    next();
  };
};

/**
 * 日付形式のバリデーション
 * @param {Array} dateFields - 日付フィールド名の配列
 * @returns {Function} Express middleware
 */
const validateDate = (dateFields) => {
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };
    
    dateFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        const dateValue = new Date(data[field]);
        
        if (isNaN(dateValue.getTime())) {
          errors[field] = `${field}は有効な日付形式である必要があります (YYYY-MM-DD または ISO形式)`;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, '日付形式が無効です');
    }
    
    next();
  };
};

/**
 * メールアドレス形式のバリデーション
 * @param {Array} emailFields - メールフィールド名の配列
 * @returns {Function} Express middleware
 */
const validateEmail = (emailFields) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };
    
    emailFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        if (!emailRegex.test(data[field])) {
          errors[field] = `${field}は有効なメールアドレス形式である必要があります`;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, 'メールアドレス形式が無効です');
    }
    
    next();
  };
};

/**
 * IDの存在チェック（数値のみ）
 * @param {string} paramName - パラメータ名
 * @returns {Function} Express middleware
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return sendValidationError(res, { [paramName]: `${paramName}が指定されていません` });
    }
    
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return sendValidationError(res, { [paramName]: `${paramName}は正の整数である必要があります` });
    }
    
    // バリデーション済みのIDをreq.paramsに設定
    req.params[paramName] = numericId;
    next();
  };
};

/**
 * ページネーションパラメータのバリデーション
 * @param {Object} options - {maxLimit: number, defaultLimit: number}
 * @returns {Function} Express middleware
 */
const validatePagination = (options = {}) => {
  const { maxLimit = 100, defaultLimit = 20 } = options;
  
  return (req, res, next) => {
    const errors = {};
    
    // ページ番号のバリデーション
    if (req.query.page) {
      const page = parseInt(req.query.page, 10);
      if (isNaN(page) || page < 1) {
        errors.page = 'ページ番号は1以上の整数である必要があります';
      } else {
        req.query.page = page;
      }
    } else {
      req.query.page = 1;
    }
    
    // リミットのバリデーション
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (isNaN(limit) || limit < 1) {
        errors.limit = 'リミットは1以上の整数である必要があります';
      } else if (limit > maxLimit) {
        errors.limit = `リミットは${maxLimit}以下である必要があります`;
      } else {
        req.query.limit = limit;
      }
    } else {
      req.query.limit = defaultLimit;
    }
    
    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, 'ページネーションパラメータが無効です');
    }
    
    next();
  };
};

/**
 * 検索クエリのバリデーション
 * @param {Object} options - {minLength: number, maxLength: number}
 * @returns {Function} Express middleware
 */
const validateSearchQuery = (options = {}) => {
  const { minLength = 2, maxLength = 100 } = options;
  
  return (req, res, next) => {
    const { q, search } = req.query;\n    const query = q || search;\n    \n    if (query !== undefined && query !== null && query !== '') {\n      if (typeof query !== 'string') {\n        return sendValidationError(res, { q: '検索クエリは文字列である必要があります' });\n      }\n      \n      const trimmedQuery = query.trim();\n      \n      if (trimmedQuery.length < minLength) {\n        return sendValidationError(res, { q: `検索クエリは${minLength}文字以上である必要があります` });\n      }\n      \n      if (trimmedQuery.length > maxLength) {\n        return sendValidationError(res, { q: `検索クエリは${maxLength}文字以下である必要があります` });\n      }\n      \n      // 正規化されたクエリを設定\n      req.query.q = trimmedQuery;\n      if (req.query.search) req.query.search = trimmedQuery;\n    }\n    \n    next();\n  };\n};\n\n/**\n * カスタムバリデーション関数\n * @param {Function} validator - バリデーション関数 (req, res, next) => boolean or Promise<boolean>\n * @param {string} errorMessage - エラーメッセージ\n * @returns {Function} Express middleware\n */\nconst customValidation = (validator, errorMessage = 'バリデーションエラーが発生しました') => {\n  return async (req, res, next) => {\n    try {\n      const isValid = await validator(req, res, next);\n      if (isValid !== false) {\n        next();\n      }\n    } catch (error) {\n      console.error('Custom validation error:', error);\n      return sendValidationError(res, { custom: errorMessage });\n    }\n  };\n};\n\n/**\n * 複数バリデーションの組み合わせ\n * @param  {...Function} validators - バリデーション関数の配列\n * @returns {Function} Express middleware\n */\nconst combineValidations = (...validators) => {\n  return (req, res, next) => {\n    let index = 0;\n    \n    const runNext = (err) => {\n      if (err) return next(err);\n      \n      if (index >= validators.length) {\n        return next();\n      }\n      \n      const validator = validators[index++];\n      validator(req, res, runNext);\n    };\n    \n    runNext();\n  };\n};\n\n// 共通バリデーションパターン\nconst commonValidations = {\n  // 問題管理用\n  problem: {\n    create: combineValidations(\n      validateRequired(['title', 'description', 'reporter_user_id']),\n      validateStringLength({ title: { max: 200 }, description: { max: 5000 } }),\n      validateEnum({ \n        priority: ['Low', 'Medium', 'High', 'Critical'],\n        status: ['Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed']\n      })\n    ),\n    update: combineValidations(\n      validateId(),\n      validateStringLength({ title: { max: 200 }, description: { max: 5000 } }),\n      validateEnum({ \n        priority: ['Low', 'Medium', 'High', 'Critical'],\n        status: ['Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed']\n      })\n    )\n  },\n  \n  // リリース管理用\n  release: {\n    create: combineValidations(\n      validateRequired(['title', 'description']),\n      validateStringLength({ title: { max: 200 }, description: { max: 2000 } }),\n      validateEnum({ \n        status: ['Planning', 'Ready for Approval', 'Approved', 'In Progress', 'Deployed', 'Rolled Back', 'Closed'],\n        releaseType: ['Major', 'Minor', 'Patch', 'Hotfix']\n      }),\n      validateDate(['plannedDeploymentDate', 'actualDeploymentDate'])\n    ),\n    update: combineValidations(\n      validateId(),\n      validateStringLength({ title: { max: 200 }, description: { max: 2000 } }),\n      validateEnum({ \n        status: ['Planning', 'Ready for Approval', 'Approved', 'In Progress', 'Deployed', 'Rolled Back', 'Closed'],\n        releaseType: ['Major', 'Minor', 'Patch', 'Hotfix']\n      }),\n      validateDate(['plannedDeploymentDate', 'actualDeploymentDate'])\n    )\n  },\n  \n  // ナレッジ管理用\n  knowledge: {\n    create: combineValidations(\n      validateRequired(['title', 'content', 'category']),\n      validateStringLength({ title: { max: 200 }, content: { max: 10000 } })\n    ),\n    update: combineValidations(\n      validateId(),\n      validateStringLength({ title: { max: 200 }, content: { max: 10000 } })\n    ),\n    search: combineValidations(\n      validateSearchQuery({ minLength: 2, maxLength: 100 }),\n      validatePagination({ maxLimit: 50, defaultLimit: 10 })\n    )\n  },\n  \n  // 共通パターン\n  pagination: validatePagination(),\n  id: validateId(),\n  search: validateSearchQuery()\n};\n\nmodule.exports = {\n  validateRequired,\n  validateStringLength,\n  validateEnum,\n  validateNumericRange,\n  validateDate,\n  validateEmail,\n  validateId,\n  validatePagination,\n  validateSearchQuery,\n  customValidation,\n  combineValidations,\n  commonValidations\n};