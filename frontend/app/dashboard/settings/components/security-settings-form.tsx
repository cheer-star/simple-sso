'use client';

import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SecuritySettings {
  session_duration_admin_hours: number;
  password_min_length: number;
  password_require_uppercase: boolean;
}

export function SecuritySettingsForm() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/settings/security')
      .then(response => {
        setSettings(response.data);
      })
      .catch(() => toast.error("Failed to load security settings."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await api.put('/api/admin/settings/security', settings);
      toast.success("Security settings updated successfully.");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update settings.");
    }
  };

  if (isLoading) return <div>Loading security settings...</div>;
  if (!settings) return <div>Failed to load settings.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Policies</CardTitle>
        <CardDescription>Configure system-wide security settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Admin Session Duration (hours)</Label>
            <Input type="number" value={settings.session_duration_admin_hours} onChange={e => setSettings({ ...settings, session_duration_admin_hours: parseInt(e.target.value) || 1 })} min="1" />
            <p className="text-sm text-muted-foreground">How long an admin can stay logged in before needing to re-authenticate.</p>
          </div>
          <div className="space-y-2">
            <Label>Minimum Password Length</Label>
            <Input type="number" value={settings.password_min_length} onChange={e => setSettings({ ...settings, password_min_length: parseInt(e.target.value) || 8 })} min="8" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Require Uppercase Letter</Label>
                <p className="text-sm text-muted-foreground">Passwords must contain at least one uppercase letter (A-Z).</p>
              </div>
              <Switch checked={settings.password_require_uppercase} onCheckedChange={checked => setSettings({...settings, password_require_uppercase: checked })}/>
          </div>
          <Button type="submit">Save Security Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}