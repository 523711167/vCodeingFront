import type { LoginRequest, PermissionPayload } from '@/services/auth.service';

function wait(ms = 400) {
  // 人为加一点延迟，是为了让登录 loading 和异步流程在本地也能真实暴露出来。
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

// 这份权限数据既服务菜单，也服务路由和按钮权限演示。
// 后续如果要模拟不同角色，可以再补多套 payload。
export const mockPermissionPayload: PermissionPayload = {
  userId: 'u1001',
  name: '运营经理',
  roles: ['operator_admin'],
  menus: [
    {
      path: '/dashboard',
      title: '工作台',
      authCode: 'dashboard:view',
    },
    {
      path: '/content',
      title: '内容管理',
      authCode: 'content:module:view',
      children: [
        {
          path: '/content/list',
          title: '内容列表',
          authCode: 'content:list:view',
        },
      ],
    },
    {
      path: '/operation',
      title: '运营活动',
      authCode: 'operation:module:view',
      children: [
        {
          path: '/operation/list',
          title: '活动列表',
          authCode: 'operation:list:view',
        },
      ],
    },
    {
      path: '/system',
      title: '系统管理',
      authCode: 'system:module:view',
      children: [
        {
          path: '/system/users',
          title: '账号管理',
          authCode: 'system:user:view',
        },
        {
          path: '/system/roles',
          title: '角色管理',
          authCode: 'system:role:view',
        },
        {
          path: '/system/menus',
          title: '菜单权限',
          authCode: 'system:menu:view',
        },
      ],
    },
    {
      path: '/profile',
      title: '个人中心',
      authCode: 'profile:view',
    },
  ],
  buttons: [
    'content:create',
    'content:edit',
    'content:delete',
    'operation:create',
    'operation:edit',
    'operation:delete',
    'system:user:edit',
    'system:role:edit',
    'system:menu:edit',
  ],
};

export async function mockLogin(payload: LoginRequest) {
  await wait();

  // 这里故意只开放一组固定账号，方便示例项目快速验证完整登录链路。
  if (payload.username === 'admin' && payload.password === '123456') {
    return {
      token: 'mock-admin-token',
    };
  }

  // 登录失败也要保持和真实接口相似的错误行为，方便页面处理异常提示。
  throw new Error('账号或密码错误，请使用 admin / 123456 登录');
}
