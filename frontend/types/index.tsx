export interface Department {
  id: number;
  name: string;
  description?: string | null;
  parent_id: number | null;
}

// 前端使用的树形节点类型
export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  created_at: string;
  department?: {
    id: number;
    name: string;
  } | null;
}

export interface Platform {
  client_id: string;
  redirect_uri: string;
  client_secret?: string;
}
