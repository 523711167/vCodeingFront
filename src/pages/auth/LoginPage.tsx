import { App as AntdApp, Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getDefaultRoutePath,
  login,
  type LoginRequest,
} from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAuthSession, setLoginLoading } from '@/store/slices/authSlice';
import { setPermissionPayload } from '@/store/slices/permissionSlice';

const isAuthMock = import.meta.env.VITE_USE_AUTH_MOCK
  ? import.meta.env.VITE_USE_AUTH_MOCK !== 'false'
  : import.meta.env.VITE_USE_MOCK !== 'false';

interface LoginRouteState {
  from?: {
    hash?: string;
    pathname?: string;
    search?: string;
  };
}

interface LoginSuccessFlashState {
  flashMessage?: {
    content: string;
    type: 'success';
  };
}

function getLoginSuccessTarget(
  routeState: LoginRouteState | null,
  fallbackPath: string,
) {
  const pathname = routeState?.from?.pathname;

  // 登录后优先回到认证守卫记录下来的原始页面。
  // 只有在没有来源页时，才回退到默认首页。
  if (!pathname || pathname === '/login') {
    return fallbackPath;
  }

  return `${pathname}${routeState.from?.search ?? ''}${routeState.from?.hash ?? ''}`;
}

function LoginPage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const loginLoading = useAppSelector((state) => state.auth.loginLoading);
  const routeState = location.state as LoginRouteState | null;

  const handleSubmit = async (values: LoginRequest) => {
    try {
      // 登录流程分成三步：
      // 1. 请求或刷新 token，确保拿到可用 access_token
      // 2. 基于 introspect 结果还原当前用户、菜单和按钮权限
      // 3. 把认证与权限一起写入 store 和本地缓存
      dispatch(setLoginLoading(true));
      const loginResult = await login(values);
      dispatch(setAuthSession(loginResult.session));
      dispatch(setPermissionPayload(loginResult.permissionPayload));
      navigate(
        getLoginSuccessTarget(
          routeState,
          getDefaultRoutePath(loginResult.permissionPayload),
        ),
        {
          replace: true,
          // 成功提示跟随路由一起带到目标页展示，
          // 避免当前页刚调用 message 就立刻跳转，导致用户看不到提示。
          state: {
            flashMessage: {
              content: '登录成功，欢迎回来',
              type: 'success',
            },
          } satisfies LoginSuccessFlashState,
        },
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '登录失败，请稍后重试',
      );
    } finally {
      dispatch(setLoginLoading(false));
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Space direction="vertical" size={20}>
          <div>
            <Typography.Text className="login-kicker">
              React Admin Starter
            </Typography.Text>
            <Typography.Title level={2}>内容运营后台</Typography.Title>
            <Typography.Paragraph type="secondary">
              基于 Vite、React、TypeScript、Ant Design 与 Redux Toolkit
              的后台骨架。
            </Typography.Paragraph>
          </div>

          <Alert
            // 提示文案跟随认证模式切换，避免联调时用户还以为当前页面在走 mock。
            message={
              isAuthMock
                ? 'Mock 登录账号：admin / 123456'
                : 'OAuth2 联调账号：admin / admin123'
            }
            showIcon
            type="info"
          />

          <Form<LoginRequest>
            initialValues={{
              password: isAuthMock ? '123456' : 'admin123',
              username: 'admin',
            }}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input placeholder="请输入账号" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button block htmlType="submit" loading={loginLoading} type="primary">
              登录系统
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default LoginPage;
