import { mockDashboardOverview } from '@/mock/dashboard';
import { request } from '@/services/http';

export interface DashboardOverview {
  totalContents: number;
  onlineActivities: number;
  pendingTasks: number;
  weeklyVisits: number;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchDashboardOverview() {
  if (useMock) {
    return Promise.resolve(mockDashboardOverview);
  }

  return request<DashboardOverview>({
    method: 'get',
    url: '/dashboard/overview',
  });
}
