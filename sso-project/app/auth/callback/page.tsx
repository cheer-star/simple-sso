// client-app/src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import axios from 'axios';

async function handleCallback({ code }: { code: string }) {
  if (!code) {
    return <div>Error: No authorization code found.</div>;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('client_id', 'client_app_1');
    formData.append('client_secret', 'client_app_1_secret');

    // 服务器端请求，交换 code 获取 token
    const response = await axios.post('http://localhost:8000/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = response.data;

    // 将 access_token 存入此应用的 cookie 中
    (await cookies()).set('client_session_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 15, // 15 分钟，与 token 有效期一致
    });

  } catch (error: any) {
    console.error("Token exchange failed:", error.response?.data);
    return <div>Error: Could not log you in. Please try again.</div>;
  }
  
  // 登录成功，重定向到首页
  redirect('/');
}


export default function AuthCallbackPage({ searchParams }: { searchParams: { code: string } }) {
  // 注意：UI 部分不会被渲染，因为 handleCallback 会执行重定向
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {handleCallback(searchParams)}
    </Suspense>
  );
}