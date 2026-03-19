// 这个文件专门给 TypeScript 补充“Vite 运行时注入的全局类型声明”。
// 因为 import.meta.env 并不是浏览器原生就有完整业务字段提示的对象，
// 所以我们在这里集中声明项目会用到哪些环境变量，后续扩展时也优先从这里接入。
/// <reference types="vite/client" />

// 三斜线 reference 的作用，是把 Vite 官方内置的类型声明提前引入进来。
// 这样 TypeScript 才知道 import.meta、import.meta.env、静态资源导入等 Vite 特性应该如何检查类型。
interface ImportMetaEnv {
  // VITE_APP_TITLE 表示应用标题配置。
  // 用可选字段是因为某些环境下可以不配置，代码里就需要自己提供兜底值。
  readonly VITE_APP_TITLE?: string;
  // VITE_API_BASE_URL 用来约定请求基础地址，让开发、测试、生产环境可以切换不同后端入口。
  readonly VITE_API_BASE_URL?: string;
  // VITE_API_PROXY_TARGET 主要给 Vite 开发代理读取，用来指定业务接口真正的后端服务。
  // 这里和 OAuth2 代理分开，是为了后续如果业务接口和认证接口走不同网关时仍能独立切换。
  readonly VITE_API_PROXY_TARGET?: string;
  // VITE_USE_MOCK 控制当前是否走前端 mock 数据。
  // 这里保留 string 类型，是因为环境变量在运行时本质上都会以字符串形式注入。
  readonly VITE_USE_MOCK?: string;
  // VITE_USE_USER_MOCK 允许账号管理页单独切到真实接口，
  // 避免其他业务模块暂时仍在 mock 时，用户管理也被一起锁死在 mock 上。
  readonly VITE_USE_USER_MOCK?: string;
  // VITE_USE_AUTH_MOCK 允许把认证链路单独切到真实后端，
  // 避免业务页面还没联调完成时，登录能力也被迫继续走 mock。
  readonly VITE_USE_AUTH_MOCK?: string;
  // VITE_LOGIN_EXPIRE_CODE 用来告诉请求层：哪个业务错误码代表登录失效。
  // 把它做成环境变量后，不同后端约定变化时就不需要直接改业务代码。
  readonly VITE_LOGIN_EXPIRE_CODE?: string;
  // 下面这组 OAuth2 变量用于本地联调 token、refresh、introspect、revoke。
  // 如果未来改成 BFF 代理模式，前端只需要保留 baseURL，不再直接暴露 client_secret。
  readonly VITE_OAUTH_BASE_URL?: string;
  // VITE_OAUTH_PROXY_TARGET 主要给 Vite 开发代理读取，用来指定真正的后端地址。
  // 虽然前端运行时代码当前不直接消费它，但保留声明可以避免环境配置语义分散。
  readonly VITE_OAUTH_PROXY_TARGET?: string;
  readonly VITE_OAUTH_CLIENT_ID?: string;
  readonly VITE_OAUTH_CLIENT_SECRET?: string;
  readonly VITE_OAUTH_SCOPE?: string;
  // VITE_IDLE_LOGOUT_MS 控制会话空闲多久后自动退出。
  // 这里使用毫秒，是为了让本地调试时可以快速改成 10 秒、30 秒等短时值。
  readonly VITE_IDLE_LOGOUT_MS?: string;
}

// ImportMeta 是 ES Module 里的元信息对象类型。
// 这里把 env 指向上面声明的 ImportMetaEnv，目的是让你在代码里写 import.meta.env.xxx 时获得自动提示和类型校验。
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
