import type { ActivityItem } from '@/services/operation.service';

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
