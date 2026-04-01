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
  workflowName?: string;
}

export interface SaveBizApplyDraftPayload {
  bizDefinitionId: number;
  title: string;
  formData: string;
}

export async function saveBizApplyDraft(payload: SaveBizApplyDraftPayload) {
  return request<BizApplyDraftRecord>({
    data: payload,
    method: 'post',
    url: API_ENDPOINTS.bizApply.saveDraft,
  });
}
