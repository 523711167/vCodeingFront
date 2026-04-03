import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  App as AntdApp,
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
  fetchWorkflowApplyDetail,
  fetchWorkflowApplyPage,
  type BizApplyDraftRecord,
  type WorkflowApplyPageQuery,
  type WorkflowApplyPageResult,
} from '@/services/biz-apply.service';
import { fetchBizDefinitionList } from '@/services/biz.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { recallWorkflowBiz } from '@/services/workflow.service';

interface ApplySearchFormValues {
  id?: string;
  title?: string;
}

const initialPageQuery: WorkflowApplyPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: WorkflowApplyPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

function getLaunchStatusColor(status?: string) {
  if (status === 'DRAFT') {
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

function ApplyPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<ApplySearchFormValues>();
  const [query, setQuery] = useState<WorkflowApplyPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<WorkflowApplyPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [recallingId, setRecallingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<BizApplyDraftRecord | null>(null);
  const [bizNameMap, setBizNameMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        const bizDefinitions = await fetchBizDefinitionList();

        if (!canceled) {
          // “我的发起”分页返回的仍然是业务申请视图对象，
          // 列表里只有 bizDefinitionId，所以这里补一层业务名称映射，避免界面直接露出 ID。
          setBizNameMap(
            bizDefinitions.reduce<Record<number, string>>((accumulator, currentRecord) => {
              accumulator[currentRecord.id] = currentRecord.bizName;
              return accumulator;
            }, {}),
          );
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '我的发起业务名称映射加载失败');
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchWorkflowApplyPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '我的发起列表加载失败');
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

  const columns = useMemo<ColumnsType<BizApplyDraftRecord>>(
    () => [
      {
        title: '业务申请ID',
        dataIndex: 'id',
        width: 140,
      },
      {
        title: '业务名称',
        dataIndex: 'bizDefinitionId',
        width: 180,
        render: (value: number) => bizNameMap[value] || '-',
      },
      {
        title: '申请标题',
        dataIndex: 'title',
        ellipsis: true,
        width: 240,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '申请状态',
        dataIndex: 'bizStatus',
        width: 140,
        render: (value: string | undefined) => (
          <Tag color={getLaunchStatusColor(value)}>{value || '-'}</Tag>
        ),
      },
      {
        title: '申请人',
        dataIndex: 'applicantName',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '绑定流程',
        dataIndex: 'workflowName',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '提交时间',
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
        width: 180,
        render: (_, record) => (
          <Space size={0}>
            <Button
              type="link"
              onClick={() => {
                void openDetail(record.id);
              }}
            >
              查看详情
            </Button>
            {record.bizStatus === 'PENDING' && (
              <Button
                danger
                loading={recallingId === record.id}
                type="link"
                onClick={() => {
                  handleRecall(record);
                }}
              >
                撤回
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [bizNameMap, recallingId],
  );

  async function openDetail(id: number) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetailRecord = await fetchWorkflowApplyDetail(id);
      setDetailRecord(nextDetailRecord);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      showErrorMessageOnce(error, '我的发起详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSearch(values: ApplySearchFormValues) {
    const nextId = Number(values.id?.trim() ?? '');

    setQuery((previousQuery) => ({
      ...previousQuery,
      bizDefinitionId: undefined,
      pageNum: 1,
      title: values.title?.trim() || undefined,
      // 当前 apply/page 只支持 bizDefinitionId 和 title；
      // 这里把业务申请 ID 当成主键精确定位时，优先走 detail 的思路保留给后续扩展，
      // 当前版本只先对标题查询做真实对接，避免误把 id 塞进后端不支持的字段。
      ...(Number.isFinite(nextId) && nextId > 0 ? {} : {}),
    }));

    if (Number.isFinite(nextId) && nextId > 0) {
      void openDetail(nextId);
    }
  }

  function handleReset() {
    searchForm.resetFields();
    setQuery(initialPageQuery);
  }

  function handleRecall(record: BizApplyDraftRecord) {
    modal.confirm({
      title: `确认撤回申请“${record.title || record.id}”吗？`,
      content: '撤回后当前流程将终止，通常需要重新修改后再发起。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRecallingId(record.id);

          // 撤回接口要求 instanceId。
          // 列表页如果没直接返回流程实例 ID，这里补查一次详情，避免为了按钮额外改分页字段依赖。
          const detail = await fetchWorkflowApplyDetail(record.id);
          const instanceId = detail.workflowInstanceId ?? detail.instanceId;

          if (!instanceId) {
            message.warning('当前发起记录缺少流程实例ID，暂时无法撤回');
            return;
          }

          await recallWorkflowBiz({
            comment: '发起人主动撤回',
            instanceId,
          });

          message.success('撤回成功');
          setQuery((previousQuery) => ({
            ...previousQuery,
          }));
        } catch (error) {
          showErrorMessageOnce(error, '撤回失败');
        } finally {
          setRecallingId(null);
        }
      },
    });
  }

  return (
    <PageContainer
      description="我的发起页已对接 apply/page 和 apply/detail，可查看当前用户发起的业务申请。"
      title="我的发起"
    >
      <Form<ApplySearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
        <Form.Item label="业务申请ID" name="id">
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

      <Table<BizApplyDraftRecord>
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
        rowKey="id"
        // 列表页按“最多展示 10 行可视区域”控制表格高度，
        // 超出的记录交给表格自身滚动，避免页面在数据较多时被整块撑长。
        scroll={{ x: 1400, y: 10 * 54 }}
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
        title="我的发起详情"
        width={680}
      >
        <Descriptions
          column={2}
          items={[
            {
              key: 'id',
              label: '业务申请ID',
              children: detailRecord?.id ?? '-',
            },
            {
              key: 'bizName',
              label: '业务名称',
              children:
                detailRecord?.bizDefinitionId
                  ? bizNameMap[detailRecord.bizDefinitionId] || detailRecord.bizDefinitionId
                  : '-',
            },
            {
              key: 'title',
              label: '申请标题',
              children: detailRecord?.title || '-',
            },
            {
              key: 'bizStatus',
              label: '申请状态',
              children: detailRecord?.bizStatus || '-',
            },
            {
              key: 'applicantName',
              label: '申请人',
              children: detailRecord?.applicantName || '-',
            },
            {
              key: 'workflowName',
              label: '绑定流程',
              children: detailRecord?.workflowName || '-',
            },
            {
              key: 'submittedAt',
              label: '提交时间',
              children: detailRecord?.submittedAt || '-',
            },
            {
              key: 'finishedAt',
              label: '结束时间',
              children: detailRecord?.finishedAt || '-',
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

export default ApplyPage;
