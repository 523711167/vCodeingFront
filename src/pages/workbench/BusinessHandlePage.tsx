import { useEffect, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
} from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchBizDefinitionDetail,
  type BizDefinitionRecord,
} from '@/services/biz.service';
import { saveBizApplyDraft } from '@/services/biz-apply.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface BusinessHandleFormValues {
  reimbursementAmount?: number;
  remark?: string;
  title?: string;
}

function BusinessHandlePage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [handleForm] = Form.useForm<BusinessHandleFormValues>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [detailRecord, setDetailRecord] = useState<BizDefinitionRecord | null>(null);
  const rawBizDefinitionId = Number(searchParams.get('id') ?? '');
  const bizDefinitionId =
    Number.isFinite(rawBizDefinitionId) && rawBizDefinitionId > 0
      ? rawBizDefinitionId
      : null;

  useEffect(() => {
    if (!bizDefinitionId) {
      setDetailRecord(null);
      return;
    }

    const currentBizDefinitionId = bizDefinitionId;

    let cancelled = false;

    async function run() {
      try {
        setDetailLoading(true);
        const detail = await fetchBizDefinitionDetail(currentBizDefinitionId);

        if (!cancelled) {
          setDetailRecord(detail);
          // 申请标题优先给一个可编辑默认值，减少用户第一次保存草稿时的输入成本。
          // 后续如果后端有“标题模板”或“编号规则”，优先在这里替换默认值生成逻辑。
          handleForm.setFieldValue('title', `${detail.bizName}申请`);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '业务办理详情加载失败');
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
  }, [bizDefinitionId]);

  async function handleSaveDraft() {
    if (!bizDefinitionId) {
      message.warning('缺少业务定义 ID，无法保存草稿');
      return;
    }

    try {
      // 草稿保存至少要求申请标题可用；
      // 其他业务字段允许先保存未完成状态，方便用户中途退出后继续编辑。
      const { title } = await handleForm.validateFields(['title']);
      const draftTitle = title?.trim();

      if (!draftTitle) {
        message.warning('请输入申请标题');
        return;
      }

      const formValues = handleForm.getFieldsValue();

      setDraftSaving(true);
      const savedDraft = await saveBizApplyDraft({
        bizDefinitionId,
        formData: JSON.stringify({
          reimbursementAmount: formValues.reimbursementAmount,
          remark: formValues.remark?.trim() || '',
        }),
        title: draftTitle,
      });

      message.success(`草稿保存成功${savedDraft.id ? `（草稿ID：${savedDraft.id}）` : ''}`);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in (error as Record<string, unknown>)
      ) {
        return;
      }

      showErrorMessageOnce(error, '草稿保存失败');
    } finally {
      setDraftSaving(false);
    }
  }

  return (
    <PageContainer
      description="业务办理页改成独立页承载，便于后续接入复杂表单、附件、审批意见和流程轨迹。"
      title="业务办理"
    >
      {!bizDefinitionId && (
        <Alert
          message="缺少业务定义 ID，暂时无法打开办理页。"
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
        />
      )}

      <Spin spinning={detailLoading}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="业务信息">
            {detailRecord ? (
              <Descriptions
                column={2}
                items={[
                  {
                    key: 'bizName',
                    label: '业务名称',
                    children: detailRecord.bizName,
                  },
                  {
                    key: 'bizCode',
                    label: '业务编码',
                    children: detailRecord.bizCode,
                  },
                  {
                    key: 'status',
                    label: '状态',
                    children: detailRecord.statusMsg,
                  },
                  {
                    key: 'description',
                    label: '业务描述',
                    children: detailRecord.bizDesc || '-',
                  },
                ]}
              />
            ) : (
              <Empty description="暂未获取到业务定义详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title="业务表单">
            {/* 这里先把“独立页录入”的交互骨架搭起来，
                后续真实业务表单接口出来后，优先在当前 Form 区域替换成动态表单渲染，不要再退回列表弹窗模式。 */}
            <Form<BusinessHandleFormValues>
              form={handleForm}
              initialValues={{
                reimbursementAmount: undefined,
                remark: '',
                title: '',
              }}
              layout="vertical"
              onFinish={(values) => {
                void values;
                message.info('业务办理提交接口待接入，当前先保留独立页交互骨架');
              }}
            >
              {/* 标题和金额放在同一行，是为了让业务办理页首屏先展示最核心的两个录入字段，
                  用户进入页面后可以更快完成主操作；字段继续增加时再往下一行扩展。 */}
              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <Form.Item
                    extra="草稿保存接口要求传申请标题，所以这里先作为业务办理页的基础字段。"
                    label="申请标题"
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: '请输入申请标题',
                      },
                    ]}
                  >
                    <Input placeholder="请输入申请标题" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    extra="这里先按报销场景补一个金额字段，后续如果后端返回动态表单配置，可以继续替换成真实业务字段。"
                    label="报销金额"
                    name="reimbursementAmount"
                    rules={[
                      {
                        required: true,
                        message: '请输入报销金额',
                      },
                    ]}
                  >
                    <InputNumber
                      min={0}
                      placeholder="请输入报销金额"
                      precision={2}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                extra="当前先预留一块录入区域，后续接真实表单接口后会替换成动态字段。"
                label="办理备注"
                name="remark"
              >
                <Input.TextArea
                  placeholder="请输入当前业务的办理内容或补充说明"
                  rows={8}
                />
              </Form.Item>
              <Space>
                <Button
                  loading={draftSaving}
                  onClick={() => {
                    void handleSaveDraft();
                  }}
                >
                  保存草稿
                </Button>
                <Button htmlType="submit" type="primary">
                  提交办理
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

export default BusinessHandlePage;
