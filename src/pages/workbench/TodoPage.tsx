import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchWorkflowTodoPage,
  type WorkflowTodoPageQuery,
  type WorkflowTodoPageResult,
  type WorkflowTodoRecord,
} from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { fetchUserPage, type UserRecord } from '@/services/user.service';
import { delegateWorkflowBiz } from '@/services/workflow.service';

interface TodoSearchFormValues {
  bizApplyId?: string;
  title?: string;
}

interface DelegateFormValues {
  delegateToUserId?: number;
  comment?: string;
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
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchForm] = Form.useForm<TodoSearchFormValues>();
  const [delegateForm] = Form.useForm<DelegateFormValues>();
  const [query, setQuery] = useState<WorkflowTodoPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<WorkflowTodoPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [delegateTargetRecord, setDelegateTargetRecord] = useState<WorkflowTodoRecord | null>(null);
  const [delegateSubmitting, setDelegateSubmitting] = useState(false);
  const [userOptions, setUserOptions] = useState<UserRecord[]>([]);
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [userOptionsLoaded, setUserOptionsLoaded] = useState(false);

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

  useEffect(() => {
    if (!delegateTargetRecord || userOptionsLoaded) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setUserOptionsLoading(true);
        const pageResult = await fetchUserPage({
          pageNum: 1,
          pageSize: 200,
          status: 1,
        });

        if (!cancelled) {
          // 转办弹窗先复用系统用户分页作为单选数据源，
          // 这样不用额外等待“用户下拉专用接口”也能先打通链路。
          // 如果后续用户量变大，可以从这里切到远程搜索或专用轻量 list 接口。
          setUserOptions(pageResult.records);
          setUserOptionsLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '转办用户列表加载失败');
        }
      } finally {
        if (!cancelled) {
          setUserOptionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [delegateTargetRecord, userOptionsLoaded]);

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
        width: 180,
        render: (_, record) => (
          <Space size={0}>
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
            <Button
              type="link"
              onClick={() => {
                delegateForm.setFieldsValue({
                  delegateToUserId: undefined,
                });
                setDelegateTargetRecord(record);
              }}
            >
              转办
            </Button>
          </Space>
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

  function handleCloseDelegateModal() {
    delegateForm.resetFields();
    setDelegateTargetRecord(null);
  }

  async function handleSubmitDelegate() {
    if (!delegateTargetRecord) {
      return;
    }

    try {
      const values = await delegateForm.validateFields();
      setDelegateSubmitting(true);
      await delegateWorkflowBiz({
        approverInstanceId: delegateTargetRecord.approverInstanceId,
        comment: values.comment?.trim() || undefined,
        delegateToUserId: Number(values.delegateToUserId),
        instanceId: delegateTargetRecord.workflowInstanceId,
        nodeInstanceId: delegateTargetRecord.nodeInstanceId,
      });
      message.success('转办成功');
      handleCloseDelegateModal();
      setQuery((previousQuery) => ({
        ...previousQuery,
      }));
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in (error as Record<string, unknown>)
      ) {
        return;
      }

      showErrorMessageOnce(error, '转办失败');
    } finally {
      setDelegateSubmitting(false);
    }
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

      <Modal
        confirmLoading={delegateSubmitting}
        destroyOnHidden
        okText="确认转办"
        onCancel={handleCloseDelegateModal}
        onOk={() => {
          void handleSubmitDelegate();
        }}
        open={Boolean(delegateTargetRecord)}
        title="转办代办"
      >
        <Form<DelegateFormValues> form={delegateForm} layout="vertical">
          <Form.Item label="业务申请ID">
            <Input disabled value={delegateTargetRecord?.bizApplyId} />
          </Form.Item>
          <Form.Item label="申请标题">
            <Input disabled value={delegateTargetRecord?.title || '-'} />
          </Form.Item>
          <Form.Item
            extra="当前先复用系统用户分页作为候选人来源；如果后续要按部门、角色或关键字筛选，可以从这里继续扩展。"
            label="转办给"
            name="delegateToUserId"
            rules={[
              {
                required: true,
                message: '请选择转办人',
              },
            ]}
          >
            <Select
              allowClear
              loading={userOptionsLoading}
              optionFilterProp="label"
              options={userOptions.map((user) => ({
                label: `${user.realName} (${user.username})`,
                value: user.id,
              }))}
              placeholder="请选择转办人"
              showSearch
            />
          </Form.Item>
          <Form.Item
            extra="转办原因会和转办动作一起提交给后端；如果后续后端要求必填或增加模板文案，可以直接在这里补规则。"
            label="转办原因"
            name="comment"
            rules={[
              {
                max: 500,
                message: '转办原因最多输入 500 个字符',
              },
            ]}
          >
            <Input.TextArea placeholder="请输入转办原因" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

export default TodoPage;
