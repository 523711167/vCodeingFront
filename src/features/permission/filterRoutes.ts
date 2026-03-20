import type { AppRouteItem } from '@/router/types';

export function flattenRoutes(routes: AppRouteItem[]): AppRouteItem[] {
  // 扁平化主要服务于 React Router 注册。
  // 菜单、面包屑等仍然优先消费原始树结构。
  return routes.flatMap((route) => [
    route,
    // ??：只在 null 或 undefined 时才用默认值
    // ||：只要是“假值”就会用默认值，比如 ''、0、false 也会触发
    ...flattenRoutes(route.children ?? []),
  ]);
}
