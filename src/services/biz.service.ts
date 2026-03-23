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
    // 业务绑定角色接口已改为显式使用 bizDefinitionId 查询参数，
    // 这里同步后端命名，避免继续复用通用 id 导致请求命中不到最新接口实现。
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
