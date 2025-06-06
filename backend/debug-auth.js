#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'itsm.sqlite');
const db = new sqlite3.Database(dbPath);

async function testAuthentication() {
  console.log('🔍 認証システムデバッグ');
  console.log('========================');

  // データベース接続確認
  console.log('📂 データベースパス:', dbPath);
  
  // ユーザー情報確認
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, user) => {
    if (err) {
      console.error('❌ データベースエラー:', err);
      return;
    }

    if (!user) {
      console.error('❌ adminユーザーが見つかりません');
      return;
    }

    console.log('👤 adminユーザー情報:');
    console.log('   ID:', user.user_id);
    console.log('   ユーザー名:', user.username);
    console.log('   ロール:', user.role);
    console.log('   パスワードハッシュ:', user.password_hash ? '設定済み' : '未設定');
    console.log('   パスワードソルト:', user.password_salt);

    // パスワード検証テスト
    if (user.password_hash && user.password_hash !== 'initial_hash_placeholder') {
      console.log('\n🔐 パスワード検証テスト:');
      try {
        const isValid = await bcrypt.compare('admin123', user.password_hash);
        console.log('   admin123で検証:', isValid ? '✅ 成功' : '❌ 失敗');
        
        if (!isValid) {
          console.log('   ハッシュ値:', user.password_hash);
          // 新しいハッシュを生成してテスト
          const newHash = await bcrypt.hash('admin123', 12);
          console.log('   新しいハッシュ:', newHash);
          const newIsValid = await bcrypt.compare('admin123', newHash);
          console.log('   新しいハッシュで検証:', newIsValid ? '✅ 成功' : '❌ 失敗');
        }
      } catch (bcryptErr) {
        console.error('   bcryptエラー:', bcryptErr);
      }
    }

    db.close();
  });
}

testAuthentication();