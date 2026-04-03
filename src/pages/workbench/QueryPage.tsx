import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import WorkflowTraceTimeline from '@/components/workflow/WorkflowTraceTimeline';
import {
  fetchWorkflowQueryDetail,
  fetchWorkflowQueryPage,
  type WorkflowQueryPageQuery,
  type WorkflowQueryPageResult,
  type WorkflowQueryRecord,
} from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface QuerySearchFormValues {
  bizApplyId?: string;
  title?: string;
  bizStatus?: string;
}

const initialPageQuery: WorkflowQueryPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: WorkflowQueryPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

const bizStatusOptions = [
  { label: '审批中', value: 'PROCESSING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已撤回', value: 'RECALLED' },
] as const;

function getBizStatusColor(status?: string) {
  if (status === 'APPROVED') {
    return 'success';
  }

  if (status === 'REJECTED') {
    return 'error';
  }

  if (status === 'PROCESSING') {
    return 'processing';
  }

  return 'default';
}

function QueryPage() {
  const [searchForm] = Form.useForm<QuerySearchFormValues>();
  const [query, setQuery] = useState<WorkflowQueryPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<WorkflowQueryPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WorkflowQueryRecord | null>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchWorkflowQueryPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '查询箱列表加载失败');
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

  const columns = useMemo<ColumnsType<WorkflowQueryRecord>>(
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
        title: '业务状态',
        dataIndex: 'bizStatusMsg',
        width: 140,
        render: (_, record) => (
          <Tag color={getBizStatusColor(record.bizStatus)}>
            {record.bizStatusMsg || record.bizStatus || '-'}
          </Tag>
        ),
      },
      {
        title: '流程状态',
        dataIndex: 'workflowStatusMsg',
        width: 140,
        render: (value: string | undefined, record) => value || record.workflowStatus || '-',
      },
      {
        title: '申请人',
        dataIndex: 'applicantName',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '当前节点',
        dataIndex: 'currentNodeName',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '提交流程时间',
        dataIndex: 'submittedAt',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '结束时间',
        dataIndex: 'finishedAt',
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
              void openDetail(record.bizApplyId);
            }}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [],
  );

  async function openDetail(bizApplyId: number) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetailRecord = await fetchWorkflowQueryDetail(bizApplyId);
      setDetailRecord(nextDetailRecord);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      showErrorMessageOnce(error, '查询详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSearch(values: QuerySearchFormValues) {
    const nextBizApplyId = Number(values.bizApplyId?.trim() ?? '');

    setQuery((previousQuery) => ({
      ...previousQuery,
      bizApplyId: Number.isFinite(nextBizApplyId) && nextBizApplyId > 0 ? nextBizApplyId : undefined,
      bizStatus: values.bizStatus || undefined,
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
      description="查询箱已接入当前用户查询分页接口，并支持按业务申请详情查看流程与表单信息。"
      title="查询箱"
    >
      <Form<QuerySearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
        <Form.Item label="业务申请ID" name="bizApplyId">
          <Input allowClear placeholder="请输入业务申请ID" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item label="申请标题" name="title">
          <Input allowClear placeholder="请输入申请标题" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item label="业务状态" name="bizStatus">
          <Select
            allowClear
            options={bizStatusOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            placeholder="请选择业务状态"
            style={{ width: 160 }}
          />
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

      {/* 查询箱直接消费 query/page 返回值，
          这样后续如果继续补更多状态筛选或导出能力，不需要重写列表分页主干。 */}
      <Table<WorkflowQueryRecord>
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
        rowKey="bizApplyId"
        // 查询箱和“我的发起”保持一致：主列表最多展示 10 行可视高度，
        // 超出部分交给表格内部滚动，避免工作台页整体被表格拉得过长。
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
        title="查询详情"
        width={720}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                key: 'bizStatusMsg',
                label: '业务状态',
                children: detailRecord?.bizStatusMsg || detailRecord?.bizStatus || '-',
              },
              {
                key: 'workflowStatusMsg',
                label: '流程状态',
                children: detailRecord?.workflowStatusMsg || detailRecord?.workflowStatus || '-',
              },
              {
                key: 'currentNodeName',
                label: '当前节点',
                children: detailRecord?.currentNodeName || '-',
              },
              {
                key: 'workflowInstanceId',
                label: '流程实例ID',
                children: detailRecord?.workflowInstanceId ?? '-',
              },
              {
                key: 'submittedAt',
                label: '提交流程时间',
                children: detailRecord?.submittedAt || '-',
              },
              {
                key: 'finishedAt',
                label: '流程结束时间',
                children: detailRecord?.finishedAt || '-',
              },
              {
                key: 'updatedAt',
                label: '最近更新时间',
                children: detailRecord?.updatedAt || '-',
              },
              {
                key: 'formData',
                label: '表单数据',
                children: detailRecord?.formData || '-',
              },
            ]}
          />
          <WorkflowTraceTimeline
            context={
              detailRecord
                ? {
                    applicantName: detailRecord.applicantName,
                    currentNodeName: detailRecord.currentNodeName,
                    finishedAt: detailRecord.finishedAt,
                    startedAt: detailRecord.submittedAt,
                    workflowInstanceId: detailRecord.workflowInstanceId,
                    workflowStatus: detailRecord.workflowStatus,
                    workflowStatusMsg: detailRecord.workflowStatusMsg,
                  }
                : null
            }
            emptyDescription="暂无可演示的流程轨迹"
          />
        </Space>
      </Drawer>
    </PageContainer>
  );
}

export default QueryPage;
