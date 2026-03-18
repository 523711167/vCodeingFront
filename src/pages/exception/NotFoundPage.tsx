import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDefaultRoutePath } from '@/services/auth.service';
import { useAppSelector } from '@/store/hooks';

function NotFoundPage() {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const currentUser = useAppSelector((state) => state.permission.user);
  const fallbackPath = token ? getDefaultRoutePath(currentUser) : '/login';

  return (
    <div className="exception-page">
      <Result
        extra={
          // 404 页的返回入口跟随当前登录态切换，
          // 这样既能服务布局内 404，也能服务未登录用户的异常跳转。
          <Button onClick={() => navigate(fallbackPath)} type="primary">
            {token ? '返回系统首页' : '返回登录页'}
          </Button>
        }
        status="404"
        // 404 表示当前地址没有匹配到任何有效页面。
        subTitle="页面不存在，可能已经被移动或删除。"
        title="404"
      />
    </div>
  );
}

export default NotFoundPage;
