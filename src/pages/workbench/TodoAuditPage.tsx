import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Spin,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchWorkflowTodoDetail,
  type WorkflowTodoRecord,
} from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { auditWorkflowBiz } from '@/services/workflow.service';

interface AuditFormValues {
  comment?: string;
}

function TodoAuditPage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [auditForm] = Form.useForm<AuditFormValues>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WorkflowTodoRecord | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const rawApproverInstanceId = Number(searchParams.get('approverInstanceId') ?? '');
  const approverInstanceId =
    Number.isFinite(rawApproverInstanceId) && rawApproverInstanceId > 0
      ? rawApproverInstanceId
      : null;

  useEffect(() => {
    if (!approverInstanceId) {
      setDetailRecord(null);
      return;
    }

    const currentApproverInstanceId = approverInstanceId;
    let cancelled = false;

    async function run() {
      try {
        setDetailLoading(true);
        const nextDetailRecord = await fetchWorkflowTodoDetail(currentApproverInstanceId);

        if (!cancelled) {
          setDetailRecord(nextDetailRecord);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '代办详情加载失败');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [approverInstanceId]);

  async function handleAudit(action: 'APPROVE' | 'REJECT') {
    if (!detailRecord) {
      message.warning('缺少代办详情信息，暂时无法提交审核');
      return;
    }

    try {
      const values = await auditForm.validateFields();
      setSubmittingAction(action);
      await auditWorkflowBiz({
        action,
        approverInstanceId: detailRecord.approverInstanceId,
        comment: values.comment?.trim() || undefined,
        instanceId: detailRecord.workflowInstanceId,
        nodeInstanceId: detailRecord.nodeInstanceId,
      });
      message.success(action === 'APPROVE' ? '审核通过成功' : '审核拒绝成功');
      navigate('/workbench/todo', { replace: true });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in (error as Record<string, unknown>)
      ) {
        return;
      }

      showErrorMessageOnce(error, action === 'APPROVE' ? '审核通过失败' : '审核拒绝失败');
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <PageContainer
      description="代办详情页已切到后端详情接口加载，审核动作直接复用当前详情返回的节点和实例信息。"
      title="代办审核"
    >
      {!approverInstanceId && (
        <Alert
          message="缺少审批人实例ID"
          description="当前页面没有拿到 approverInstanceId，请从代办箱列表重新进入。"
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
        />
      )}

      <Spin spinning={detailLoading}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="申请信息">
            {detailRecord ? (
              <Descriptions
                column={2}
                items={[
                  {
                    key: 'bizApplyId',
                    label: '业务申请ID',
                    children: detailRecord.bizApplyId,
                  },
                  {
                    key: 'bizName',
                    label: '业务名称',
                    children: detailRecord.bizName || '-',
                  },
                  {
                    key: 'title',
                    label: '申请标题',
                    children: detailRecord.title || '-',
                  },
                  {
                    key: 'applicantName',
                    label: '申请人',
                    children: detailRecord.applicantName || '-',
                  },
                  {
                    key: 'nodeName',
                    label: '当前节点',
                    children: detailRecord.nodeName || '-',
                  },
                  {
                    key: 'approverStatusMsg',
                    label: '当前状态',
                    children: detailRecord.approverStatusMsg || detailRecord.approverStatus || '-',
                  },
                  {
                    key: 'startedAt',
                    label: '发起时间',
                    children: detailRecord.startedAt || '-',
                  },
                  {
                    key: 'todoAt',
                    label: '进入代办时间',
                    children: detailRecord.todoAt || '-',
                  },
                  {
                    key: 'formData',
                    label: '表单数据',
                    children: detailRecord.formData || '-',
                  },
                ]}
              />
            ) : (
              <Empty description="暂未获取到代办详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title="审核意见">
            <Form<AuditFormValues>
              form={auditForm}
              initialValues={{
                comment: '',
              }}
              layout="vertical"
            >
              <Form.Item
                extra="审核意见会随通过或拒绝动作一并提交给后端；后续如果后端增加必填规则，优先在这里同步校验。"
                label="备注"
                name="comment"
                rules={[
                  {
                    max: 500,
                    message: '备注最多输入 500 个字符',
                  },
                ]}
              >
                <Input.TextArea placeholder="请输入审核备注" rows={6} />
              </Form.Item>
              <Space>
                <Button
                  disabled={!detailRecord}
                  loading={submittingAction === 'APPROVE'}
                  onClick={() => {
                    void handleAudit('APPROVE');
                  }}
                  type="primary"
                >
                  审核通过
                </Button>
                <Button
                  danger
                  disabled={!detailRecord}
                  loading={submittingAction === 'REJECT'}
                  onClick={() => {
                    void handleAudit('REJECT');
                  }}
                >
                  审核拒绝
                </Button>
                <Button onClick={() => navigate(-1)}>返回</Button>
              </Space>
            </Form>
          </Card>
        </Space>
      </Spin>
    </PageContainer>
  );
}

export default TodoAuditPage;
