import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyAccountForm } from './components/my-account-form';
import { SecuritySettingsForm } from './components/security-settings-form';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system-wide settings.</p>
      </div>

      <Tabs defaultValue="my-account" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-account">My Account</TabsTrigger>
          <TabsTrigger value="security" disabled>Security</TabsTrigger>
        </TabsList>
        <TabsContent value="my-account" className="mt-6">
          <MyAccountForm />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecuritySettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}