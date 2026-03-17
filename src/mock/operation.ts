import type { ActivityItem } from '@/services/operation.service';

// 活动列表同时保留“进行中”和“已结束”两种状态，便于表格状态列演示。
export const mockActivityList: ActivityItem[] = [
  {
    id: 'a-001',
    name: '春季拉新活动',
    owner: '王琳',
    status: '进行中',
    period: '2026-03-01 ~ 2026-03-31',
  },
  {
    id: 'a-002',
    name: '内容创作者激励计划',
    owner: '赵晴',
    status: '已结束',
    period: '2026-02-01 ~ 2026-02-20',
  },
];
