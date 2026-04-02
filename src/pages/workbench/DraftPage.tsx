import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { App as AntdApp, Button, Form, Input, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchBizApplyDraftPage,
  type BizApplyDraftPageQuery,
  type BizApplyDraftPageResult,
  type BizApplyDraftRecord,
} from '@/services/biz-apply.service';
import { fetchBizDefinitionList } from '@/services/biz.service';
import { showErrorMessageOnce } from '@/services/error-message';
import {
  fetchWorkflowDefinitionList,
  submitWorkflowBiz,
} from '@/services/workflow.service';

interface DraftSearchFormValues {
  title?: string;
}

const initialPageQuery: BizApplyDraftPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: BizApplyDraftPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

function getDraftStatusColor(status?: string) {
  return status === 'DRAFT' ? 'processing' : 'default';
}

function DraftPage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchForm] = Form.useForm<DraftSearchFormValues>();
  const [query, setQuery] = useState<BizApplyDraftPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<BizApplyDraftPageResult>(initialPageData);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [submittingDraftId, setSubmittingDraftId] = useState<number | null>(null);
  const [bizNameMap, setBizNameMap] = useState<Record<number, string>>({});
  const [workflowIdMap, setWorkflowIdMap] = useState<Record<number, number | undefined>>({});

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        // 业务定义返回结果已经不再直接包含 workflowDefinitionId，
        // 草稿箱需要额外拿一份流程定义列表，按流程编码还原“流程ID”展示列。
        const [bizDefinitions, workflowDefinitions] = await Promise.all([
          fetchBizDefinitionList(),
          fetchWorkflowDefinitionList(),
        ]);
        const workflowIdByCode = workflowDefinitions.reduce<Record<string, number>>(
          (accumulator, currentRecord) => {
            accumulator[currentRecord.code] = currentRecord.id;
            return accumulator;
          },
          {},
        );

        if (!canceled) {
          // 草稿分页当前只有 bizDefinitionId，没有直接返回业务名称，
          // 所以前端这里补一层映射，把列表展示从“业务ID”提升成“业务名称 / 流程ID”。
          setBizNameMap(
            bizDefinitions.reduce<Record<number, string>>((accumulator, currentRecord) => {
              accumulator[currentRecord.id] = currentRecord.bizName;
              return accumulator;
            }, {}),
          );
          setWorkflowIdMap(
            bizDefinitions.reduce<Record<number, number | undefined>>(
              (accumulator, currentRecord) => {
                accumulator[currentRecord.id] = currentRecord.workflowDefinitionCode
                  ? workflowIdByCode[currentRecord.workflowDefinitionCode]
                  : undefined;
                return accumulator;
              },
              {},
            ),
          );
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '业务名称映射加载失败');
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
        const nextPageData = await fetchBizApplyDraftPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '草稿箱列表加载失败');
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
  }, [query, reloadVersion]);

  const columns = useMemo<ColumnsType<BizApplyDraftRecord>>(
    () => [
      {
        title: '草稿ID',
        dataIndex: 'id',
        width: 120,
      },
      {
        title: '申请标题',
        dataIndex: 'title',
        ellipsis: true,
      },
      {
        title: '业务名称',
        dataIndex: 'bizDefinitionId',
        width: 180,
        render: (value: number) => bizNameMap[value] || '-',
      },
      {
        title: '流程名称',
        dataIndex: 'workflowName',
        ellipsis: true,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '流程ID',
        dataIndex: 'bizDefinitionId',
        width: 120,
        render: (value: number) => workflowIdMap[value] || '-',
      },
      {
        title: '申请人',
        dataIndex: 'applicantName',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'bizStatus',
        width: 120,
        render: (value: string | undefined) => (
          <Tag color={getDraftStatusColor(value)}>{value || '-'}</Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 220,
        render: (_, record) => (
          <Space size={0}>
            {/* 继续编辑时把业务定义 ID 和草稿 ID 一起带到办理页，
                是为了让办理页既能加载业务定义描述，又能回填草稿表单内容。 */}
            <Button
              type="link"
              onClick={() => {
                navigate(
                  `/workbench/inbox/handle?id=${record.bizDefinitionId}&draftId=${record.id}`,
                );
              }}
            >
              继续编辑
            </Button>
            <Button
              loading={submittingDraftId === record.id}
              type="link"
              onClick={() => {
                void handleSubmitDraft(record);
              }}
            >
              提交办理
            </Button>
          </Space>
        ),
      },
    ],
    [bizNameMap, navigate, submittingDraftId, workflowIdMap],
  );

  function triggerReload(pageNum = query.pageNum) {
    if (pageNum === query.pageNum) {
      setReloadVersion((previousVersion) => previousVersion + 1);
      return;
    }

    setQuery((previousQuery) => ({
      ...previousQuery,
      pageNum,
    }));
  }

  async function handleSubmitDraft(record: BizApplyDraftRecord) {
    try {
      setSubmittingDraftId(record.id);
      const submitResult = await submitWorkflowBiz({
        bizApplyId: record.id,
      });

      message.success(
        `提交办理成功${submitResult.workflowInstanceId ? `（流程实例ID：${submitResult.workflowInstanceId}）` : ''}`,
      );
      // 草稿提交后通常会脱离草稿箱，所以这里主动刷新列表，
      // 让用户立刻看到“已提交草稿”从当前页消失，减少重复点击。
      triggerReload(
        pageData.records.length === 1 && query.pageNum > 1 ? query.pageNum - 1 : query.pageNum,
      );
    } catch (error) {
      showErrorMessageOnce(error, '提交办理失败');
    } finally {
      setSubmittingDraftId(null);
    }
  }

  function handleSearch(values: DraftSearchFormValues) {
    // 查询条件统一落回分页 query，是为了让搜索和分页共用同一份状态，
    // 后续如果再加业务 ID、时间范围筛选，也只需要在这里继续并入 query。
    setQuery((previousQuery) => ({
      ...previousQuery,
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
      description="草稿箱直接对接当前用户草稿分页接口，方便从工作台恢复未完成的业务申请。"
      title="草稿箱"
    >
      <Form<DraftSearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
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

      {/* 列表和分页都直接使用后端 page 返回值，
          这样后续如果草稿箱补充批量操作或多条件筛选，不需要重写分页同步逻辑。 */}
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
        scroll={{ x: 900 }}
        style={{ marginTop: 16 }}
      />
    </PageContainer>
  );
}

export default DraftPage;
