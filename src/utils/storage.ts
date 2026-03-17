import type { PermissionPayload } from '@/services/auth.service';

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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PERMISSION_KEY);
}
