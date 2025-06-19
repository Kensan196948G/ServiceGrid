const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;

const loginHTML = `
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
          const response = await fetch('http://localhost:8082/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            alert('ログイン成功！ダッシュボードページは開発中です。');
          } else {
            setError('ログインに失敗しました');
          }
        } catch (err) {
          setError('サーバーエラーが発生しました: ' + err.message);
        } finally {
          setIsSubmitting(false);
        }
      };
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                    <path d="M12 7L6.5 10v4c0 2.77 1.92 4.87 4.5 5.5 2.58-.63 4.5-2.73 4.5-5.5v-4L12 7z" fill="rgba(255,255,255,0.3)"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="パスワードを入力"
                    required
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">テストアカウント:</p>
                    <p>管理者: <code className="bg-blue-100 px-1 rounded text-xs">admin</code> / <code className="bg-blue-100 px-1 rounded text-xs">admin123</code></p>
                    <p>オペレータ: <code className="bg-blue-100 px-1 rounded text-xs">operator</code> / <code className="bg-blue-100 px-1 rounded text-xs">operator123</code></p>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={!username || !password || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ログイン中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    ログイン
                  </>
                )}
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
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(loginHTML);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 React Login Server started at http://localhost:${PORT}`);
  console.log(`📋 Login credentials: admin/admin123 or operator/operator123`);
  console.log(`🔗 Backend API: http://localhost:8082`);
});