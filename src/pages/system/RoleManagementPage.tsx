import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Table } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchRoles, type RoleRecord } from '@/services/role.service';

const columns: ColumnsType<RoleRecord> = [
  {
    dataIndex: 'name',
    title: '角色名称',
  },
  {
    dataIndex: 'description',
    title: '角色说明',
  },
];

function RoleManagementPage() {
  const [data, setData] = useState<RoleRecord[]>([]);

  useEffect(() => {
    fetchRoles().then(setData);
  }, []);

  return (
    <PageContainer title="角色管理">
      <Table columns={columns} dataSource={data} rowKey="id" />
    </PageContainer>
  );
}

export default RoleManagementPage;
