import type { DashboardOverview } from '@/services/dashboard.service';

// 工作台 mock 数据保持“有一定业务感但不过度复杂”的程度，方便先验证视觉布局。
export const mockDashboardOverview: DashboardOverview = {
  totalContents: 128,
  onlineActivities: 12,
  pendingTasks: 7,
  weeklyVisits: 48321,
};
