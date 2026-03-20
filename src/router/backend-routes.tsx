import { createElement, type ComponentType } from 'react';
import { Navigate } from 'react-router-dom';
import type { MenuRecord } from '@/services/menu.service';
import type { AppRouteItem } from '@/router/types';
import NotFoundPage from '@/pages/exception/NotFoundPage';

const routeModules = {
  ...import.meta.glob('../pages/**/*.tsx', { eager: true }),
  ...import.meta.glob('../layouts/**/*.tsx', { eager: true }),
} as Record<string, { default?: ComponentType }>;

function normalizePath(path?: string) {
  if (!path) {
    return '';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

function getFirstAccessiblePath(menus: MenuRecord[]): string | null {
  for (const menu of menus) {
    if (menu.status !== 1) {
      continue;
    }

    if (menu.type !== 'BUTTON' && menu.path) {
      if (menu.type === 'MENU') {
        return normalizePath(menu.path);
      }

      const childPath = getFirstAccessiblePath(menu.children ?? []);

      if (childPath) {
        return childPath;
      }
    }
  }

  return null;
}

function resolveRouteElement(menu: MenuRecord) {
  const normalizedComponent = menu.component?.trim();

  // 目录节点通常只承担菜单分组职责，不直接对应页面组件。
  // 这里统一跳转到它的第一个可访问子页面，避免前端再维护一份静态默认子路由。
  if (
    menu.type === 'DIRECTORY' ||
    !normalizedComponent ||
    normalizedComponent === 'layouts/RouteLayout'
    ||
    normalizedComponent === 'RouteLayout'
  ) {
    const redirectPath = getFirstAccessiblePath(menu.children ?? []);

    return redirectPath ? <Navigate replace to={redirectPath} /> : <NotFoundPage />;
  }

  const modulePath = `../${normalizedComponent}.tsx`;
  const matchedModule =
    routeModules[modulePath] ??
    Object.entries(routeModules).find(([currentPath]) =>
      currentPath.endsWith(`/${normalizedComponent}.tsx`),
    )?.[1];

  // 后端 component 字段是路由到页面组件的唯一入口。
  // 如果后端配置了一个前端不存在的组件名，这里直接落到内容区 404，便于联调排错。
  if (!matchedModule?.default) {
    return <NotFoundPage />;
  }

  return createElement(matchedModule.default);
}

function toAppRouteItem(menu: MenuRecord): AppRouteItem | null {
  if (menu.status !== 1 || menu.type === 'BUTTON' || !menu.path) {
    return null;
  }

  const children = [...(menu.children ?? [])]
    .sort((prevMenu, nextMenu) => (prevMenu.sortOrder ?? 0) - (nextMenu.sortOrder ?? 0))
    .map((child) => toAppRouteItem(child))
    .filter((child): child is AppRouteItem => Boolean(child));

  return {
    path: normalizePath(menu.path),
    element: resolveRouteElement(menu),
    meta: {
      hidden: menu.visible === 0,
      icon: menu.icon,
      title: menu.name,
    },
    children: children.length ? children : undefined,
  };
}

export function buildBackendRoutes(menus: MenuRecord[]) {
  // 后端菜单本身已经是树结构，前端只负责把“按钮节点”和“停用节点”剔除掉，
  // 再按 sortOrder 输出成 React Router 与侧边菜单可消费的统一路由树。
  return [...menus]
    .sort((prevMenu, nextMenu) => (prevMenu.sortOrder ?? 0) - (nextMenu.sortOrder ?? 0))
    .map((menu) => toAppRouteItem(menu))
    .filter((route): route is AppRouteItem => Boolean(route));
}

export function getDefaultMenuPath(menus: MenuRecord[]) {
  return getFirstAccessiblePath(menus) ?? '/403';
}
