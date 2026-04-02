import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
} from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import {
  fetchBizApplyDraftDetail,
  saveBizApplyDraft,
  saveAndSubmitBizApply,
  updateBizApplyDraft,
} from '@/services/biz-apply.service';
import {
  fetchBizDefinitionDetail,
  type BizDefinitionRecord,
} from '@/services/biz.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { submitWorkflowBiz } from '@/services/workflow.service';

type BusinessFormType = 'fish' | 'leave' | 'reimbursement' | 'unknown';

interface DraftFormData {
  fishTime?: string;
  leaveTime?: string;
  reimbursementAmount?: number;
  reimbursementTime?: string;
  reimbursementType?: string;
  remark?: string;
}

interface BusinessHandleFormValues {
  fishTime?: Dayjs;
  leaveTime?: Dayjs;
  reimbursementAmount?: number;
  reimbursementTime?: Dayjs;
  reimbursementType?: string;
  remark?: string;
  title?: string;
}

const reimbursementTypeOptions = [
  { label: '差旅报销', value: 'TRAVEL' },
  { label: '餐饮报销', value: 'MEAL' },
  { label: '办公报销', value: 'OFFICE' },
  { label: '其他报销', value: 'OTHER' },
];

function detectBusinessFormType(detailRecord: BizDefinitionRecord | null): BusinessFormType {
  const normalizedText = `${detailRecord?.bizName ?? ''} ${detailRecord?.bizCode ?? ''}`.toLowerCase();

  // 办理页目前只存在三种固定业务类型。
  // 这里同时兼容业务名称和业务编码做识别，避免后端配置一端写中文、一端写英文时前端失配。
  if (normalizedText.includes('摸鱼') || normalizedText.includes('fish')) {
    return 'fish';
  }

  if (normalizedText.includes('请假') || normalizedText.includes('leave')) {
    return 'leave';
  }

  if (
    normalizedText.includes('报销') ||
    normalizedText.includes('reimbursement') ||
    normalizedText.includes('expense')
  ) {
    return 'reimbursement';
  }

  return 'unknown';
}

function parseDraftDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedDate = dayjs(value);

  return parsedDate.isValid() ? parsedDate : undefined;
}

function parseDraftFormData(formData?: string): DraftFormData {
  if (!formData) {
    return {};
  }

  try {
    const parsed = JSON.parse(formData) as DraftFormData;

    return {
      fishTime: typeof parsed.fishTime === 'string' ? parsed.fishTime : undefined,
      leaveTime: typeof parsed.leaveTime === 'string' ? parsed.leaveTime : undefined,
      reimbursementAmount:
        typeof parsed.reimbursementAmount === 'number'
          ? parsed.reimbursementAmount
          : undefined,
      reimbursementTime:
        typeof parsed.reimbursementTime === 'string' ? parsed.reimbursementTime : undefined,
      reimbursementType:
        typeof parsed.reimbursementType === 'string' ? parsed.reimbursementType : undefined,
      remark: typeof parsed.remark === 'string' ? parsed.remark : '',
    };
  } catch {
    return {};
  }
}

function buildDraftFormData(values: BusinessHandleFormValues, formType: BusinessFormType) {
  // 草稿序列化要跟着业务类型一起切换，
  // 这样草稿回填时只会还原当前业务真正需要的字段，不会把别的业务字段残留进来。
  const baseData = {
    remark: values.remark?.trim() || '',
  };

  if (formType === 'fish') {
    return JSON.stringify({
      ...baseData,
      fishTime: values.fishTime?.format('YYYY-MM-DD HH:mm:ss') || '',
    });
  }

  if (formType === 'leave') {
    return JSON.stringify({
      ...baseData,
      leaveTime: values.leaveTime?.format('YYYY-MM-DD HH:mm:ss') || '',
    });
  }

  if (formType === 'reimbursement') {
    return JSON.stringify({
      ...baseData,
      reimbursementAmount: values.reimbursementAmount,
      reimbursementTime: values.reimbursementTime?.format('YYYY-MM-DD HH:mm:ss') || '',
      reimbursementType: values.reimbursementType || '',
    });
  }

  return JSON.stringify(baseData);
}

function BusinessHandlePage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [handleForm] = Form.useForm<BusinessHandleFormValues>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailRecord, setDetailRecord] = useState<BizDefinitionRecord | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const rawBizDefinitionId = Number(searchParams.get('id') ?? '');
  const rawDraftId = Number(searchParams.get('draftId') ?? '');
  const bizDefinitionId =
    Number.isFinite(rawBizDefinitionId) && rawBizDefinitionId > 0
      ? rawBizDefinitionId
      : null;
  const draftId = Number.isFinite(rawDraftId) && rawDraftId > 0 ? rawDraftId : null;
  const businessFormType = useMemo(
    () => detectBusinessFormType(detailRecord),
    [detailRecord],
  );

  useEffect(() => {
    if (!bizDefinitionId) {
      setDetailRecord(null);
      setEditingDraftId(null);
      return;
    }

    const currentBizDefinitionId = bizDefinitionId;
    const currentDraftId = draftId;

    let cancelled = false;

    async function run() {
      try {
        setDetailLoading(true);
        // 草稿编辑场景要把“业务定义描述”和“草稿内容”一起拉回来，
        // 这样进入页面后就能一次性完成头部信息展示和表单回填。
        const [detail, draftDetail] = await Promise.all([
          fetchBizDefinitionDetail(currentBizDefinitionId),
          currentDraftId ? fetchBizApplyDraftDetail(currentDraftId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setDetailRecord(detail);
          setEditingDraftId(draftDetail?.id ?? null);
          const currentFormType = detectBusinessFormType(detail);
          const parsedDraftFormData = parseDraftFormData(draftDetail?.formData);

          // 每次业务类型变化都显式重置整张表单，
          // 避免用户从一种业务切到另一种业务时，旧字段值还残留在表单状态里。
          handleForm.resetFields();
          handleForm.setFieldsValue({
            fishTime:
              currentFormType === 'fish' && parsedDraftFormData.fishTime
                ? parseDraftDate(parsedDraftFormData.fishTime)
                : undefined,
            leaveTime:
              currentFormType === 'leave' && parsedDraftFormData.leaveTime
                ? parseDraftDate(parsedDraftFormData.leaveTime)
                : undefined,
            reimbursementTime:
              currentFormType === 'reimbursement' && parsedDraftFormData.reimbursementTime
                ? parseDraftDate(parsedDraftFormData.reimbursementTime)
                : undefined,
            reimbursementAmount:
              currentFormType === 'reimbursement'
                ? parsedDraftFormData.reimbursementAmount
                : undefined,
            reimbursementType:
              currentFormType === 'reimbursement'
                ? parsedDraftFormData.reimbursementType
                : undefined,
            remark: parsedDraftFormData.remark ?? '',
            title: draftDetail?.title || `${detail.bizName}申请`,
          });
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
  }, [bizDefinitionId, draftId, handleForm]);

  async function handleSaveDraft() {
    if (!bizDefinitionId) {
      message.warning('缺少业务定义 ID，无法保存草稿');
      return;
    }

    if (businessFormType === 'unknown') {
      message.warning('当前业务类型暂未配置办理表单，请联系管理员确认业务定义');
      return;
    }

    try {
      // 保存草稿时要先校验“标题 + 当前业务类型的必填字段”，
      // 这样不同业务的录入规则能保持独立，不会互相干扰。
      const fieldsToValidate: Array<keyof BusinessHandleFormValues> = ['title'];

      if (businessFormType === 'fish') {
        fieldsToValidate.push('fishTime');
      } else if (businessFormType === 'leave') {
        fieldsToValidate.push('leaveTime');
      } else if (businessFormType === 'reimbursement') {
        fieldsToValidate.push(
          'reimbursementAmount',
          'reimbursementTime',
          'reimbursementType',
        );
      }

      const validatedValues = await handleForm.validateFields(fieldsToValidate);
      const draftTitle = validatedValues.title?.trim();

      if (!draftTitle) {
        message.warning('请输入申请标题');
        return;
      }

      const formValues = handleForm.getFieldsValue();

      setDraftSaving(true);
      const savedDraft = editingDraftId
        ? await updateBizApplyDraft({
            bizDefinitionId,
            formData: buildDraftFormData(formValues, businessFormType),
            id: editingDraftId,
            title: draftTitle,
          })
        : await saveBizApplyDraft({
            bizDefinitionId,
            formData: buildDraftFormData(formValues, businessFormType),
            title: draftTitle,
          });

      setEditingDraftId(savedDraft.id ?? editingDraftId);

      // 新增草稿后立刻补全 draftId 到地址栏，
      // 是为了让用户刷新页面、复制链接或从草稿箱返回时都能继续命中编辑链路。
      if (!editingDraftId && savedDraft.id) {
        navigate(`/workbench/inbox/handle?id=${bizDefinitionId}&draftId=${savedDraft.id}`, {
          replace: true,
        });
      }

      message.success(
        `${editingDraftId ? '草稿更新' : '草稿保存'}成功${savedDraft.id ? `（草稿ID：${savedDraft.id}）` : ''}`,
      );
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in (error as Record<string, unknown>)
      ) {
        return;
      }

      showErrorMessageOnce(error, editingDraftId ? '草稿更新失败' : '草稿保存失败');
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleSubmitBusiness() {
    if (!bizDefinitionId) {
      message.warning('缺少业务定义 ID，无法提交办理');
      return;
    }

    if (businessFormType === 'unknown') {
      message.warning('当前业务类型暂未配置办理表单，请联系管理员确认业务定义');
      return;
    }

    try {
      // 提交办理和保存草稿共用同一套必填校验，
      // 这样三种业务类型在“保存”和“提交”两条链路上的字段要求保持一致。
      const fieldsToValidate: Array<keyof BusinessHandleFormValues> = ['title'];

      if (businessFormType === 'fish') {
        fieldsToValidate.push('fishTime');
      } else if (businessFormType === 'leave') {
        fieldsToValidate.push('leaveTime');
      } else if (businessFormType === 'reimbursement') {
        fieldsToValidate.push(
          'reimbursementAmount',
          'reimbursementTime',
          'reimbursementType',
        );
      }

      const validatedValues = await handleForm.validateFields(fieldsToValidate);
      const submitTitle = validatedValues.title?.trim();

      if (!submitTitle) {
        message.warning('请输入申请标题');
        return;
      }

      const formValues = handleForm.getFieldsValue();
      const formData = buildDraftFormData(formValues, businessFormType);

      setSubmitting(true);

      const submitResult = editingDraftId
        ? await (async () => {
            // 草稿继续办理时，先把当前表单覆盖回草稿，再走运行态 submit。
            // 这样后端能基于最新草稿内容发起审批，不会把旧表单数据送入流程。
            const updatedDraft = await updateBizApplyDraft({
              bizDefinitionId,
              formData,
              id: editingDraftId,
              title: submitTitle,
            });

            return submitWorkflowBiz({
              bizApplyId: updatedDraft.id,
            });
          })()
        : await saveAndSubmitBizApply({
            bizDefinitionId,
            formData,
            title: submitTitle,
          });

      message.success(
        `提交办理成功${submitResult.workflowInstanceId ? `（流程实例ID：${submitResult.workflowInstanceId}）` : ''}`,
      );
      navigate('/workbench/todo', {
        replace: true,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in (error as Record<string, unknown>)
      ) {
        return;
      }

      showErrorMessageOnce(error, '提交办理失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer
      description="业务办理页按业务类型渲染不同录入项，并继续支持草稿保存与草稿恢复编辑。"
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
            {/* 办理页目前只有三种固定业务。
                所以这里先采用前端分支渲染，而不是引入更重的动态表单方案，降低当前联调复杂度。 */}
            <Form<BusinessHandleFormValues>
              form={handleForm}
              initialValues={{
                remark: '',
                reimbursementType: undefined,
                title: '',
              }}
              layout="vertical"
              onFinish={() => {
                void handleSubmitBusiness();
              }}
            >
              {businessFormType !== 'reimbursement' && (
                <Row gutter={[16, 0]}>
                  <Col md={8} span={24}>
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

                  {businessFormType === 'fish' && (
                    <>
                      <Col md={8} span={24}>
                        <Form.Item
                          extra="客户摸鱼业务只需要记录一次摸鱼时间，后续如果要改成时间段，可以从这个字段扩展成开始/结束时间。"
                          label="摸鱼时间"
                          name="fishTime"
                          rules={[
                            {
                              required: true,
                              message: '请选择摸鱼时间',
                            },
                          ]}
                        >
                          <DatePicker
                            placeholder="请选择摸鱼时间"
                            showTime
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col md={8} span={24}>
                        <Form.Item
                          extra="摸鱼业务先把备注收进首行，方便一屏内完成三项录入；如果后续备注明显变长，再从这里恢复成多行输入。"
                          label="办理备注"
                          name="remark"
                        >
                          <Input placeholder="请输入当前业务的补充说明" />
                        </Form.Item>
                      </Col>
                    </>
                  )}

                  {businessFormType === 'leave' && (
                    <>
                      <Col md={8} span={24}>
                        <Form.Item
                          extra="客户请假业务当前只记录请假时间，后续如果需要补请假天数或请假类型，优先在这一组表单内继续扩展。"
                          label="请假时间"
                          name="leaveTime"
                          rules={[
                            {
                              required: true,
                              message: '请选择请假时间',
                            },
                          ]}
                        >
                          <DatePicker
                            placeholder="请选择请假时间"
                            showTime
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col md={8} span={24}>
                        <Form.Item
                          extra="请假业务先共用一格短备注，保证首行能容纳三项录入；后续若要补长文本说明，可继续拆成独立多行备注区。"
                          label="办理备注"
                          name="remark"
                        >
                          <Input placeholder="请输入当前业务的补充说明" />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              )}

              {businessFormType === 'reimbursement' && (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  {/* 报销场景把字段拆成“两行主次分明”的布局，
                      是为了让标题、金额、类型先形成一组决策信息，再往下填写时间和备注。 */}
                  <Row gutter={[16, 0]}>
                    <Col md={8} span={24}>
                      <Form.Item
                        extra="申请标题保留在首行，方便用户在填写金额和类型前先明确本次报销单的主题。"
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
                    <Col md={8} span={24}>
                      <Form.Item
                        extra="报销金额使用数字输入组件，是为了减少金额格式错误并保留后续扩展币种、税额的空间。"
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
                          prefix="¥"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col md={8} span={24}>
                      <Form.Item
                        extra="报销类型放在首行末位，用户录完标题和金额后可以顺手完成分类。"
                        label="报销类型"
                        name="reimbursementType"
                        rules={[
                          {
                            required: true,
                            message: '请选择报销类型',
                          },
                        ]}
                      >
                        <Select options={reimbursementTypeOptions} placeholder="请选择报销类型" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={[16, 0]}>
                    <Col md={8} span={24}>
                      <Form.Item
                        extra="报销时间单独放到第二行开头，是为了让时间信息和上面的金额、类型形成更清晰的阅读分组。"
                        label="报销时间"
                        name="reimbursementTime"
                        rules={[
                          {
                            required: true,
                            message: '请选择报销时间',
                          },
                        ]}
                      >
                        <DatePicker
                          placeholder="请选择报销时间"
                          showTime
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col md={16} span={24}>
                      <Form.Item
                        extra="备注区拉宽到两列宽度，是为了让报销说明、票据摘要等内容输入时不容易被横向挤压。"
                        label="办理备注"
                        name="remark"
                      >
                        <Input.TextArea
                          placeholder="请输入当前业务的补充说明"
                          rows={4}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Space>
              )}

              {businessFormType === 'unknown' && (
                <Alert
                  message="当前业务定义未匹配到办理表单"
                  description="目前办理页仅支持客户摸鱼、客户请假、客户报销三种业务类型，请检查业务名称或业务编码配置。"
                  showIcon
                  style={{ marginBottom: 16 }}
                  type="warning"
                />
              )}

              <Space>
                <Button
                  loading={draftSaving}
                  onClick={() => {
                    void handleSaveDraft();
                  }}
                >
                  {editingDraftId ? '更新草稿' : '保存草稿'}
                </Button>
                <Button htmlType="submit" loading={submitting} type="primary">
                  {submitting ? '提交中...' : '提交办理'}
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
