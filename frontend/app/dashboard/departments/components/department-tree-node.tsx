'use client';

import { DepartmentNode } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';

interface DepartmentTreeNodeProps {
  node: DepartmentNode;
  onEdit: (dept: DepartmentNode) => void;
  onAddSub: (parent: DepartmentNode) => void;
  onDelete: (dept: DepartmentNode) => void;
}

export function DepartmentTreeNode({ node, onEdit, onAddSub, onDelete }: DepartmentTreeNodeProps) {
  const hasChildren = node.children.length > 0;

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center space-x-2 my-1 group rounded-md hover:bg-accent">
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronRight className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-90" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        ) : (
          <div className="w-9" />
        )}
        <span className="font-medium flex-1 py-2">{node.name}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 pr-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddSub(node)}><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(node)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="pl-9 border-l ml-4">
          {node.children.map(childNode => (
            <DepartmentTreeNode
              key={childNode.id}
              node={childNode}
              onEdit={onEdit}
              onAddSub={onAddSub}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}