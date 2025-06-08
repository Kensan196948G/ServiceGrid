import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Button, Input, Card } from '../components/CommonUI';
import { APP_NAME } from '../constants';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Password not actually checked in this mock
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) { // Basic validation
      setError('ユーザー名は必須です。');
      return;
    }
    // In a real app, you'd authenticate against a backend.
    // Here, we just log in with the chosen role.
    // Password "admin" for admin, anything else for user is a common mock pattern.
    const selectedRole = password === 'adminpass' ? UserRole.ADMIN : UserRole.USER;
    login(username, selectedRole); 
    setError('');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card title={`${APP_NAME}へログイン`} className="w-full max-w-md shadow-2xl">
        <div className="flex justify-center mb-6">
            <img src="https://picsum.photos/80/80?grayscale" alt="プラットフォームロゴ" className="w-20 h-20 rounded-full"/>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="ユーザー名"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="例: taro.yamada"
            required
            aria-required="true"
          />
          <Input
            label="パスワード"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力してください"
            required
            aria-required="true"
          />
          {/* Role selection can be removed if password implies role */}
          {/* <Select
            label="Role (for demo)"
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: UserRole.USER, label: 'User' },
              { value: UserRole.ADMIN, label: 'Admin' },
            ]}
          /> */}
          <p className="text-xs text-slate-500">ヒント: 管理者ロールにはパスワード 'adminpass' を使用してください。</p>
          {error && <p className="text-sm text-red-500 text-center" role="alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            ログイン
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;