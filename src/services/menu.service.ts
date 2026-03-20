import { mockMenuTree } from '@/mock/system';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

export type MenuTypeValue = 'DIRECTORY' | 'MENU' | 'BUTTON';
export type MenuVisibleValue = 0 | 1;
export type MenuStatusValue = 0 | 1;

// 菜单管理接口同时覆盖树列表、详情和表单提交。
// 这里统一定义完整字段，是为了避免页面层再维护一套“列表字段”和“详情字段”。
export interface MenuRecord {
  id: number;
  parentId: number;
  type: MenuTypeValue;
  typeMsg: string;
  name: string;
  permission?: string;
  path?: string;
  component?: string;
  icon?: string;
  sortOrder?: number;
  visible: MenuVisibleValue;
  visibleMsg: string;
  status: MenuStatusValue;
  statusMsg: string;
  createdAt?: string;
  updatedAt?: string;
  children?: MenuRecord[];
}

export interface MenuTreeQuery {
  name?: string;
  type?: MenuTypeValue;
  visible?: MenuVisibleValue;
  status?: MenuStatusValue;
}

export interface CreateMenuPayload {
  parentId?: number;
  type: MenuTypeValue;
  name: string;
  permission?: string;
  path?: string;
  component?: string;
  icon?: string;
  sortOrder?: number;
  visible: MenuVisibleValue;
  status: MenuStatusValue;
}

export interface UpdateMenuPayload extends CreateMenuPayload {
  id: number;
}

export interface DeleteMenusPayload {
  id?: number;
  idList?: number[];
}

const useMenuMock = import.meta.env.VITE_USE_MENU_MOCK
  ? import.meta.env.VITE_USE_MENU_MOCK !== 'false'
  : import.meta.env.VITE_USE_USER_MOCK
    ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
    : import.meta.env.VITE_USE_MOCK !== 'false';

function cloneMenuTree(nodes: MenuRecord[]): MenuRecord[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneMenuTree(node.children) : undefined,
  }));
}

// mock 菜单库做成可变树，是为了让菜单管理页在纯前端模式下也能完整联调增删改查。
let mockMenuDb = cloneMenuTree(mockMenuTree);

function toMenuTypeMsg(type: MenuTypeValue) {
  switch (type) {
    case 'DIRECTORY':
      return '目录';
    case 'MENU':
      return '菜单';
    case 'BUTTON':
      return '按钮';
    default:
      return String(type);
  }
}

function toVisibleMsg(visible: MenuVisibleValue) {
  return visible === 1 ? '显示' : '隐藏';
}

function toStatusMsg(status: MenuStatusValue) {
  return status === 1 ? '正常' : '停用';
}

function nowString() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function findMenuNode(nodes: MenuRecord[], id: number): MenuRecord | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (node.children?.length) {
      const matchedNode = findMenuNode(node.children, id);

      if (matchedNode) {
        return matchedNode;
      }
    }
  }

  return null;
}

function findMenuDetail(nodes: MenuRecord[], id: number): MenuRecord | null {
  const matchedNode = findMenuNode(nodes, id);

  return matchedNode
    ? {
        ...matchedNode,
      }
    : null;
}

function getDeleteMenuIds(payload: DeleteMenusPayload) {
  if (payload.idList?.length) {
    return payload.idList;
  }

  if (typeof payload.id === 'number') {
    return [payload.id];
  }

  throw new Error('缺少要删除的菜单ID');
}

function getAllMenuIds(nodes: MenuRecord[]): number[] {
  return nodes.flatMap((node) => [
    node.id,
    ...getAllMenuIds(node.children ?? []),
  ]);
}

function filterMenuTree(nodes: MenuRecord[], query: MenuTreeQuery): MenuRecord[] {
  return nodes.reduce<MenuRecord[]>((acc, node) => {
    const children = node.children ? filterMenuTree(node.children, query) : undefined;
    const matchedName = query.name ? node.name.includes(query.name) : true;
    const matchedType = query.type ? node.type === query.type : true;
    const matchedVisible =
      typeof query.visible === 'number' ? node.visible === query.visible : true;
    const matchedStatus =
      typeof query.status === 'number' ? node.status === query.status : true;

    if (matchedName && matchedType && matchedVisible && matchedStatus) {
      acc.push({
        ...node,
        children,
      });
      return acc;
    }

    if (children?.length) {
      // 树查询需要在子节点命中时保留父节点，避免用户失去菜单上下文。
      acc.push({
        ...node,
        children,
      });
    }

    return acc;
  }, []);
}

function deleteMenuNode(nodes: MenuRecord[], id: number): MenuRecord[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? deleteMenuNode(node.children, id) : undefined,
    }));
}

function detachMenuNode(
  nodes: MenuRecord[],
  id: number,
): { nextTree: MenuRecord[]; targetNode: MenuRecord | null } {
  let detachedNode: MenuRecord | null = null;

  const nextTree = nodes
    .filter((node) => {
      if (node.id === id) {
        detachedNode = {
          ...node,
          children: node.children ? cloneMenuTree(node.children) : undefined,
        };
        return false;
      }

      return true;
    })
    .map((node) => {
      if (!node.children?.length) {
        return node;
      }

      const detachedResult = detachMenuNode(node.children, id);

      if (detachedResult.targetNode) {
        detachedNode = detachedResult.targetNode;
      }

      return {
        ...node,
        children: detachedResult.nextTree,
      };
    });

  return {
    nextTree,
    targetNode: detachedNode,
  };
}

function attachMenuNode(
  nodes: MenuRecord[],
  parentId: number,
  targetNode: MenuRecord,
): MenuRecord[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children ?? []), targetNode],
      };
    }

    return {
      ...node,
      children: node.children ? attachMenuNode(node.children, parentId, targetNode) : undefined,
    };
  });
}

export async function fetchMenuTree(query: MenuTreeQuery = {}) {
  if (useMenuMock) {
    return Promise.resolve(filterMenuTree(cloneMenuTree(mockMenuDb), query));
  }

  return request<MenuRecord[]>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.menu.tree,
  });
}

export async function fetchMenuDetail(id: number) {
  if (useMenuMock) {
    const detail = findMenuDetail(mockMenuDb, id);

    if (!detail) {
      throw new Error('菜单不存在');
    }

    return Promise.resolve(detail);
  }

  return request<MenuRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.menu.detail,
  });
}

export async function createMenu(payload: CreateMenuPayload) {
  if (useMenuMock) {
    const parentId = payload.parentId ?? 0;
    const parentMenu = parentId ? findMenuNode(mockMenuDb, parentId) : null;

    if (parentId && !parentMenu) {
      throw new Error('父级菜单不存在');
    }

    const nextId = Math.max(...getAllMenuIds(mockMenuDb), 0) + 1;
    const now = nowString();
    const createdMenu: MenuRecord = {
      id: nextId,
      parentId,
      type: payload.type,
      typeMsg: toMenuTypeMsg(payload.type),
      name: payload.name,
      permission: payload.permission,
      path: payload.path,
      component: payload.component,
      icon: payload.icon,
      sortOrder: payload.sortOrder ?? 1,
      visible: payload.visible,
      visibleMsg: toVisibleMsg(payload.visible),
      status: payload.status,
      statusMsg: toStatusMsg(payload.status),
      createdAt: now,
      updatedAt: now,
    };

    if (parentMenu) {
      parentMenu.children = [...(parentMenu.children ?? []), createdMenu];
    } else {
      mockMenuDb = [...mockMenuDb, createdMenu];
    }

    return Promise.resolve({
      ...createdMenu,
    });
  }

  return request<MenuRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.menu.create,
  });
}

export async function updateMenu(payload: UpdateMenuPayload) {
  if (useMenuMock) {
    const targetMenu = findMenuNode(mockMenuDb, payload.id);

    if (!targetMenu) {
      throw new Error('菜单不存在');
    }

    const nextParentId = payload.parentId ?? 0;
    const nextMenu: MenuRecord = {
      ...targetMenu,
      parentId: payload.parentId ?? 0,
      type: payload.type,
      typeMsg: toMenuTypeMsg(payload.type),
      name: payload.name,
      permission: payload.permission,
      path: payload.path,
      component: payload.component,
      icon: payload.icon,
      sortOrder: payload.sortOrder,
      visible: payload.visible,
      visibleMsg: toVisibleMsg(payload.visible),
      status: payload.status,
      statusMsg: toStatusMsg(payload.status),
      updatedAt: nowString(),
      children: targetMenu.children ? cloneMenuTree(targetMenu.children) : undefined,
    };

    if (nextParentId !== targetMenu.parentId) {
      if (nextParentId !== 0 && !findMenuNode(mockMenuDb, nextParentId)) {
        throw new Error('父级菜单不存在');
      }

      const detachedResult = detachMenuNode(mockMenuDb, payload.id);

      if (!detachedResult.targetNode) {
        throw new Error('菜单不存在');
      }

      mockMenuDb =
        nextParentId === 0
          ? [...detachedResult.nextTree, nextMenu]
          : attachMenuNode(detachedResult.nextTree, nextParentId, nextMenu);
    } else {
      Object.assign(targetMenu, nextMenu);
    }

    return Promise.resolve({
      ...nextMenu,
    });
  }

  return request<MenuRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.menu.update,
  });
}

export async function deleteMenus(payload: DeleteMenusPayload) {
  if (useMenuMock) {
    const deleteIds = getDeleteMenuIds(payload);

    deleteIds.forEach((id) => {
      const targetNode = findMenuNode(mockMenuDb, id);

      if (!targetNode) {
        throw new Error('菜单不存在');
      }
    });

    mockMenuDb = deleteIds.reduce((tree, id) => deleteMenuNode(tree, id), mockMenuDb);
    return Promise.resolve({});
  }

  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.menu.delete,
  });
}
