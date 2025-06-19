const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Static files
app.use(express.static('.'));

// React app route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ITSM運用システムプラットフォーム</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState } = React;
    
    const LoginPage = () => {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [error, setError] = useState('');
      
      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard';
          } else {
            setError('ログインに失敗しました');
          }
        } catch (err) {
          setError('サーバーエラーが発生しました');
        } finally {
          setIsSubmitting(false);
        }
      };
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                </svg>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">ITSM運用システム</h1>
              <p className="text-sm text-slate-600 mb-4">プラットフォーム</p>
              <div className="w-16 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto"></div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ユーザー名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ユーザー名を入力"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">パスワード</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="パスワードを入力"
                    required
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">テストアカウント:</p>
                  <p>管理者: admin / admin123</p>
                  <p>オペレータ: operator / operator123</p>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={!username || !password || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          </div>
        </div>
      );
    };
    
    ReactDOM.render(<LoginPage />, document.getElementById('root'));
  </script>
</body>
</html>
  `);
});

// API proxy
app.use('/api', (req, res) => {
  res.redirect(307, `http://localhost:8082${req.originalUrl}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 React Login Server started at http://localhost:${PORT}`);
  console.log(`📋 Login credentials: admin/admin123 or operator/operator123`);
});