import { mockUsers } from '@/mock/system';

export interface UserRecord {
  id: string;
  name: string;
  role: string;
  status: '启用' | '禁用';
}

export async function fetchUsers() {
  return Promise.resolve(mockUsers);
}
