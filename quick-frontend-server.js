const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static('.'));

// API proxy to backend
app.use('/api', (req, res) => {
  // Simple proxy to backend on port 8082
  const backendUrl = `http://localhost:8082${req.url}`;
  console.log(`Proxying API request: ${req.method} ${backendUrl}`);
  
  // Send a simple response for now
  if (req.url === '/health') {
    res.json({ status: 'Frontend proxy OK', backend: 'http://localhost:8082' });
  } else {
    res.status(502).json({ error: 'Backend proxy not implemented' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  console.log(`Serving React app for: ${req.path}`);
  
  // Simple HTML that loads React app
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ITSM運用システム</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; }
    .loading { display: flex; align-items: center; justify-content: center; height: 100vh; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      <p class="ml-4 text-xl">ITSM運用システム読み込み中...</p>
    </div>
  </div>

  <script type="text/babel">
    const { useState, useEffect, createContext, useContext } = React;
    const { BrowserRouter, Routes, Route, Navigate, useNavigate } = ReactRouterDOM;

    // Simple Auth Context
    const AuthContext = createContext();

    const AuthProvider = ({ children }) => {
      const [user, setUser] = useState(null);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState(null);

      const login = async (username, password) => {
        setError(null);
        setIsLoading(true);
        
        // Mock authentication
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'operator' && password === 'operator123')) {
          setTimeout(() => {
            setUser({ 
              username, 
              role: username === 'admin' ? 'ADMIN' : 'USER',
              id: '1'
            });
            setIsLoading(false);
          }, 1000);
          return true;
        } else {
          setError('ユーザー名またはパスワードが正しくありません');
          setIsLoading(false);
          return false;
        }
      };

      const logout = () => {
        setUser(null);
        setError(null);
      };

      return React.createElement(AuthContext.Provider, {
        value: { user, login, logout, isLoading, error }
      }, children);
    };

    const useAuth = () => useContext(AuthContext);

    // Login Page Component
    const LoginPage = () => {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const { login, error, isLoading } = useAuth();
      const navigate = useNavigate();

      const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) {
          navigate('/dashboard');
        }
      };

      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4'
      }, 
        React.createElement('div', {
          className: 'w-full max-w-md bg-white rounded-lg shadow-2xl p-8'
        }, [
          React.createElement('div', { key: 'header', className: 'text-center mb-8' }, [
            React.createElement('div', { 
              key: 'icon',
              className: 'w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4'
            }, '🔒'),
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold text-slate-800 mb-1' 
            }, 'ITSM運用システム'),
            React.createElement('p', { 
              key: 'subtitle',
              className: 'text-sm text-slate-600' 
            }, 'プラットフォーム')
          ]),
          React.createElement('form', {
            key: 'form',
            onSubmit: handleSubmit,
            className: 'space-y-5'
          }, [
            React.createElement('div', { key: 'username-field' }, [
              React.createElement('label', {
                key: 'username-label',
                className: 'block text-sm font-medium text-slate-700 mb-1'
              }, 'ユーザー名'),
              React.createElement('input', {
                key: 'username-input',
                type: 'text',
                value: username,
                onChange: (e) => setUsername(e.target.value),
                className: 'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                placeholder: 'ユーザー名を入力',
                required: true,
                disabled: isLoading
              })
            ]),
            React.createElement('div', { key: 'password-field' }, [
              React.createElement('label', {
                key: 'password-label',
                className: 'block text-sm font-medium text-slate-700 mb-1'
              }, 'パスワード'),
              React.createElement('input', {
                key: 'password-input',
                type: 'password',
                value: password,
                onChange: (e) => setPassword(e.target.value),
                className: 'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                placeholder: 'パスワードを入力',
                required: true,
                disabled: isLoading
              })
            ]),
            React.createElement('div', {
              key: 'test-accounts',
              className: 'bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800'
            }, [
              React.createElement('p', { key: 'test-title', className: 'font-medium mb-1' }, 'テストアカウント:'),
              React.createElement('p', { key: 'admin' }, '管理者: admin / admin123'),
              React.createElement('p', { key: 'operator' }, 'オペレータ: operator / operator123')
            ]),
            error && React.createElement('div', {
              key: 'error',
              className: 'bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800'
            }, error),
            React.createElement('button', {
              key: 'submit',
              type: 'submit',
              disabled: !username || !password || isLoading,
              className: 'w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }, isLoading ? 'ログイン中...' : 'ログイン')
          ])
        ])
      );
    };

    // Dashboard Page Component
    const DashboardPage = () => {
      const { user, logout } = useAuth();
      
      return React.createElement('div', {
        className: 'min-h-screen bg-slate-50'
      }, [
        React.createElement('div', {
          key: 'header',
          className: 'bg-white shadow border-b border-slate-200'
        }, 
          React.createElement('div', {
            className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
          },
            React.createElement('div', {
              className: 'flex justify-between items-center py-4'
            }, [
              React.createElement('h1', {
                key: 'title',
                className: 'text-2xl font-bold text-slate-800'
              }, 'ITSM運用システム ダッシュボード'),
              React.createElement('div', {
                key: 'user-info',
                className: 'flex items-center space-x-4'
              }, [
                React.createElement('span', {
                  key: 'welcome',
                  className: 'text-slate-600'
                }, \`ようこそ、\${user?.username}さん\`),
                React.createElement('button', {
                  key: 'logout',
                  onClick: logout,
                  className: 'bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700'
                }, 'ログアウト')
              ])
            ])
          )
        ),
        React.createElement('div', {
          key: 'content',
          className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
        }, [
          React.createElement('div', {
            key: 'welcome-card',
            className: 'bg-white rounded-lg shadow p-6 mb-6'
          }, [
            React.createElement('h2', {
              key: 'welcome-title',
              className: 'text-xl font-semibold text-slate-800 mb-2'
            }, 'ダッシュボード'),
            React.createElement('p', {
              key: 'welcome-text',
              className: 'text-slate-600'
            }, 'ITSM運用システムへようこそ。左側のメニューから各機能にアクセスできます。')
          ]),
          React.createElement('div', {
            key: 'stats',
            className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'
          }, [
            React.createElement('div', {
              key: 'incidents',
              className: 'bg-white rounded-lg shadow p-6'
            }, [
              React.createElement('h3', {
                key: 'incidents-title',
                className: 'text-lg font-medium text-slate-800 mb-2'
              }, 'インシデント'),
              React.createElement('p', {
                key: 'incidents-count',
                className: 'text-3xl font-bold text-blue-600'
              }, '24'),
              React.createElement('p', {
                key: 'incidents-label',
                className: 'text-sm text-slate-500'
              }, 'オープン中')
            ]),
            React.createElement('div', {
              key: 'assets',
              className: 'bg-white rounded-lg shadow p-6'
            }, [
              React.createElement('h3', {
                key: 'assets-title',
                className: 'text-lg font-medium text-slate-800 mb-2'
              }, '資産'),
              React.createElement('p', {
                key: 'assets-count',
                className: 'text-3xl font-bold text-green-600'
              }, '342'),
              React.createElement('p', {
                key: 'assets-label',
                className: 'text-sm text-slate-500'
              }, '管理中')
            ]),
            React.createElement('div', {
              key: 'requests',
              className: 'bg-white rounded-lg shadow p-6'
            }, [
              React.createElement('h3', {
                key: 'requests-title',
                className: 'text-lg font-medium text-slate-800 mb-2'
              }, 'サービス要求'),
              React.createElement('p', {
                key: 'requests-count',
                className: 'text-3xl font-bold text-yellow-600'
              }, '15'),
              React.createElement('p', {
                key: 'requests-label',
                className: 'text-sm text-slate-500'
              }, '承認待ち')
            ]),
            React.createElement('div', {
              key: 'availability',
              className: 'bg-white rounded-lg shadow p-6'
            }, [
              React.createElement('h3', {
                key: 'availability-title',
                className: 'text-lg font-medium text-slate-800 mb-2'
              }, 'システム可用性'),
              React.createElement('p', {
                key: 'availability-count',
                className: 'text-3xl font-bold text-green-600'
              }, '99.8%'),
              React.createElement('p', {
                key: 'availability-label',
                className: 'text-sm text-slate-500'
              }, '今月の稼働率')
            ])
          ])
        ])
      ]);
    };

    // Protected Route Component
    const ProtectedRoute = ({ children }) => {
      const { user } = useAuth();
      return user ? children : React.createElement(Navigate, { to: '/login', replace: true });
    };

    // Main App Component
    const App = () => {
      return React.createElement(AuthProvider, {},
        React.createElement(BrowserRouter, {},
          React.createElement(Routes, {}, [
            React.createElement(Route, {
              key: 'login',
              path: '/login',
              element: React.createElement(LoginPage)
            }),
            React.createElement(Route, {
              key: 'dashboard',
              path: '/dashboard',
              element: React.createElement(ProtectedRoute, {},
                React.createElement(DashboardPage)
              )
            }),
            React.createElement(Route, {
              key: 'root',
              path: '/',
              element: React.createElement(Navigate, { to: '/dashboard', replace: true })
            }),
            React.createElement(Route, {
              key: 'fallback',
              path: '*',
              element: React.createElement(Navigate, { to: '/dashboard', replace: true })
            })
          ])
        )
      );
    };

    // Render the app
    ReactDOM.render(React.createElement(App), document.getElementById('root'));
  </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on http://localhost:${PORT}`);
  console.log(`📊 Backend proxy: http://localhost:8082`);
});