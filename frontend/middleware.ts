import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // --- 修改这里：检查新的 cookie 名称 ---
  const adminSessionToken = request.cookies.get('admin_session_token');

  // --- 修改这里：使用新的 token 变量 ---
  if (!adminSessionToken) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};