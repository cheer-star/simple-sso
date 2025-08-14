'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserFormDialog } from './user-form-dialog'; // 导入新的通用表单

interface CreateUserButtonProps {
  onUserCreated: () => void;
}

export function CreateUserButton({ onUserCreated }: CreateUserButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        New User
      </Button>
      {/* 渲染通用表单，但不传入 initialData (创建模式) */}
      <UserFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onActionComplete={onUserCreated}
      />
    </>
  );
}