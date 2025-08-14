'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { toast } from 'sonner';
import { Department, DepartmentNode } from '@/types';
import api from '@/lib/api';
import { buildTree } from '@/lib/tree-builder';

import { DepartmentTreeNode } from './components/department-tree-node';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function DepartmentsPage() {
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);
  const [tree, setTree] = useState<DepartmentNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<DepartmentNode>>({});

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/departments');
      const departments: Department[] = response.data;
      setFlatDepartments(departments);
      setTree(buildTree(departments));
    } catch (error) {
      toast.error("Failed to fetch departments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);
  
  const handleOpenEdit = (dept: Partial<DepartmentNode> = {}) => {
    setCurrentDept(dept);
    setIsEditOpen(true);
  };

  const handleOpenAddSub = (parent: DepartmentNode) => {
    setCurrentDept({ parent_id: parent.id });
    setIsEditOpen(true);
  };
  
  const handleOpenDelete = (dept: DepartmentNode) => {
    setCurrentDept(dept);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const isEditing = !!currentDept.id;
    const url = isEditing ? `/api/admin/departments/${currentDept.id}` : '/api/admin/departments';
    const method = isEditing ? 'put' : 'post';
    const payload = { 
        name: currentDept.name, 
        description: currentDept.description, 
        parent_id: currentDept.parent_id ? Number(currentDept.parent_id) : null 
    };

    try {
      await api[method](url, payload);
      toast.success(`Department ${isEditing ? 'updated' : 'created'}.`);
      setIsEditOpen(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Action failed.");
    }
  };

  const handleDelete = async () => {
    if (!currentDept.id) return;
    try {
      await api.delete(`/api/admin/departments/${currentDept.id}`);
      toast.success("Department deleted.");
      setIsDeleteOpen(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Structure</h1>
          <p className="text-muted-foreground">Manage the organizational hierarchy.</p>
        </div>
        <Button onClick={() => handleOpenEdit()}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Top-Level Department
        </Button>
      </div>

      <div className="p-4 border rounded-lg min-h-[300px]">
        {isLoading ? <p className="text-muted-foreground">Loading department tree...</p> : 
         tree.length > 0 ? tree.map(node => (
          <DepartmentTreeNode
            key={node.id}
            node={node}
            onEdit={handleOpenEdit}
            onAddSub={handleOpenAddSub}
            onDelete={handleOpenDelete}
          />
         )) : <p className="text-muted-foreground">No departments found. Create one to get started.</p>
        }
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{currentDept.id ? 'Edit' : 'Create'} Department</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
                <Label htmlFor="dept-name">Department Name</Label>
                <Input id="dept-name" placeholder="e.g., Marketing" value={currentDept.name || ''} onChange={e => setCurrentDept({...currentDept, name: e.target.value})} required />
            </div>
            <div>
                <Label htmlFor="dept-desc">Description</Label>
                <Textarea id="dept-desc" placeholder="(Optional)" value={currentDept.description || ''} onChange={e => setCurrentDept({...currentDept, description: e.target.value})} />
            </div>
            <div>
                <Label htmlFor="dept-parent">Parent Department</Label>
                <Select
                  value={currentDept.parent_id ? String(currentDept.parent_id) : "root"}
                  onValueChange={val => setCurrentDept({ ...currentDept, parent_id: val === "root" ? null : Number(val) })}
                >
                  <SelectTrigger id="dept-parent"><SelectValue placeholder="Select a parent..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">-- No Parent (Top-Level) --</SelectItem>
                    {flatDepartments
                      .filter(d => d.id !== currentDept.id)
                      .map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{currentDept.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make all its direct sub-departments top-level. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}