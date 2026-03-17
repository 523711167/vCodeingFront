import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Input, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import { fetchActivityList, type ActivityItem } from '@/services/operation.service';

// 活动列表沿用内容列表的交互骨架，目的是让后台各业务模块的页面结构统一。
const columns: ColumnsType<ActivityItem> = [
  {
    dataIndex: 'name',
    title: '活动名称',
  },
  {
    dataIndex: 'owner',
    title: '负责人',
  },
  {
    dataIndex: 'status',
    title: '状态',
    render: (status: ActivityItem['status']) => (
      <Tag color={status === '进行中' ? 'blue' : 'default'}>{status}</Tag>
    ),
  },
  {
    dataIndex: 'period',
    title: '活动周期',
  },
];

function OperationListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 当前先走 mock service，页面层不区分 mock 和真实接口来源。
    setLoading(true);
    fetchActivityList()
      .then((result) => setData(result.list))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer
      description="运营活动页展示了活动列表、状态和基础操作入口。"
      extra={
        <PermissionButton
          permissionCode="operation:create"
          type="primary"
          // 活动创建走独立页面，方便后续扩展更复杂的活动配置表单。
          onClick={() => navigate('/operation/create')}
        >
          新增活动
        </PermissionButton>
      }
      title="活动列表"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <Input.Search allowClear placeholder="搜索活动名称" />
        <Table
          columns={[
            ...columns,
            {
              key: 'action',
              title: '操作',
              render: (_, record) => (
                <Space>
                  {/* 操作区仍然统一走权限按钮，避免页面里手写按钮显隐判断。 */}
                  <PermissionButton
                    permissionCode="operation:edit"
                    onClick={() => navigate(`/operation/edit/${record.id}`)}
                    size="small"
                    type="link"
                  >
                    编辑
                  </PermissionButton>
                  <PermissionButton
                    danger
                    permissionCode="operation:delete"
                    size="small"
                    type="link"
                  >
                    删除
                  </PermissionButton>
                </Space>
              ),
            },
          ]}
          dataSource={data}
          loading={loading}
          pagination={{
            pageSize: 10,
          }}
          rowKey="id"
        />
      </Space>
    </PageContainer>
  );
}

export default OperationListPage;
