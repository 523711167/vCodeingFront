import { useMemo } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useRoutes } from 'react-router-dom';
import { filterRoutesByPermissions, flattenRoutes } from '@/features/permission/filterRoutes';
import MainLayout from '@/layouts/MainLayout';
import { businessRoutes, publicRoutes } from '@/router/routes';
import { AuthGuard } from '@/router/guards';
import type { AppRouteItem } from '@/router/types';
import { useAppSelector } from '@/store/hooks';

function toRelativePath(path: string) {
  // useRoutes 在 children 中注册子路由时不需要前导斜杠。
  // 统一在这里做一次转换，避免每个路由定义都关心这个细节。
  return path.startsWith('/') ? path.slice(1) : path;
}

function toRouteObjects(routes: AppRouteItem[]): RouteObject[] {
  // 业务路由定义里允许保留树形结构，便于菜单和权限表达。
  // React Router 最终消费的是扁平的 RouteObject，所以这里做一次转换。
  return flattenRoutes(routes).map((route) => ({
    path: toRelativePath(route.path),
    element: route.element,
  }));
}

function AppRouter() {
  // routeAuthCodes 由权限 slice 统一维护。
  // 路由层不直接关心“角色是什么”，只关心最终可访问的权限码集合。
  const permissionCodes = useAppSelector((state) => state.permission.routeAuthCodes);

  const allowedBusinessRoutes = useMemo(
    () => filterRoutesByPermissions(businessRoutes, permissionCodes),
    [permissionCodes],
  );

  const routeObjects = useMemo<RouteObject[]>(
    () => [
      {
        path: '/login',
        element: publicRoutes.login,
      },
      {
        path: '/403',
        element: publicRoutes.forbidden,
      },
      {
        path: '/',
        element: (
          // 认证守卫包住整个后台主布局。
          // 这样未登录用户在进入任何业务页之前都会先被拦截。
          <AuthGuard>
            <MainLayout routes={allowedBusinessRoutes} />
          </AuthGuard>
        ),
        children: [
          {
            // 进入后台根路径时，直接落到工作台。
            index: true,
            element: <Navigate replace to="/dashboard" />,
          },
          ...toRouteObjects(allowedBusinessRoutes),
        ],
      },
      {
        path: '*',
        element: publicRoutes.notFound,
      },
    ],
    [allowedBusinessRoutes],
  );

  return useRoutes(routeObjects);
}

export default AppRouter;
