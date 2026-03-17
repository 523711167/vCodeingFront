# vCodeing Front 项目阅读说明

这份文档面向“想看懂这个项目代码”的读者。

重点不是介绍产品功能，而是回答两个问题：

1. 这个项目的代码是怎么组织的。
2. 读到某个文件时，应该知道它负责什么。

## 1. 项目主线

这个项目是一个基于 `Vite + React + TypeScript + Ant Design + Redux Toolkit + React Router` 的后台前端骨架。

应用启动后的主线可以概括成下面这条链路：

`src/main.tsx`
-> 挂载 React 应用
-> `src/app/providers.tsx` 注入全局能力
-> `src/app/App.tsx` 承接路由
-> `src/router/AppRouter.tsx` 根据权限生成可访问路由
-> `src/layouts/MainLayout.tsx` 渲染后台整体布局
-> `src/pages/**` 渲染具体业务页面
-> `src/services/**` 负责拿数据
-> `src/store/**` 管跨页面共享状态

如果先抓住这条主线，再去看单个文件，会容易很多。

## 2. 根目录文件作用

### `package.json`

- 记录项目名称、依赖、脚本命令。
- `npm run dev` 启动开发环境。
- `npm run build` 执行类型检查并打包。
- `npm run typecheck` 只做 TypeScript 类型检查。

### `tsconfig.json`

- TypeScript 的总入口配置。
- 当前文件本身不直接配置编译规则，而是通过 `references` 把工作拆给两个子配置：
  - `tsconfig.app.json`：负责浏览器里的前端应用代码。
  - `tsconfig.node.json`：负责 Node 环境下的配置文件。

### `tsconfig.app.json`

- 管理 `src` 目录下的前端 TypeScript 配置。
- `strict: true` 表示开启严格类型检查。
- `jsx: "react-jsx"` 让 TypeScript 正确理解 React JSX。
- `baseUrl` 和 `paths` 让项目可以使用 `@/xxx` 这样的别名导入。
- `include: ["src"]` 表示只检查前端源码。

### `tsconfig.node.json`

- 管理 Node 环境下的 TypeScript 文件。
- 当前主要用于 `vite.config.ts`。
- `types: ["node"]` 让 TypeScript 认识 Node 提供的类型。

### `vite.config.ts`

- Vite 的构建和开发服务器配置文件。
- 这里主要做了两件事：
  - 注册 React 插件。
  - 把 `@` 别名映射到 `src` 目录。
- `server.port = 5173` 指定本地开发端口。

### `.env.example`

- 示例环境变量文件。
- 告诉开发者这个项目支持哪些环境变量。
- 当前包括：
  - `VITE_APP_TITLE`：应用标题。
  - `VITE_API_BASE_URL`：接口基础地址。
  - `VITE_USE_MOCK`：是否启用本地 mock。
  - `VITE_LOGIN_EXPIRE_CODE`：登录过期业务码。

### `docs/react-admin-tech-design.md`

- 项目的技术设计说明。
- 如果想从“架构设计视角”理解项目，而不是从代码入口逐个读，可以先看这份文档。

## 3. `src` 目录总览

### `src/main.tsx`

- React 应用真正的挂载入口。
- 浏览器加载页面后，会从这里把应用渲染到 `#root`。
- 全局样式也在这里引入。

### `src/vite-env.d.ts`

- 给 Vite 注入的全局对象补充 TypeScript 类型声明。
- 让 `import.meta.env` 在项目里有明确的类型提示。
- 如果新增环境变量，应该优先修改这里。

### `src/styles/global.css`

- 存放全局样式。
- 一般用于页面基础布局、公共类名、整体视觉基线。

## 4. `src/app`：应用入口层

### `src/app/App.tsx`

- 应用根组件。
- 当前职责很单一，只负责承接路由层。
- 这样可以避免把入口组件写得过重。

### `src/app/providers.tsx`

- 统一包裹全局 Provider。
- 当前包括：
  - Redux `Provider`
  - Ant Design `ConfigProvider`
  - Ant Design `App`
  - React Router `BrowserRouter`
- 如果后续要接国际化、主题、埋点、错误上报，通常也会从这一层扩展。

## 5. `src/router`：路由层

### `src/router/AppRouter.tsx`

- 项目的路由装配中心。
- 它会读取权限状态，过滤掉当前用户无权访问的业务路由。
- 然后调用 React Router 的 `useRoutes` 生成最终可访问页面。

### `src/router/routes.tsx`

- 整个后台的业务路由总表。
- 同一份配置同时服务：
  - 路由注册
  - 菜单生成
  - 权限过滤
  - 面包屑匹配
- 新增页面时，通常优先从这个文件接入。

### `src/router/guards.tsx`

- 放路由守卫逻辑。
- 当前只有 `AuthGuard`，负责拦截未登录用户。
- 没有 token 时，会跳转到登录页。

### `src/router/types.ts`

- 路由配置的类型定义。
- 约束每条业务路由应该包含哪些字段，比如 `path`、`element`、`meta`。

## 6. `src/layouts`：页面骨架层

### `src/layouts/MainLayout.tsx`

- 后台主布局。
- 负责渲染：
  - 左侧菜单
  - 顶部栏
  - 面包屑
  - 右侧内容区
- 它本身不负责具体业务页面，只负责“页面壳子”。

## 7. `src/store`：全局状态层

### `src/store/index.ts`

- Redux store 的创建入口。
- 把多个 slice 组合成全局状态树。

### `src/store/hooks.ts`

- 对 `useDispatch` 和 `useSelector` 做类型封装。
- 页面层统一用这里导出的 hooks，避免每个页面重复写类型。

### `src/store/slices/authSlice.ts`

- 管理登录态。
- 当前主要存：
  - `token`
  - 登录 loading 状态
- 同时负责把 token 写入本地存储。

### `src/store/slices/permissionSlice.ts`

- 管理权限数据。
- 当前主要存：
  - 当前用户信息
  - 可访问路由权限码
  - 按钮权限码
- 菜单展示和按钮显隐都依赖这里。

### `src/store/slices/appSlice.ts`

- 管理应用级 UI 状态。
- 当前只维护侧边栏折叠状态。

## 8. `src/features`：特定能力模块

### `src/features/permission/filterRoutes.ts`

- 负责根据权限码过滤业务路由。
- 这里把“权限判断逻辑”从路由组件里拆出来，便于复用和测试。
- 同时提供路由拍平方法，方便交给 React Router 注册。

## 9. `src/components`：公共组件

### `src/components/PageContainer.tsx`

- 页面外层统一容器。
- 统一页面标题区、描述区和内容卡片壳子。
- 列表页和表单页通常都复用它。

### `src/components/PermissionButton.tsx`

- 带按钮权限控制的按钮组件。
- 如果当前用户没有对应按钮权限，就不渲染按钮。
- 页面层不需要每次自己写权限判断。

## 10. `src/services`：数据访问层

这一层的原则是：页面只调用 service，不自己直接处理请求细节。

### `src/services/http.ts`

- Axios 的统一封装。
- 负责：
  - 设置请求基础地址
  - 自动带上 token
  - 统一网络错误处理
  - 登录失效时统一清理状态

### `src/services/auth.service.ts`

- 管理登录和权限相关接口。
- 当前包括：
  - 登录
  - 获取当前用户权限信息

### `src/services/dashboard.service.ts`

- 提供工作台首页所需的概览数据。

### `src/services/content.service.ts`

- 提供内容列表相关数据。
- 这里还定义了通用分页结构 `PageResult<T>`。

### `src/services/operation.service.ts`

- 提供活动列表数据。
- 复用了内容模块定义的分页结构。

### `src/services/user.service.ts`

- 提供用户管理页的数据。

### `src/services/role.service.ts`

- 提供角色管理页的数据。

### `src/services/menu.service.ts`

- 提供菜单权限树数据。

## 11. `src/utils`：工具层

### `src/utils/storage.ts`

- 统一封装本地存储读写。
- 当前负责 token 和权限数据的持久化。
- 页面和 slice 不直接操作 `localStorage`，而是通过这里间接访问。

## 12. `src/mock`：模拟数据层

这一层的作用是：在后端接口还没接好时，前端也能先把页面和流程跑起来。

### `src/mock/auth.ts`

- 模拟登录和权限数据。
- 当前固定支持 `admin / 123456` 登录。

### `src/mock/dashboard.ts`

- 模拟工作台指标数据。

### `src/mock/content.ts`

- 模拟内容列表数据。

### `src/mock/operation.ts`

- 模拟活动列表数据。

### `src/mock/system.ts`

- 模拟用户、角色、菜单树等系统管理数据。

## 13. `src/pages`：业务页面层

这一层就是用户真正看到的页面。

### `src/pages/auth/LoginPage.tsx`

- 登录页。
- 负责收集账号密码、发起登录、拉取权限、写入 store，并跳转到工作台。

### `src/pages/dashboard/DashboardPage.tsx`

- 工作台首页。
- 展示概览指标、快捷入口、待办事项。

### `src/pages/content/ContentListPage.tsx`

- 内容列表页。
- 展示搜索区、表格区、操作按钮。

### `src/pages/content/ContentFormPage.tsx`

- 内容新增/编辑页。
- 通过路由参数判断当前是新增模式还是编辑模式。

### `src/pages/operation/OperationListPage.tsx`

- 活动列表页。
- 结构上与内容列表页类似。

### `src/pages/operation/OperationFormPage.tsx`

- 活动新增/编辑页。

### `src/pages/system/UserManagementPage.tsx`

- 账号管理页。

### `src/pages/system/RoleManagementPage.tsx`

- 角色管理页。

### `src/pages/system/MenuManagementPage.tsx`

- 菜单权限管理页。

### `src/pages/profile/ProfilePage.tsx`

- 个人中心页。

### `src/pages/exception/ForbiddenPage.tsx`

- 无权限访问页，对应 `403`。

### `src/pages/exception/NotFoundPage.tsx`

- 页面不存在时的兜底页，对应 `404`。

## 14. 推荐阅读顺序

如果你的目标是“把这个项目看懂”，建议按下面顺序读：

1. `src/main.tsx`
2. `src/app/providers.tsx`
3. `src/app/App.tsx`
4. `src/router/AppRouter.tsx`
5. `src/router/routes.tsx`
6. `src/layouts/MainLayout.tsx`
7. `src/store/index.ts`
8. `src/store/slices/authSlice.ts`
9. `src/store/slices/permissionSlice.ts`
10. `src/services/http.ts`
11. `src/pages/auth/LoginPage.tsx`
12. `src/pages/content/ContentListPage.tsx`

这样读的好处是：

- 先建立“应用怎么跑起来”的整体认识。
- 再理解“权限和菜单怎么工作”。
- 最后再回到具体页面看数据流和交互。

## 15. 一句话总结

这个项目的核心设计思路是：

- 用 `routes.tsx` 作为业务路由和菜单的单一事实源。
- 用 `store` 管登录态、权限和全局 UI 状态。
- 用 `services` 隔离页面和请求实现。
- 用 `mock` 保证前端在没有后端时也能独立开发。

如果后续继续扩展项目，优先沿着这个分层继续加代码，不要把请求、权限判断和页面渲染混在一个文件里。
