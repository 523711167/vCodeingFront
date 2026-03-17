import { mockRoles } from '@/mock/system';

// 角色记录保持轻量，便于示例页快速展示角色列表。
export interface RoleRecord {
  id: string;
  name: string;
  description: string;
}

export async function fetchRoles() {
  // 和其他 service 一样，页面不直接消费 mock 文件，只走 service 层。
  return Promise.resolve(mockRoles);
}
