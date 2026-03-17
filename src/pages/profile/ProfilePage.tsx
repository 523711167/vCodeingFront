import { Avatar, Descriptions, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import { useAppSelector } from '@/store/hooks';

function ProfilePage() {
  const user = useAppSelector((state) => state.permission.user);

  return (
    <PageContainer
      description="个人中心保留了用户信息和后续扩展入口。"
      title="个人中心"
    >
      <Space direction="vertical" size={16}>
        <Avatar icon={<UserOutlined />} size={72} />
        <Typography.Title level={4}>{user?.name ?? '未登录用户'}</Typography.Title>
        <Descriptions column={1}>
          <Descriptions.Item label="用户 ID">
            {user?.userId ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.roles.join('、') ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="说明">
            后续可继续扩展密码修改、登录日志、设备信息等能力。
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </PageContainer>
  );
}

export default ProfilePage;
