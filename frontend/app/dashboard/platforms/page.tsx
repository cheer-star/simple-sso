'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Platform } from '@/types';
import api from '@/lib/api';

import { CreatePlatformButton } from './components/create-platform-button';
import { PlatformTable } from './components/platform-table';

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlatforms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/clients');
      setPlatforms(response.data);
    } catch (error) {
      toast.error("Failed to fetch platforms.");
      setPlatforms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Management</h1>
          <p className="text-muted-foreground">Manage client applications registered with the SSO.</p>
        </div>
        <CreatePlatformButton onPlatformCreated={fetchPlatforms} />
      </div>
      
      <PlatformTable 
        platforms={platforms}
        isLoading={isLoading} 
        onActionComplete={fetchPlatforms} 
      />
    </div>
  );
}