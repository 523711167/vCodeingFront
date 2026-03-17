import { type ReactNode, useMemo, useState } from 'react';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NotificationOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Breadcrumb, Button, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import type { AppRouteItem } from '@/router/types';
import { clearAuth } from '@/store/slices/authSlice';
import { clearPermission } from '@/store/slices/permissionSlice';
import { toggleSider } from '@/store/slices/appSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const { Header, Sider, Content } = Layout;

const iconMap: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  content: <ReadOutlined />,
  operation: <NotificationOutlined />,
  system: <AppstoreOutlined />,
  profile: <UserOutlined />,
};

function toMenuItems(routes: AppRouteItem[]): MenuProps['items'] {
  return routes
    // hidden 路由不出现在菜单里，但路由本身仍然可以访问。
    .filter((route) => !route.meta.hidden)
    .map((route) => {
      const children = route.children?.filter((child) => !child.meta.hidden);

      if (children?.length) {
        return {
          key: route.path,
          icon: route.meta.icon ? iconMap[route.meta.icon] : undefined,
          label: route.meta.title,
          children: toMenuItems(children),
        };
      }

      return {
        key: route.path,
        icon: route.meta.icon ? iconMap[route.meta.icon] : undefined,
        label: route.meta.title,
      };
    });
}

function findBreadcrumbItems(routes: AppRouteItem[], pathname: string) {
  const items: { title: string }[] = [];

  const walk = (nodes: AppRouteItem[], parents: { title: string }[]) => {
    for (const node of nodes) {
      const nextParents = [...parents, { title: node.meta.title }];
      // 使用 matchPath 而不是简单字符串相等，
      // 是为了兼容 /edit/:id 这类带动态参数的路径。
      const isMatch = matchPath({ path: node.path, end: true }, pathname);

      if (isMatch) {
        items.push(...nextParents);
        return true;
      }

      if (node.children?.length && walk(node.children, nextParents)) {
        return true;
      }
    }

    return false;
  };

  walk(routes, []);
  return items;
}

interface MainLayoutProps {
  routes: AppRouteItem[];
}

function MainLayout({ routes }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  // openKeys 只负责当前菜单展开状态，不需要进入全局 store。
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const collapsed = useAppSelector((state) => state.app.siderCollapsed);
  const user = useAppSelector((state) => state.permission.user);

  // 菜单项和面包屑都从同一份 routes 推导，避免页面标题和菜单结构各维护一套配置。
  const menuItems = useMemo(() => toMenuItems(routes), [routes]);
  const breadcrumbItems = useMemo(
    () => findBreadcrumbItems(routes, location.pathname),
    [routes, location.pathname],
  );

  const selectedKeys = useMemo(() => {
    // 当前实现只需要匹配两层结构：一级业务模块 + 一级页面。
    // 如果后续路由层级变深，可以把这段逻辑也改成递归版。
    const matched = routes.flatMap((route) => {
      const nodes = [route, ...(route.children ?? [])];
      return nodes
        .filter((node) =>
          matchPath({ path: node.path, end: true }, location.pathname),
        )
        .map((node) => node.path);
    });

    return matched.length ? matched : [location.pathname];
  }, [location.pathname, routes]);

  const handleLogout = () => {
    // 退出时同时清认证和权限，避免下个账号复用上个账号的菜单缓存。
    dispatch(clearAuth());
    dispatch(clearPermission());
    navigate('/login', { replace: true });
  };

  return (
    <Layout className="app-shell">
      <Sider
        breakpoint="lg"
        collapsed={collapsed}
        collapsible
        theme="light"
        trigger={null}
      >
        <div className="app-logo">
          <span className="app-logo__mark">VC</span>
          {!collapsed && <span className="app-logo__text">内容运营后台</span>}
        </div>
        <Menu
          items={menuItems}
          mode="inline"
          // 菜单 key 直接复用路由 path，这样点击后可以直接导航，减少一层映射关系。
          onClick={({ key }) => navigate(String(key))}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          openKeys={collapsed ? [] : openKeys}
          selectedKeys={selectedKeys}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space align="center">
            <Button
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => dispatch(toggleSider())}
              type="text"
            />
            <Breadcrumb items={breadcrumbItems} />
          </Space>
          <Space align="center">
            <Typography.Text type="secondary">欢迎回来</Typography.Text>
            <Space size={8}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>{user?.name ?? '未登录用户'}</Typography.Text>
            </Space>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              type="text"
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="app-content">
          {/* 所有业务页面都通过 Outlet 渲染到主布局内容区。 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
