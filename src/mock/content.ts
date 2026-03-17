import type { ContentItem } from '@/services/content.service';

// 内容列表数据刻意覆盖“已发布 / 草稿”两种状态，用于验证状态标签展示。
export const mockContentList: ContentItem[] = [
  {
    id: 'c-001',
    title: '首页改版内容排期',
    category: '专题内容',
    author: '张悦',
    status: '已发布',
    updatedAt: '2026-03-16 10:30',
  },
  {
    id: 'c-002',
    title: '春季活动推文素材',
    category: '运营稿件',
    author: '李楠',
    status: '草稿',
    updatedAt: '2026-03-15 18:20',
  },
  {
    id: 'c-003',
    title: '用户增长周报',
    category: '数据内容',
    author: '陈璐',
    status: '已发布',
    updatedAt: '2026-03-14 09:12',
  },
];
