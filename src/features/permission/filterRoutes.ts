import type { AppRouteItem } from '@/router/types';

export function filterRoutesByPermissions(
  routes: AppRouteItem[],
  permissionCodes: string[],
): AppRouteItem[] {
  return routes.reduce<AppRouteItem[]>((acc, route) => {
    const children = route.children
      ? filterRoutesByPermissions(route.children, permissionCodes)
      : undefined;
    const hasChildren = Boolean(children?.length);
    const isAllowed =
      !route.meta.authCode || permissionCodes.includes(route.meta.authCode);

    if (isAllowed || hasChildren) {
      acc.push({
        ...route,
        children,
      });
    }

    return acc;
  }, []);
}

export function flattenRoutes(routes: AppRouteItem[]): AppRouteItem[] {
  return routes.flatMap((route) => [
    route,
    ...flattenRoutes(route.children ?? []),
  ]);
}
