import { mockRoles } from '@/mock/system';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// RoleRecord 直接对齐角色管理接口的核心返回结构。
// 页面、抽屉和后续菜单授权页都应该复用这里的定义，避免每个页面再猜字段。
export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: number;
  statusMsg: string;
  sortOrder?: number;
  dataScope?: number;
  dataScopeMsg?: string;
  createdAt?: string;
  updatedAt?: string;
  customDeptIds: number[];
}

export interface RolePageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  code?: string;
  status?: number;
}

export interface RolePageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: RoleRecord[];
}

export interface CreateRolePayload {
  name: string;
  code: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateRolePayload {
  id: number;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateRoleStatusPayload {
  id: number;
  status: 0 | 1;
}

export interface DeleteRolesPayload {
  id?: number;
  idList?: number[];
}

const useRoleMock = import.meta.env.VITE_USE_ROLE_MOCK
  ? import.meta.env.VITE_USE_ROLE_MOCK !== 'false'
  : import.meta.env.VITE_USE_USER_MOCK
    ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
    : import.meta.env.VITE_USE_MOCK !== 'false';

// mock 角色库做成可变仓库，是为了让新增、修改、状态切换、删除在纯前端联调时
// 也能覆盖真实交互链路；如果后续要接更细的角色菜单或数据权限 mock，可以继续从这里扩展。
let mockRoleDb: RoleRecord[] = mockRoles.map((role) => ({
  ...role,
  customDeptIds: [...role.customDeptIds],
}));

function buildMockPageResult(query: RolePageQuery): RolePageResult {
  const filtered = mockRoleDb.filter((role) => {
    const matchedName = query.name ? role.name.includes(query.name) : true;
    const matchedCode = query.code ? role.code.includes(query.code) : true;
    const matchedStatus =
      typeof query.status === 'number' ? role.status === query.status : true;

    return matchedName && matchedCode && matchedStatus;
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

function findMockRoleOrThrow(id: number) {
  const role = mockRoleDb.find((item) => item.id === id);

  if (!role) {
    throw new Error('角色不存在');
  }

  return role;
}

function cloneMockRole(role: RoleRecord): RoleRecord {
  return {
    ...role,
    customDeptIds: [...role.customDeptIds],
  };
}

function getDeleteRoleIds(payload: DeleteRolesPayload) {
  if (payload.idList?.length) {
    return payload.idList;
  }

  if (typeof payload.id === 'number') {
    return [payload.id];
  }

  throw new Error('缺少要删除的角色ID');
}

export async function fetchRolePage(query: RolePageQuery) {
  if (useRoleMock) {
    return Promise.resolve(buildMockPageResult(query));
  }

  return request<RolePageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.role.page,
  });
}

export async function fetchRoleDetail(id: number) {
  if (useRoleMock) {
    return Promise.resolve(cloneMockRole(findMockRoleOrThrow(id)));
  }

  return request<RoleRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.role.detail,
  });
}

export async function createRole(payload: CreateRolePayload) {
  if (useRoleMock) {
    const duplicatedRole = mockRoleDb.find((role) => role.code === payload.code);

    if (duplicatedRole) {
      throw new Error('角色编码已存在');
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextId =
      mockRoleDb.reduce((maxId, role) => Math.max(maxId, role.id), 0) + 1;
    const createdRole: RoleRecord = {
      id: nextId,
      name: payload.name,
      code: payload.code,
      description: payload.description,
      status: 1,
      statusMsg: '正常',
      sortOrder: payload.sortOrder ?? nextId,
      dataScope: 1,
      dataScopeMsg: '全部数据',
      createdAt: now,
      updatedAt: now,
      customDeptIds: [],
    };

    mockRoleDb = [createdRole, ...mockRoleDb];
    return Promise.resolve(cloneMockRole(createdRole));
  }

  return request<RoleRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.role.create,
  });
}

export async function updateRole(payload: UpdateRolePayload) {
  if (useRoleMock) {
    const targetRole = findMockRoleOrThrow(payload.id);

    Object.assign(targetRole, {
      description: payload.description,
      name: payload.name,
      sortOrder: payload.sortOrder,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    return Promise.resolve(cloneMockRole(targetRole));
  }

  return request<RoleRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.role.update,
  });
}

export async function updateRoleStatus(payload: UpdateRoleStatusPayload) {
  if (useRoleMock) {
    const targetRole = findMockRoleOrThrow(payload.id);

    Object.assign(targetRole, {
      status: payload.status,
      statusMsg: payload.status === 1 ? '正常' : '停用',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    // 页面统一只传 id，service 负责把前端语义转换成后端要求的 roleId，
    // 这样如果后端字段名后续再变，调用方不需要再做一轮重构。
    data: {
      roleId: payload.id,
      status: payload.status,
    },
    method: 'post',
    url: API_ENDPOINTS.role.updateStatus,
  });
}

export async function deleteRoles(payload: DeleteRolesPayload) {
  if (useRoleMock) {
    const deleteIds = getDeleteRoleIds(payload);

    deleteIds.forEach((id) => {
      findMockRoleOrThrow(id);
    });
    mockRoleDb = mockRoleDb.filter((role) => !deleteIds.includes(role.id));
    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.role.delete,
  });
}
