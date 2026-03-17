import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Space, Table, Tag } from 'antd';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import { fetchUsers, type UserRecord } from '@/services/user.service';

const columns: ColumnsType<UserRecord> = [
  {
    dataIndex: 'name',
    title: '账号名称',
  },
  {
    dataIndex: 'role',
    title: '角色',
  },
  {
    dataIndex: 'status',
    title: '状态',
    render: (status: UserRecord['status']) => (
      <Tag color={status === '启用' ? 'green' : 'default'}>{status}</Tag>
    ),
  },
];

function UserManagementPage() {
  const [data, setData] = useState<UserRecord[]>([]);

  useEffect(() => {
    fetchUsers().then(setData);
  }, []);

  return (
    <PageContainer title="账号管理">
      <Table
        columns={[
          ...columns,
          {
            key: 'action',
            title: '操作',
            render: () => (
              <Space>
                <PermissionButton
                  permissionCode="system:user:edit"
                  size="small"
                  type="link"
                >
                  编辑
                </PermissionButton>
              </Space>
            ),
          },
        ]}
        dataSource={data}
        rowKey="id"
      />
    </PageContainer>
  );
}

export default UserManagementPage;
