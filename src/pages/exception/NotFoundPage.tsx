import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="exception-page">
      <Result
        extra={
          <Button onClick={() => navigate('/dashboard')} type="primary">
            返回工作台
          </Button>
        }
        status="404"
        subTitle="页面不存在，可能已经被移动或删除。"
        title="404"
      />
    </div>
  );
}

export default NotFoundPage;
