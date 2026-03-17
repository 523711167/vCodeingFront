import { mockUsers } from '@/mock/system';

// 用户记录先只保留列表展示所需字段。
export interface UserRecord {
  id: string;
  name: string;
  role: string;
  status: '启用' | '禁用';
}

export async function fetchUsers() {
  // 当前系统管理页先只依赖本地 mock。
  // 后续接真接口时，这里会成为统一替换点。
  return Promise.resolve(mockUsers);
}
