import { mockDeptTree } from '@/mock/system';
import type { OrgTypeCode } from '@/constants/select-options';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// DeptRecord 对齐组织管理接口的主要返回字段。
// 这里把树节点和详情页的公共字段统一起来，后续做新增、移动、删除时可以继续复用。
export interface DeptRecord {
  id: number;
  parentId: number;
  name: string;
  orgType?: OrgTypeCode;
  orgTypeMsg?: string;
  postType?: string;
  code?: string;
  path?: string;
  level?: number;
  sortOrder?: number;
  leaderId?: number;
  leaderName?: string;
  status: number;
  statusMsg: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeptTreeRecord extends DeptRecord {
  children?: DeptTreeRecord[];
}

export interface DeptTreeQuery {
  name?: string;
  status?: number;
}

export interface CreateDeptPayload {
  parentId?: number;
  name: string;
  orgType: OrgTypeCode;
  postType?: string;
  code?: string;
  sortOrder?: number;
  leaderId?: number;
  status: 0 | 1;
}

export interface UpdateDeptPayload {
  id: number;
  name: string;
  orgType: OrgTypeCode;
  postType?: string;
  code?: string;
  sortOrder?: number;
  leaderId?: number;
  status: 0 | 1;
}

export interface DeleteDeptsPayload {
  id?: number;
  idList?: number[];
}

const useDeptMock = import.meta.env.VITE_USE_DEPT_MOCK
  ? import.meta.env.VITE_USE_DEPT_MOCK !== 'false'
  : import.meta.env.VITE_USE_USER_MOCK
    ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
    : import.meta.env.VITE_USE_MOCK !== 'false';

function cloneDeptTree(nodes: DeptTreeRecord[]): DeptTreeRecord[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneDeptTree(node.children) : undefined,
  }));
}

// mock 组织库改成可变树仓库，是为了让新增、修改、删除在纯前端模式下也能完整走通。
// 后续如果继续加移动部门，只需要在这棵树上补移动逻辑，不必重写整套 mock 结构。
let mockDeptDb = cloneDeptTree(mockDeptTree);

function filterDeptTree(nodes: DeptTreeRecord[], query: DeptTreeQuery): DeptTreeRecord[] {
  return nodes.reduce<DeptTreeRecord[]>((acc, node) => {
    const children = node.children ? filterDeptTree(node.children, query) : undefined;
    const matchedName = query.name ? node.name.includes(query.name) : true;
    const matchedStatus =
      typeof query.status === 'number' ? node.status === query.status : true;

    if (matchedName && matchedStatus) {
      acc.push({
        ...node,
        children,
      });
      return acc;
    }

    if (children?.length) {
      // 当父节点自己不匹配但子节点命中时，仍然保留父节点，
      // 这样树结构不会被打断，用户能看出命中节点的组织上下文。
      acc.push({
        ...node,
        children,
      });
    }

    return acc;
  }, []);
}

function findDeptInTree(nodes: DeptTreeRecord[], id: number): DeptRecord | null {
  for (const node of nodes) {
    if (node.id === id) {
      return {
        ...node,
      };
    }

    if (node.children?.length) {
      const matchedNode = findDeptInTree(node.children, id);

      if (matchedNode) {
        return matchedNode;
      }
    }
  }

  return null;
}

function getAllDeptIds(nodes: DeptTreeRecord[]): number[] {
  return nodes.flatMap((node) => [
    node.id,
    ...getAllDeptIds(node.children ?? []),
  ]);
}

function findDeptNode(nodes: DeptTreeRecord[], id: number): DeptTreeRecord | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (node.children?.length) {
      const matchedNode = findDeptNode(node.children, id);

      if (matchedNode) {
        return matchedNode;
      }
    }
  }

  return null;
}

function getDeleteDeptIds(payload: DeleteDeptsPayload) {
  if (payload.idList?.length) {
    return payload.idList;
  }

  if (typeof payload.id === 'number') {
    return [payload.id];
  }

  throw new Error('缺少要删除的组织ID');
}

function deleteDeptNode(nodes: DeptTreeRecord[], id: number): DeptTreeRecord[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? deleteDeptNode(node.children, id) : undefined,
    }));
}

function nowString() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function toStatusMsg(status: 0 | 1) {
  return status === 1 ? '正常' : '停用';
}

function toOrgTypeMsg(orgType: OrgTypeCode) {
  switch (orgType) {
    case 'GROUP':
      return '集团';
    case 'COMPANY':
      return '公司';
    case 'DEPT':
      return '部门';
    case 'POST':
      return '岗位';
    default:
      return orgType;
  }
}

export async function fetchDeptTree(query: DeptTreeQuery = {}) {
  if (useDeptMock) {
    return Promise.resolve(filterDeptTree(cloneDeptTree(mockDeptDb), query));
  }

  return request<DeptTreeRecord[]>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.dept.tree,
  });
}

export async function fetchDeptDetail(id: number) {
  if (useDeptMock) {
    const detail = findDeptInTree(mockDeptDb, id);

    if (!detail) {
      throw new Error('组织不存在');
    }

    return Promise.resolve(detail);
  }

  return request<DeptRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.dept.detail,
  });
}

export async function createDept(payload: CreateDeptPayload) {
  if (useDeptMock) {
    const parentId = payload.parentId ?? 0;
    const parentDept = parentId ? findDeptNode(mockDeptDb, parentId) : null;

    if (parentId && !parentDept) {
      throw new Error('父级组织不存在');
    }

    const nextId = Math.max(...getAllDeptIds(mockDeptDb), 0) + 1;
    const now = nowString();
    const createdDept: DeptTreeRecord = {
      id: nextId,
      parentId,
      name: payload.name,
      orgType: payload.orgType,
      orgTypeMsg: toOrgTypeMsg(payload.orgType),
      postType: payload.postType,
      code: payload.code,
      level: parentDept ? (parentDept.level ?? 1) + 1 : 1,
      path: parentDept?.path ? `${parentDept.path}/${nextId}` : `/${nextId}`,
      sortOrder: payload.sortOrder ?? 1,
      leaderId: payload.leaderId,
      leaderName: payload.leaderId ? `用户${payload.leaderId}` : undefined,
      status: payload.status,
      statusMsg: toStatusMsg(payload.status),
      createdAt: now,
      updatedAt: now,
    };

    if (parentDept) {
      parentDept.children = [...(parentDept.children ?? []), createdDept];
    } else {
      mockDeptDb = [...mockDeptDb, createdDept];
    }

    return Promise.resolve({ ...createdDept });
  }

  return request<DeptRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.dept.create,
  });
}

export async function updateDept(payload: UpdateDeptPayload) {
  if (useDeptMock) {
    const targetDept = findDeptNode(mockDeptDb, payload.id);

    if (!targetDept) {
      throw new Error('组织不存在');
    }

    Object.assign(targetDept, {
      code: payload.code,
      leaderId: payload.leaderId,
      leaderName: payload.leaderId ? `用户${payload.leaderId}` : targetDept.leaderName,
      name: payload.name,
      orgType: payload.orgType,
      orgTypeMsg: toOrgTypeMsg(payload.orgType),
      postType: payload.postType,
      sortOrder: payload.sortOrder,
      status: payload.status,
      statusMsg: toStatusMsg(payload.status),
      updatedAt: nowString(),
    });

    return Promise.resolve({ ...targetDept });
  }

  return request<DeptRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.dept.update,
  });
}

export async function deleteDepts(payload: DeleteDeptsPayload) {
  if (useDeptMock) {
    const deleteIds = getDeleteDeptIds(payload);

    deleteIds.forEach((id) => {
      if (!findDeptNode(mockDeptDb, id)) {
        throw new Error('组织不存在');
      }
    });

    mockDeptDb = deleteIds.reduce(
      (currentTree, id) => deleteDeptNode(currentTree, id),
      mockDeptDb,
    );

    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.dept.delete,
  });
}
