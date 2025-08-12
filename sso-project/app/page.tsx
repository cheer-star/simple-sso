// client-app/src/app/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import {jwtDecode} from 'jwt-decode';

interface UserPayload {
  name: string;
  email: string;
  exp: number;
}

export default async function Home() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('client_session_token')?.value;
  let user: UserPayload | null = null;

  if (token) {
    try {
      user = jwtDecode<UserPayload>(token);
    } catch (e) {
      console.error('Invalid token');
    }
  }

  // 构建到 SSO 服务的登录链接
  const ssoLoginUrl = new URL('http://localhost:8000/authorize');
  ssoLoginUrl.searchParams.append('response_type', 'code');
  ssoLoginUrl.searchParams.append('client_id', 'client_app_1');
  ssoLoginUrl.searchParams.append('redirect_uri', 'http://localhost:3001/auth/callback');

  return (
    <div style={{ padding: '50px' }}>
      <h1>Welcome to Client App</h1>
      {user ? (
        <div>
          <p>You are logged in as: <strong>{user.name}</strong> ({user.email})</p>
          <p>
            <Link href="/profile">Go to Profile (Protected Page)</Link>
          </p>
          <a href="/api/logout">Logout</a>
        </div>
      ) : (
        <div>
          <p>You are not logged in.</p>
          <a href={ssoLoginUrl.toString()}>Login with SSO</a>
        </div>
      )}
    </div>
  );
}