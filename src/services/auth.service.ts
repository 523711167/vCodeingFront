import axios from 'axios';
import { mockLogin } from '@/mock/auth';
import { mockMenuTree } from '@/mock/system';
import { API_BASE_URLS, API_ENDPOINTS } from '@/services/api-endpoints';
import {
  requestPasswordToken,
  requestRefreshToken,
  revokeToken,
  type OAuthTokenResponse,
} from '@/services/oauth.service';
import type { MenuRecord } from '@/services/menu.service';
import {
  getStoredRefreshToken,
  getStoredToken,
  getStoredTokenType,
} from '@/utils/storage';

// 登录请求体保持最小结构，后续如果接验证码、多租户或登录方式切换，可以从这里扩展。
export interface LoginRequest {
  username: string;
  password: string;
}

// PermissionPayload 是登录后最关键的一份上下文数据。
// 页面展示、动态路由、侧边菜单和按钮权限都会依赖它。
export interface PermissionPayload {
  userId: string;
  name: string;
  roles: string[];
  menus: MenuRecord[];
  buttons: string[];
}

// AuthSession 统一描述当前前端需要持久化的 OAuth2 会话数据。
// 后续如果要加“提前多久刷新”“多端会话标识”等字段，可以继续从这里扩展。
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
}

interface LoginResult {
  session: AuthSession;
  permissionPayload: PermissionPayload;
}

// 认证链路单独支持 mock 开关，是因为业务页面可能仍然走 mock，
// 但登录过程已经需要联调真实后端。
const useMock = import.meta.env.VITE_USE_AUTH_MOCK
  ? import.meta.env.VITE_USE_AUTH_MOCK !== 'false'
  : import.meta.env.VITE_USE_MOCK !== 'false';

interface ApiResponse<T> {
  code: number;
  msg?: string;
  message?: string;
  data: T;
}

// 当前登录用户上下文来自业务接口，而不是 OAuth introspect。
// 这样做是为了适配后端 claim 精简后，前端仍然能稳定拿到姓名、角色和按钮权限。
interface CurrentUserContext {
  userId: number;
  username: string;
  realName?: string;
  avatar?: string;
  status: number;
  statusMsg?: string;
  roleCodes?: string[];
  permissions?: string[];
}

function toAuthSession(tokenPayload: OAuthTokenResponse): AuthSession {
  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token ?? '',
    tokenType: tokenPayload.token_type ?? 'Bearer',
    // 提前把绝对过期时间算好，是为了后续如果要做“即将过期提示”
    // 或“静默刷新倒计时”，请求层不必自己重复换算。
    expiresAt: Date.now() + (tokenPayload.expires_in ?? 0) * 1000,
  };
}

function buildPermissionPayload(
  currentUser: CurrentUserContext,
  menus: MenuRecord[],
): PermissionPayload {
  return {
    userId: String(currentUser.userId ?? ''),
    name: currentUser.realName ?? currentUser.username ?? '未命名用户',
    roles: currentUser.roleCodes ?? [],
    // 路由、菜单和图标完全以后端菜单树为准，前端不再保留一份同构静态菜单配置。
    menus,
    // 按钮权限暂时继续保留原始权限码，后续如果恢复按钮级校验，可以直接基于这份数据消费。
    buttons: currentUser.permissions ?? [],
  };
}

export function getDefaultRoutePath(payload?: PermissionPayload | null) {
  const walk = (menus: MenuRecord[]): string | null => {
    for (const menu of menus) {
      if (menu.status !== 1 || menu.type === 'BUTTON' || !menu.path) {
        continue;
      }

      if (menu.type === 'MENU') {
        return menu.path;
      }

      const childPath = walk(menu.children ?? []);

      if (childPath) {
        return childPath;
      }
    }

    return null;
  };

  return walk(payload?.menus ?? []) ?? '/403';
}

async function fetchCurrentMenus(session: AuthSession) {
  const response = await axios.get<ApiResponse<MenuRecord[]>>(
    `${API_BASE_URLS.business}${API_ENDPOINTS.menu.tree}`,
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
      },
      timeout: 10000,
    },
  );
  const result = response.data;
  const resultMessage = result.message ?? result.msg ?? '菜单数据加载失败';

  if (result.code !== 0) {
    throw new Error(resultMessage);
  }

  return result.data;
}

async function fetchCurrentUserContext(session: AuthSession) {
  // 登录后的“用户是谁、有哪些角色和按钮权限”以后统一走 current-user，
  // 这样后端即使继续调整 OAuth claim，前端菜单和权限也不会再次丢失。
  const response = await axios.get<ApiResponse<CurrentUserContext>>(
    `${API_BASE_URLS.business}${API_ENDPOINTS.auth.currentUser}`,
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
      },
      timeout: 10000,
    },
  );
  const result = response.data;
  const resultMessage = result.message ?? result.msg ?? '当前登录用户信息加载失败';

  if (result.code !== 0) {
    throw new Error(resultMessage);
  }

  return result.data;
}

// 这个方法同时给“登录成功后初始化权限”和“页面刷新后的权限自恢复”复用。
// 这样当前用户、菜单树和按钮权限始终来自同一组后端接口，不会出现缓存越用越旧的问题。
export async function fetchCurrentPermissionPayload(
  session: Pick<AuthSession, 'accessToken' | 'tokenType'> = {
    accessToken: getStoredToken(),
    tokenType: getStoredTokenType(),
  },
) {
  if (!session.accessToken) {
    throw new Error('缺少 access token，无法加载当前权限');
  }

  const authSession: AuthSession = {
    accessToken: session.accessToken,
    expiresAt: 0,
    refreshToken: '',
    tokenType: session.tokenType,
  };
  const [currentUser, currentMenus] = await Promise.all([
    fetchCurrentUserContext(authSession),
    fetchCurrentMenus(authSession),
  ]);

  return buildPermissionPayload(currentUser, currentMenus);
}

export async function refreshCurrentSession(refreshToken = getStoredRefreshToken()) {
  if (!refreshToken) {
    throw new Error('缺少 refresh token，无法续期登录状态');
  }

  return toAuthSession(await requestRefreshToken(refreshToken));
}

export async function login(payload: LoginRequest) {
  if (useMock) {
    // mock 分支直接返回模拟登录结果，用于前端独立开发。
    const result = await mockLogin(payload);

    return {
      session: {
        accessToken: result.token,
        refreshToken: '',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 7199 * 1000,
      },
      permissionPayload: buildPermissionPayload(
        {
          permissions: [
            'sys:user:add',
            'sys:user:edit',
            'sys:user:delete',
            'sys:user:reset-pwd',
            'sys:role:add',
            'sys:role:edit',
            'sys:role:delete',
            'sys:menu:edit',
          ],
          realName: '运营经理',
          roleCodes: ['operator_admin'],
          status: 1,
          userId: 1001,
          username: 'mock-admin',
        },
        mockMenuTree,
      ),
    } satisfies LoginResult;
  }

  const initialSession = toAuthSession(
    await requestPasswordToken(payload.username, payload.password),
  );
  const activeSession = initialSession;

  return {
    session: activeSession,
    // 当前后端的 introspect 结果并不稳定，登录后完整的姓名、角色和权限
    // 统一以业务接口 /sys/auth/current-user 为准，避免再次出现“登录成功但菜单为空”的问题。
    permissionPayload: await fetchCurrentPermissionPayload(activeSession),
  } satisfies LoginResult;
}

export async function logout() {
  if (useMock) {
    return;
  }

  const accessToken = getStoredToken();

  if (!accessToken) {
    return;
  }

  try {
    // 退出时优先撤销 access_token，让后端尽快终止当前会话。
    await revokeToken(accessToken);
  } catch {
    // 撤销失败不阻塞前端退出，因为本地清理登录态仍然必须发生。
  }
}
