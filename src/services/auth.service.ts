import axios from 'axios';
import { mockLogin } from '@/mock/auth';
import { mockMenuTree } from '@/mock/system';
import { API_BASE_URLS, API_ENDPOINTS } from '@/services/api-endpoints';
import {
  introspectToken,
  requestPasswordToken,
  requestRefreshToken,
  revokeToken,
  type OAuthIntrospectionResponse,
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
  claims: OAuthIntrospectionResponse,
  menus: MenuRecord[],
): PermissionPayload {
  return {
    // 当前后端已经约定通过 introspect 返回完整用户 claim，
    // 所以登录态恢复和首登都统一从这里提取用户身份字段。
    userId: claims.user_id ?? claims.sub ?? '',
    name: claims.real_name ?? claims.sub ?? '未命名用户',
    roles: claims.roles ?? [],
    // 路由、菜单和图标完全以后端菜单树为准，前端不再保留一份同构静态菜单配置。
    menus,
    // 按钮权限暂时继续保留原始权限码，后续如果恢复按钮级校验，可以直接基于这份数据消费。
    buttons: claims.permissions ?? [],
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

// 这个方法同时给“登录成功后初始化权限”和“页面刷新后的权限自恢复”复用。
// 这样用户 claim、菜单树和按钮权限都从 OAuth introspect + 菜单树接口恢复，
// 不再依赖已经下线的 current-user 业务接口。
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
  const [claims, currentMenus] = await Promise.all([
    introspectToken(authSession.accessToken),
    fetchCurrentMenus(authSession),
  ]);

  if (!claims.active) {
    throw new Error('登录状态校验失败');
  }

  return buildPermissionPayload(claims, currentMenus);
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
          active: true,
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
          real_name: '运营经理',
          roles: ['operator_admin'],
          sub: 'mock-admin',
          user_id: '1001',
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
    // 登录后权限上下文只使用 OAuth introspect，
    // 这样可以和当前后端“移除 current-user、统一走 OAuth claim”的实现保持一致。
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
