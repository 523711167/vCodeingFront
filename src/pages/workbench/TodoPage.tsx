import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Form, Input, Space, Table, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchWorkflowTodoPage,
  type WorkflowTodoPageQuery,
  type WorkflowTodoPageResult,
  type WorkflowTodoRecord,
} from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface TodoSearchFormValues {
  bizApplyId?: string;
  title?: string;
}

const initialPageQuery: WorkflowTodoPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: WorkflowTodoPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

function getApproverStatusColor(status?: string) {
  if (status === 'PENDING') {
    return 'processing';
  }

  if (status === 'APPROVED') {
    return 'success';
  }

  if (status === 'REJECTED') {
    return 'error';
  }

  return 'default';
}

function TodoPage() {
  const navigate = useNavigate();
  const [searchForm] = Form.useForm<TodoSearchFormValues>();
  const [query, setQuery] = useState<WorkflowTodoPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<WorkflowTodoPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchWorkflowTodoPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '代办箱列表加载失败');
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

  const columns = useMemo<ColumnsType<WorkflowTodoRecord>>(
    () => [
      {
        title: '业务申请ID',
        dataIndex: 'bizApplyId',
        width: 140,
      },
      {
        title: '业务名称',
        dataIndex: 'bizName',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '申请标题',
        dataIndex: 'title',
        ellipsis: true,
        width: 220,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '申请人',
        dataIndex: 'applicantName',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '当前节点',
        dataIndex: 'nodeName',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '代办状态',
        dataIndex: 'approverStatusMsg',
        width: 140,
        render: (_, record) => (
          <Tag color={getApproverStatusColor(record.approverStatus)}>
            {record.approverStatusMsg || record.approverStatus || '-'}
          </Tag>
        ),
      },
      {
        title: '发起时间',
        dataIndex: 'startedAt',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              const search = new URLSearchParams({
                approverInstanceId: String(record.approverInstanceId),
              });

              // 代办详情页已经切到真实详情接口，
              // 列表页这里只需要传 approverInstanceId 作为详情定位键即可。
              navigate(`/workbench/todo/audit?${search.toString()}`);
            }}
          >
            审核
          </Button>
        ),
      },
      {
        title: '进入代办时间',
        dataIndex: 'todoAt',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
    ],
    [navigate],
  );

  function handleSearch(values: TodoSearchFormValues) {
    const nextBizApplyId = Number(values.bizApplyId?.trim() ?? '');

    setQuery((previousQuery) => ({
      ...previousQuery,
      bizApplyId: Number.isFinite(nextBizApplyId) && nextBizApplyId > 0 ? nextBizApplyId : undefined,
      pageNum: 1,
      title: values.title?.trim() || undefined,
    }));
  }

  function handleReset() {
    searchForm.resetFields();
    setQuery(initialPageQuery);
  }

  return (
    <PageContainer
      description="代办箱已接入当前用户代办分页接口，方便按业务申请和标题快速定位待处理事项。"
      title="代办箱"
    >
      <Form<TodoSearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
        <Form.Item label="业务申请ID" name="bizApplyId">
          <Input allowClear placeholder="请输入业务申请ID" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item label="申请标题" name="title">
          <Input allowClear placeholder="请输入申请标题" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit" type="primary">
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 代办箱直接消费后端 todo/page 的分页结果，
          这样后续如果再补审批动作、批量处理或更多筛选项，不需要重写列表主干逻辑。 */}
      <Table<WorkflowTodoRecord>
        columns={columns}
        dataSource={pageData.records}
        loading={tableLoading}
        pagination={{
          current: pageData.pageNum,
          pageSize: pageData.pageSize,
          showSizeChanger: true,
          total: pageData.total,
          onChange: (pageNum, pageSize) => {
            setQuery((previousQuery) => ({
              ...previousQuery,
              pageNum,
              pageSize,
            }));
          },
        }}
        rowKey="approverInstanceId"
        scroll={{ x: 1400 }}
        style={{ marginTop: 16 }}
      />
    </PageContainer>
  );
}

export default TodoPage;
