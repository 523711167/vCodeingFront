import { mockRoles } from '@/mock/system';

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
}

export async function fetchRoles() {
  return Promise.resolve(mockRoles);
}
