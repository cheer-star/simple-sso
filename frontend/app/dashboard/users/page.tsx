'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { User } from '@/types';

import { CreateUserButton } from './components/create-user-button';
import { UserTable } from './components/user-table';

import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/users');

      setUsers(response.data.items);
    } catch (error) {
      toast.error("Failed to fetch users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all SSO users in the system.</p>
        </div>
        <CreateUserButton onUserCreated={fetchUsers} />
      </div>
      
      <UserTable 
        users={users} 
        isLoading={isLoading} 
        onActionComplete={fetchUsers} 
      />
    </div>
  );
}