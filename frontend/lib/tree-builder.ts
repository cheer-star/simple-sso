// src/lib/tree-builder.ts

import { Department, DepartmentNode } from "@/types";

export function buildTree(departments: Department[]): DepartmentNode[] {
  const map = new Map<number, DepartmentNode>();
  const roots: DepartmentNode[] = [];

  // Pass 1: Create nodes and populate map
  departments.forEach(dept => {
    map.set(dept.id, { ...dept, children: [] });
  });

  // Pass 2: Link children to parents
  departments.forEach(dept => {
    const node = map.get(dept.id);
    if (!node) return;

    if (dept.parent_id && map.has(dept.parent_id)) {
      const parent = map.get(dept.parent_id);
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}