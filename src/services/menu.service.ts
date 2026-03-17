import { mockMenuTree } from '@/mock/system';

// 菜单树结构既可以渲染权限树，也可以在后续扩展成路由配置编辑器的数据源。
export interface MenuRecord {
  key: string;
  title: string;
  children?: MenuRecord[];
}

export async function fetchMenuTree() {
  // 当前菜单权限页只读树结构，因此直接返回 mock 数据即可。
  return Promise.resolve(mockMenuTree);
}
