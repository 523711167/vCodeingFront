import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Input, Space, Table, Tag } from 'antd';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import { fetchContentList, type ContentItem } from '@/services/content.service';

// 列配置提到组件外部，可以避免每次渲染都重新创建结构。
const columns: ColumnsType<ContentItem> = [
  {
    dataIndex: 'title',
    title: '标题',
  },
  {
    dataIndex: 'category',
    title: '分类',
  },
  {
    dataIndex: 'author',
    title: '作者',
  },
  {
    dataIndex: 'status',
    title: '状态',
    render: (status: ContentItem['status']) => (
      <Tag color={status === '已发布' ? 'green' : 'gold'}>{status}</Tag>
    ),
  },
  {
    dataIndex: 'updatedAt',
    title: '更新时间',
  },
];

function ContentListPage() {
  const [data, setData] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 这是列表页最基础的数据加载流程。
    // 后续如果接分页、筛选、排序，可以继续把查询参数也纳入这段逻辑。
    setLoading(true);
    fetchContentList()
      .then((result) => setData(result.list))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer
      description="内容列表页当前只保留后端菜单已覆盖的列表能力，不再暴露没有菜单支撑的新增/编辑入口。"
      title="内容列表"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        {/* 当前搜索框是结构占位，便于先把列表工具区完整搭出来。 */}
        <Input.Search allowClear placeholder="搜索内容标题" />
        <Table
          columns={[
            ...columns,
            {
              key: 'action',
              title: '操作',
              render: () => (
                <Space>
                  <PermissionButton
                    danger
                    permissionCode="content:delete"
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
            // 当前先只保留分页壳子，后续再把页码和总数接入接口返回值。
            pageSize: 10,
          }}
          rowKey="id"
        />
      </Space>
    </PageContainer>
  );
}

export default ContentListPage;
