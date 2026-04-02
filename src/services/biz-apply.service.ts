import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// 业务申请草稿返回值只先保留当前页面会关心的字段。
// 如果后续要继续接“草稿详情 / 草稿列表 / 保存并提交”，优先在这个 service 文件里继续扩展。
export interface BizApplyDraftRecord {
  id: number;
  bizDefinitionId: number;
  title?: string;
  bizStatus?: string;
  applicantId?: number;
  applicantName?: string;
  deptId?: number;
  // OpenAPI 当前 schema 没显式写出 formData / 更新时间，
  // 但草稿继续编辑场景需要读取这些字段，所以这里先按联调需求声明成可选。
  // 如果后端后续补全文档，这里继续和文档字段保持一致即可。
  formData?: string;
  updatedAt?: string;
  workflowName?: string;
}

export interface SaveBizApplyDraftPayload {
  bizDefinitionId: number;
  title: string;
  formData: string;
}

export interface UpdateBizApplyDraftPayload extends SaveBizApplyDraftPayload {
  id: number;
}

export interface BizApplyDraftPageQuery {
  pageNum: number;
  pageSize: number;
  bizDefinitionId?: number;
  title?: string;
}

export interface BizApplyDraftPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: BizApplyDraftRecord[];
}

export interface WorkflowTodoRecord {
  approverInstanceId: number;
  nodeInstanceId: number;
  workflowInstanceId: number;
  bizApplyId: number;
  bizDefinitionId: number;
  bizName?: string;
  title?: string;
  applicantId?: number;
  applicantName?: string;
  formData?: string;
  nodeName?: string;
  nodeType?: string;
  approverStatus?: string;
  approverStatusMsg?: string;
  startedAt?: string;
  todoAt?: string;
}

export interface WorkflowTodoPageQuery {
  pageNum: number;
  pageSize: number;
  bizApplyId?: number;
  bizDefinitionId?: number;
  title?: string;
}

export interface WorkflowTodoPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: WorkflowTodoRecord[];
}

export interface WorkflowQueryRecord {
  bizApplyId: number;
  bizDefinitionId: number;
  bizName?: string;
  title?: string;
  bizStatus?: string;
  bizStatusMsg?: string;
  applicantId?: number;
  applicantName?: string;
  deptId?: number;
  workflowInstanceId?: number;
  workflowStatus?: string;
  workflowStatusMsg?: string;
  currentNodeName?: string;
  currentNodeType?: string;
  formData?: string;
  submittedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
}

export interface WorkflowQueryPageQuery {
  pageNum: number;
  pageSize: number;
  bizApplyId?: number;
  bizDefinitionId?: number;
  title?: string;
  bizStatus?: string;
}

export interface WorkflowQueryPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: WorkflowQueryRecord[];
}

export async function saveBizApplyDraft(payload: SaveBizApplyDraftPayload) {
  return request<BizApplyDraftRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.bizApply.saveDraft,
  });
}

export async function updateBizApplyDraft(payload: UpdateBizApplyDraftPayload) {
  return request<BizApplyDraftRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.bizApply.updateDraft,
  });
}

export async function fetchBizApplyDraftPage(query: BizApplyDraftPageQuery) {
  return request<BizApplyDraftPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.bizApply.draftPage,
  });
}

export async function fetchBizApplyDraftDetail(id: number) {
  return request<BizApplyDraftRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.bizApply.draftDetail,
  });
}

export async function fetchWorkflowTodoPage(query: WorkflowTodoPageQuery) {
  return request<WorkflowTodoPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.bizApply.todoPage,
  });
}

export async function fetchWorkflowTodoDetail(approverInstanceId: number) {
  return request<WorkflowTodoRecord>({
    method: 'get',
    params: { approverInstanceId },
    url: API_ENDPOINTS.bizApply.todoDetail,
  });
}

export async function fetchWorkflowQueryPage(query: WorkflowQueryPageQuery) {
  return request<WorkflowQueryPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.bizApply.queryPage,
  });
}

export async function fetchWorkflowQueryDetail(bizApplyId: number) {
  return request<WorkflowQueryRecord>({
    method: 'get',
    params: { bizApplyId },
    url: API_ENDPOINTS.bizApply.queryDetail,
  });
}
