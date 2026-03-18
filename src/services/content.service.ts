import { mockContentList } from '@/mock/content';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// PageResult 抽成泛型后，内容列表、活动列表等分页接口都可以复用同一结构。
export interface PageResult<T> {
  list: T[];
  pageNum: number;
  pageSize: number;
  total: number;
}

// ContentItem 只保留当前列表页实际消费到的字段，避免骨架阶段过早引入过多业务细节。
export interface ContentItem {
  id: string;
  title: string;
  category: string;
  author: string;
  status: '已发布' | '草稿';
  updatedAt: string;
}

// 所有 service 都遵循同一条原则：
// 页面层只调用 service，不自己判断 mock、拼 URL 或处理返回结构。
const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchContentList() {
  if (useMock) {
    return Promise.resolve({
      // mock 返回值刻意保持成真实分页结构，方便后续无缝切真接口。
      list: mockContentList,
      pageNum: 1,
      pageSize: 10,
      total: mockContentList.length,
    } satisfies PageResult<ContentItem>);
  }

  return request<PageResult<ContentItem>>({
    method: 'get',
    // 当前路径只是骨架示例，后续可以按后端接口规范调整，但页面层无需改动。
    url: API_ENDPOINTS.content.list,
  });
}
