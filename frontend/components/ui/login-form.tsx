'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function FormContent() {
  const [username, setUsername] = useState('john.doe');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const clientDisplayName = clientId ? `'${clientId}'` : 'the application';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      await axios.post('http://login.nepdi.com.cn:8000/api/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
      });

      const authorizeUrl = `http://login.nepdi.com.cn:8000/authorize?${searchParams.toString()}`;
      window.location.replace(authorizeUrl);
      
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0 shadow-lg">
      <CardContent className="grid p-0 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Sign In</h1>
              <p className="text-muted-foreground text-balance">
                to continue to {clientDisplayName}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="john.doe"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
        <div className="bg-muted relative hidden md:block">
          {/* 
            你可以替换这里的图片为你自己的品牌图片。
            为了方便，我们先使用一个来自 unplash 的通用图片。
            尺寸为 800x1200 以适应各种屏幕比例。
          */}
          <img
            src="unsplash.jpg"
            alt="SSO Illustration"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
          />
        </div>
      </CardContent>
    </Card>
  );
}


export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // 我们将实际的表单内容包裹在 Suspense 中，因为它依赖 useSearchParams
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Suspense fallback={
        <Card className="overflow-hidden p-0 shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2 min-h-[400px]">
            <div className="p-6 md:p-8 flex flex-col justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
             <div className="bg-muted relative hidden md:block"/>
          </CardContent>
        </Card>
      }>
        <FormContent />
      </Suspense>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance">
        Powered by SSO Authentication Service
      </div>
    </div>
  );
}