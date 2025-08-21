import { LoginForm } from "@/components/ui/login-form";

export default function LoginPage() {
  return (
    // 使用 flex-col 来确保页脚文本在卡片下方
    <div className="bg-slate-50 dark:bg-slate-900 flex min-h-screen flex-col items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  );
}