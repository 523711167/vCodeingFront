import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Space,
  Table,
  Tag,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import {
  fetchWorkflowProcessedDetail,
  fetchWorkflowProcessedPage,
  type WorkflowProcessedPageQuery,
  type WorkflowProcessedPageResult,
  type WorkflowTodoRecord,
} from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface DoneSearchFormValues {
  bizApplyId?: string;
  title?: string;
}

const initialPageQuery: WorkflowProcessedPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: WorkflowProcessedPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

function getProcessedStatusColor(status?: string) {
  if (status === 'APPROVED') {
    return 'success';
  }

  if (status === 'REJECTED') {
    return 'error';
  }

  if (status === 'PENDING') {
    return 'processing';
  }

  return 'default';
}

function ProcessedPage() {
  const [searchForm] = Form.useForm<DoneSearchFormValues>();
  const [query, setQuery] = useState<WorkflowProcessedPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<WorkflowProcessedPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WorkflowTodoRecord | null>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchWorkflowProcessedPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '已办箱列表加载失败');
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
        title: '办理节点',
        dataIndex: 'nodeName',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '办理结果',
        dataIndex: 'approverStatusMsg',
        width: 140,
        render: (_, record) => (
          <Tag color={getProcessedStatusColor(record.approverStatus)}>
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
        title: '进入已办时间',
        dataIndex: 'todoAt',
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
              void openDetail(record.approverInstanceId);
            }}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [],
  );

  async function openDetail(approverInstanceId: number) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetailRecord = await fetchWorkflowProcessedDetail(approverInstanceId);
      setDetailRecord(nextDetailRecord);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      showErrorMessageOnce(error, '已办详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSearch(values: DoneSearchFormValues) {
    const nextBizApplyId = Number(values.bizApplyId?.trim() ?? '');

    setQuery((previousQuery) => ({
      ...previousQuery,
      bizApplyId:
        Number.isFinite(nextBizApplyId) && nextBizApplyId > 0
          ? nextBizApplyId
          : undefined,
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
      description="已办箱已对接 processed/page 和 processed/detail，可查看当前用户已处理事项。"
      title="已办箱"
    >
      <Form<DoneSearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
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

      {/* 已办箱延续代办/查询箱的交互习惯：
          统一支持列表分页、固定 10 行可视高度和详情抽屉，减少用户切换心智成本。 */}
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
        scroll={{ x: 1500, y: 10 * 54 }}
        style={{ marginTop: 16 }}
      />

      <Drawer
        destroyOnClose
        loading={detailLoading}
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        open={detailOpen}
        title="已办详情"
        width={720}
      >
        <Descriptions
          column={2}
          items={[
            {
              key: 'bizApplyId',
              label: '业务申请ID',
              children: detailRecord?.bizApplyId ?? '-',
            },
            {
              key: 'bizName',
              label: '业务名称',
              children: detailRecord?.bizName || '-',
            },
            {
              key: 'title',
              label: '申请标题',
              children: detailRecord?.title || '-',
            },
            {
              key: 'applicantName',
              label: '申请人',
              children: detailRecord?.applicantName || '-',
            },
            {
              key: 'nodeName',
              label: '办理节点',
              children: detailRecord?.nodeName || '-',
            },
            {
              key: 'approverStatus',
              label: '办理结果',
              children: detailRecord?.approverStatusMsg || detailRecord?.approverStatus || '-',
            },
            {
              key: 'workflowInstanceId',
              label: '流程实例ID',
              children: detailRecord?.workflowInstanceId ?? '-',
            },
            {
              key: 'approverInstanceId',
              label: '审批人实例ID',
              children: detailRecord?.approverInstanceId ?? '-',
            },
            {
              key: 'startedAt',
              label: '发起时间',
              children: detailRecord?.startedAt || '-',
            },
            {
              key: 'todoAt',
              label: '进入已办时间',
              children: detailRecord?.todoAt || '-',
            },
            {
              key: 'formData',
              label: '表单数据',
              children: detailRecord?.formData || '-',
            },
          ]}
        />
      </Drawer>
    </PageContainer>
  );
}

export default ProcessedPage;
