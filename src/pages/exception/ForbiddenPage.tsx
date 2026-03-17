import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="exception-page">
      <Result
        extra={
          <Button onClick={() => navigate('/dashboard')} type="primary">
            返回工作台
          </Button>
        }
        status="403"
        subTitle="当前账号没有访问该页面的权限，请联系管理员开通。"
        title="403"
      />
    </div>
  );
}

export default ForbiddenPage;
