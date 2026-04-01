import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Form, Input, Select, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchCurrentUserBizDefinitionPage,
  type BizDefinitionPageQuery,
  type BizDefinitionPageResult,
  type BizDefinitionRecord,
  type BizDefinitionStatusValue,
} from '@/services/biz.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface SearchFormValues {
  bizCode?: string;
  bizName?: string;
  status?: BizDefinitionStatusValue;
}

const initialPageQuery: BizDefinitionPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: BizDefinitionPageResult = {
  pageNum: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  records: [],
};

const bizStatusOptions = [
  { label: '正常', value: 1 },
  { label: '停用', value: 0 },
] as const;

function getStatusTagColor(status: BizDefinitionStatusValue) {
  return status === 1 ? 'green' : 'default';
}

function InboxPage() {
  const navigate = useNavigate();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [query, setQuery] = useState<BizDefinitionPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<BizDefinitionPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);

        // 业务办理页面只展示当前登录用户有权办理的业务定义，
        // 因此这里明确走 current-user/page，而不是系统管理用的全量分页接口。
        const nextPageData = await fetchCurrentUserBizDefinitionPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '业务办理列表加载失败');
        }
      } finally {
        if (!canceled) {
          setTableLoading(false);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [query]);

  const columns: ColumnsType<BizDefinitionRecord> = [
    {
      dataIndex: 'bizName',
      title: '业务名称',
      width: 180,
    },
    {
      dataIndex: 'bizCode',
      title: '业务编码',
      width: 180,
    },
    {
      dataIndex: 'bizDesc',
      title: '业务描述',
      ellipsis: true,
      render: (bizDesc?: string) => bizDesc || '-',
      width: 260,
    },
    {
      dataIndex: 'statusMsg',
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Tag color={getStatusTagColor(record.status)}>{record.statusMsg}</Tag>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: 140,
      render: (_, record) => (
        // “办理”改成站内跳转，保持用户仍处在后台主布局范围内。
        // 后续如果要升级成应用内多标签，也优先从这里继续扩展，而不是再退回浏览器新开页。
        <Button
          onClick={() => {
            navigate(`/workbench/inbox/handle?id=${record.id}`);
          }}
          size="small"
          type="link"
        >
          办理
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      description="业务办理页已接入当前用户可查看业务定义的分页查询接口。"
      title="业务办理"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <div className="management-toolbar">
          <Form<SearchFormValues>
            className="management-toolbar__form"
            form={searchForm}
            layout="inline"
            onFinish={(values) => {
              setQuery((previousQuery) => ({
                ...previousQuery,
                bizCode: values.bizCode?.trim() || undefined,
                bizName: values.bizName?.trim() || undefined,
                pageNum: 1,
                status: values.status,
              }));
            }}
          >
            <Form.Item label="业务名称" name="bizName">
              <Input allowClear placeholder="请输入业务名称" />
            </Form.Item>
            <Form.Item label="业务编码" name="bizCode">
              <Input allowClear placeholder="请输入业务编码" />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                allowClear
                options={bizStatusOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择状态"
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button htmlType="submit" type="primary">
                  查询
                </Button>
                <Button
                  onClick={() => {
                    searchForm.resetFields();
                    setQuery({
                      ...initialPageQuery,
                    });
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
        <Table<BizDefinitionRecord>
          columns={columns}
          dataSource={pageData.records}
          loading={tableLoading}
          pagination={{
            current: query.pageNum,
            onChange: (pageNum, pageSize) => {
              setQuery((previousQuery) => ({
                ...previousQuery,
                pageNum,
                pageSize,
              }));
            },
            pageSize: query.pageSize,
            showSizeChanger: true,
            total: pageData.total,
          }}
          rowKey="id"
          scroll={{ x: 1200 }}
        />
      </Space>
    </PageContainer>
  );
}

export default InboxPage;
