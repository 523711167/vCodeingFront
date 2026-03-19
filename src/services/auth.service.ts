import { mockLogin, mockPermissionPayload } from '@/mock/auth';
import {
  introspectToken,
  requestPasswordToken,
  requestRefreshToken,
  revokeToken,
  type OAuthIntrospectionResponse,
  type OAuthTokenResponse,
} from '@/services/oauth.service';
import { getStoredRefreshToken, getStoredToken } from '@/utils/storage';

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

function hasPermissionPrefix(permissions: string[], prefix: string) {
  return permissions.some((permission) => permission.startsWith(prefix));
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

function buildPermissionPayload(claims: OAuthIntrospectionResponse): PermissionPayload {
  const permissions = claims.permissions ?? [];
  const roles = claims.roles ?? [];
  const isAdmin = roles.includes('ADMIN') || claims.sub === 'admin';
  const canViewUsers = isAdmin || hasPermissionPrefix(permissions, 'sys:user:');
  const canViewRoles = isAdmin || hasPermissionPrefix(permissions, 'sys:role:');
  const canViewMenus = isAdmin || hasPermissionPrefix(permissions, 'sys:menu:');
  const systemChildren: PermissionMenu[] = [];

  if (canViewUsers) {
    systemChildren.push({
      path: '/system/users',
      title: '账号管理',
      authCode: 'system:user:view',
    });
  }

  if (canViewRoles) {
    systemChildren.push({
      path: '/system/roles',
      title: '角色管理',
      authCode: 'system:role:view',
    });
  }

  if (canViewMenus) {
    systemChildren.push({
      path: '/system/menus',
      title: '菜单权限',
      authCode: 'system:menu:view',
    });
  }

  return {
    userId: claims.user_id ?? claims.sub ?? '',
    name: claims.real_name ?? claims.sub ?? '未命名用户',
    roles,
    menus: [
      {
        path: '/dashboard',
        title: '工作台',
        authCode: 'dashboard:view',
      },
      ...(systemChildren.length
        ? [
            {
              path: '/system',
              title: '系统管理',
              authCode: 'system:module:view',
              children: systemChildren,
            },
          ]
        : []),
      {
        path: '/profile',
        title: '个人中心',
        authCode: 'profile:view',
      },
    ],
    // 当前前端只用到了少量按钮权限，因此这里先做一层聚焦映射。
    // 如果后续页面开始直接消费 sys:* 原始权限码，可以在这里改成双写或直接透传。
    buttons: [
      ...(permissions.includes('sys:user:add') ? ['system:user:create'] : []),
      ...(permissions.includes('sys:user:edit') ? ['system:user:edit'] : []),
      ...(permissions.includes('sys:user:delete') ? ['system:user:delete'] : []),
      ...(permissions.includes('sys:user:reset-pwd')
        ? ['system:user:reset-pwd']
        : []),
      ...(permissions.includes('sys:role:edit') ? ['system:role:edit'] : []),
      ...(permissions.includes('sys:menu:edit') ? ['system:menu:edit'] : []),
    ],
  };
}

export function getDefaultRoutePath(payload?: PermissionPayload | null) {
  return payload?.menus[0]?.path ?? '/403';
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
      permissionPayload: mockPermissionPayload,
    } satisfies LoginResult;
  }

  const initialSession = toAuthSession(
    await requestPasswordToken(payload.username, payload.password),
  );
  const activeSession = initialSession;
  const claims = await introspectToken(activeSession.accessToken);

  if (!claims.active) {
    throw new Error('登录成功，但令牌校验失败');
  }

  return {
    session: activeSession,
    permissionPayload: buildPermissionPayload(claims),
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
