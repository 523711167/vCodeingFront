import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

export type BizDefinitionStatusValue = 0 | 1;

// 业务定义页当前围绕“列表、详情、表单提交”三类场景工作，
// 这里统一复用同一份 Record，避免页面层再拆出多套重复类型。
export interface BizDefinitionRecord {
  id: number;
  bizCode: string;
  bizName: string;
  bizDesc?: string;
  workflowDefinitionId?: number;
  workflowDefinitionCode?: string;
  workflowDefinitionName?: string;
  status: BizDefinitionStatusValue;
  statusMsg: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BizDefinitionPageQuery {
  pageNum: number;
  pageSize: number;
  bizCode?: string;
  bizName?: string;
  workflowDefinitionId?: number;
  status?: BizDefinitionStatusValue;
}

export interface BizDefinitionPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: BizDefinitionRecord[];
}

export interface BizDefinitionListQuery {
  bizCode?: string;
  bizName?: string;
  workflowDefinitionId?: number;
  status?: BizDefinitionStatusValue;
}

export interface CreateBizDefinitionPayload {
  bizCode: string;
  bizName: string;
  bizDesc?: string;
  workflowDefinitionId?: number;
  status: BizDefinitionStatusValue;
}

export interface UpdateBizDefinitionPayload {
  id: number;
  bizName: string;
  bizDesc?: string;
  workflowDefinitionId?: number;
  // 后端已将角色绑定并入业务定义编辑接口。
  // OpenAPI 文档当前还没完全体现这个字段，这里先按联调结果补齐 roleIds，
  // 避免前端继续依赖旧的“单独绑定角色”接口。
  roleIds?: number[];
  status: BizDefinitionStatusValue;
}

export interface DeleteBizDefinitionPayload {
  id: number;
}

export interface BizDefinitionRoleRecord {
  bizDefinitionId: number;
  roleIds: number[];
}

export interface UpdateBizDefinitionRolesPayload {
  bizDefinitionId: number;
  roleIds?: number[];
}

export async function fetchBizDefinitionPage(query: BizDefinitionPageQuery) {
  return request<BizDefinitionPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.biz.page,
  });
}

export async function fetchCurrentUserBizDefinitionPage(
  query: BizDefinitionPageQuery,
) {
  return request<BizDefinitionPageResult>({
    method: 'get',
    params: query,
    // 工作台“业务办理”需要命中“当前用户可查看”的专用分页接口，
    // 和系统管理里的全量业务定义分页分开，避免把本不该看到的业务入口直接暴露给当前用户。
    url: API_ENDPOINTS.biz.currentUserPage,
  });
}

export async function fetchBizDefinitionList(
  query: BizDefinitionListQuery = {},
) {
  return request<BizDefinitionRecord[]>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.biz.list,
  });
}

export async function fetchBizDefinitionDetail(id: number) {
  return request<BizDefinitionRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.biz.detail,
  });
}

export async function createBizDefinition(payload: CreateBizDefinitionPayload) {
  return request<BizDefinitionRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.biz.create,
  });
}

export async function updateBizDefinition(payload: UpdateBizDefinitionPayload) {
  return request<BizDefinitionRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.biz.update,
  });
}

export async function deleteBizDefinition(payload: DeleteBizDefinitionPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.biz.delete,
  });
}

export async function fetchBizDefinitionRoles(bizDefinitionId: number) {
  return request<BizDefinitionRoleRecord>({
    method: 'get',
    params: { bizDefinitionId },
    url: API_ENDPOINTS.biz.roles,
  });
}

export async function updateBizDefinitionRoles(
  payload: UpdateBizDefinitionRolesPayload,
) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.biz.updateRoles,
  });
}
