import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URLS, API_ENDPOINTS } from '@/services/api-endpoints';

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expires_in?: number;
}

// introspect 的返回字段并不稳定，所以这里把常见 claim 都声明成可选。
// 后续如果后端继续补充租户、部门、组织等字段，可以在这里集中扩展。
export interface OAuthIntrospectionResponse {
  active: boolean;
  aud?: string[];
  client_id?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  jti?: string;
  nbf?: number;
  permissions?: string[];
  real_name?: string;
  roles?: string[];
  scope?: string;
  status?: string;
  sub?: string;
  token_type?: string;
  user_id?: string;
}

interface OAuthWrappedErrorResponse {
  code?: number;
  data?: unknown;
  msg?: string;
}

const oauthHttp = axios.create({
  // OAuth2 地址独立配置，避免后续业务 API 走网关或不同前缀时影响登录链路。
  baseURL: API_BASE_URLS.oauth,
  timeout: 10000,
});

function buildClientAuthorizationHeader() {
  const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID ?? '';
  const clientSecret = import.meta.env.VITE_OAUTH_CLIENT_SECRET ?? '';

  // 这里直接拼 Basic 头，是为了兼容当前后端 OAuth2 的 client_secret_basic 方案。
  // 这只适合本地联调；正式环境应改成由 BFF 或网关托管客户端密钥。
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

function buildFormBody(payload: Record<string, string>) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    params.set(key, value);
  });

  return params;
}

function isOAuthWrappedErrorResponse(
  payload: unknown,
): payload is OAuthWrappedErrorResponse {
  return typeof payload === 'object' && payload !== null && 'code' in payload;
}

async function requestOAuthPayload<T>(
  config: AxiosRequestConfig,
) {
  try {
    const response = await oauthHttp.request<T>(config);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<OAuthWrappedErrorResponse>;
    const payload = axiosError.response?.data;

    // 当前后端在失败时会返回非 200 状态码，并把业务文案放进 msg/message。
    // 这里统一把它转换成 Error，调用方只需要消费最终的错误文案即可。
    if (isOAuthWrappedErrorResponse(payload)) {
      throw new Error(payload.msg || '认证请求失败');
    }

    throw error;
  }
}

export async function requestPasswordToken(username: string, password: string) {
  return requestOAuthPayload<OAuthTokenResponse>(
    {
      method: 'post',
      url: API_ENDPOINTS.oauth.token,
      data: buildFormBody({
        grant_type: 'password_login',
        password,
        scope: import.meta.env.VITE_OAUTH_SCOPE ?? 'api',
        username,
      }),
      headers: {
        Authorization: buildClientAuthorizationHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export async function requestRefreshToken(refreshToken: string) {
  return requestOAuthPayload<OAuthTokenResponse>(
    {
      method: 'post',
      url: API_ENDPOINTS.oauth.token,
      data: buildFormBody({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: import.meta.env.VITE_OAUTH_SCOPE ?? 'api',
      }),
      headers: {
        Authorization: buildClientAuthorizationHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export async function introspectToken(token: string) {
  return requestOAuthPayload<OAuthIntrospectionResponse>(
    {
      method: 'post',
      url: API_ENDPOINTS.oauth.introspect,
      data: buildFormBody({ token }),
      headers: {
        Authorization: buildClientAuthorizationHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export async function revokeToken(token: string) {
  return oauthHttp.request<void>({
    method: 'post',
    url: API_ENDPOINTS.oauth.revoke,
    data: buildFormBody({ token }),
    headers: {
      Authorization: buildClientAuthorizationHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
