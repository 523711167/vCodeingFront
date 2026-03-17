import { mockActivityList } from '@/mock/operation';
import { request } from '@/services/http';
import type { PageResult } from '@/services/content.service';

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
      list: mockActivityList,
      pageNum: 1,
      pageSize: 10,
      total: mockActivityList.length,
    } satisfies PageResult<ActivityItem>);
  }

  return request<PageResult<ActivityItem>>({
    method: 'get',
    url: '/activities',
  });
}
