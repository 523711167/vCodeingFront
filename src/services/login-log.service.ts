import { API_ENDPOINTS } from '@/services/api-endpoints';
import { request } from '@/services/http';

// 登录日志页面当前围绕“分页查询 + 详情查看”两类场景工作，
// 所以这里先把查询参数和返回结构集中在同一个 service 文件里，便于后续继续扩展导出、清理等能力。
export interface LoginLogRecord {
  id: number;
  userId?: number;
  username?: string;
  result?: string;
  resultMsg?: string;
  failReason?: string;
  clientIp?: string;
  userAgent?: string;
  loginAt?: string;
  createdAt?: string;
}

export interface LoginLogPageQuery {
  pageNum: number;
  pageSize: number;
  username?: string;
  result?: string;
  loginAtStart?: string;
  loginAtEnd?: string;
}

export interface LoginLogPageResult {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  records: LoginLogRecord[];
}

export async function fetchLoginLogPage(query: LoginLogPageQuery) {
  return request<LoginLogPageResult>({
    method: 'get',
    params: query,
    url: API_ENDPOINTS.auth.loginLogPage,
  });
}

export async function fetchLoginLogDetail(id: number) {
  return request<LoginLogRecord>({
    method: 'get',
    params: { id },
    url: API_ENDPOINTS.auth.loginLogDetail,
  });
}
