// client-app/src/app/profile/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';

interface UserPayload {
  sub: string;
  email: string;
  exp: number;
}

export default async function ProfilePage() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('sso_session_token')?.value;

  if (!token) {
    // 如果没有 token，重定向到首页，首页会显示登录链接
    redirect('/');
  }

  let user: UserPayload;
  try {
    user = jwtDecode<UserPayload>(token);
    // 检查 token 是否过期
    if (Date.now() >= user.exp * 1000) {
      throw new Error("Token expired");
    }
  } catch (e) {
    console.error('Invalid or expired token', e);
    // 如果 token 无效或过期，也重定向
    redirect('/');
  }

  return (
    <div style={{ padding: '50px' }}>
      <h1>Your Profile</h1>
      <p>This is a protected page.</p>
      <p>Name: <strong>{user.sub}</strong></p>
      <p>Email: <strong>{user.email}</strong></p>
      <Link href="/">Back to Home</Link>
    </div>
  );
}