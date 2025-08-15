// src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Globe } from 'lucide-react'; // 导入图标
import { DeveloperInfo } from './components/developer-info';

// 获取客户端信息 (无变化)
async function getClients() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('admin_session_token');
  if (!token) redirect('/admin/login');
  try {
    const res = await fetch('http://localhost:8000/api/clients', {
      headers: { Cookie: `${token.name}=${token.value}` },
    });
    if (!res.ok) throw new Error('Failed to fetch clients');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// 获取管理员信息 (无变化)
async function getCurrentUser() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('admin_session_token');
  if (!token) redirect('/admin/login');
  try {
    const res = await fetch('http://localhost:8000/api/admin/me', {
      headers: { Cookie: `${token.name}=${token.value}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return await res.json();
  } catch (error) {
    console.error(error);
    redirect('/admin/login');
  }
}

// --- 新增：获取用户统计数据的函数 ---
async function getUserStats() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('admin_session_token');
  if (!token) redirect('/admin/login');
  try {
    const res = await fetch('http://localhost:8000/api/admin/stats/users', {
      headers: { Cookie: `${token.name}=${token.value}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user stats');
    return await res.json();
  } catch (error) {
    console.error(error);
    // 出错时返回默认值，防止页面崩溃
    return { total_users: 0, new_users_last_7_days: 0 };
  }
}

export default async function DashboardOverviewPage() {
  // --- 修改这里：并行获取所有数据 ---
  const [user, clients, userStats] = await Promise.all([
    getCurrentUser(),
    getClients(),
    getUserStats()
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">欢迎, {user.full_name || user.sub}!</h1>
        <p className="text-muted-foreground">这里是您的单点登录系统概览。</p>
      </div>

      {/* 保持这个 grid 布局，它会自动处理列 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平台概览</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">个平台已注册</p>
          </CardContent>
        </Card>

        {/* --- 新增：用户概览卡片 --- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户概览</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              +{userStats.new_users_last_7_days} 位新用户 (近7日)
            </p>
          </CardContent>
        </Card>

        {/* 你可以保留这个管理员信息卡片，或者之后把它移到“设置”页面 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前管理员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{user.full_name}</div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">已接入平台列表</h2>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-4">
              {clients.map((client: any) => (
                <li key={client.client_id} className="p-4 border rounded-md">
                  <p className="font-semibold">{client.client_id}</p>
                  <p className="text-sm text-muted-foreground break-all">Redirect URI: {client.redirect_uri}</p>
                </li>
              ))}
              {clients.length === 0 && <p>暂无已接入的平台。</p>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <DeveloperInfo />
      </div>

    </div>
  );
}