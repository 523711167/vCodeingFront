import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

export type WorkflowDefinitionStatusValue = 0 | 1 | 2;

export interface WorkflowNodeApproverRecord {
  approverType?: string;
  approverValue?: string;
  sortOrder?: number;
}

export interface WorkflowNodeRecord {
  id?: number;
  definitionId?: number;
  name?: string;
  nodeType?: string;
  nodeTypeMsg?: string;
  approveMode?: string;
  approveModeMsg?: string;
  timeoutHours?: number;
  timeoutAction?: string;
  timeoutActionMsg?: string;
  remindHours?: number;
  positionX?: number;
  positionY?: number;
  configJson?: string;
  approverList?: WorkflowNodeApproverRecord[];
}

export interface WorkflowTransitionRecord {
  id?: number;
  definitionId?: number;
  fromNodeId?: number;
  toNodeId?: number;
  conditionExpr?: string;
  isDefault?: boolean | number;
  is_default?: boolean | number;
  priority?: number;
  label?: string;
}

// 流程定义列表和详情当前都复用同一份返回类型。
// 这样列表页、详情抽屉、后续流程设计页回填都可以围绕同一份结构继续扩展。
export interface WorkflowDefinitionRecord {
  id: number;
  name: string;
  code: string;
  version: number;
  description?: string;
  workFlowJson?: string;
  status: WorkflowDefinitionStatusValue;
  statusMsg: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  nodeList?: WorkflowNodeRecord[];
  transitionList?: WorkflowTransitionRecord[];
}

export interface WorkflowDefinitionPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  code?: string;
  status?: WorkflowDefinitionStatusValue;
}

export interface WorkflowDefinitionPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: WorkflowDefinitionRecord[];
}

export interface WorkflowDefinitionListQuery {
  name?: string;
  code?: string;
  status?: WorkflowDefinitionStatusValue;
}

export interface WorkflowDefinitionIdPayload {
  id: number;
}

export interface SubmitWorkflowBizPayload {
  bizApplyId: number;
}

export interface WorkflowBizSubmitResult {
  bizApplyId: number;
  workflowInstanceId?: number;
  currentNode?: Record<string, unknown>;
}

export interface AuditWorkflowBizPayload {
  instanceId: number;
  nodeInstanceId: number;
  approverInstanceId: number;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}

export interface RecallWorkflowBizPayload {
  instanceId: number;
  comment?: string;
}

export interface CreateWorkflowDefinitionPayload {
  name: string;
  code: string;
  description?: string;
  workFlowJson: string;
}

export interface UpdateWorkflowDefinitionPayload {
  id: number;
  name: string;
  description?: string;
  workFlowJson: string;
}

export async function fetchWorkflowDefinitionPage(query: WorkflowDefinitionPageQuery) {
  return request<WorkflowDefinitionPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.workflowDefinition.page,
  });
}

export async function fetchWorkflowDefinitionList(
  query: WorkflowDefinitionListQuery = {},
) {
  return request<WorkflowDefinitionRecord[]>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.workflowDefinition.list,
  });
}

export async function fetchWorkflowDefinitionDetail(id: number) {
  return request<WorkflowDefinitionRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.workflowDefinition.detail,
  });
}

export async function createWorkflowDefinition(payload: CreateWorkflowDefinitionPayload) {
  return request<WorkflowDefinitionRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.workflowDefinition.create,
  });
}

export async function updateWorkflowDefinition(payload: UpdateWorkflowDefinitionPayload) {
  return request<WorkflowDefinitionRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.workflowDefinition.update,
  });
}

export async function publishWorkflowDefinition(payload: WorkflowDefinitionIdPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.workflowDefinition.publish,
  });
}

export async function disableWorkflowDefinition(payload: WorkflowDefinitionIdPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.workflowDefinition.disable,
  });
}

export async function deleteWorkflowDefinition(payload: WorkflowDefinitionIdPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.workflowDefinition.delete,
  });
}

export async function submitWorkflowBiz(payload: SubmitWorkflowBizPayload) {
  return request<WorkflowBizSubmitResult>({
    data: payload,
    method: 'post',
    // 草稿箱提交办理会直接把现有业务申请草稿送去发起审批，
    // 所以这里单独补一条运行态 submit 接口，避免和流程定义配置接口混在一起。
    url: API_ENDPOINTS.workflowBiz.submit,
  });
}

export async function auditWorkflowBiz(payload: AuditWorkflowBizPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    // 审核动作属于流程运行态写接口。
    // 统一收口在 workflow service，便于后续继续补转交、加签、撤回等运行态动作。
    url: API_ENDPOINTS.workflowBiz.audit,
  });
}

export async function recallWorkflowBiz(payload: RecallWorkflowBizPayload) {
  return request<Record<string, never>>({
    data: payload,
    method: 'post',
    // 撤回入口给“我的发起”使用。
    // 统一放在 workflow service，便于后续继续补转交、加签等运行态动作。
    url: API_ENDPOINTS.workflowBiz.recall,
  });
}
