'use client';

import { useState, FormEvent } from 'react';
import axios from 'axios';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import api from '@/lib/api';

interface CreateUserButtonProps {
  onUserCreated: () => void;
}

export function CreateUserButton({ onUserCreated }: CreateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', email: '', password: '' });

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/users', newUser);

      toast.success("User created successfully.");
      setIsOpen(false);
      setNewUser({ username: '', full_name: '', email: '', password: '' });
      onUserCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create user.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Fill in the details to create a new SSO user.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateUser} className="grid gap-4 py-4">
          <Input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} required />
          <Input placeholder="Full Name" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} required />
          <Input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required />
          <Input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
          <DialogFooter>
            <Button type="submit">Create User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}