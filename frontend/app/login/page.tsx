// frontend/src/app/login/page.tsx
'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

function LoginPage() {
  const [username, setUsername] = useState('john.doe');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      // 1. 调用后端登录接口，后端会设置 httpOnly 的 SSO session cookie
      await axios.post('http://localhost:8000/api/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true, // 非常重要！允许跨域发送 cookie
      });

      // 2. 登录成功后，重新导向到 /authorize 端点
      // 这样 FastAPI 就能检测到 SSO session cookie 并生成授权码
      const authorizeUrl = `http://localhost:8000/authorize?${searchParams.toString()}`;
      // 使用 window.location.replace 进行重定向，以便后端能正确处理
      window.location.replace(authorizeUrl);
      
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'An unexpected error occurred.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>SSO Login</h1>
      <p>Login to continue to the application.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '4px' }}>
          Log In
        </button>
      </form>
    </div>
  );
}

// 使用 Suspense 包裹，因为 useSearchParams 需要它
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  )
}