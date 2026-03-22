import { useMemo } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useRoutes } from 'react-router-dom';
import { flattenRoutes } from '@/features/permission/filterRoutes';
import { getDefaultRoutePath } from '@/services/auth.service';
import MainLayout from '@/layouts/MainLayout';
import { buildBackendRoutes } from '@/router/backend-routes';
import { publicRoutes } from '@/router/routes';
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
  return flattenRoutes(routes)
    .filter((route) => route.meta.routeEnabled !== false)
    .map((route) => ({
      path: toRelativePath(route.path),
      element: route.element,
    }));
}

function toKnownModuleFallbacks(routes: AppRouteItem[]): RouteObject[] {
  return routes.map((route) => ({
    // 一级模块存在，但具体子路径不存在时，仍然保留主布局，
    // 只在内容区渲染 404，避免把整个应用直接打回首页。
    path: `${toRelativePath(route.path)}/*`,
    element: publicRoutes.notFound,
  }));
}

function AppRouter() {
  const currentUser = useAppSelector((state) => state.permission.user);
  const allowedBusinessRoutes = useMemo(
    () => buildBackendRoutes(currentUser?.menus ?? []),
    [currentUser?.menus],
  );
  const defaultRoutePath = getDefaultRoutePath(currentUser);
  const knownModuleFallbacks = useMemo(
    () => toKnownModuleFallbacks(allowedBusinessRoutes),
    [allowedBusinessRoutes],
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
            // 默认落点从权限树里推导，而不是写死 dashboard，
            // 这样当后端只下发系统管理权限时，也不会被重定向到无权页面。
            index: true,
            element: <Navigate replace to={defaultRoutePath} />,
          },
          ...toRouteObjects(allowedBusinessRoutes),
          ...knownModuleFallbacks,
          {
            // 只有“一级路径本身就不存在”时，才回退到系统首页。
            // 这和已知模块下的二级 404 区分开，避免用户在模块内部误跳首页。
            path: '*',
            element: <Navigate replace to={defaultRoutePath} />,
          },
        ],
      },
    ],
    [allowedBusinessRoutes, defaultRoutePath, knownModuleFallbacks],
  );

  return useRoutes(routeObjects);
}

export default AppRouter;
