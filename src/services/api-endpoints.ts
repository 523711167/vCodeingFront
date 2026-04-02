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
  // biz 域对应“业务定义”菜单。
  // 这里独立成一个分组，是为了把业务建模类接口和流程定义、系统管理接口区分开，
  // 后续如果再补业务对象、业务规则、业务表单，也继续沿着这个域扩展。
  biz: {
    create: '/sys/biz/create',
    currentUserPage: '/sys/biz/current-user/page',
    delete: '/sys/biz/delete',
    detail: '/sys/biz/detail',
    list: '/sys/biz/list',
    page: '/sys/biz/page',
    roles: '/sys/biz/roles',
    updateRoles: '/sys/biz/roles/update',
    update: '/sys/biz/update',
  },
  // bizApply 域承接“业务办理/草稿/提交审批”这类运行态接口。
  // 这样可以和业务定义配置接口拆开，避免页面在 import 时把配置态和运行态混成一组。
  bizApply: {
    draftDetail: '/sys/biz-apply/draft/detail',
    draftPage: '/sys/biz-apply/draft/page',
    todoDetail: '/sys/biz-apply/todo/detail',
    todoPage: '/sys/biz-apply/todo/page',
    // 最新草稿写接口已经收敛到 /draft/save 和 /draft/update。
    // 这里直接切到新版路径，避免前端继续命中兼容中的旧地址。
    saveDraft: '/sys/biz-apply/draft/save',
    updateDraft: '/sys/biz-apply/draft/update',
  },
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
  workflowDefinition: {
    create: '/sys/workflow-definition/create',
    delete: '/sys/workflow-definition/delete',
    detail: '/sys/workflow-definition/detail',
    disable: '/sys/workflow-definition/disable',
    list: '/sys/workflow-definition/list',
    page: '/sys/workflow-definition/page',
    publish: '/sys/workflow-definition/publish',
    update: '/sys/workflow-definition/update',
  },
  workflowBiz: {
    audit: '/sys/workflow-biz/audit',
    submit: '/sys/workflow-biz/submit',
  },
  dept: {
    create: '/sys/dept/create',
    delete: '/sys/dept/delete',
    detail: '/sys/dept/detail',
    tree: '/sys/dept/tree',
    update: '/sys/dept/update',
  },
  menu: {
    create: '/sys/menu/create',
    delete: '/sys/menu/delete',
    detail: '/sys/menu/detail',
    tree: '/sys/menu/tree',
    update: '/sys/menu/update',
  },
  user: {
    create: '/sys/user/create',
    delete: '/sys/user/delete',
    updateDepts: '/sys/user/depts/update',
    updateRoles: '/sys/user/roles/update',
    detail: '/sys/user/detail',
    page: '/sys/user/page',
    resetPassword: '/sys/user/password/reset',
    update: '/sys/user/update',
    updateStatus: '/sys/user/status/update',
  },
  role: {
    create: '/sys/role/create',
    updateDataScope: '/sys/role/data-scope/update',
    delete: '/sys/role/delete',
    detail: '/sys/role/detail',
    list: '/sys/role/list',
    menus: '/sys/role/menus',
    page: '/sys/role/page',
    updateMenus: '/sys/role/menus/update',
    update: '/sys/role/update',
    updateStatus: '/sys/role/status/update',
  },
} as const;
