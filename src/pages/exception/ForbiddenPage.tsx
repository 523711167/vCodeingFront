import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="exception-page">
      <Result
        extra={
          // 403 场景下，回到工作台通常比浏览器返回更稳定。
          <Button onClick={() => navigate('/workbench')} type="primary">
            返回工作台
          </Button>
        }
        status="403"
        // 403 说明路由存在，但当前账号没有对应权限。
        subTitle="当前账号没有访问该页面的权限，请联系管理员开通。"
        title="403"
      />
    </div>
  );
}

export default ForbiddenPage;
