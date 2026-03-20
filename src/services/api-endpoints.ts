// 这个文件专门维护“前端当前会调用到的所有后端接口地址”。
// 这样做的目的，是把 URI 变成单一事实源：后端前缀、模块路径、OAuth2 端点变化时，
// 只需要改这里，不需要去每个 service 文件逐个搜索字符串。

// API_BASE_URLS 负责集中声明不同请求域的基础地址。
// 业务接口和 OAuth2 接口拆开，是因为它们在联调阶段可能经过不同代理或网关。
export const API_BASE_URLS = {
  business: import.meta.env.VITE_API_BASE_URL ?? '/api',
  oauth:
    import.meta.env.VITE_OAUTH_BASE_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    '/api',
} as const;

// API_ENDPOINTS 按业务域组织路径，目的是让调用方在 import 后就能看出接口归属。
// 如果后续系统管理模块接真接口，也优先从这里继续补充 user / role / menu 域。
export const API_ENDPOINTS = {
  dashboard: {
    overview: '/dashboard/overview',
  },
  content: {
    list: '/contents',
  },
  oauth: {
    introspect: '/oauth2/introspect',
    revoke: '/oauth2/revoke',
    token: '/oauth2/token',
  },
  operation: {
    list: '/activities',
  },
  dept: {
    create: '/sys/dept/create',
    delete: '/sys/dept/delete',
    detail: '/sys/dept/detail',
    tree: '/sys/dept/tree',
    update: '/sys/dept/update',
  },
  user: {
    create: '/sys/user/create',
    delete: '/sys/user/delete',
    updateDepts: '/sys/user/depts/update',
    detail: '/sys/user/detail',
    page: '/sys/user/page',
    resetPassword: '/sys/user/password/reset',
    update: '/sys/user/update',
    updateStatus: '/sys/user/status/update',
  },
  role: {
    create: '/sys/role/create',
    delete: '/sys/role/delete',
    detail: '/sys/role/detail',
    page: '/sys/role/page',
    update: '/sys/role/update',
    updateStatus: '/sys/role/status/update',
  },
} as const;
