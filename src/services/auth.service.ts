import { mockLogin, mockPermissionPayload } from '@/mock/auth';
import { request } from '@/services/http';

// 登录请求体保持最小结构，后续如果接验证码、多租户或登录方式切换，可以从这里扩展。
export interface LoginRequest {
  username: string;
  password: string;
}

// PermissionMenu 描述的是“菜单树结构”，它既能驱动菜单展示，也能辅助路由权限过滤。
export interface PermissionMenu {
  path: string;
  title: string;
  authCode: string;
  children?: PermissionMenu[];
}

// PermissionPayload 是登录后最关键的一份上下文数据。
// 页面展示、菜单渲染、按钮权限判断都会依赖它。
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

// 通过环境变量统一控制 mock / 真接口切换，页面层不需要知道当前请求来源。
const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export async function login(payload: LoginRequest) {
  if (useMock) {
    // mock 分支直接返回模拟登录结果，用于前端独立开发。
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
    // 权限数据和登录返回拆开，是为了更贴近真实后台的“登录 + 拉用户信息”流程。
    return Promise.resolve(mockPermissionPayload);
  }

  return request<PermissionPayload>({
    method: 'get',
    url: '/auth/me',
  });
}
