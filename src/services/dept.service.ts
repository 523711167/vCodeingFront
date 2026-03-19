import { mockDeptTree } from '@/mock/system';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// DeptRecord 对齐组织管理接口的主要返回字段。
// 这里把树节点和详情页的公共字段统一起来，后续做新增、移动、删除时可以继续复用。
export interface DeptRecord {
  id: number;
  parentId: number;
  name: string;
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

export async function fetchDeptTree(query: DeptTreeQuery = {}) {
  if (useDeptMock) {
    return Promise.resolve(filterDeptTree(cloneDeptTree(mockDeptTree), query));
  }

  return request<DeptTreeRecord[]>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.dept.tree,
  });
}

export async function fetchDeptDetail(id: number) {
  if (useDeptMock) {
    const detail = findDeptInTree(mockDeptTree, id);

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
