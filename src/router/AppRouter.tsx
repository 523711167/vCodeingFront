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
  return path.startsWith('/') ? path.slice(1) : path;
}

function toRouteObjects(routes: AppRouteItem[]): RouteObject[] {
  return flattenRoutes(routes).map((route) => ({
    path: toRelativePath(route.path),
    element: route.element,
  }));
}

function AppRouter() {
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
          <AuthGuard>
            <MainLayout routes={allowedBusinessRoutes} />
          </AuthGuard>
        ),
        children: [
          {
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
