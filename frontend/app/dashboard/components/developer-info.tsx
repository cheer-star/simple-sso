'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Platform } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MarkdownGuide } from './markdown-guide';

export function DeveloperInfo() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    api.get('/api/admin/clients')
      .then(response => {
        setPlatforms(response.data);
        if (response.data.length > 0) {
          setSelectedPlatform(response.data[0]);
        }
      })
      .catch(() => toast.error("Failed to load platforms."));
  }, []);

  const handlePlatformChange = (clientId: string) => {
    const platform = platforms.find(p => p.client_id === clientId) || null;
    setSelectedPlatform(platform);
    setClientSecret(null); // 切换平台时隐藏密钥
  };

  const handleRevealSecret = async () => {
    if (!selectedPlatform) return;
    try {
      const response = await api.post(`/api/admin/clients/${selectedPlatform.client_id}/reveal-secret`);
      if (response.data && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      } else {
        toast.error("API response did not contain a secret.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to reveal client secret.");
    }
  };

  const handleResetSecret = async () => {
    if (!selectedPlatform) return;
    try {
      const response = await api.post(`/api/admin/clients/${selectedPlatform.client_id}/reset-secret`);
       if (response.data && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
        toast.success("Client Secret has been reset. Please save the new secret.");
       } else {
        toast.error("API response did not contain the new secret.");
       }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to reset client secret.");
    } finally {
        setIsResetConfirmOpen(false);
    }
  };

  const generateMarkdownContent = (platform: Platform): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const authUrl = `${baseUrl}/authorize?response_type=code&client_id=${platform.client_id}&redirect_uri=${platform.redirect_uri}`;
    
    return `
### Step 1: Redirect User for Login

Your application should redirect the user to the following URL. This will present them with the SSO login page.

\`\`\`
${authUrl}
\`\`\`

### Step 2: Handle the Callback

After the user successfully logs in, they will be redirected back to your application's specified **Redirect URI** (\`${platform.redirect_uri}\`).

A one-time **authorization code** will be included as a URL query parameter.

**Example Redirect:**
\`\`\`
${platform.redirect_uri}?code=AUTHORIZATION_CODE_HERE
\`\`\`

### Step 3: Exchange Code for a Token

Your application's backend must then make a \`POST\` request to the Token URL to exchange the authorization code for a JWT access token. This request must be server-to-server.

**Token URL:** \`${baseUrl}/token\`

**Request Body (form-urlencoded):**
- \`grant_type\`: "authorization_code"
- \`code\`: The code you received in Step 2.
- \`client_id\`: \`${platform.client_id}\`
- \`client_secret\`: Your Client Secret.
- \`redirect_uri\`: \`${platform.redirect_uri}\`

**Example using cURL:**
\`\`\`bash
curl -X POST ${baseUrl}/token \\
  -d grant_type=authorization_code \\
  -d code=AUTHORIZATION_CODE_FROM_STEP_2 \\
  -d client_id=${platform.client_id} \\
  -d client_secret=YOUR_CLIENT_SECRET \\
  -d redirect_uri=${platform.redirect_uri}
\`\`\`

The response will contain the \`access_token\`, which you can then use to verify the user's identity.
    `;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Integration Guide</CardTitle>
        <CardDescription>How to connect your application to this SSO service.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className='pb-2'>Select a Platform to View Details</Label>
          <Select onValueChange={handlePlatformChange} value={selectedPlatform?.client_id}>
            <SelectTrigger>
              <SelectValue placeholder="Select a platform..." />
            </SelectTrigger>
            <SelectContent>
              {platforms.map(p => (
                <SelectItem key={p.client_id} value={p.client_id}>{p.client_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedPlatform && (
            <div className='space-y-4'>
                <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input readOnly value={selectedPlatform.client_id} />
                </div>
                <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <div className="flex items-center space-x-2">
                        <Input readOnly type={!clientSecret ? "password" : "text"} value={clientSecret || "••••••••••••••••"} />
                        <Button variant="outline" onClick={handleRevealSecret} disabled={!!clientSecret}>Reveal</Button>
                        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>Reset</Button>
                    </div>
                </div>

                <div className="pt-4">
                  <MarkdownGuide content={generateMarkdownContent(selectedPlatform)} />
                </div>
            </div>
        )}

        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset Client Secret?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will invalidate the current secret for "{selectedPlatform?.client_id}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSecret} className="bg-destructive hover:bg-destructive/90">Reset Secret</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}