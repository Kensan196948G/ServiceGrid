// Node.js 内蔵テストランナー対応版
const { test, describe } = require('node:test');
const assert = require('node:assert');

// TextEncoder/TextDecoder polyfill for Node.js testing
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

const request = require('supertest');
const app = require('../server');
const { initDatabase } = require('../scripts/init-database');

describe('Authentication API', () => {
  let server;

  beforeAll(async () => {
    // テスト用データベースを初期化
    await initDatabase();
    
    // テストサーバーを起動
    server = app.listen(0); // ランダムポートを使用
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/auth/login', () => {
    it('有効な認証情報でログインできる', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).toHaveProperty('role', 'administrator');
    });

    it('無効な認証情報でログインが失敗する', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('必須フィールドが不足している場合にエラーを返す', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'admin'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password required');
    });

    it('存在しないユーザーでログインが失敗する', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // 認証トークンを取得
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('有効なトークンでユーザー情報を取得できる', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'admin');
      expect(response.body).toHaveProperty('role', 'administrator');
    });

    it('トークンなしでアクセスが拒否される', async () => {
      const response = await request(server)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('無効なトークンでアクセスが拒否される', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });
});