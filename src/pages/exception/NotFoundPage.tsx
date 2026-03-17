import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="exception-page">
      <Result
        extra={
          // 404 场景下，统一把用户引回系统主入口，避免停留在无效地址。
          <Button onClick={() => navigate('/dashboard')} type="primary">
            返回工作台
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
