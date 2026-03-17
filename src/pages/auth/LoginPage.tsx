import { message, Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchPermissionPayload, login, type LoginRequest } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLoginLoading, setToken } from '@/store/slices/authSlice';
import { setPermissionPayload } from '@/store/slices/permissionSlice';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const loginLoading = useAppSelector((state) => state.auth.loginLoading);

  const handleSubmit = async (values: LoginRequest) => {
    try {
      dispatch(setLoginLoading(true));
      const loginResult = await login(values);
      dispatch(setToken(loginResult.token));
      const permissionPayload = await fetchPermissionPayload();
      dispatch(setPermissionPayload(permissionPayload));
      message.success('登录成功，欢迎回来');
      navigate('/dashboard', { replace: true });
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
            message="Mock 登录账号：admin / 123456"
            showIcon
            type="info"
          />

          <Form<LoginRequest> layout="vertical" onFinish={handleSubmit}>
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
