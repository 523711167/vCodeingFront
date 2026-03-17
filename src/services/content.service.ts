import { mockContentList } from '@/mock/content';
import { request } from '@/services/http';

export interface PageResult<T> {
  list: T[];
  pageNum: number;
  pageSize: number;
  total: number;
}

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  author: string;
  status: '已发布' | '草稿';
  updatedAt: string;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchContentList() {
  if (useMock) {
    return Promise.resolve({
      list: mockContentList,
      pageNum: 1,
      pageSize: 10,
      total: mockContentList.length,
    } satisfies PageResult<ContentItem>);
  }

  return request<PageResult<ContentItem>>({
    method: 'get',
    url: '/contents',
  });
}
