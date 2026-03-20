import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  App as AntdApp,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import {
  DATA_SCOPE_OPTIONS,
  getDataScopeLabelByCode,
  type DataScopeCode,
} from '@/constants/select-options';
import { fetchDeptTree, type DeptTreeRecord } from '@/services/dept.service';
import {
  createRole,
  deleteRoles,
  fetchRoleDetail,
  fetchRolePage,
  updateRoleDataScope,
  updateRole,
  updateRoleStatus,
  type CreateRolePayload,
  type RolePageQuery,
  type RolePageResult,
  type RoleRecord,
  type UpdateRoleDataScopePayload,
  type UpdateRolePayload,
} from '@/services/role.service';

const isRoleMock = import.meta.env.VITE_USE_ROLE_MOCK
  ? import.meta.env.VITE_USE_ROLE_MOCK !== 'false'
  : import.meta.env.VITE_USE_USER_MOCK
    ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
    : import.meta.env.VITE_USE_MOCK !== 'false';

interface SearchFormValues {
  name?: string;
  code?: string;
  status?: number;
}

interface RoleFormValues {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}

interface RoleDataScopeFormValues {
  dataScope: DataScopeCode;
  deptIds?: number[];
}

interface DeptTreeSelectOption {
  title: string;
  value: number;
  children?: DeptTreeSelectOption[];
}

const initialPageQuery: RolePageQuery = {
  pageNum: 1,
  pageSize: 10,
};

function getStatusTagColor(status: number) {
  return status === 1 ? 'green' : 'default';
}

function buildDeptTreeSelectData(nodes: DeptTreeRecord[]): DeptTreeSelectOption[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    children: node.children ? buildDeptTreeSelectData(node.children) : undefined,
  }));
}

function flattenDeptTree(nodes: DeptTreeRecord[]): DeptTreeRecord[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenDeptTree(node.children ?? []),
  ]);
}

function RoleManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [roleForm] = Form.useForm<RoleFormValues>();
  const [dataScopeForm] = Form.useForm<RoleDataScopeFormValues>();
  const [query, setQuery] = useState<RolePageQuery>(initialPageQuery);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pageData, setPageData] = useState<RolePageResult>({
    pageNum: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    records: [],
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RoleRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [dataScopeOpen, setDataScopeOpen] = useState(false);
  const [dataScopeLoading, setDataScopeLoading] = useState(false);
  const [dataScopeSubmitting, setDataScopeSubmitting] = useState(false);
  const [dataScopeTargetRole, setDataScopeTargetRole] = useState<RoleRecord | null>(null);
  const [deptTreeData, setDeptTreeData] = useState<DeptTreeRecord[]>([]);
  const selectedDataScope = Form.useWatch('dataScope', dataScopeForm);
  const deptNameMap = new Map(
    flattenDeptTree(deptTreeData).map((dept) => [dept.id, dept.name] as const),
  );

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchRolePage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        // 真接口分支已经在 request 层做统一提示，这里只给 mock 分支兜底。
        if (!canceled && isRoleMock && error instanceof Error) {
          message.error(error.message);
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
  }, [message, query, reloadVersion]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        const deptTree = await fetchDeptTree();

        if (!canceled) {
          // 角色数据权限里的“自定义部门”直接复用组织树，
          // 这样详情展示和编辑提交都能共享同一份组织基础数据。
          setDeptTreeData(deptTree);
        }
      } catch (error) {
        if (!canceled && isRoleMock && error instanceof Error) {
          message.error(error.message);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [message]);

  async function loadDetail(roleId: number, openDrawer = true) {
    try {
      setDetailLoading(true);
      const detail = await fetchRoleDetail(roleId);
      setDetailRecord(detail);

      if (openDrawer) {
        setDetailOpen(true);
      }
    } catch (error) {
      if (isRoleMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function triggerReload(pageNum = query.pageNum) {
    // 统一从 query 这条链路触发重载，可以避免查询、分页、删除后的刷新逻辑
    // 分散在多个函数里，后续要补缓存或防抖时也只需要改一处。
    if (query.pageNum === pageNum) {
      setReloadVersion((previousVersion) => previousVersion + 1);
      return;
    }

    setQuery((previousQuery) => {
      return {
        ...previousQuery,
        pageNum,
      };
    });
  }

  function openCreateModal() {
    setEditingRoleId(null);
    roleForm.resetFields();
    setEditorOpen(true);
  }

  async function openEditModal(roleId: number) {
    try {
      setEditorLoading(true);
      const detail = await fetchRoleDetail(roleId);

      setEditingRoleId(roleId);
      roleForm.setFieldsValue({
        code: detail.code,
        description: detail.description,
        name: detail.name,
        sortOrder: detail.sortOrder,
      });
      setEditorOpen(true);
    } catch (error) {
      if (isRoleMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setEditorLoading(false);
    }
  }

  async function handleSubmitRoleForm(values: RoleFormValues) {
    try {
      setEditorSubmitting(true);

      if (editingRoleId) {
        const payload: UpdateRolePayload = {
          id: editingRoleId,
          description: values.description?.trim() || undefined,
          name: values.name.trim(),
          sortOrder: values.sortOrder,
        };

        await updateRole(payload);
        message.success('角色修改成功');
      } else {
        const payload: CreateRolePayload = {
          code: values.code?.trim() || '',
          description: values.description?.trim() || undefined,
          name: values.name.trim(),
          sortOrder: values.sortOrder,
        };

        await createRole(payload);
        message.success('角色新增成功');
      }

      setEditorOpen(false);
      setEditingRoleId(null);
      roleForm.resetFields();
      triggerReload(editingRoleId ? query.pageNum : 1);
    } catch (error) {
      if (isRoleMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setEditorSubmitting(false);
    }
  }

  async function handleToggleRoleStatus(record: RoleRecord) {
    const nextStatus = record.status === 1 ? 0 : 1;

    modal.confirm({
      content: `角色 ${record.name} 将被${nextStatus === 1 ? '启用' : '停用'}。`,
      okText: '确认',
      title: `确认${nextStatus === 1 ? '启用' : '停用'}该角色？`,
      onOk: async () => {
        try {
          await updateRoleStatus({
            id: record.id,
            status: nextStatus,
          });
          message.success('角色状态更新成功');
          triggerReload();

          if (detailRecord?.id === record.id) {
            void loadDetail(record.id, false);
          }
        } catch (error) {
          if (isRoleMock && error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }

  async function handleDeleteRole(record: RoleRecord) {
    modal.confirm({
      content: `删除后无法恢复，角色 ${record.name} 将被永久移除。`,
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      title: '确认删除该角色？',
      onOk: async () => {
        try {
          await deleteRoles({ idList: [record.id] });
          message.success('角色删除成功');

          if (detailRecord?.id === record.id) {
            setDetailOpen(false);
            setDetailRecord(null);
          }

          const shouldFallbackToPreviousPage =
            pageData.records.length === 1 && query.pageNum > 1;

          triggerReload(shouldFallbackToPreviousPage ? query.pageNum - 1 : query.pageNum);
        } catch (error) {
          if (isRoleMock && error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }

  async function openDataScopeModal(roleId: number) {
    try {
      setDataScopeLoading(true);
      const detail = await fetchRoleDetail(roleId);
      const currentDataScope = detail.dataScope ?? 'ALL';

      setDataScopeTargetRole(detail);
      dataScopeForm.setFieldsValue({
        dataScope: currentDataScope,
        deptIds: detail.customDeptIds,
      });
      setDataScopeOpen(true);
    } catch (error) {
      if (isRoleMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDataScopeLoading(false);
    }
  }

  async function handleSubmitDataScope(values: RoleDataScopeFormValues) {
    if (!dataScopeTargetRole) {
      return;
    }

    if (values.dataScope === 'CUSTOM_DEPT' && !(values.deptIds?.length)) {
      dataScopeForm.setFields([
        {
          name: 'deptIds',
          errors: ['请选择自定义部门'],
        },
      ]);
      return;
    }

    try {
      setDataScopeSubmitting(true);
      const payload: UpdateRoleDataScopePayload = {
        roleId: dataScopeTargetRole.id,
        dataScope: values.dataScope,
        deptIds: values.dataScope === 'CUSTOM_DEPT' ? values.deptIds ?? [] : [],
      };

      await updateRoleDataScope(payload);
      message.success('角色数据权限更新成功');
      setDataScopeOpen(false);
      setDataScopeTargetRole(null);
      dataScopeForm.resetFields();
      triggerReload();

      if (detailRecord?.id === payload.roleId) {
        void loadDetail(payload.roleId, false);
      }
    } catch (error) {
      if (isRoleMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDataScopeSubmitting(false);
    }
  }

  const columns: ColumnsType<RoleRecord> = [
    {
      dataIndex: 'name',
      title: '角色名称',
    },
    {
      dataIndex: 'code',
      title: '角色编码',
    },
    {
      dataIndex: 'description',
      title: '角色说明',
      render: (description?: string) => description || '-',
    },
    {
      dataIndex: 'statusMsg',
      title: '状态',
      render: (_, record) => (
        <Tag color={getStatusTagColor(record.status)}>{record.statusMsg}</Tag>
      ),
    },
    {
      dataIndex: 'sortOrder',
      title: '排序',
      render: (sortOrder?: number) => sortOrder ?? '-',
    },
    {
      dataIndex: 'updatedAt',
      title: '更新时间',
      render: (updatedAt?: string) => updatedAt || '-',
    },
    {
      key: 'action',
      title: '操作',
      width: 380,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void loadDetail(record.id)} size="small" type="link">
            详情
          </Button>
          <PermissionButton
            onClick={() => void openEditModal(record.id)}
            permissionCode="system:role:edit"
            size="small"
            type="link"
          >
            编辑
          </PermissionButton>
          <PermissionButton
            onClick={() => void openDataScopeModal(record.id)}
            permissionCode="system:role:data-scope"
            size="small"
            type="link"
          >
            数据权限
          </PermissionButton>
          <PermissionButton
            onClick={() => void handleToggleRoleStatus(record)}
            permissionCode="system:role:edit"
            size="small"
            type="link"
          >
            {record.status === 1 ? '停用' : '启用'}
          </PermissionButton>
          <PermissionButton
            danger
            onClick={() => void handleDeleteRole(record)}
            permissionCode="system:role:delete"
            size="small"
            type="link"
          >
            删除
          </PermissionButton>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      description="角色管理页当前已对接真实角色接口，支持分页查询、详情、新增、修改、数据权限配置、状态切换和删除。"
      title="角色管理"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <div className="management-toolbar">
          <Form<SearchFormValues>
            className="management-toolbar__form"
            form={searchForm}
            layout="inline"
            onFinish={(values) => {
              const nextName = values.name?.trim() || undefined;
              const nextCode = values.code?.trim() || undefined;

              setQuery((previousQuery) => ({
                ...previousQuery,
                code: nextCode,
                name: nextName,
                pageNum:
                  previousQuery.name === nextName &&
                  previousQuery.code === nextCode &&
                  previousQuery.status === values.status
                    ? previousQuery.pageNum
                    : 1,
                status: values.status,
              }));
            }}
          >
            <Form.Item label="角色名称" name="name">
              <Input allowClear placeholder="请输入角色名称" />
            </Form.Item>
            <Form.Item label="角色编码" name="code">
              <Input allowClear placeholder="请输入角色编码" />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                allowClear
                options={[
                  { label: '正常', value: 1 },
                  { label: '停用', value: 0 },
                ]}
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
                    setQuery((previousQuery) => ({
                      ...previousQuery,
                      code: undefined,
                      name: undefined,
                      pageNum: 1,
                      status: undefined,
                    }));
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
          {/* 角色管理复用通用工具栏布局，保证查询入口和新增动作与账号管理保持一致。 */}
          <PermissionButton
            onClick={() => openCreateModal()}
            permissionCode="system:role:create"
            type="primary"
          >
            新增角色
          </PermissionButton>
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
        title="角色详情"
        width={680}
      >
        {detailRecord && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="角色名称">{detailRecord.name}</Descriptions.Item>
            <Descriptions.Item label="角色编码">{detailRecord.code}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusTagColor(detailRecord.status)}>
                {detailRecord.statusMsg}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色说明">
              {detailRecord.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="排序">
              {detailRecord.sortOrder ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="数据权限范围">
              {detailRecord.dataScopeMsg || getDataScopeLabelByCode(detailRecord.dataScope)}
            </Descriptions.Item>
            <Descriptions.Item label="自定义部门">
              {detailRecord.customDeptIds.length
                ? detailRecord.customDeptIds
                    .map((deptId) => deptNameMap.get(deptId) ?? String(deptId))
                    .join('、')
                : '-'}
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

      <Modal
        confirmLoading={dataScopeSubmitting}
        destroyOnClose
        onCancel={() => {
          setDataScopeOpen(false);
          setDataScopeTargetRole(null);
          dataScopeForm.resetFields();
        }}
        onOk={() => void dataScopeForm.submit()}
        open={dataScopeOpen}
        title="配置数据权限"
      >
        <Form<RoleDataScopeFormValues>
          form={dataScopeForm}
          layout="vertical"
          onFinish={(values) => void handleSubmitDataScope(values)}
        >
          <Form.Item label="目标角色">
            <Input disabled value={dataScopeTargetRole?.name || ''} />
          </Form.Item>
          <Form.Item
            label="数据权限范围"
            name="dataScope"
            rules={[{ required: true, message: '请选择数据权限范围' }]}
          >
            <Select
              loading={dataScopeLoading}
              options={DATA_SCOPE_OPTIONS.map((option) => ({
                label: option.value,
                value: option.key,
              }))}
              placeholder="请选择数据权限范围"
            />
          </Form.Item>
          {selectedDataScope === 'CUSTOM_DEPT' && (
            <Form.Item
              extra="仅在“自定义部门”时需要选择组织。"
              label="自定义部门"
              name="deptIds"
            >
              <TreeSelect
                allowClear
                loading={dataScopeLoading}
                multiple
                placeholder="请选择自定义部门"
                showSearch
                style={{ width: '100%' }}
                treeCheckable
                treeData={buildDeptTreeSelectData(deptTreeData)}
                treeDefaultExpandAll
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        confirmLoading={editorSubmitting}
        destroyOnClose
        onCancel={() => {
          setEditorOpen(false);
          setEditingRoleId(null);
          roleForm.resetFields();
        }}
        onOk={() => roleForm.submit()}
        open={editorOpen}
        title={editingRoleId ? '编辑角色' : '新增角色'}
      >
        <Form<RoleFormValues>
          form={roleForm}
          layout="vertical"
          onFinish={(values) => void handleSubmitRoleForm(values)}
        >
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入角色名称' }]}
          >
            <Input maxLength={64} placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            label="角色编码"
            name="code"
            rules={
              editingRoleId
                ? undefined
                : [{ required: true, whitespace: true, message: '请输入角色编码' }]
            }
          >
            <Input
              disabled={Boolean(editingRoleId)}
              maxLength={64}
              placeholder="请输入角色编码"
            />
          </Form.Item>
          <Form.Item label="角色说明" name="description">
            <Input.TextArea maxLength={200} placeholder="请输入角色说明" rows={4} />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder">
            <InputNumber
              min={0}
              placeholder="请输入排序值"
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>

        {editorLoading && (
          <div style={{ color: '#999', marginTop: 8 }}>
            正在加载角色详情...
          </div>
        )}
        {editingRoleId && (
          <div style={{ color: '#999', marginTop: 8 }}>
            当前后端修改接口不支持变更角色编码，所以编辑态只读展示编码。
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

export default RoleManagementPage;
