import LoginPage from '@/pages/auth/LoginPage';
import ForbiddenPage from '@/pages/exception/ForbiddenPage';
import NotFoundPage from '@/pages/exception/NotFoundPage';

// publicRoutes 只保留不需要登录即可访问的页面。
// 业务路由已经切换成“根据后端菜单树运行时生成”，不再在前端静态维护一份菜单/路由表。
export const publicRoutes = {
  forbidden: <ForbiddenPage />,
  login: <LoginPage />,
  notFound: <NotFoundPage />,
};
