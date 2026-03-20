import { API_ENDPOINTS } from '@/services/api-endpoints';
import { fetchDeptTree, type DeptTreeRecord } from '@/services/dept.service';
import { request } from '@/services/http';
import { mockUsers } from '@/mock/system';

export interface UserRoleRecord {
  id: number;
  name: string;
  code: string;
  status: number;
}

export interface UserDeptRecord {
  id: number;
  parentId: number;
  name: string;
  code: string;
  leaderId: number;
  leaderName: string;
  status: number;
  isPrimary: number;
  isPrimaryMsg: string;
}

// UserRecord 直接对齐当前后端返回结构，避免页面层自己做二次结构猜测。
// 后续如果接口新增字段，优先从这里补类型，再决定页面是否展示。
export interface UserRecord {
  id: number;
  username: string;
  realName: string;
  email?: string;
  mobile?: string;
  avatar?: string;
  status: number;
  statusMsg: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  roles: UserRoleRecord[];
  depts: UserDeptRecord[];
}

export interface UserPageQuery {
  pageNum: number;
  pageSize: number;
  username?: string;
  status?: number;
}

export interface UserPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: UserRecord[];
}

export interface CreateUserPayload {
  username: string;
  password: string;
  realName: string;
  email?: string;
  mobile?: string;
  avatar?: string;
}

export interface UpdateUserPayload {
  id: number;
  realName: string;
  email?: string;
  mobile?: string;
  avatar?: string;
}

export interface UpdateUserStatusPayload {
  id: number;
  status: 0 | 1;
}

export interface ResetUserPasswordPayload {
  id: number;
  newPassword: string;
}

export interface DeleteUsersPayload {
  idList: number[];
}

export interface UpdateUserDeptItemPayload {
  deptId: number;
  isPrimary: 0 | 1;
}

export interface UpdateUserDeptsPayload {
  userId: number;
  depts: UpdateUserDeptItemPayload[];
}

const useUserMock = import.meta.env.VITE_USE_USER_MOCK
  ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
  : import.meta.env.VITE_USE_MOCK !== 'false';

// 用户 mock 数据改成模块级可变仓库，是为了让新增、修改、删除这些交互
// 在纯前端模式下也能走完整流程，而不是只有列表能看、操作全失效。
let mockUserDb: UserRecord[] = [...mockUsers];

function buildMockPageResult(query: UserPageQuery): UserPageResult {
  const filtered = mockUserDb.filter((user) => {
    const matchedUsername = query.username
      ? user.username.includes(query.username)
      : true;
    const matchedStatus =
      typeof query.status === 'number' ? user.status === query.status : true;

    return matchedUsername && matchedStatus;
  });
  const startIndex = (query.pageNum - 1) * query.pageSize;
  const records = filtered.slice(startIndex, startIndex + query.pageSize);

  return {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
    records,
  };
}

function findMockUserOrThrow(id: number) {
  const user = mockUserDb.find((item) => item.id === id);

  if (!user) {
    throw new Error('用户不存在');
  }

  return user;
}

function cloneMockUser(user: UserRecord): UserRecord {
  return {
    ...user,
    depts: [...user.depts],
    roles: [...user.roles],
  };
}

function flattenDeptTree(nodes: DeptTreeRecord[]): DeptTreeRecord[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenDeptTree(node.children ?? []),
  ]);
}

export async function fetchUserPage(query: UserPageQuery) {
  if (useUserMock) {
    return Promise.resolve(buildMockPageResult(query));
  }

  return request<UserPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.user.page,
  });
}

export async function fetchUserDetail(id: number) {
  if (useUserMock) {
    return Promise.resolve(cloneMockUser(findMockUserOrThrow(id)));
  }

  return request<UserRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.user.detail,
  });
}

export async function createUser(payload: CreateUserPayload) {
  if (useUserMock) {
    const duplicatedUser = mockUserDb.find((user) => user.username === payload.username);

    if (duplicatedUser) {
      throw new Error('username已存在');
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextId =
      mockUserDb.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1;
    const createdUser: UserRecord = {
      id: nextId,
      username: payload.username,
      realName: payload.realName,
      email: payload.email,
      mobile: payload.mobile,
      avatar: payload.avatar,
      status: 1,
      statusMsg: '正常',
      createdAt: now,
      updatedAt: now,
      roles: [],
      depts: [],
    };

    mockUserDb = [createdUser, ...mockUserDb];
    return Promise.resolve(cloneMockUser(createdUser));
  }

  return request<UserRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.create,
  });
}

export async function updateUser(payload: UpdateUserPayload) {
  if (useUserMock) {
    const targetUser = findMockUserOrThrow(payload.id);

    Object.assign(targetUser, {
      avatar: payload.avatar,
      email: payload.email,
      mobile: payload.mobile,
      realName: payload.realName,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    return Promise.resolve(cloneMockUser(targetUser));
  }

  return request<UserRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.update,
  });
}

export async function updateUserStatus(payload: UpdateUserStatusPayload) {
  if (useUserMock) {
    const targetUser = findMockUserOrThrow(payload.id);

    Object.assign(targetUser, {
      status: payload.status,
      statusMsg: payload.status === 1 ? '正常' : '停用',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.updateStatus,
  });
}

export async function resetUserPassword(payload: ResetUserPasswordPayload) {
  if (useUserMock) {
    findMockUserOrThrow(payload.id);
    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.resetPassword,
  });
}

export async function deleteUsers(payload: DeleteUsersPayload) {
  if (useUserMock) {
    payload.idList.forEach((id) => {
      findMockUserOrThrow(id);
    });
    mockUserDb = mockUserDb.filter((user) => !payload.idList.includes(user.id));
    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.delete,
  });
}

export async function updateUserDepts(payload: UpdateUserDeptsPayload) {
  if (useUserMock) {
    const targetUser = findMockUserOrThrow(payload.userId);
    const deptTree = await fetchDeptTree();
    const deptMap = new Map(
      flattenDeptTree(deptTree).map((dept) => [dept.id, dept] as const),
    );

    // 这里把“用户关联组织”也复用组织树数据，是为了让 mock 模式下的组织名称、
    // 负责人和状态始终跟当前组织管理页保持一致，后续扩展组织字段也只需要补这一处映射。
    targetUser.depts = payload.depts.map((item) => {
      const matchedDept = deptMap.get(item.deptId);

      if (!matchedDept) {
        throw new Error(`组织 ${item.deptId} 不存在`);
      }

      return {
        id: matchedDept.id,
        parentId: matchedDept.parentId,
        name: matchedDept.name,
        code: matchedDept.code ?? '',
        leaderId: matchedDept.leaderId ?? 0,
        leaderName: matchedDept.leaderName ?? '',
        status: matchedDept.status,
        isPrimary: item.isPrimary,
        isPrimaryMsg: item.isPrimary === 1 ? '是' : '否',
      };
    });
    targetUser.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

    return Promise.resolve(cloneMockUser(targetUser));
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.user.updateDepts,
  });
}
