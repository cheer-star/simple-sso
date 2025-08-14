'use client';

import { useState, FormEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Platform } from '@/types';

interface PlatformActionsProps {
  platform: Platform;
  onActionComplete: () => void;
}

export function PlatformActions({ platform, onActionComplete }: PlatformActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [updatedRedirectUri, setUpdatedRedirectUri] = useState(platform.redirect_uri);

  const handleUpdatePlatform = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/clients/${platform.client_id}`, { redirect_uri: updatedRedirectUri });
      toast.success("Platform updated successfully.");
      setIsEditOpen(false);
      onActionComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update platform.");
    }
  };
  
  const handleDeletePlatform = async () => {
    try {
      await api.delete(`/api/admin/clients/${platform.client_id}`);
      toast.success("Platform has been deleted.");
      setIsDeleteOpen(false);
      onActionComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete platform.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-600" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Platform</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePlatform} className="space-y-4 py-4">
            <div>
              <Label>Client ID (read-only)</Label>
              <Input readOnly value={platform.client_id} />
            </div>
            <div>
              <Label htmlFor="redirect-uri">Redirect URI</Label>
              <Input id="redirect-uri" type="url" value={updatedRedirectUri} onChange={(e) => setUpdatedRedirectUri(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the platform <strong>{platform.client_id}</strong> and prevent it from using the SSO service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlatform} className="bg-red-600 hover:bg-red-700">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}