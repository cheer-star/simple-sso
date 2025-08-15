'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ImportUsersButtonProps {
  onActionComplete: () => void;
}

export function ImportUsersButton({ onActionComplete }: ImportUsersButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to import.");
      return;
    }
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post(`/api/admin/users/import?overwrite=${overwrite}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { new_users, updated_users, skipped_users, errors } = response.data;
      
      let description = `Created: ${new_users}, Updated: ${updated_users}, Skipped: ${skipped_users}.`;
      if (errors.length > 0) {
          description += ` Errors: ${errors.length}. Check console for details.`;
          console.error("Import Errors:", errors);
      }
      
      toast.success("Import Complete", { description });
      onActionComplete();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to import users.");
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
          <DialogDescription>Upload an Excel file to bulk-create or update users.</DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Label>Import Mode</Label>
          <div className="flex items-center space-x-2 rounded-lg border p-4 mt-2">
            <Switch id="overwrite-mode" checked={overwrite} onCheckedChange={setOverwrite} />
            <div className="flex-1">
              <Label htmlFor="overwrite-mode" className="font-bold">Update existing users</Label>
              <p className="text-xs text-muted-foreground">If enabled, users with matching usernames in the file will be updated. Otherwise, they will be skipped.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold mb-2">File Structure Guide</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Your file must contain the required columns. You can <a href="/user_template.xlsx" download className="underline text-primary">download a template here</a>.
          </p>
          <Table>
            <TableHeader><TableRow><TableHead>Column</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-mono font-bold">username</TableCell><TableCell>Unique identifier for the user. Used to check for existence.</TableCell></TableRow>
              <TableRow><TableCell className="font-mono font-bold">email</TableCell><TableCell>User's unique email address.</TableCell></TableRow>
              <TableRow><TableCell className="font-mono font-bold">full_name</TableCell><TableCell>User's full name.</TableCell></TableRow>
              <TableRow><TableCell className="font-mono font-bold">password</TableCell><TableCell>Initial password for **new users only**.</TableCell></TableRow>
              <TableRow><TableCell className="font-mono">department_name</TableCell><TableCell>Optional. The exact name of an existing department.</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-4">
          <Label htmlFor="file-upload">Upload Excel File (.xlsx, .xls)</Label>
          <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
            {isImporting ? "Importing..." : "Confirm and Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}