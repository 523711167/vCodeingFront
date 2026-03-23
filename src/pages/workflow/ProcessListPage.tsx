import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  App as AntdApp,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import { showErrorMessageOnce } from '@/services/error-message';
import {
  deleteWorkflowDefinition,
  disableWorkflowDefinition,
  fetchWorkflowDefinitionDetail,
  fetchWorkflowDefinitionPage,
  publishWorkflowDefinition,
  type WorkflowDefinitionPageQuery,
  type WorkflowDefinitionPageResult,
  type WorkflowDefinitionRecord,
  type WorkflowDefinitionStatusValue,
} from '@/services/workflow.service';

interface SearchFormValues {
  name?: string;
  code?: string;
  bizCode?: string;
  status?: WorkflowDefinitionStatusValue;
}

const initialPageQuery: WorkflowDefinitionPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: WorkflowDefinitionPageResult = {
  pageNum: 1,
  pageSize: 10,
  records: [],
  total: 0,
  totalPages: 0,
};

const workflowStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已停用', value: 2 },
] as const;

function getWorkflowStatusTagColor(status: WorkflowDefinitionStatusValue) {
  switch (status) {
    case 1:
      return 'green';
    case 2:
      return 'orange';
    case 0:
    default:
      return 'default';
  }
}

function ProcessListPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [query, setQuery] = useState<WorkflowDefinitionPageQuery>(initialPageQuery);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pageData, setPageData] = useState<WorkflowDefinitionPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WorkflowDefinitionRecord | null>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchWorkflowDefinitionPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '流程列表加载失败');
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

  function triggerReload(pageNum = query.pageNum) {
    // 列表刷新统一走 query / reloadVersion 这一条链路，
    // 这样查询、分页和行内操作后的重载行为就能保持一致，后续补缓存或防抖也只用改一处。
    if (pageNum === query.pageNum) {
      setReloadVersion((previousVersion) => previousVersion + 1);
      return;
    }

    setQuery((previousQuery) => ({
      ...previousQuery,
      pageNum,
    }));
  }

  async function loadDetail(recordId: number) {
    try {
      setDetailLoading(true);
      const detail = await fetchWorkflowDefinitionDetail(recordId);
      setDetailRecord(detail);
      setDetailOpen(true);
    } catch (error) {
      showErrorMessageOnce(error, '流程详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handlePublish(record: WorkflowDefinitionRecord) {
    modal.confirm({
      title: `确认发布流程“${record.name}”吗？`,
      content: '发布后该流程将进入可用状态。',
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        try {
          await publishWorkflowDefinition({ id: record.id });
          message.success('流程发布成功');
          triggerReload();
        } catch (error) {
          showErrorMessageOnce(error, '流程发布失败');
        }
      },
    });
  }

  async function handleDisable(record: WorkflowDefinitionRecord) {
    modal.confirm({
      title: `确认停用流程“${record.name}”吗？`,
      content: '停用后该流程将不能继续被使用。',
      okText: '确认停用',
      cancelText: '取消',
      onOk: async () => {
        try {
          await disableWorkflowDefinition({ id: record.id });
          message.success('流程停用成功');
          triggerReload();
        } catch (error) {
          showErrorMessageOnce(error, '流程停用失败');
        }
      },
    });
  }

  async function handleDelete(record: WorkflowDefinitionRecord) {
    modal.confirm({
      title: `确认删除流程“${record.name}”吗？`,
      content: '删除后不可恢复，请确认该流程已不再使用。',
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteWorkflowDefinition({ id: record.id });
          message.success('流程删除成功');
          triggerReload(pageData.records.length === 1 && query.pageNum > 1 ? query.pageNum - 1 : query.pageNum);
        } catch (error) {
          showErrorMessageOnce(error, '流程删除失败');
        }
      },
    });
  }

  // 列表列定义直接放在组件内部，是为了让行内操作能读取到最新的分页和抽屉状态，
  // 避免 useMemo 依赖遗漏后，发布/删除动作拿到旧闭包。
  const columns: ColumnsType<WorkflowDefinitionRecord> = [
    {
      dataIndex: 'name',
      title: '流程名称',
    },
    {
      dataIndex: 'code',
      title: '流程编码',
    },
    {
      dataIndex: 'bizCode',
      title: '业务编码',
      render: (bizCode?: string) => bizCode || '-',
    },
    {
      dataIndex: 'version',
      title: '版本号',
      width: 100,
    },
    {
      dataIndex: 'statusMsg',
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Tag color={getWorkflowStatusTagColor(record.status)}>
          {record.statusMsg}
        </Tag>
      ),
    },
    {
      dataIndex: 'updatedAt',
      title: '更新时间',
      width: 180,
      render: (updatedAt?: string) => updatedAt || '-',
    },
    {
      key: 'action',
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void loadDetail(record.id)} size="small" type="link">
            详情
          </Button>
          {record.status !== 1 && (
            <Button onClick={() => void handlePublish(record)} size="small" type="link">
              发布
            </Button>
          )}
          {record.status === 1 && (
            <Button onClick={() => void handleDisable(record)} size="small" type="link">
              停用
            </Button>
          )}
          <Button danger onClick={() => void handleDelete(record)} size="small" type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      description="流程列表页当前已对接真实流程定义接口，支持查询、分页、详情、发布、停用和删除。"
      title="流程列表"
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
                code: values.code?.trim() || undefined,
                name: values.name?.trim() || undefined,
                pageNum: 1,
                status: values.status,
              }));
            }}
          >
            <Form.Item label="流程名称" name="name">
              <Input allowClear placeholder="请输入流程名称" />
            </Form.Item>
            <Form.Item label="流程编码" name="code">
              <Input allowClear placeholder="请输入流程编码" />
            </Form.Item>
            <Form.Item label="业务编码" name="bizCode">
              <Input allowClear placeholder="请输入业务编码" />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                allowClear
                options={workflowStatusOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择状态"
                style={{ width: 160 }}
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

        <Table
          columns={columns}
          dataSource={pageData.records}
          loading={tableLoading}
          pagination={{
            current: query.pageNum,
            onChange: (pageNum, pageSize) => {
              setQuery((previousQuery) => {
                if (
                  previousQuery.pageNum === pageNum &&
                  previousQuery.pageSize === pageSize
                ) {
                  return previousQuery;
                }

                return {
                  ...previousQuery,
                  pageNum,
                  pageSize,
                };
              });
            },
            pageSize: query.pageSize,
            showSizeChanger: true,
            total: pageData.total,
          }}
          rowKey="id"
        />
      </Space>

      <Drawer
        destroyOnClose
        loading={detailLoading}
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        open={detailOpen}
        title="流程详情"
        width={720}
      >
        {detailRecord && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="流程名称">
              {detailRecord.name}
            </Descriptions.Item>
            <Descriptions.Item label="流程编码">
              {detailRecord.code}
            </Descriptions.Item>
            <Descriptions.Item label="业务编码">
              {detailRecord.bizCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="版本号">
              {detailRecord.version}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getWorkflowStatusTagColor(detailRecord.status)}>
                {detailRecord.statusMsg}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="流程描述">
              {detailRecord.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="节点数量">
              {detailRecord.nodeList?.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="连线数量">
              {detailRecord.transitionList?.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailRecord.createdAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detailRecord.updatedAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
}

export default ProcessListPage;
