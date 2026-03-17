import { mockLogin, mockPermissionPayload } from '@/mock/auth';
import { request } from '@/services/http';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PermissionMenu {
  path: string;
  title: string;
  authCode: string;
  children?: PermissionMenu[];
}

export interface PermissionPayload {
  userId: string;
  name: string;
  roles: string[];
  menus: PermissionMenu[];
  buttons: string[];
}

interface LoginResponse {
  token: string;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function login(payload: LoginRequest) {
  if (useMock) {
    return mockLogin(payload);
  }

  return request<LoginResponse>({
    method: 'post',
    url: '/auth/login',
    data: payload,
  });
}

export async function fetchPermissionPayload() {
  if (useMock) {
    return Promise.resolve(mockPermissionPayload);
  }

  return request<PermissionPayload>({
    method: 'get',
    url: '/auth/me',
  });
}
