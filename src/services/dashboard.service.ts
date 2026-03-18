import { mockDashboardOverview } from '@/mock/dashboard';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// 工作台概览数据通常是聚合型接口，因此单独抽成一个类型。
export interface DashboardOverview {
  totalContents: number;
  onlineActivities: number;
  pendingTasks: number;
  weeklyVisits: number;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchDashboardOverview() {
  if (useMock) {
    // 工作台进入频率高，mock 数据直接返回，减少不必要延迟。
    return Promise.resolve(mockDashboardOverview);
  }

  return request<DashboardOverview>({
    method: 'get',
    url: API_ENDPOINTS.dashboard.overview,
  });
}
