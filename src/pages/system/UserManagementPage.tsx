import { useEffect, useState, type MouseEvent } from 'react';
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
  TreeSelect,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import type { DeptTreeRecord } from '@/services/dept.service';
import { fetchDeptTree } from '@/services/dept.service';
import { fetchRoleList, type RoleRecord } from '@/services/role.service';
import {
  createUser,
  deleteUsers,
  fetchUserDetail,
  fetchUserPage,
  resetUserPassword,
  updateUser,
  updateUserDepts,
  updateUserRoles,
  updateUserStatus,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UpdateUserDeptsPayload,
  type UpdateUserRolesPayload,
  type UserPageQuery,
  type UserPageResult,
  type UserRecord,
} from '@/services/user.service';

const isUserMock = import.meta.env.VITE_USE_USER_MOCK
  ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
  : import.meta.env.VITE_USE_MOCK !== 'false';

interface SearchFormValues {
  username?: string;
  status?: number;
}

interface UserFormValues {
  avatar?: string;
  email?: string;
  mobile?: string;
  password?: string;
  realName: string;
  username: string;
}

interface ResetPasswordFormValues {
  newPassword: string;
}

interface UserDeptBindingFormValues {
  deptIds?: number[];
  primaryDeptId?: number;
}

interface UserRoleBindingFormValues {
  roleIds?: number[];
}

interface DeptTreeSelectOption {
  title: string;
  value: number;
  disabled?: boolean;
  children?: DeptTreeSelectOption[];
}

const initialPageQuery: UserPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

function getStatusTagColor(status: number) {
  return status === 1 ? 'green' : 'default';
}

function formatRoleNames(record: UserRecord) {
  return record.roles.length
    ? record.roles.map((role) => role.name).join('、')
    : '-';
}

function formatPrimaryDeptName(
  record: UserRecord,
  deptPathLabelMap: Map<number, string>,
) {
  // 账号管理列表和详情只展示主组织，避免用户绑定多个组织后主列表信息过长。
  // 后续如果需要补充“全部所属组织”，优先在详情弹框新增独立字段，而不是回退到这里拼接多项。
  const primaryDept =
    record.depts.find((dept) => dept.isPrimary === 1) ?? record.depts[0];

  if (!primaryDept) {
    return '-';
  }

  return deptPathLabelMap.get(primaryDept.id) ?? primaryDept.name;
}

function formatAllDeptNames(
  record: UserRecord,
  deptPathLabelMap: Map<number, string>,
) {
  return record.depts.length
    ? record.depts
        .map((dept) => {
          const deptLabel = deptPathLabelMap.get(dept.id) ?? dept.name;

          return `${deptLabel}${dept.isPrimary === 1 ? '（主）' : ''}`;
        })
        .join('、')
    : '-';
}

function buildDeptTreeSelectData(
  nodes: DeptTreeRecord[],
  disabledDeptIds: Set<number>,
): DeptTreeSelectOption[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    disabled: disabledDeptIds.has(node.id),
    children: node.children
      ? buildDeptTreeSelectData(node.children, disabledDeptIds)
      : undefined,
  }));
}

function flattenDeptTree(nodes: DeptTreeRecord[]): DeptTreeRecord[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenDeptTree(node.children ?? []),
  ]);
}

function buildDeptPathLabelMap(
  nodes: DeptTreeRecord[],
  parentPath = '',
  labelMap = new Map<number, string>(),
) {
  nodes.forEach((node) => {
    const currentPath = parentPath ? `${parentPath}-${node.name}` : node.name;

    labelMap.set(node.id, currentPath);

    if (node.children?.length) {
      buildDeptPathLabelMap(node.children, currentPath, labelMap);
    }
  });

  return labelMap;
}

function buildDeptParentIdMap(
  nodes: DeptTreeRecord[],
  parentIdMap = new Map<number, number>(),
) {
  nodes.forEach((node) => {
    parentIdMap.set(node.id, node.parentId);

    if (node.children?.length) {
      buildDeptParentIdMap(node.children, parentIdMap);
    }
  });

  return parentIdMap;
}

function buildDeptDescendantIdsMap(
  nodes: DeptTreeRecord[],
  descendantIdsMap = new Map<number, number[]>(),
) {
  nodes.forEach((node) => {
    const descendantIds = flattenDeptTree(node.children ?? []).map((child) => child.id);

    descendantIdsMap.set(node.id, descendantIds);

    if (node.children?.length) {
      buildDeptDescendantIdsMap(node.children, descendantIdsMap);
    }
  });

  return descendantIdsMap;
}

function collectAncestorDeptIds(
  deptId: number,
  parentIdMap: Map<number, number>,
) {
  const ancestorIds: number[] = [];
  let currentParentId = parentIdMap.get(deptId);

  while (typeof currentParentId === 'number' && currentParentId > 0) {
    ancestorIds.push(currentParentId);
    currentParentId = parentIdMap.get(currentParentId);
  }

  return ancestorIds;
}

function hasSelectedAncestorDept(
  deptId: number,
  selectedDeptIds: number[],
  parentIdMap: Map<number, number>,
) {
  return collectAncestorDeptIds(deptId, parentIdMap).some((ancestorId) =>
    selectedDeptIds.includes(ancestorId),
  );
}

function normalizeSelectedDeptIds(
  nextDeptIds: number[],
  previousDeptIds: number[],
  parentIdMap: Map<number, number>,
  descendantIdsMap: Map<number, number[]>,
) {
  let normalizedDeptIds = previousDeptIds.filter((deptId) => nextDeptIds.includes(deptId));
  const addedDeptIds = nextDeptIds.filter((deptId) => !previousDeptIds.includes(deptId));

  addedDeptIds.forEach((deptId) => {
    if (hasSelectedAncestorDept(deptId, normalizedDeptIds, parentIdMap)) {
      return;
    }

    const descendantDeptIds = descendantIdsMap.get(deptId) ?? [];

    normalizedDeptIds = normalizedDeptIds.filter(
      (selectedDeptId) => !descendantDeptIds.includes(selectedDeptId),
    );
    normalizedDeptIds.push(deptId);
  });

  return normalizedDeptIds;
}

function buildDisabledDeptIds(
  selectedDeptIds: number[],
  parentIdMap: Map<number, number>,
  descendantIdsMap: Map<number, number[]>,
) {
  const disabledDeptIds = new Set<number>();

  selectedDeptIds.forEach((deptId) => {
    collectAncestorDeptIds(deptId, parentIdMap).forEach((ancestorId) => {
      disabledDeptIds.add(ancestorId);
    });

    (descendantIdsMap.get(deptId) ?? []).forEach((descendantId) => {
      disabledDeptIds.add(descendantId);
    });
  });

  selectedDeptIds.forEach((deptId) => {
    disabledDeptIds.delete(deptId);
  });

  return disabledDeptIds;
}

function UserManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [userForm] = Form.useForm<UserFormValues>();
  const [passwordForm] = Form.useForm<ResetPasswordFormValues>();
  const [deptBindingForm] = Form.useForm<UserDeptBindingFormValues>();
  const [query, setQuery] = useState<UserPageQuery>(initialPageQuery);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pageData, setPageData] = useState<UserPageResult>({
    pageNum: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    records: [],
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<UserRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserRecord | null>(null);
  const [roleBindingForm] = Form.useForm<UserRoleBindingFormValues>();
  const [roleBindingOpen, setRoleBindingOpen] = useState(false);
  const [roleBindingLoading, setRoleBindingLoading] = useState(false);
  const [roleBindingSubmitting, setRoleBindingSubmitting] = useState(false);
  const [roleBindingTargetUser, setRoleBindingTargetUser] = useState<UserRecord | null>(
    null,
  );
  const [roleOptions, setRoleOptions] = useState<RoleRecord[]>([]);
  const [deptBindingOpen, setDeptBindingOpen] = useState(false);
  const [deptBindingLoading, setDeptBindingLoading] = useState(false);
  const [deptBindingSubmitting, setDeptBindingSubmitting] = useState(false);
  const [deptBindingTargetUser, setDeptBindingTargetUser] = useState<UserRecord | null>(
    null,
  );
  const [deptTreeData, setDeptTreeData] = useState<DeptTreeRecord[]>([]);
  const deptPathLabelMap = buildDeptPathLabelMap(deptTreeData);
  const deptParentIdMap = buildDeptParentIdMap(deptTreeData);
  const deptDescendantIdsMap = buildDeptDescendantIdsMap(deptTreeData);
  const selectedDeptIds = Form.useWatch('deptIds', deptBindingForm) ?? [];
  const disabledDeptIds = buildDisabledDeptIds(
    selectedDeptIds,
    deptParentIdMap,
    deptDescendantIdsMap,
  );
  const deptFlatOptions = flattenDeptTree(deptTreeData).map((dept) => ({
    label: deptPathLabelMap.get(dept.id) ?? dept.name,
    value: dept.id,
  }));
  const selectedDeptOptions = deptFlatOptions.filter((option) =>
    selectedDeptIds.includes(option.value),
  );

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchUserPage(query);

        if (!canceled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        // 真接口错误已经在 request 层统一提示，这里只兜底 mock 分支的手动抛错。
        if (!canceled && isUserMock && error instanceof Error) {
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
          // 用户页缓存完整组织树，是为了让列表、详情和“关联组织”弹框
          // 都能复用同一套层级路径展示规则，避免不同区域显示不一致。
          setDeptTreeData(deptTree);
        }
      } catch (error) {
        if (!canceled && isUserMock && error instanceof Error) {
          message.error(error.message);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [message]);

  async function loadDetail(userId: number, openDrawer = true) {
    try {
      setDetailLoading(true);
      const detail = await fetchUserDetail(userId);
      setDetailRecord(detail);

      if (openDrawer) {
        setDetailOpen(true);
      }
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function triggerReload(pageNum = query.pageNum) {
    // 统一通过 query 变更触发重载，是为了把分页、筛选、增删改后的刷新入口
    // 收口到同一条 useEffect 链路，避免页面里散落多个独立请求。
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

  async function openCreateModal() {
    setEditingUserId(null);
    userForm.resetFields();
    setEditorOpen(true);
  }

  async function openEditModal(userId: number) {
    try {
      setEditorLoading(true);
      const detail = await fetchUserDetail(userId);

      setEditingUserId(userId);
      userForm.setFieldsValue({
        avatar: detail.avatar,
        email: detail.email,
        mobile: detail.mobile,
        realName: detail.realName,
        username: detail.username,
      });
      setEditorOpen(true);
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setEditorLoading(false);
    }
  }

  async function handleSubmitUserForm(values: UserFormValues) {
    try {
      setEditorSubmitting(true);

      if (editingUserId) {
        const payload: UpdateUserPayload = {
          id: editingUserId,
          avatar: values.avatar,
          email: values.email,
          mobile: values.mobile,
          realName: values.realName,
        };

        await updateUser(payload);
        message.success('用户修改成功');
      } else {
        const payload: CreateUserPayload = {
          avatar: values.avatar,
          email: values.email,
          mobile: values.mobile,
          password: values.password ?? '',
          realName: values.realName,
          username: values.username,
        };

        await createUser(payload);
        message.success('用户新增成功');
      }

      setEditorOpen(false);
      setEditingUserId(null);
      userForm.resetFields();
      triggerReload(editingUserId ? query.pageNum : 1);
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setEditorSubmitting(false);
    }
  }

  async function handleToggleUserStatus(record: UserRecord) {
    const nextStatus = record.status === 1 ? 0 : 1;

    modal.confirm({
      content: `账号 ${record.username} 将被${nextStatus === 1 ? '启用' : '停用'}。`,
      okText: '确认',
      title: `确认${nextStatus === 1 ? '启用' : '停用'}该用户？`,
      onOk: async () => {
        try {
          await updateUserStatus({
            id: record.id,
            status: nextStatus,
          });
          message.success('用户状态更新成功');
          triggerReload();

          if (detailRecord?.id === record.id) {
            void loadDetail(record.id, false);
          }
        } catch (error) {
          if (isUserMock && error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }

  function openResetPasswordModal(record: UserRecord) {
    setPasswordTargetUser(record);
    passwordForm.resetFields();
    setPasswordOpen(true);
  }

  async function openRoleBindingModal(record: UserRecord) {
    try {
      setRoleBindingLoading(true);
      setRoleBindingTargetUser(record);
      roleBindingForm.resetFields();

      // 关联角色和当前用户详情同时加载，是为了让可选角色与已绑定角色保持同一时刻的数据快照，
      // 避免角色刚被修改后弹框仍显示旧值。
      const [detail, roleList] = await Promise.all([
        fetchUserDetail(record.id),
        fetchRoleList(),
      ]);

      setRoleOptions(roleList);
      roleBindingForm.setFieldsValue({
        roleIds: detail.roles.map((role) => role.id),
      });
      setRoleBindingOpen(true);
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setRoleBindingLoading(false);
    }
  }

  async function handleSubmitResetPassword(values: ResetPasswordFormValues) {
    if (!passwordTargetUser) {
      return;
    }

    try {
      setPasswordSubmitting(true);
      await resetUserPassword({
        id: passwordTargetUser.id,
        newPassword: values.newPassword,
      });
      message.success('密码重置成功');
      setPasswordOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleSubmitRoleBinding(values: UserRoleBindingFormValues) {
    if (!roleBindingTargetUser) {
      return;
    }

    try {
      setRoleBindingSubmitting(true);
      const payload: UpdateUserRolesPayload = {
        userId: roleBindingTargetUser.id,
        roleIds: values.roleIds ?? [],
      };

      await updateUserRoles(payload);
      message.success('用户角色关联成功');
      setRoleBindingOpen(false);
      setRoleBindingTargetUser(null);
      roleBindingForm.resetFields();
      triggerReload();

      if (detailRecord?.id === payload.userId) {
        void loadDetail(payload.userId, false);
      }
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setRoleBindingSubmitting(false);
    }
  }

  async function handleDeleteUser(record: UserRecord) {
    modal.confirm({
      content: `删除后无法恢复，账号 ${record.username} 将被永久移除。`,
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      title: '确认删除该用户？',
      onOk: async () => {
        try {
          await deleteUsers({ idList: [record.id] });
          message.success('用户删除成功');

          if (detailRecord?.id === record.id) {
            setDetailOpen(false);
            setDetailRecord(null);
          }

          const shouldFallbackToPreviousPage =
            pageData.records.length === 1 && query.pageNum > 1;

          triggerReload(shouldFallbackToPreviousPage ? query.pageNum - 1 : query.pageNum);
        } catch (error) {
          if (isUserMock && error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }

  async function openDeptBindingModal(record: UserRecord) {
    try {
      setDeptBindingLoading(true);
      setDeptBindingTargetUser(record);
      deptBindingForm.resetFields();

      // 关联组织弹框同时拉用户详情和完整组织树，是为了保证“当前已关联组织”
      // 与“可选组织列表”来自同一时刻的数据，避免列表页缓存导致默认值不准确。
      const [detail, deptTree] = await Promise.all([
        fetchUserDetail(record.id),
        fetchDeptTree(),
      ]);
      const primaryDept = detail.depts.find((dept) => dept.isPrimary === 1);

      setDeptTreeData(deptTree);
      deptBindingForm.setFieldsValue({
        deptIds: detail.depts.map((dept) => dept.id),
        primaryDeptId: primaryDept?.id,
      });
      setDeptBindingOpen(true);
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDeptBindingLoading(false);
    }
  }

  function handleDeptIdsChange(nextDeptIds: number[]) {
    const normalizedDeptIds = normalizeSelectedDeptIds(
      nextDeptIds,
      selectedDeptIds,
      deptParentIdMap,
      deptDescendantIdsMap,
    );
    const currentPrimaryDeptId = deptBindingForm.getFieldValue('primaryDeptId');

    deptBindingForm.setFieldValue('deptIds', normalizedDeptIds);

    if (!normalizedDeptIds.length) {
      deptBindingForm.setFieldValue('primaryDeptId', undefined);
      return;
    }

    if (
      !currentPrimaryDeptId ||
      !normalizedDeptIds.includes(currentPrimaryDeptId)
    ) {
      deptBindingForm.setFieldValue('primaryDeptId', normalizedDeptIds[0]);
    }
  }

  function renderDeptBindingTag(props: {
    value: number;
    closable: boolean;
    onClose: (event?: MouseEvent<HTMLElement>) => void;
  }) {
    const deptLabel = deptPathLabelMap.get(props.value) ?? String(props.value);

    return (
      <Tag
        closable={props.closable}
        onClose={props.onClose}
        style={{ display: 'block', marginBottom: 4, marginInlineEnd: 0, width: '100%' }}
      >
        {deptLabel}
      </Tag>
    );
  }

  async function handleSubmitDeptBinding(values: UserDeptBindingFormValues) {
    if (!deptBindingTargetUser) {
      return;
    }

    const deptIds = values.deptIds ?? [];

    if (deptIds.length > 0 && !values.primaryDeptId) {
      deptBindingForm.setFields([
        {
          errors: ['请选择主组织'],
          name: 'primaryDeptId',
        },
      ]);
      return;
    }

    try {
      setDeptBindingSubmitting(true);
      const payload: UpdateUserDeptsPayload = {
        userId: deptBindingTargetUser.id,
        depts: deptIds.map((deptId) => ({
          deptId,
          isPrimary: deptId === values.primaryDeptId ? 1 : 0,
        })),
      };

      await updateUserDepts(payload);
      message.success('用户组织关联成功');
      setDeptBindingOpen(false);
      setDeptBindingTargetUser(null);
      deptBindingForm.resetFields();
      triggerReload();

      if (detailRecord?.id === payload.userId) {
        void loadDetail(payload.userId, false);
      }
    } catch (error) {
      if (isUserMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDeptBindingSubmitting(false);
    }
  }

  const columns: ColumnsType<UserRecord> = [
    {
      dataIndex: 'username',
      title: '账号',
    },
    {
      dataIndex: 'realName',
      title: '姓名',
    },
    {
      dataIndex: 'email',
      title: '邮箱',
      render: (email?: string) => email || '-',
    },
    {
      dataIndex: 'mobile',
      title: '手机号',
      render: (mobile?: string) => mobile || '-',
    },
    {
      key: 'roles',
      title: '角色',
      render: (_, record) => formatRoleNames(record),
    },
    {
      key: 'depts',
      title: '组织',
      render: (_, record) => formatPrimaryDeptName(record, deptPathLabelMap),
    },
    {
      dataIndex: 'statusMsg',
      title: '状态',
      render: (_, record) => (
        <Tag color={getStatusTagColor(record.status)}>{record.statusMsg}</Tag>
      ),
    },
    {
      dataIndex: 'lastLoginAt',
      title: '最后登录时间',
      render: (lastLoginAt?: string) => lastLoginAt || '-',
    },
    {
      key: 'action',
      title: '操作',
      width: 520,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void loadDetail(record.id)} size="small" type="link">
            详情
          </Button>
          <PermissionButton
            onClick={() => void openEditModal(record.id)}
            permissionCode="system:user:edit"
            size="small"
            type="link"
          >
            编辑
          </PermissionButton>
          <PermissionButton
            onClick={() => void openDeptBindingModal(record)}
            permissionCode="system:user:assign-dept"
            size="small"
            type="link"
          >
            关联组织
          </PermissionButton>
          <PermissionButton
            onClick={() => void openRoleBindingModal(record)}
            permissionCode="system:user:assign-role"
            size="small"
            type="link"
          >
            关联角色
          </PermissionButton>
          <PermissionButton
            onClick={() => void handleToggleUserStatus(record)}
            permissionCode="system:user:edit"
            size="small"
            type="link"
          >
            {record.status === 1 ? '停用' : '启用'}
          </PermissionButton>
          <PermissionButton
            onClick={() => openResetPasswordModal(record)}
            permissionCode="system:user:reset-pwd"
            size="small"
            type="link"
          >
            重置密码
          </PermissionButton>
          <PermissionButton
            danger
            onClick={() => void handleDeleteUser(record)}
            permissionCode="system:user:delete"
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
      description="账号管理页当前已对接真实用户接口，支持分页查询、详情、新增、修改、关联组织、状态切换、密码重置和删除。"
      title="账号管理"
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
                pageNum:
                  previousQuery.username === (values.username?.trim() || undefined) &&
                  previousQuery.status === values.status
                    ? previousQuery.pageNum
                    : 1,
                status: values.status,
                username: values.username?.trim() || undefined,
              }));
            }}
          >
            <Form.Item label="账号" name="username">
              <Input allowClear placeholder="请输入账号" />
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
                      pageNum: 1,
                      status: undefined,
                      username: undefined,
                    }));
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
          {/* 系统管理列表页把“查询区 + 新增按钮”收口到同一行，
              是为了统一后台主操作入口的位置；后续其他管理页也直接复用这套结构。 */}
          <PermissionButton
            onClick={() => void openCreateModal()}
            permissionCode="system:user:create"
            type="primary"
          >
            新增用户
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
        title="用户详情"
        width={720}
      >
        {detailRecord && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="账号">
              {detailRecord.username}
            </Descriptions.Item>
            <Descriptions.Item label="姓名">
              {detailRecord.realName}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {detailRecord.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {detailRecord.mobile || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="头像地址">
              {detailRecord.avatar || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusTagColor(detailRecord.status)}>
                {detailRecord.statusMsg}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {formatRoleNames(detailRecord)}
            </Descriptions.Item>
            <Descriptions.Item label="组织">
              {formatAllDeptNames(detailRecord, deptPathLabelMap)}
            </Descriptions.Item>
            <Descriptions.Item label="最后登录时间">
              {detailRecord.lastLoginAt || '-'}
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
        confirmLoading={editorSubmitting}
        destroyOnHidden
        onCancel={() => {
          setEditorOpen(false);
          setEditingUserId(null);
          userForm.resetFields();
        }}
        okText={editingUserId ? '保存修改' : '创建用户'}
        okButtonProps={{
          loading: editorSubmitting,
        }}
        onOk={() => void userForm.submit()}
        open={editorOpen}
        title={editingUserId ? '编辑用户' : '新增用户'}
      >
        <Form<UserFormValues>
          form={userForm}
          initialValues={{
            avatar: '',
            email: '',
            mobile: '',
            realName: '',
            username: '',
          }}
          layout="vertical"
          onFinish={handleSubmitUserForm}
        >
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input disabled={Boolean(editingUserId)} placeholder="请输入账号" />
          </Form.Item>
          {!editingUserId && (
            <Form.Item
              label="初始密码"
              name="password"
              rules={[{ required: true, message: '请输入初始密码' }]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}
          <Form.Item
            label="姓名"
            name="realName"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="手机号" name="mobile">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item label="头像地址" name="avatar">
            <Input placeholder="请输入头像 URL" />
          </Form.Item>
          {editorLoading && (
            <Tag color="processing">
              正在加载用户详情，请稍候
            </Tag>
          )}
        </Form>
      </Modal>

      <Modal
        confirmLoading={roleBindingSubmitting}
        destroyOnHidden
        onCancel={() => {
          setRoleBindingOpen(false);
          setRoleBindingTargetUser(null);
          roleBindingForm.resetFields();
        }}
        okButtonProps={{
          loading: roleBindingSubmitting,
        }}
        okText="保存关联"
        onOk={() => void roleBindingForm.submit()}
        open={roleBindingOpen}
        title="关联角色"
      >
        <Form<UserRoleBindingFormValues>
          form={roleBindingForm}
          layout="vertical"
          onFinish={handleSubmitRoleBinding}
        >
          <Form.Item label="目标账号">
            <Input disabled value={roleBindingTargetUser?.username || ''} />
          </Form.Item>
          <Form.Item
            extra="支持多选；如果需要移除全部角色，直接清空后保存即可。"
            label="所属角色"
            name="roleIds"
          >
            <Select
              allowClear
              loading={roleBindingLoading}
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions.map((role) => ({
                label: role.status === 1 ? `${role.name}（${role.code}）` : `${role.name}（${role.code}，停用）`,
                value: role.id,
              }))}
              placeholder="请选择角色"
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={deptBindingSubmitting}
        destroyOnHidden
        onCancel={() => {
          setDeptBindingOpen(false);
          setDeptBindingTargetUser(null);
          deptBindingForm.resetFields();
        }}
        okButtonProps={{
          loading: deptBindingSubmitting,
        }}
        okText="保存关联"
        onOk={() => void deptBindingForm.submit()}
        open={deptBindingOpen}
        title="关联组织"
      >
        <Form<UserDeptBindingFormValues>
          form={deptBindingForm}
          layout="vertical"
          onFinish={handleSubmitDeptBinding}
        >
          <Form.Item label="目标账号">
            <Input disabled value={deptBindingTargetUser?.username || ''} />
          </Form.Item>
          <Form.Item
            extra="树节点保持原始名称展示；已选组织会按完整层级逐行展示，且父子节点不能同时选中。"
            label="所属组织"
            name="deptIds"
          >
            <TreeSelect
              allowClear
              className="user-dept-tree-select"
              loading={deptBindingLoading}
              multiple
              onChange={(value) => handleDeptIdsChange(value as number[])}
              placeholder="请选择组织"
              style={{ width: '100%' }}
              tagRender={renderDeptBindingTag}
              treeData={buildDeptTreeSelectData(deptTreeData, disabledDeptIds)}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item
            label="主组织"
            name="primaryDeptId"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const deptIds = (getFieldValue('deptIds') ?? []) as number[];

                  if (!deptIds.length || value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('请选择主组织'));
                },
              }),
            ]}
          >
            <Select
              allowClear
              disabled={!selectedDeptOptions.length}
              options={selectedDeptOptions}
              placeholder="请选择主组织"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={passwordSubmitting}
        destroyOnHidden
        onCancel={() => {
          setPasswordOpen(false);
          setPasswordTargetUser(null);
          passwordForm.resetFields();
        }}
        okButtonProps={{
          loading: passwordSubmitting,
        }}
        okText="确认重置"
        onOk={() => void passwordForm.submit()}
        open={passwordOpen}
        title="重置密码"
      >
        <Form<ResetPasswordFormValues>
          form={passwordForm}
          layout="vertical"
          onFinish={handleSubmitResetPassword}
        >
          <Form.Item label="目标账号">
            <Input disabled value={passwordTargetUser?.username || ''} />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

export default UserManagementPage;
