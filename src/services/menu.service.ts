import { mockMenuTree } from '@/mock/system';

export interface MenuRecord {
  key: string;
  title: string;
  children?: MenuRecord[];
}

export async function fetchMenuTree() {
  return Promise.resolve(mockMenuTree);
}
