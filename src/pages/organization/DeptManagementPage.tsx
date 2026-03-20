import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  App as AntdApp,
  Button,
  Descriptions,
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
import {
  getOrgTypeLabel,
  ORG_TYPE_OPTIONS,
  type OrgTypeCode,
} from '@/constants/select-options';
import {
  createDept,
  deleteDepts,
  fetchDeptDetail,
  fetchDeptTree,
  updateDept,
  type CreateDeptPayload,
  type DeptRecord,
  type DeptTreeRecord,
  type UpdateDeptPayload,
} from '@/services/dept.service';

interface DeptFormValues {
  parentId?: number;
  name: string;
  orgType: OrgTypeCode;
  postType?: string;
  code?: string;
  leaderId?: number;
  sortOrder?: number;
  status: 0 | 1;
}

interface DeptTreeSelectNode {
  title: string;
  value: number;
  children?: DeptTreeSelectNode[];
}

function collectExpandedRowKeys(nodes: DeptTreeRecord[]): number[] {
  return nodes.flatMap((node) => [
    node.id,
    ...collectExpandedRowKeys(node.children ?? []),
  ]);
}

function getStatusTagColor(status: number) {
  return status === 1 ? 'green' : 'default';
}

function getActionErrorMessage(error: unknown, fallbackMessage = '操作失败，请稍后重试') {
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}

function toTreeSelectData(nodes: DeptTreeRecord[]): DeptTreeSelectNode[] {
  // 新增组织时需要保留父子关系选择，因此这里单独输出 TreeSelect 的 value/title 结构。
  // 如果后续接“移动部门”接口，也可以复用这份树选项。
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    children: node.children ? toTreeSelectData(node.children) : undefined,
  }));
}

function hasChildDept(record: DeptTreeRecord) {
  return Boolean(record.children?.length);
}

function DeptManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [deptForm] = Form.useForm<DeptFormValues>();
  const currentOrgType = Form.useWatch('orgType', deptForm);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<DeptRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [allDeptTree, setAllDeptTree] = useState<DeptTreeRecord[]>([]);
  const [tableData, setTableData] = useState<DeptTreeRecord[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextTreeData = await fetchDeptTree();

        if (!canceled) {
          setTableData(nextTreeData);
          // Table 的 defaultExpandAllRows 只在首屏同步数据时生效。
          // 组织树是异步返回的，所以这里改成受控展开，确保每次重载后仍然全部展开。
          setExpandedRowKeys(collectExpandedRowKeys(nextTreeData));
        }
      } catch (error) {
        if (!canceled) {
          message.error(getActionErrorMessage(error, '组织列表加载失败'));
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
  }, [message, reloadVersion]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        const nextTreeData = await fetchDeptTree();

        if (!canceled) {
          // 父级组织下拉必须始终使用完整组织树，不能复用列表查询后的结果，
          // 否则用户在搜索框里输入条件时，新增弹窗可选父级也会被一起过滤掉。
          setAllDeptTree(nextTreeData);
        }
      } catch (error) {
        if (!canceled) {
          message.error(getActionErrorMessage(error, '组织树选项加载失败'));
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [message, reloadVersion]);

  function triggerReload() {
    // 组织列表统一通过版本号触发重载，避免增删改后必须强行改查询条件才能重新请求。
    setReloadVersion((previousVersion) => previousVersion + 1);
  }

  async function openDetailModal(record: DeptTreeRecord) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetail = await fetchDeptDetail(record.id);
      setDetailRecord(nextDetail);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      message.error(getActionErrorMessage(error, '组织详情加载失败'));
    } finally {
      setDetailLoading(false);
    }
  }

  async function openCreateModal() {
    setEditingDeptId(null);
    deptForm.setFieldsValue({
      parentId: 0,
      orgType: 'DEPT',
      postType: undefined,
      status: 1,
    });
    setEditorOpen(true);
  }

  async function openEditModal(record: DeptTreeRecord) {
    try {
      const detail = await fetchDeptDetail(record.id);

      setEditingDeptId(detail.id);
      deptForm.setFieldsValue({
        code: detail.code,
        leaderId: detail.leaderId,
        name: detail.name,
        orgType: detail.orgType ?? 'DEPT',
        postType: detail.postType,
        sortOrder: detail.sortOrder,
        status: detail.status as 0 | 1,
      });
      setEditorOpen(true);
    } catch (error) {
      message.error(getActionErrorMessage(error, '组织详情加载失败'));
    }
  }

  async function handleSubmitDeptForm(values: DeptFormValues) {
    try {
      setEditorSubmitting(true);

      if (editingDeptId) {
        const payload: UpdateDeptPayload = {
          id: editingDeptId,
          code: values.code?.trim() || undefined,
          leaderId: values.leaderId,
          name: values.name.trim(),
          orgType: values.orgType,
          postType: values.postType?.trim() || undefined,
          sortOrder: values.sortOrder,
          status: values.status,
        };

        await updateDept(payload);
        message.success('组织修改成功');
      } else {
        const payload: CreateDeptPayload = {
          parentId: values.parentId ?? 0,
          code: values.code?.trim() || undefined,
          name: values.name.trim(),
          orgType: values.orgType,
          postType: values.postType?.trim() || undefined,
          sortOrder: values.sortOrder,
          status: values.status,
        };

        await createDept(payload);
        message.success('组织新增成功');
      }

      setEditorOpen(false);
      setEditingDeptId(null);
      deptForm.resetFields();
      triggerReload();
    } catch (error) {
      message.error(
        getActionErrorMessage(error, editingDeptId ? '组织修改失败' : '组织新增失败'),
      );
    } finally {
      setEditorSubmitting(false);
    }
  }

  async function handleDeleteDept(record: DeptTreeRecord) {
    if (hasChildDept(record)) {
      message.warning('存在下级组织，不能直接删除，请先删除或迁移下级节点');
      return;
    }

    modal.confirm({
      content: `删除后不可恢复，组织 ${record.name} 将被永久移除。`,
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      title: '确认删除该组织？',
      onOk: async () => {
        try {
          await deleteDepts({ id: record.id });
          message.success('组织删除成功');

          if (detailRecord?.id === record.id) {
            setDetailOpen(false);
            setDetailRecord(null);
          }

          triggerReload();
        } catch (error) {
          message.error(getActionErrorMessage(error, '组织删除失败'));
        }
      },
    });
  }

  const treeSelectData = useMemo(
    () => [
      {
        title: '顶级组织',
        value: 0,
        children: toTreeSelectData(allDeptTree),
      },
    ],
    [allDeptTree],
  );

  const columns: ColumnsType<DeptTreeRecord> = [
    {
      dataIndex: 'name',
      title: '组织名称',
    },
    {
      dataIndex: 'orgType',
      title: '组织类型',
      render: (orgType?: string) => getOrgTypeLabel(orgType),
    },
    {
      dataIndex: 'code',
      title: '组织编码',
      render: (code?: string) => code || '-',
    },
    {
      dataIndex: 'leaderName',
      title: '主管',
      render: (leaderName?: string) => leaderName || '-',
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
      width: 220,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void openDetailModal(record)} size="small" type="link">
            详情
          </Button>
          <Button onClick={() => void openEditModal(record)} size="small" type="link">
            编辑
          </Button>
          <Button
            danger
            onClick={() => void handleDeleteDept(record)}
            size="small"
            type="link"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      description="组织维护页当前采用树形表格展示组织结构，详情通过按钮弹框查看，编辑和删除统一收口在操作列。"
      title="组织维护"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => void openCreateModal()} type="primary">
            新增组织
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tableData}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => {
              setExpandedRowKeys(keys as number[]);
            },
          }}
          loading={tableLoading}
          pagination={false}
          rowKey="id"
        />
      </Space>

      <Modal
        destroyOnClose
        footer={null}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        open={detailOpen}
        title="组织详情"
      >
        {detailLoading ? (
          <div style={{ color: '#999' }}>正在加载组织详情...</div>
        ) : detailRecord ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="组织名称">{detailRecord.name}</Descriptions.Item>
            <Descriptions.Item label="组织类型">
              {getOrgTypeLabel(detailRecord.orgType)}
            </Descriptions.Item>
            <Descriptions.Item label="岗位类型">
              {detailRecord.postType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="组织编码">
              {detailRecord.code || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusTagColor(detailRecord.status)}>
                {detailRecord.statusMsg}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="组织路径">
              {detailRecord.path || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="层级">
              {detailRecord.level ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="排序">
              {detailRecord.sortOrder ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="主管">
              {detailRecord.leaderName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailRecord.createdAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detailRecord.updatedAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        confirmLoading={editorSubmitting}
        destroyOnClose
        onCancel={() => {
          setEditorOpen(false);
          setEditingDeptId(null);
          deptForm.resetFields();
        }}
        onOk={() => deptForm.submit()}
        open={editorOpen}
        title={editingDeptId ? '修改组织' : '新增组织'}
      >
        <Form<DeptFormValues>
          form={deptForm}
          initialValues={{
            parentId: 0,
            orgType: 'DEPT',
            postType: undefined,
            status: 1,
          }}
          layout="vertical"
          onFinish={(values) => void handleSubmitDeptForm(values)}
        >
          {!editingDeptId && (
            <Form.Item label="父级组织" name="parentId">
              <TreeSelect
                placeholder="请选择父级组织"
                style={{ width: '100%' }}
                treeData={treeSelectData}
                treeDefaultExpandAll
              />
            </Form.Item>
          )}
          <Form.Item
            label="组织名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入组织名称' }]}
          >
            <Input maxLength={100} placeholder="请输入组织名称" />
          </Form.Item>
          <Form.Item
            label="组织类型"
            name="orgType"
            rules={[{ required: true, message: '请选择组织类型' }]}
          >
            <Select
              disabled={Boolean(editingDeptId)}
              onChange={(value) => {
                if (value !== 'POST') {
                  deptForm.setFieldValue('postType', undefined);
                }
              }}
              options={ORG_TYPE_OPTIONS}
              placeholder="请选择组织类型"
            />
          </Form.Item>
          <Form.Item
            label="岗位类型"
            name="postType"
            rules={[
              {
                validator: async (_, value) => {
                  if (currentOrgType === 'POST' && !String(value ?? '').trim()) {
                    throw new Error('组织类型为岗位时，请填写岗位类型');
                  }
                },
              },
            ]}
          >
            <Input
              disabled={currentOrgType !== 'POST'}
              maxLength={64}
              placeholder={currentOrgType === 'POST' ? '请输入岗位类型' : '仅岗位类型需要填写'}
            />
          </Form.Item>
          <Form.Item label="组织编码" name="code">
            <Input maxLength={64} placeholder="请输入组织编码" />
          </Form.Item>
          {editingDeptId && (
            <Form.Item label="主管用户ID" name="leaderId">
              <InputNumber
                min={1}
                placeholder="请输入主管用户ID"
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              options={[
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
              ]}
              placeholder="请选择状态"
            />
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

        {editingDeptId && (
          <div style={{ color: '#999', marginTop: 8 }}>
            当前后端修改接口不支持调整父级组织和组织类型，如需移动组织需继续对接移动接口。
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

export default DeptManagementPage;
