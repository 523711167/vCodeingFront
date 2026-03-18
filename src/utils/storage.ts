import type { PermissionPayload } from '@/services/auth.service';

// token 和权限信息拆开存，主要是为了让读取逻辑更直接：
// token 用于认证恢复，权限数据用于菜单和按钮恢复。
const TOKEN_KEY = 'vcodeing-token';
const REFRESH_TOKEN_KEY = 'vcodeing-refresh-token';
const TOKEN_TYPE_KEY = 'vcodeing-token-type';
const TOKEN_EXPIRES_AT_KEY = 'vcodeing-token-expires-at';
const PERMISSION_KEY = 'vcodeing-permission';

// 这里保留完整认证会话结构，是为了让刷新令牌、撤销令牌等 OAuth2 能力
// 在请求层和退出流程里都能直接复用，不需要各处自己拼装存储字段。
export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
}

export function getStoredTokenType() {
  return localStorage.getItem(TOKEN_TYPE_KEY) ?? 'Bearer';
}

export function getStoredTokenExpiresAt() {
  return Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) ?? 0);
}

export function setStoredAuthSession(session: StoredAuthSession) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(TOKEN_TYPE_KEY, session.tokenType);
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(session.expiresAt));
}

export function getStoredPermissionPayload() {
  const raw = localStorage.getItem(PERMISSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PermissionPayload;
  } catch {
    // 如果本地缓存损坏，不让页面直接崩溃，回退为“无权限数据”状态即可。
    return null;
  }
}

export function setStoredPermissionPayload(payload: PermissionPayload) {
  localStorage.setItem(PERMISSION_KEY, JSON.stringify(payload));
}

export function removePermissionPayload() {
  localStorage.removeItem(PERMISSION_KEY);
}

export function removeSessionStorage() {
  // 当前项目没有区分 sessionStorage / localStorage 的存储策略，
  // 这里的函数名保留“会话清理”的语义，便于后续统一扩展。
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(PERMISSION_KEY);
}
