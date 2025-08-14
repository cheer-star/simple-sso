'use client';

import { useState, FormEvent, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// 1. 导入新的树形选择器
import { DepartmentTreeSelect } from '@/app/dashboard/departments/components/department-tree-select';
import { User } from '@/types';

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
  initialData?: User | null;
}

export function UserFormDialog({ isOpen, onOpenChange, onActionComplete, initialData }: UserFormDialogProps) {
  const isEditing = !!initialData;
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    department_id: '' // 保持为 string, 'none' 或 id
  });

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        username: initialData.username,
        full_name: initialData.full_name,
        email: initialData.email,
        password: '',
        department_id: initialData.department ? String(initialData.department.id) : 'none'
      });
    } else {
      setFormData({ username: '', full_name: '', email: '', password: '', department_id: '' });
    }
  }, [initialData, isEditing, isOpen]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      full_name: formData.full_name,
      email: formData.email,
      department_id: (formData.department_id && formData.department_id !== 'none') ? parseInt(formData.department_id) : null,
    };
    
    if (!isEditing) {
      payload.username = formData.username;
      payload.password = formData.password;
    }

    const url = isEditing ? `/api/admin/users/${initialData?.id}` : '/api/admin/users';
    const method = isEditing ? 'put' : 'post';
    
    try {
      await api[method](url, payload);
      toast.success(`User ${isEditing ? 'updated' : 'created'} successfully.`);
      onOpenChange(false);
      onActionComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'create'} user.`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required disabled={isEditing} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          
          {!isEditing && (
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!isEditing} />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="department">Department</Label>
            {/* 2. 使用新的 DepartmentTreeSelect 组件 */}
            <DepartmentTreeSelect
              value={formData.department_id}
              onValueChange={value => setFormData({ ...formData, department_id: value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}