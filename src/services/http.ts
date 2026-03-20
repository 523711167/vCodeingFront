import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
} from 'axios';
import { API_BASE_URLS } from '@/services/api-endpoints';
import { refreshCurrentSession } from '@/services/auth.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { clearAuth } from '@/store/slices/authSlice';
import { clearPermission } from '@/store/slices/permissionSlice';
import { store } from '@/store';
import { setAuthSession } from '@/store/slices/authSlice';
import {
  getStoredRefreshToken,
  getStoredToken,
  getStoredTokenType,
} from '@/utils/storage';

interface ApiResponse<T> {
  code: number;
  message?: string;
  msg?: string;
  data: T;
  traceId?: string;
}

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

// 整个项目只保留一个 axios 实例：
// 统一 baseURL、超时、认证头、错误处理，避免页面里散落请求规范。
const http = axios.create({
  baseURL: API_BASE_URLS.business,
  timeout: 10000,
});

let refreshingPromise: ReturnType<typeof refreshCurrentSession> | null = null;

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  const tokenType = getStoredTokenType();

  if (token) {
    // Axios 1.x 里 headers 可能是 AxiosHeaders 实例，也可能是普通对象，
    // 这里统一转成 AxiosHeaders 再写入，能避免类型和运行时兼容问题。
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `${tokenType} ${token}`);
    config.headers = headers;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; msg?: string }>) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;
    const canRefresh =
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.skipAuthRefresh &&
      Boolean(getStoredRefreshToken());

    if (canRefresh && originalRequest) {
      originalRequest._retry = true;

      try {
        // 并发 401 共用同一条 refresh 请求，避免同一时刻把 refresh_token 打爆。
        const refreshPromise = refreshingPromise ?? refreshCurrentSession();
        refreshingPromise = refreshPromise;
        const refreshedSession = await refreshPromise;
        store.dispatch(setAuthSession(refreshedSession));
        const headers = AxiosHeaders.from(
          originalRequest.headers as AxiosHeaders | undefined,
        );
        headers.set(
          'Authorization',
          `${refreshedSession.tokenType} ${refreshedSession.accessToken}`,
        );
        originalRequest.headers = headers;

        return http.request(originalRequest);
      } catch {
        store.dispatch(clearAuth());
        store.dispatch(clearPermission());
        showErrorMessageOnce(new Error('登录状态已失效，请重新登录'));
      } finally {
        refreshingPromise = null;
      }
    }

    // 这里兜底的是“网络层错误”，例如超时、断网、网关异常。
    // 业务错误码在 request<T> 里统一处理。
    showErrorMessageOnce(
      error,
      error.response?.data?.message ??
        error.response?.data?.msg ??
        '网络请求失败，请稍后重试',
    );
    return Promise.reject(error);
  },
);

export async function request<T>(config: AxiosRequestConfig) {
  const response = await http.request<ApiResponse<T>>(config);
  const result = response.data;
  const loginExpireCode = Number(import.meta.env.VITE_LOGIN_EXPIRE_CODE ?? 40101);
  const resultMessage = result.message ?? result.msg ?? '请求失败';

  if (result.code === 0) {
    return result.data;
  }

  if (result.code === loginExpireCode) {
    // 登录失效属于全局事件，不应该交给某个页面单独处理。
    // 在请求层统一清理认证和权限，能保证行为一致。
    store.dispatch(clearAuth());
    store.dispatch(clearPermission());
  }

  const requestError = new Error(resultMessage);

  showErrorMessageOnce(requestError, resultMessage);
  throw requestError;
}
