import type { MenuRecord } from '@/services/menu.service';
import type { RoleRecord } from '@/services/role.service';
import type { UserRecord } from '@/services/user.service';

export const mockUsers: UserRecord[] = [
  { id: 'u1', name: '运营经理', role: '管理员', status: '启用' },
  { id: 'u2', name: '内容编辑', role: '编辑', status: '启用' },
  { id: 'u3', name: '活动运营', role: '运营', status: '禁用' },
];

export const mockRoles: RoleRecord[] = [
  { id: 'r1', name: '管理员', description: '拥有全部菜单和按钮权限' },
  { id: 'r2', name: '编辑', description: '负责内容编辑与发布' },
  { id: 'r3', name: '运营', description: '负责活动创建与运营配置' },
];

export const mockMenuTree: MenuRecord[] = [
  {
    key: 'dashboard',
    title: '工作台',
  },
  {
    key: 'content',
    title: '内容管理',
    children: [{ key: 'content-list', title: '内容列表' }],
  },
  {
    key: 'operation',
    title: '运营活动',
    children: [{ key: 'operation-list', title: '活动列表' }],
  },
  {
    key: 'system',
    title: '系统管理',
    children: [
      { key: 'system-users', title: '账号管理' },
      { key: 'system-roles', title: '角色管理' },
      { key: 'system-menus', title: '菜单权限' },
    ],
  },
];
