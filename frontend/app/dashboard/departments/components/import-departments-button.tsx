'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ImportDepartmentsButtonProps {
    onActionComplete: () => void;
}

export function ImportDepartmentsButton({ onActionComplete }: ImportDepartmentsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
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
            const response = await api.post('/api/admin/departments/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(response.data.message || "Departments imported successfully.");
            onActionComplete();
            setIsOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to import departments.");
        } finally {
            setIsImporting(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Import Departments</DialogTitle>
                    <DialogDescription>Upload an Excel file to bulk-create your department structure.</DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="mt-4">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Warning: Overwrite Operation</AlertTitle>
                    <AlertDescription>
                        Importing a new file will **delete all existing departments** and their user associations before creating the new structure. This action cannot be undone.
                    </AlertDescription>
                </Alert>

                <div className="mt-4">
                    <h4 className="font-semibold mb-2">File Structure Guide</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                        Your Excel file must contain the following columns. The 'id' and 'parent_id' columns are used to build the hierarchy. You can <a href="/department_template.xlsx" download className="underline text-primary">download a template here</a>.
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Column</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-mono">id</TableCell>
                                <TableCell>Any (Text or Number)</TableCell>
                                <TableCell>A unique identifier for the row **within the file**. It's used to link parents and children.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-mono">name</TableCell>
                                <TableCell>Text</TableCell>
                                <TableCell>The name of the department.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-mono">parent_id</TableCell>
                                <TableCell>Any (Optional)</TableCell>
                                <TableCell>The 'id' of the parent department **from this file**. Leave empty for top-level departments.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-mono">description</TableCell>
                                <TableCell>Text (Optional)</TableCell>
                                <TableCell>A brief description of the department.</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4">
                    <Label htmlFor="file-upload" className='pb-4'>Upload Excel File (.xlsx, .xls)</Label>
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