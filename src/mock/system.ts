import type { MenuRecord } from '@/services/menu.service';
import type { RoleRecord } from '@/services/role.service';
import type { UserRecord } from '@/services/user.service';

// 三组系统管理 mock 数据集中放在一个文件里，方便系统模块统一维护。
export const mockUsers: UserRecord[] = [
  {
    id: 1,
    username: 'admin',
    realName: '系统管理员',
    email: 'admin@yuyu.com',
    mobile: '13800000000',
    status: 1,
    statusMsg: '正常',
    lastLoginAt: '2026-03-19 11:41:59',
    createdAt: '2026-03-18 02:52:20',
    updatedAt: '2026-03-19 03:41:58',
    roles: [{ id: 1, name: '系统管理员', code: 'ADMIN', status: 1 }],
    depts: [
      {
        id: 1,
        parentId: 0,
        name: '总部',
        code: 'HEAD_OFFICE',
        leaderId: 1,
        leaderName: '系统管理员',
        status: 1,
        isPrimary: 1,
        isPrimaryMsg: '是',
      },
    ],
  },
  {
    id: 2,
    username: 'editor_demo',
    realName: '内容编辑',
    email: 'editor@example.com',
    mobile: '13800000001',
    status: 1,
    statusMsg: '正常',
    lastLoginAt: '2026-03-19 10:30:00',
    createdAt: '2026-03-18 09:30:00',
    updatedAt: '2026-03-19 10:30:00',
    roles: [{ id: 2, name: '编辑', code: 'EDITOR', status: 1 }],
    depts: [],
  },
  {
    id: 3,
    username: 'operator_demo',
    realName: '活动运营',
    email: 'operator@example.com',
    mobile: '13800000002',
    status: 0,
    statusMsg: '停用',
    lastLoginAt: '2026-03-18 18:00:00',
    createdAt: '2026-03-17 16:00:00',
    updatedAt: '2026-03-18 18:00:00',
    roles: [{ id: 3, name: '运营', code: 'OPERATOR', status: 1 }],
    depts: [],
  },
];

export const mockRoles: RoleRecord[] = [
  { id: 'r1', name: '管理员', description: '拥有全部菜单和按钮权限' },
  { id: 'r2', name: '编辑', description: '负责内容编辑与发布' },
  { id: 'r3', name: '运营', description: '负责活动创建与运营配置' },
];

// 菜单树结构和菜单权限页里的 Tree 组件保持一一对应关系。
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
