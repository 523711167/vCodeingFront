import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Input, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
      description="示例内容列表页，包含搜索区、表格区与常见操作按钮。"
      extra={
        <PermissionButton
          permissionCode="content:create"
          type="primary"
          // 列表页只负责跳转，不直接承载创建表单。
          onClick={() => navigate('/content/create')}
        >
          新增内容
        </PermissionButton>
      }
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
              render: (_, record) => (
                <Space>
                  {/* 编辑页复用同一个表单组件，通过 id 参数区分编辑对象。 */}
                  <PermissionButton
                    permissionCode="content:edit"
                    onClick={() => navigate(`/content/edit/${record.id}`)}
                    size="small"
                    type="link"
                  >
                    编辑
                  </PermissionButton>
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
