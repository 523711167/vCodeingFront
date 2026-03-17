import type { PermissionPayload } from '@/services/auth.service';

// token 和权限信息拆开存，主要是为了让读取逻辑更直接：
// token 用于认证恢复，权限数据用于菜单和按钮恢复。
const TOKEN_KEY = 'vcodeing-token';
const PERMISSION_KEY = 'vcodeing-permission';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
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
  localStorage.removeItem(PERMISSION_KEY);
}
