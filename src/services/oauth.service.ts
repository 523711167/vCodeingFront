import axios from 'axios';
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

export async function requestPasswordToken(username: string, password: string) {
  return oauthHttp
    .request<OAuthTokenResponse>({
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
    })
    .then((response) => response.data);
}

export async function requestRefreshToken(refreshToken: string) {
  return oauthHttp
    .request<OAuthTokenResponse>({
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
    })
    .then((response) => response.data);
}

export async function introspectToken(token: string) {
  return oauthHttp
    .request<OAuthIntrospectionResponse>({
      method: 'post',
      url: API_ENDPOINTS.oauth.introspect,
      data: buildFormBody({ token }),
      headers: {
        Authorization: buildClientAuthorizationHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    .then((response) => response.data);
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
