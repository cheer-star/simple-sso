// client-app/src/app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

// 这个函数处理对 /api/auth/callback 的 GET 请求
export async function GET(request: NextRequest) {
  // 从请求 URL 中获取 'code' 参数
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // 如果没有 code，重定向到错误页面
  if (!code) {
    console.error("Authorization code not found.");
    // 重定向回首页，可以带上错误信息
    return NextResponse.redirect(new URL('/?error=NoCode', request.url));
  }

  try {
    // 1. 准备向 SSO Provider 的 /token 端点发送请求
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('client_id', 'client_app_2');
    formData.append('client_secret', 'client_app_2_secret');

    const response = await axios.post('http://login.nepdi.com.cn:8000/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      withCredentials: true, // 非常重要！允许跨域发送 cookie
    });

    const { access_token } = response.data;

    // 3. 将 Token 存入 cookie。这里是允许的！
    // 注意：cookie 名称是 client_session_token，不是 sso_session_token
    (await
          // 3. 将 Token 存入 cookie。这里是允许的！
          // 注意：cookie 名称是 client_session_token，不是 sso_session_token
          cookies()).set('sso_session_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 15, // 15 分钟
    });
    
    // 4. 成功后，将用户重定向到应用首页
    return NextResponse.redirect(new URL('/', "http://material.nepdi.com.cn:3001"));

  } catch (error: any) {
    console.error("Token exchange failed:", error.response?.data || error.message);
    // 如果失败，重定向回首页并带上错误信息
    return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
  }
}