// Jest setup file
// テスト環境の環境変数設定

process.env.VITE_API_BASE_URL = 'http://localhost:8082';
process.env.VITE_GEMINI_API_KEY = 'test-api-key';

// TextEncoder/TextDecoder グローバル設定（Node.js v18以降で必要な場合）
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fetch APIモック（Node.js 18+では不要）
// global.fetch は Node.js 18以降では標準でサポートされている