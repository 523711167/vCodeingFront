import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

export type WorkflowDefinitionStatusValue = 0 | 1 | 2;

export interface WorkflowNodeRecord {
  [key: string]: unknown;
}

export interface WorkflowTransitionRecord {
  [key: string]: unknown;
}

// 流程定义列表和详情当前都复用同一份返回类型。
// 这样列表页、详情抽屉、后续流程设计页回填都可以围绕同一份结构继续扩展。
export interface WorkflowDefinitionRecord {
  id: number;
  name: string;
  code: string;
  version: number;
  description?: string;
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

export interface CreateWorkflowDefinitionNodePayload {
  code: string;
  name: string;
  nodeType: 'START' | 'APPROVAL' | 'CONDITION' | 'PARALLEL_SPLIT' | 'PARALLEL_JOIN' | 'END';
  approveMode?: 'AND' | 'OR' | 'SEQUENTIAL';
  timeoutHours?: number;
  timeoutAction?: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'NOTIFY_ONLY';
  remindHours?: number;
  positionX?: number;
  positionY?: number;
  configJson?: string;
  approverList?: Array<{
    approverType: 'USER' | 'ROLE' | 'DEPT' | 'INITIATOR_DEPT_LEADER';
    approverValue: string;
    sortOrder?: number;
  }>;
}

export interface CreateWorkflowTransitionPayload {
  fromNodeCode: string;
  toNodeCode: string;
  label?: string;
  priority?: number;
}

export interface CreateWorkflowDefinitionPayload {
  name: string;
  code: string;
  description?: string;
  nodes: CreateWorkflowDefinitionNodePayload[];
  transitions: CreateWorkflowTransitionPayload[];
}

export interface UpdateWorkflowDefinitionPayload {
  id: number;
  name: string;
  description?: string;
  nodes: CreateWorkflowDefinitionNodePayload[];
  transitions: CreateWorkflowTransitionPayload[];
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
