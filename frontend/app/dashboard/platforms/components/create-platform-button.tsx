'use client';

import { useState, FormEvent } from 'react';
import { PlusCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Platform } from '@/types';
import { Label } from '@/components/ui/label';

interface CreatePlatformButtonProps {
  onPlatformCreated: () => void;
}

export function CreatePlatformButton({ onPlatformCreated }: CreatePlatformButtonProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ client_id: '', redirect_uri: '' });
  const [createdPlatform, setCreatedPlatform] = useState<Platform | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleCreatePlatform = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/admin/clients', newPlatform);
      setCreatedPlatform(response.data);
      toast.success("Platform created successfully.");
      setIsCreateOpen(false); // 关闭创建对话框
      setIsSuccessOpen(true); // 打开成功对话框
      setNewPlatform({ client_id: '', redirect_uri: '' }); // 重置表单
      onPlatformCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create platform.");
    }
  };

  const handleCopySecret = () => {
    if (createdPlatform?.client_secret) {
      navigator.clipboard.writeText(createdPlatform.client_secret);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000); // Reset icon after 2 seconds
    }
  };

  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Platform
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Platform</DialogTitle>
            <DialogDescription>The Client Secret will be generated automatically.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePlatform} className="grid gap-4 py-4">
            <Input placeholder="Client ID (e.g., my-cool-app)" value={newPlatform.client_id} onChange={(e) => setNewPlatform({ ...newPlatform, client_id: e.target.value })} required />
            <Input type="url" placeholder="Redirect URI (e.g., https://app.com/callback)" value={newPlatform.redirect_uri} onChange={(e) => setNewPlatform({ ...newPlatform, redirect_uri: e.target.value })} required />
            <DialogFooter>
              <Button type="submit">Create Platform</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Platform Created Successfully!</DialogTitle>
            <DialogDescription className="text-destructive">
              This is the **only** time you will see the Client Secret. Copy it and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Client ID</Label>
              <p className="font-mono text-sm p-2 bg-muted rounded-md">{createdPlatform?.client_id}</p>
            </div>
            <div>
              <Label>Client Secret</Label>
              <div className="flex items-center space-x-2">
                <Input readOnly value={createdPlatform?.client_secret} className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopySecret}>
                  {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuccessOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}