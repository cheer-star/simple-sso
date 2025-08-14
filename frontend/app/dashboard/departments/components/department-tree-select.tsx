'use client';

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Department } from "@/types";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DepartmentTreeSelectProps {
  value: string; // The selected department ID as a string, or 'none'
  onValueChange: (value: string) => void;
}

// 1. 新增一个接口，用于扁平化后的带层级的部门数据
interface FlatDepartment extends Department {
  depth: number;
}

export function DepartmentTreeSelect({ value, onValueChange }: DepartmentTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // 2. 将扁平化的树结构计算逻辑移到 useMemo 中
  const flatTree = useMemo(() => {
    const flat: FlatDepartment[] = [];
    const buildFlat = (parentId: number | null, depth: number) => {
      departments
        .filter(d => d.parent_id === parentId)
        .forEach(d => {
          flat.push({ ...d, depth });
          buildFlat(d.id, depth + 1);
        });
    };
    buildFlat(null, 0); // 从根节点开始
    return flat;
  }, [departments]);

  useEffect(() => {
    if (departments.length === 0) {
      api.get('/api/admin/departments')
        .then(response => {
          setDepartments(response.data);
        })
        .catch(() => toast.error("Failed to load departments."));
    }
  }, [departments.length]);

  const selectedDeptName = useMemo(() => {
    if (!value || value === 'none') return "Select a department...";
    return departments.find(d => String(d.id) === value)?.name || "Select a department...";
  }, [value, departments]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedDeptName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
            <CommandInput placeholder="Search department..." />
            <CommandList>
                <CommandEmpty>No department found.</CommandEmpty>
                <CommandGroup>
                    {/* 3. 使用 CommandItem 来渲染所有选项，使其可搜索 */}
                    <CommandItem
                      value="none"
                      onSelect={() => handleSelect('none')}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === 'none' ? "opacity-100" : "opacity-0")} />
                      -- No Department --
                    </CommandItem>
                    
                    {/* 4. 遍历扁平化的树，并使用 padding 来创建视觉层级 */}
                    {flatTree.map(dept => (
                      <CommandItem
                        key={dept.id}
                        value={dept.name} // CommandItem 的搜索是基于 value 的
                        onSelect={() => handleSelect(String(dept.id))}
                        style={{ paddingLeft: `${1 + dept.depth * 1.5}rem` }} // 动态计算缩进
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === String(dept.id) ? "opacity-100" : "opacity-0")} />
                        {dept.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}