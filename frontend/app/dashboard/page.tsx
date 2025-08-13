// src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 获取平台（客户端）信息
async function getClients() {
    const cookieStore = cookies();
    const token = (await cookieStore).get('admin_session_token');
    if (!token) redirect('/admin/login'); // 安全检查

    try {
        const res = await fetch('http://localhost:8000/api/clients', {
            headers: { Cookie: `${token.name}=${token.value}` },
        });
        if (!res.ok) throw new Error('Failed to fetch clients');
        return await res.json();
    } catch (error) {
        console.error(error);
        return []; // 出错时返回空数组
    }
}

// 获取当前用户信息 (可以从 layout 传递，但为了组件独立性，再次获取)
async function getCurrentUser() {
    const cookieStore = cookies();
    const token = (await cookieStore).get('admin_session_token');
    if (!token) redirect('/admin/login');

    try {
        const res = await fetch('http://localhost:8000/api/admin/me', {
            headers: { Cookie: `${token.name}=${token.value}`  },
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        return await res.json();
    } catch (error) {
        console.error(error);
        redirect('/admin/login');
    }
}


export default async function DashboardOverviewPage() {
    // 并行获取数据
    const [user, clients] = await Promise.all([getCurrentUser(), getClients()]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">欢迎, {user.full_name || user.sub}!</h1>
                <p className="text-muted-foreground">这里是您的单点登录系统概览。</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>当前用户</CardTitle>
                        <CardDescription>当前登录的管理员账户信息。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p><strong>用户名:</strong> {user.sub}</p>
                            <p><strong>全名:</strong> {user.full_name}</p>
                            <p><strong>邮箱:</strong> {user.email}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>平台概览</CardTitle>
                        <CardDescription>已接入 SSO 的平台总数。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold">{clients.length}</div>
                        <p className="text-xs text-muted-foreground">个平台已注册</p>
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
        </div>
    );
}