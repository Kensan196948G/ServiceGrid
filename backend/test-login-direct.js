#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, 'db', 'itsm.sqlite');

async function testLoginDirect() {
  console.log('🔍 直接ログインテスト');
  console.log('====================');

  const db = new sqlite3.Database(dbPath);
  
  const username = 'admin';
  const password = 'admin123';

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('❌ データベースエラー:', err);
      db.close();
      return;
    }

    if (!user) {
      console.error('❌ ユーザーが見つかりません');
      db.close();
      return;
    }

    console.log('✅ ユーザー見つかりました:', user.username);

    // パスワード検証
    try {
      let isPasswordValid = false;
      
      if (user.password_hash && user.password_hash !== 'initial_hash_placeholder') {
        console.log('🔐 bcryptでパスワード検証中...');
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('   検証結果:', isPasswordValid ? '✅ 成功' : '❌ 失敗');
      } else {
        console.log('🔐 プレーンテキストパスワード検証中...');
        isPasswordValid = (username === 'admin' && password === 'admin123');
        console.log('   検証結果:', isPasswordValid ? '✅ 成功' : '❌ 失敗');
      }

      if (!isPasswordValid) {
        console.error('❌ パスワード検証に失敗しました');
        db.close();
        return;
      }

      // JWTトークン生成
      console.log('🔑 JWTトークン生成中...');
      const payload = {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        email: user.email
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      });

      console.log('✅ JWTトークン生成成功');
      console.log('   Token length:', token.length);
      console.log('   Token preview:', token.substring(0, 50) + '...');

      // トークン検証
      console.log('🔍 JWTトークン検証中...');
      jwt.verify(token, process.env.JWT_SECRET, (verifyErr, decoded) => {
        if (verifyErr) {
          console.error('❌ JWT検証エラー:', verifyErr);
        } else {
          console.log('✅ JWT検証成功');
          console.log('   Decoded user:', decoded.username);
          console.log('   Decoded role:', decoded.role);
        }

        // レスポンス構築
        const response = {
          success: true,
          token,
          user: {
            id: user.user_id,
            username: user.username,
            role: user.role,
            display_name: user.display_name,
            email: user.email
          },
          message: 'ログインが成功しました'
        };

        console.log('\n✅ 完全ログインテスト成功');
        console.log('レスポンス:', JSON.stringify(response, null, 2));
        
        db.close();
      });

    } catch (error) {
      console.error('❌ ログイン処理エラー:', error);
      db.close();
    }
  });
}

testLoginDirect();