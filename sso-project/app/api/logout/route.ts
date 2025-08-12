// client-app/src/app/api/logout/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  // 清除本应用的 session cookie
  (await
        // 清除本应用的 session cookie
        cookies()).delete('sso_session_token');

  // 重定向到首页
  const response = NextResponse.redirect('http://material.nepdi.com.cn:3001/', { status: 302 });
  return response;
}