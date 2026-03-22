import type { ReactNode } from 'react';

export interface AppRouteMeta {
  title: string;
  icon?: string;
  hidden?: boolean;
  keepAlive?: boolean;
  // routeEnabled 专门区分“只是菜单目录”还是“真实可访问页面”。
  // 后端目录节点仍然需要出现在侧边菜单里，但不应该被注册成前端页面路由。
  routeEnabled?: boolean;
}

export interface AppRouteItem {
  path: string;
  element: ReactNode;
  meta: AppRouteMeta;
  children?: AppRouteItem[];
}
