'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator, // 导入分隔线
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@/types';
import { UserFormDialog } from './user-form-dialog'; // 编辑功能依然使用这个

interface UserActionsProps {
  user: User;
  onActionComplete: () => void;
}

export function UserActions({ user, onActionComplete }: UserActionsProps) {
  // 1. 恢复 Reset Password 和 Delete 的状态管理
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // 2. 恢复重置密码的独立 state 和 handler
  const [newPassword, setNewPassword] = useState('');

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error("Password cannot be empty.");
      return;
    }
    try {
      await api.post(`/api/admin/users/${user.id}/reset-password`, { new_password: newPassword });
      toast.success(`Password for ${user.username} has been reset.`);
      setIsResetPasswordOpen(false);
      setNewPassword(''); // 重置 state
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to reset password.");
    }
  };
  
  const handleDeleteUser = async () => {
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      toast.success("User has been deleted.");
      setIsDeleteOpen(false);
      onActionComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete user.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            Edit User
          </DropdownMenuItem>
          {/* 3. 恢复 Reset Password 菜单项 */}
          <DropdownMenuItem onClick={() => setIsResetPasswordOpen(true)}>
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator /> {/* 添加分隔线，视觉上更清晰 */}
          <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-600" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 编辑用户的 Dialog (保持不变) */}
      <UserFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onActionComplete={onActionComplete}
        initialData={user}
      />
      
      {/* 4. 恢复独立的 Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password for {user.username}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleResetPassword}>Set New Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除用户的 Dialog (保持不变) */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <strong>{user.username}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}