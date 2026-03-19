import { Navigate } from 'react-router-dom';
import type { AppRouteItem } from '@/router/types';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ContentFormPage from '@/pages/content/ContentFormPage';
import ContentListPage from '@/pages/content/ContentListPage';
import ForbiddenPage from '@/pages/exception/ForbiddenPage';
import NotFoundPage from '@/pages/exception/NotFoundPage';
import DeptManagementPage from '@/pages/organization/DeptManagementPage';
import OperationFormPage from '@/pages/operation/OperationFormPage';
import OperationListPage from '@/pages/operation/OperationListPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import MenuManagementPage from '@/pages/system/MenuManagementPage';
import RoleManagementPage from '@/pages/system/RoleManagementPage';
import UserManagementPage from '@/pages/system/UserManagementPage';

// publicRoutes 专门放不需要登录即可访问的页面。
// 这里用对象而不是数组，是为了在 AppRouter 里按语义取值更直观。
export const publicRoutes = {
  login: <LoginPage />,
  forbidden: <ForbiddenPage />,
  notFound: <NotFoundPage />,
};

// businessRoutes 是整个后台的“业务路由单一事实源”。
// 菜单渲染、面包屑、权限过滤都依赖这份配置，所以新增页面时优先改这里。
export const businessRoutes: AppRouteItem[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    meta: {
      title: '工作台',
      icon: 'dashboard',
      authCode: 'dashboard:view',
    },
  },
  {
    path: '/content',
    // 父级路由本身不渲染内容页，只负责把访问重定向到默认子页面。
    element: <Navigate replace to="/content/list" />,
    meta: {
      title: '内容管理',
      icon: 'content',
      authCode: 'content:module:view',
    },
    children: [
      {
        path: '/content/list',
        element: <ContentListPage />,
        meta: {
          title: '内容列表',
          authCode: 'content:list:view',
        },
      },
      {
        path: '/content/create',
        element: <ContentFormPage />,
        meta: {
          title: '新增内容',
          authCode: 'content:form:view',
          // hidden=true 表示仍然可以访问，但不出现在侧边菜单里。
          // 这类路由通常用于详情页、编辑页、创建页。
          hidden: true,
        },
      },
      {
        path: '/content/edit/:id',
        element: <ContentFormPage />,
        meta: {
          title: '编辑内容',
          authCode: 'content:form:view',
          hidden: true,
        },
      },
    ],
  },
  {
    path: '/operation',
    element: <Navigate replace to="/operation/list" />,
    meta: {
      title: '运营活动',
      icon: 'operation',
      authCode: 'operation:module:view',
    },
    children: [
      {
        path: '/operation/list',
        element: <OperationListPage />,
        meta: {
          title: '活动列表',
          authCode: 'operation:list:view',
        },
      },
      {
        path: '/operation/create',
        element: <OperationFormPage />,
        meta: {
          title: '新增活动',
          authCode: 'operation:form:view',
          hidden: true,
        },
      },
      {
        path: '/operation/edit/:id',
        element: <OperationFormPage />,
        meta: {
          title: '编辑活动',
          authCode: 'operation:form:view',
          hidden: true,
        },
      },
    ],
  },
  {
    path: '/organization',
    element: <Navigate replace to="/organization/depts" />,
    meta: {
      title: '组织管理',
      icon: 'organization',
      authCode: 'organization:module:view',
    },
    children: [
      {
        path: '/organization/depts',
        element: <DeptManagementPage />,
        meta: {
          title: '组织维护',
          authCode: 'organization:dept:view',
        },
      },
    ],
  },
  {
    path: '/system',
    element: <Navigate replace to="/system/users" />,
    meta: {
      title: '系统管理',
      icon: 'system',
      authCode: 'system:module:view',
    },
    children: [
      {
        path: '/system/users',
        element: <UserManagementPage />,
        meta: {
          title: '账号管理',
          authCode: 'system:user:view',
        },
      },
      {
        path: '/system/roles',
        element: <RoleManagementPage />,
        meta: {
          title: '角色管理',
          authCode: 'system:role:view',
        },
      },
      {
        path: '/system/menus',
        element: <MenuManagementPage />,
        meta: {
          title: '菜单权限',
          authCode: 'system:menu:view',
        },
      },
    ],
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    meta: {
      title: '个人中心',
      icon: 'profile',
      authCode: 'profile:view',
    },
  },
];
