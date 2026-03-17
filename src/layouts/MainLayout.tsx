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
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const collapsed = useAppSelector((state) => state.app.siderCollapsed);
  const user = useAppSelector((state) => state.permission.user);

  const menuItems = useMemo(() => toMenuItems(routes), [routes]);
  const breadcrumbItems = useMemo(
    () => findBreadcrumbItems(routes, location.pathname),
    [routes, location.pathname],
  );

  const selectedKeys = useMemo(() => {
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
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
