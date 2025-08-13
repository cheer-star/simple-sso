// src/app/dashboard/layout.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 这是一个服务器组件，可以直接获取 cookie
async function getUser() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('admin_session_token');


  if (!token) {
    // 理论上中间件会处理，但这里是双重保险
    redirect('/admin/login');
  }

  try {
    // 从后端获取当前用户信息
    const res = await fetch('http://localhost:8000/api/admin/me', {
      headers: {
        Cookie: `${token.name}=${token.value}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return await res.json();
  } catch (error) {
    console.error(error);
    // 获取失败也重定向到登录页
    redirect('/admin/login');
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const navItems = [
    { name: '概览', href: '/dashboard' },
    { name: '用户', href: '/dashboard/users' },
    { name: '部门', href: '#' }, // 暂时禁用
    { name: '平台', href: '#' }, // 暂时禁用
    { name: '设置', href: '#' }, // 暂时禁用
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-center">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center">
            <span className="font-bold">SSO-Admin</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-foreground/60 transition-colors hover:text-foreground/80"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-4">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user.sub}`} />
                <AvatarFallback>{user.sub.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
          </div>
        </div>
      </header>
      <main className="flex-1 justify-center flex">
        <div className="container py-10">
          {children}
        </div>
      </main>
    </div>
  );
}