import { mockActivityList } from '@/mock/operation';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';
import type { PageResult } from '@/services/content.service';

// 活动列表复用 content service 中的分页类型，避免重复维护相同结构。
export interface ActivityItem {
  id: string;
  name: string;
  owner: string;
  status: '进行中' | '已结束';
  period: string;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchActivityList() {
  if (useMock) {
    return Promise.resolve({
      // 统一保持分页结构，页面表格和分页器就不需要区分 mock / real。
      list: mockActivityList,
      pageNum: 1,
      pageSize: 10,
      total: mockActivityList.length,
    } satisfies PageResult<ActivityItem>);
  }

  return request<PageResult<ActivityItem>>({
    method: 'get',
    url: API_ENDPOINTS.operation.list,
  });
}
