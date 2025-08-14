'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Platform } from '@/types';
import { PlatformActions } from './platform-actions';

interface PlatformTableProps {
  platforms: Platform[];
  isLoading: boolean;
  onActionComplete: () => void;
}

export function PlatformTable({ platforms, isLoading, onActionComplete }: PlatformTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client ID</TableHead>
            <TableHead>Redirect URI</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={3} className="text-center h-24">Loading platforms...</TableCell></TableRow>
          ) : platforms.length === 0 ? (
            <TableRow><TableCell colSpan={3} className="text-center h-24">No platforms found.</TableCell></TableRow>
          ) : (
            platforms.map((platform) => (
              <TableRow key={platform.client_id}>
                <TableCell className="font-mono">{platform.client_id}</TableCell>
                <TableCell className="font-mono break-all">{platform.redirect_uri}</TableCell>
                <TableCell className="text-right">
                  <PlatformActions platform={platform} onActionComplete={onActionComplete} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}