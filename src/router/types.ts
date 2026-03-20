import type { ReactNode } from 'react';

export interface AppRouteMeta {
  title: string;
  icon?: string;
  hidden?: boolean;
  keepAlive?: boolean;
}

export interface AppRouteItem {
  path: string;
  element: ReactNode;
  meta: AppRouteMeta;
  children?: AppRouteItem[];
}
