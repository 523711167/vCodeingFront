import type { AppRouteItem } from '@/router/types';

export function filterRoutesByPermissions(
  routes: AppRouteItem[],
  permissionCodes: string[],
): AppRouteItem[] {
  return routes.reduce<AppRouteItem[]>((acc, route) => {
    // 先递归处理子节点，再决定当前节点是否保留。
    // 这样即使父节点自己不直接可访问，只要还有可见子节点，也能保留菜单分组。
    const children = route.children
      ? filterRoutesByPermissions(route.children, permissionCodes)
      : undefined;
    const hasChildren = Boolean(children?.length);
    const isAllowed =
      !route.meta.authCode || permissionCodes.includes(route.meta.authCode);

    if (isAllowed || hasChildren) {
      // 这里返回的是一棵“过滤后的新树”，不直接修改原始路由定义，
      // 这样路由配置仍然可以作为稳定的静态数据源复用。
      acc.push({
        ...route,
        children,
      });
    }

    return acc;
  }, []);
}

export function flattenRoutes(routes: AppRouteItem[]): AppRouteItem[] {
  // 扁平化主要服务于 React Router 注册。
  // 菜单、面包屑等仍然优先消费原始树结构。
  return routes.flatMap((route) => [
    route,
    ...flattenRoutes(route.children ?? []),
  ]);
}
