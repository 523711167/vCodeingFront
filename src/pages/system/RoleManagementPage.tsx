import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Table } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchRoles, type RoleRecord } from '@/services/role.service';

// 角色页先聚焦“角色名 + 说明”两列，便于快速把系统管理模块立起来。
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
    // 角色列表目前没有放进全局 store，因为它只在当前页面使用。
    fetchRoles().then(setData);
  }, []);

  return (
    <PageContainer title="角色管理">
      <Table columns={columns} dataSource={data} rowKey="id" />
    </PageContainer>
  );
}

export default RoleManagementPage;
