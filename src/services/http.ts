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

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
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
    store.dispatch(clearAuth());
    store.dispatch(clearPermission());
  }

  message.error(result.message || '请求失败');
  throw new Error(result.message || 'Request failed');
}
