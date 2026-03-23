import { useEffect, useMemo, useState } from 'react';
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
  Spin,
  Table,
  Tag,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import {
  createBizDefinition,
  deleteBizDefinition,
  fetchBizDefinitionDetail,
  fetchBizDefinitionPage,
  fetchBizDefinitionRoles,
  updateBizDefinition,
  updateBizDefinitionRoles,
  type BizDefinitionPageQuery,
  type BizDefinitionPageResult,
  type BizDefinitionRecord,
  type BizDefinitionRoleRecord,
  type BizDefinitionStatusValue,
  type CreateBizDefinitionPayload,
  type UpdateBizDefinitionRolesPayload,
  type UpdateBizDefinitionPayload,
} from '@/services/biz.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { fetchRoleList, type RoleRecord } from '@/services/role.service';
import {
  fetchWorkflowDefinitionList,
  type WorkflowDefinitionRecord,
} from '@/services/workflow.service';

interface SearchFormValues {
  bizCode?: string;
  bizName?: string;
  workflowDefinitionId?: number;
  status?: BizDefinitionStatusValue;
}

interface BizDefinitionFormValues {
  bizCode?: string;
  bizName: string;
  bizDesc?: string;
  workflowDefinitionId?: number;
  status: BizDefinitionStatusValue;
}

interface BizDefinitionRoleBindingFormValues {
  roleIds?: number[];
}

type EditorMode = 'create' | 'edit';

const initialPageQuery: BizDefinitionPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: BizDefinitionPageResult = {
  pageNum: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  records: [],
};

const bizStatusOptions = [
  { label: '正常', value: 1 },
  { label: '停用', value: 0 },
] as const;

function getStatusTagColor(status: BizDefinitionStatusValue) {
  return status === 1 ? 'green' : 'default';
}

function BusinessDefinitionPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [editorForm] = Form.useForm<BizDefinitionFormValues>();
  const [roleBindingForm] = Form.useForm<BizDefinitionRoleBindingFormValues>();
  const [query, setQuery] = useState<BizDefinitionPageQuery>(initialPageQuery);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pageData, setPageData] = useState<BizDefinitionPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [workflowOptionsLoading, setWorkflowOptionsLoading] = useState(false);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinitionRecord[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<BizDefinitionRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [roleBindingOpen, setRoleBindingOpen] = useState(false);
  const [roleBindingLoading, setRoleBindingLoading] = useState(false);
  const [roleBindingSubmitting, setRoleBindingSubmitting] = useState(false);
  const [roleBindingTargetRecord, setRoleBindingTargetRecord] =
    useState<BizDefinitionRecord | null>(null);
  const [roleOptions, setRoleOptions] = useState<RoleRecord[]>([]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchBizDefinitionPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '业务定义列表加载失败');
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

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setWorkflowOptionsLoading(true);
        // 业务定义只能绑定已发布流程，所以下拉选项这里默认只拉取 status=1 的流程定义。
        // 后续如果产品要求支持绑定草稿/停用流程，优先从这里放宽筛选条件。
        const records = await fetchWorkflowDefinitionList({ status: 1 });

        if (!canceled) {
          setWorkflowDefinitions(records);
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '流程定义选项加载失败');
        }
      } finally {
        if (!canceled) {
          setWorkflowOptionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, []);

  function triggerReload(pageNum = query.pageNum) {
    // 列表刷新统一收口到这一处，是为了让查询、分页和增删改后的刷新规则保持一致，
    // 后续如果要补缓存、请求防抖或列表选中态，也只需要改这一条链路。
    if (pageNum === query.pageNum) {
      setReloadVersion((previousVersion) => previousVersion + 1);
      return;
    }

    setQuery((previousQuery) => ({
      ...previousQuery,
      pageNum,
    }));
  }

  async function openDetail(record: BizDefinitionRecord) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetailRecord = await fetchBizDefinitionDetail(record.id);
      setDetailRecord(nextDetailRecord);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      showErrorMessageOnce(error, '业务定义详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreateEditor() {
    setEditorMode('create');
    setEditingId(null);
    editorForm.resetFields();
    // 新增时默认给“正常”状态，是为了降低表单必填数量；
    // 如果后续希望改成草稿态，优先从这里调整默认值。
    editorForm.setFieldsValue({
      status: 1,
    });
    setEditorOpen(true);
  }

  async function openEditEditor(record: BizDefinitionRecord) {
    try {
      setEditorMode('edit');
      setEditingId(record.id);
      setEditorLoading(true);
      setEditorOpen(true);
      const detail = await fetchBizDefinitionDetail(record.id);
      editorForm.setFieldsValue({
        bizCode: detail.bizCode,
        bizDesc: detail.bizDesc,
        bizName: detail.bizName,
        status: detail.status,
        workflowDefinitionId: detail.workflowDefinitionId,
      });
    } catch (error) {
      setEditorOpen(false);
      setEditingId(null);
      showErrorMessageOnce(error, '业务定义详情加载失败');
    } finally {
      setEditorLoading(false);
    }
  }

  async function handleSubmitEditor(values: BizDefinitionFormValues) {
    try {
      setEditorSubmitting(true);

      if (editorMode === 'create') {
        await createBizDefinition({
          bizCode: values.bizCode?.trim() || '',
          bizDesc: values.bizDesc?.trim() || undefined,
          bizName: values.bizName.trim(),
          status: values.status,
          workflowDefinitionId: values.workflowDefinitionId,
        } satisfies CreateBizDefinitionPayload);
        message.success('业务定义新增成功');
      } else if (editingId) {
        await updateBizDefinition({
          bizDesc: values.bizDesc?.trim() || undefined,
          bizName: values.bizName.trim(),
          id: editingId,
          status: values.status,
          workflowDefinitionId: values.workflowDefinitionId,
        } satisfies UpdateBizDefinitionPayload);
        message.success('业务定义修改成功');
      }

      setEditorOpen(false);
      triggerReload();
    } catch (error) {
      showErrorMessageOnce(error, editorMode === 'create' ? '业务定义新增失败' : '业务定义修改失败');
    } finally {
      setEditorSubmitting(false);
    }
  }

  async function openRoleBindingModal(record: BizDefinitionRecord) {
    try {
      setRoleBindingLoading(true);
      setRoleBindingTargetRecord(record);
      roleBindingForm.resetFields();

      // 绑定角色时同时拉取“当前已绑定角色”和“全量可选角色”，
      // 这样弹框打开时看到的是同一时刻的角色快照，避免刚新增角色后需要手动刷新整个页面。
      const [bizRoleRecord, roleList] = await Promise.all([
        fetchBizDefinitionRoles(record.id),
        fetchRoleList(),
      ]);

      setRoleOptions(roleList);
      roleBindingForm.setFieldsValue({
        roleIds: bizRoleRecord.roleIds,
      });
      setRoleBindingOpen(true);
    } catch (error) {
      showErrorMessageOnce(error, '业务角色关联数据加载失败');
    } finally {
      setRoleBindingLoading(false);
    }
  }

  async function handleSubmitRoleBinding(
    values: BizDefinitionRoleBindingFormValues,
  ) {
    if (!roleBindingTargetRecord) {
      return;
    }

    try {
      setRoleBindingSubmitting(true);
      await updateBizDefinitionRoles({
        bizDefinitionId: roleBindingTargetRecord.id,
        roleIds: values.roleIds ?? [],
      } satisfies UpdateBizDefinitionRolesPayload);
      message.success('业务定义角色关联成功');
      setRoleBindingOpen(false);
      setRoleBindingTargetRecord(null);
      roleBindingForm.resetFields();
    } catch (error) {
      showErrorMessageOnce(error, '业务定义角色关联失败');
    } finally {
      setRoleBindingSubmitting(false);
    }
  }

  function handleDelete(record: BizDefinitionRecord) {
    modal.confirm({
      title: `确认删除业务定义“${record.bizName}”吗？`,
      content: '删除后不可恢复，请确认该业务定义已不再使用。',
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteBizDefinition({ id: record.id });
          message.success('业务定义删除成功');
          triggerReload(
            pageData.records.length === 1 && query.pageNum > 1
              ? query.pageNum - 1
              : query.pageNum,
          );
        } catch (error) {
          // 删除确认框按当前项目其他列表页的交互保持一致：
          // 点击确认后无论接口成功还是失败，都自动关闭弹框，只保留错误提示。
          showErrorMessageOnce(error, '业务定义删除失败');
        }
      },
    });
  }

  const workflowDefinitionOptions = useMemo(
    () =>
      workflowDefinitions.map((record) => ({
        label: `${record.name}（${record.code}）`,
        value: record.id,
      })),
    [workflowDefinitions],
  );

  const columns: ColumnsType<BizDefinitionRecord> = [
    {
      dataIndex: 'bizName',
      title: '业务名称',
      width: 180,
    },
    {
      dataIndex: 'bizCode',
      title: '业务编码',
      width: 180,
    },
    {
      dataIndex: 'bizDesc',
      title: '业务描述',
      // 描述字段可能会比较长，这里先用省略展示控制列表宽度，
      // 需要完整内容时仍然可以从详情抽屉查看，不把主表格撑乱。
      ellipsis: true,
      render: (bizDesc?: string) => bizDesc || '-',
      width: 260,
    },
    {
      dataIndex: 'workflowDefinitionName',
      title: '绑定流程',
      render: (_, record) => {
        if (!record.workflowDefinitionName) {
          return '-';
        }

        return `${record.workflowDefinitionName}${record.workflowDefinitionCode ? `（${record.workflowDefinitionCode}）` : ''}`;
      },
    },
    {
      dataIndex: 'statusMsg',
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Tag color={getStatusTagColor(record.status)}>{record.statusMsg}</Tag>
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
      width: 300,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void openDetail(record)} size="small" type="link">
            详情
          </Button>
          <Button onClick={() => void openEditEditor(record)} size="small" type="link">
            编辑
          </Button>
          <Button
            onClick={() => void openRoleBindingModal(record)}
            size="small"
            type="link"
          >
            绑定角色
          </Button>
          <Button danger onClick={() => handleDelete(record)} size="small" type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      description="业务定义页已对接后端 /sys/biz 接口，支持查询、分页、详情、新增、修改和删除。"
      title="业务定义"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <div className="management-toolbar">
          <Form<SearchFormValues>
            className="management-toolbar__form"
            form={searchForm}
            layout="inline"
            onFinish={(values) => {
              setQuery({
                bizCode: values.bizCode?.trim() || undefined,
                bizName: values.bizName?.trim() || undefined,
                pageNum: 1,
                pageSize: query.pageSize,
                status: values.status,
                workflowDefinitionId: values.workflowDefinitionId,
              });
            }}
          >
            <Form.Item label="业务名称" name="bizName">
              <Input allowClear placeholder="请输入业务名称" />
            </Form.Item>
            <Form.Item label="业务编码" name="bizCode">
              <Input allowClear placeholder="请输入业务编码" />
            </Form.Item>
            <Form.Item label="绑定流程" name="workflowDefinitionId">
              <Select
                allowClear
                loading={workflowOptionsLoading}
                options={workflowDefinitionOptions}
                placeholder="请选择流程定义"
                showSearch
                style={{ width: 240 }}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                allowClear
                options={bizStatusOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择状态"
                style={{ width: 140 }}
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
          <Space>
            <PermissionButton
              onClick={openCreateEditor}
              permissionCode="sys:biz:add"
              type="primary"
            >
              新增
            </PermissionButton>
          </Space>
        </div>
        <Table<BizDefinitionRecord>
          columns={columns}
          dataSource={pageData.records}
          loading={tableLoading}
          pagination={{
            current: query.pageNum,
            onChange: (pageNum, pageSize) => {
              setQuery((previousQuery) => ({
                ...previousQuery,
                pageNum,
                pageSize,
              }));
            },
            pageSize: query.pageSize,
            showSizeChanger: true,
            total: pageData.total,
          }}
          rowKey="id"
          scroll={{ x: 1480 }}
        />
      </Space>
      <Drawer
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        open={detailOpen}
        title="业务定义详情"
        width={560}
      >
        <Spin spinning={detailLoading}>
          {detailRecord && (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="业务名称">{detailRecord.bizName}</Descriptions.Item>
              <Descriptions.Item label="业务编码">{detailRecord.bizCode}</Descriptions.Item>
              <Descriptions.Item label="业务描述">
                {detailRecord.bizDesc || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="绑定流程">
                {detailRecord.workflowDefinitionName
                  ? `${detailRecord.workflowDefinitionName}${detailRecord.workflowDefinitionCode ? `（${detailRecord.workflowDefinitionCode}）` : ''}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusTagColor(detailRecord.status)}>
                  {detailRecord.statusMsg}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detailRecord.createdAt || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {detailRecord.updatedAt || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Drawer>
      <Drawer
        destroyOnClose
        onClose={() => {
          setEditorOpen(false);
          setEditingId(null);
          editorForm.resetFields();
        }}
        open={editorOpen}
        title={editorMode === 'create' ? '新增业务定义' : '编辑业务定义'}
        width={640}
      >
        <Spin spinning={editorLoading}>
          <Form<BizDefinitionFormValues>
            form={editorForm}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmitEditor(values);
            }}
          >
            <Form.Item
              label="业务编码"
              name="bizCode"
              rules={
                editorMode === 'create'
                  ? [
                      {
                        required: true,
                        message: '请输入业务编码',
                      },
                    ]
                  : undefined
              }
            >
              <Input
                disabled={editorMode === 'edit'}
                placeholder={editorMode === 'create' ? '请输入业务编码' : '业务编码不允许编辑'}
              />
            </Form.Item>
            <Form.Item
              label="业务名称"
              name="bizName"
              rules={[
                {
                  required: true,
                  message: '请输入业务名称',
                },
              ]}
            >
              <Input placeholder="请输入业务名称" />
            </Form.Item>
            <Form.Item label="业务描述" name="bizDesc">
              <Input.TextArea placeholder="请输入业务描述" rows={4} />
            </Form.Item>
            <Form.Item label="绑定流程" name="workflowDefinitionId">
              <Select
                allowClear
                loading={workflowOptionsLoading}
                options={workflowDefinitionOptions}
                optionFilterProp="label"
                placeholder="请选择流程定义"
                showSearch
              />
            </Form.Item>
            <Form.Item
              initialValue={1}
              label="状态"
              name="status"
              rules={[
                {
                  required: true,
                  message: '请选择状态',
                },
              ]}
            >
              <Select
                options={bizStatusOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择状态"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button htmlType="submit" loading={editorSubmitting} type="primary">
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setEditorOpen(false);
                    setEditingId(null);
                    editorForm.resetFields();
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>
      <Modal
        confirmLoading={roleBindingSubmitting}
        destroyOnHidden
        onCancel={() => {
          setRoleBindingOpen(false);
          setRoleBindingTargetRecord(null);
          roleBindingForm.resetFields();
        }}
        okButtonProps={{
          loading: roleBindingSubmitting,
        }}
        okText="保存关联"
        onOk={() => void roleBindingForm.submit()}
        open={roleBindingOpen}
        title="绑定角色"
      >
        <Form<BizDefinitionRoleBindingFormValues>
          form={roleBindingForm}
          layout="vertical"
          onFinish={handleSubmitRoleBinding}
        >
          <Form.Item label="业务定义">
            <Input disabled value={roleBindingTargetRecord?.bizName || ''} />
          </Form.Item>
          <Form.Item
            extra="支持多选；如果需要移除全部角色，直接清空后保存即可。"
            label="绑定角色"
            name="roleIds"
          >
            <Select
              allowClear
              loading={roleBindingLoading}
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions.map((role) => ({
                label:
                  role.status === 1
                    ? `${role.name}（${role.code}）`
                    : `${role.name}（${role.code}，停用）`,
                value: role.id,
              }))}
              placeholder="请选择角色"
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

export default BusinessDefinitionPage;
