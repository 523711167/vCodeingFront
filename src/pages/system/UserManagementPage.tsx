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
import PermissionButton from '@/components/PermissionButton';
import {
  createUser,
  deleteUsers,
  fetchUserDetail,
  fetchUserPage,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type CreateUserPayload,
  type UpdateUserPayload,
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

function formatDeptNames(record: UserRecord) {
  return record.depts.length
    ? record.depts
        .map((dept) => `${dept.name}${dept.isPrimary === 1 ? '（主）' : ''}`)
        .join('、')
    : '-';
}

function UserManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [userForm] = Form.useForm<UserFormValues>();
  const [passwordForm] = Form.useForm<ResetPasswordFormValues>();
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
      width: 360,
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
      description="账号管理页当前已对接真实用户接口，支持分页查询、详情、新增、修改、状态切换、密码重置和删除。"
      extra={
        <PermissionButton
          onClick={() => void openCreateModal()}
          permissionCode="system:user:create"
          type="primary"
        >
          新增用户
        </PermissionButton>
      }
      title="账号管理"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <Form<SearchFormValues>
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
              {formatDeptNames(detailRecord)}
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
