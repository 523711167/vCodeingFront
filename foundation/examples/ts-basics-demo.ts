/**
 * 这个示例文件的职责是把 TypeScript 入门阶段最常见的概念放到一份可直接阅读的代码里，
 * 方便把“笔记里的概念”映射回“真实的类型写法”。
 *
 * 这里选择用分段示例而不是拼成一个完整业务模块，是因为入门学习更需要观察单点语法效果，
 * 这样不会被 React、Redux、接口请求等工程细节打断理解。
 *
 * 如果后续要扩展，可以继续按主题新增导出，例如补 `keyof`、`Parameters`、判别联合等，
 * 保持“一段概念对应一段最小示例”的组织方式即可。
 */

/**
 * 这一段演示基础类型。之所以单独导出常量，是为了让编辑器能直接悬浮查看推导结果，
 * 学习时比只看文字更直观。
 */
export const lessonBasicTypes = {
  userName: 'Tom' as string,
  age: 18 as number,
  isAdmin: true as boolean,
  tags: ['ts', 'react'] as string[],
  position: ['A-01', 1] as [string, number],
};

/**
 * 这里用 `type` 定义对象结构，职责是说明“一个对象应该有哪些字段”。
 * 实际开发里接口响应、组件 props、store 状态都经常以这种方式建模。
 */
export type UserProfile = {
  id: number;
  name: string;
  role: 'admin' | 'editor' | 'visitor';
};



/**
 * 泛型函数的职责是保留输入类型信息，让返回值能跟着输入一起变化。
 * 这里故意选择数组首项这个简单案例，是因为它能把“同一逻辑复用、不同类型保留”
 * 这个核心价值展示得最清楚。
 */
export function getFirstItem<T>(list: T[]): T | undefined {
  return list[0];
}

/**
 * 这个对象是 `typeof` 示例的真实来源。
 * 先定义值，再从值中提取类型，是减少重复类型声明的常见实践。
 */
export const featureFlags = {
  enableMock: true,
  enableAuditLog: false,
  appTitle: 'vCodeing Front',
};

/**
 * `typeof featureFlags` 的职责是直接复用现成对象的结构类型。
 * 当前这种写法适合“代码里已经有真实对象”的场景，能避免手抄一份相同类型。
 */
export type FeatureFlags = typeof featureFlags;

/**
 * 这个工厂函数模拟“从函数生成结构化数据”的场景。
 * 在真实项目里，service 层、store 初始化、数据转换函数都可能出现类似模式。
 */
export function createLearningUser(val: string) {
  return {
    id: 1,
    name: 'Tom',
    permissions: ['dashboard:view', 'user:edit'],
    email: "523711167@qq.com"
  };
}

/**
 * `ReturnType<typeof createLearningUser>` 的职责是从函数类型中提取返回值结构，
 * 这样当工厂函数返回字段变化时，依赖该类型的代码会自动同步。
 */
export type LearningUser = ReturnType<typeof createLearningUser>;


/**
 * 这一组类型单独演示 `infer` 的思路。
 * 这里没有直接让学习者记复杂语法，而是把它放到“提取函数返回值”这个具体问题里理解。
 */
type ExtractReturn<T> = T extends (...args: never[]) => infer R ? R : never;

/**
 * 这个类型别名的职责是验证上面的 `ExtractReturn` 是否真的拿到了返回值类型。
 * 如果后续要继续学工具类型，可以在这里并排补充 `Parameters`、`InstanceType` 等例子。
 */
export type LearningUserFromInfer = ExtractReturn<typeof createLearningUser>;

/**
 * 这段代码模拟 Redux 里经常出现的“从 store 推导类型”。
 * 这里不用真实 store，是为了先让学习者看懂 `typeof` 和 `ReturnType` 的组合方式，
 * 再回到业务代码里看 `RootState`、`AppDispatch` 会更容易。
 */
export const fakeStore = {
  getState() {
    return {
      auth: {
        token: 'demo-token',
        userName: 'Tom',
      },
      app: {
        collapsed: false,
      },
    };
  },
  dispatch(action: { type: string; payload?: unknown }): {type: string; payload?: unknown} {
    return action;
  },
};

/**
 * `RootState` 从 `getState` 的返回值推导而来。
 * 这种写法的好处是 store 结构一旦调整，依赖这个类型的页面和 hooks 会立刻获得同步更新。
 */
export type RootState = ReturnType<typeof fakeStore.getState>;

/**
 * `AppDispatch` 直接复用真实 `dispatch` 的函数类型。
 * 在接入 thunk、中间件、异步 action 时，这种写法能避免手写 dispatch 类型失真。
 */
export type AppDispatch = typeof fakeStore.dispatch;
export type ss = ReturnType<AppDispatch>;

/**
 * 这两个导出值只是为了让学习时更容易在编辑器里查看最终推导结果，
 * 不承担业务逻辑职责。
 */
export const exampleRootState: RootState = fakeStore.getState();
export const exampleDispatchResult: ss = fakeStore.dispatch({
  type: 'user/updateName',
  payload: { name: 'Jerry' },
});
