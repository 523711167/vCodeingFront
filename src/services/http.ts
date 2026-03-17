import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
} from 'axios';
import { message } from 'antd';
import { clearAuth } from '@/store/slices/authSlice';
import { clearPermission } from '@/store/slices/permissionSlice';
import { store } from '@/store';
import { getStoredToken } from '@/utils/storage';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

// 整个项目只保留一个 axios 实例：
// 统一 baseURL、超时、认证头、错误处理，避免页面里散落请求规范。
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    // Axios 1.x 里 headers 可能是 AxiosHeaders 实例，也可能是普通对象，
    // 这里统一转成 AxiosHeaders 再写入，能避免类型和运行时兼容问题。
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    // 这里兜底的是“网络层错误”，例如超时、断网、网关异常。
    // 业务错误码在 request<T> 里统一处理。
    message.error(error.response?.data?.message ?? '网络请求失败，请稍后重试');
    return Promise.reject(error);
  },
);

export async function request<T>(config: AxiosRequestConfig) {
  const response = await http.request<ApiResponse<T>>(config);
  const result = response.data;
  const loginExpireCode = Number(import.meta.env.VITE_LOGIN_EXPIRE_CODE ?? 40101);

  if (result.code === 0) {
    return result.data;
  }

  if (result.code === loginExpireCode) {
    // 登录失效属于全局事件，不应该交给某个页面单独处理。
    // 在请求层统一清理认证和权限，能保证行为一致。
    store.dispatch(clearAuth());
    store.dispatch(clearPermission());
  }

  message.error(result.message || '请求失败');
  throw new Error(result.message || 'Request failed');
}
