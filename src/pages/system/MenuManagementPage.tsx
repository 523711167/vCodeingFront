import { useEffect, useMemo, useState } from 'react';
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
import {
  AlertOutlined,
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarsOutlined,
  BarChartOutlined,
  BookOutlined,
  BuildOutlined,
  CalendarOutlined,
  CloudOutlined,
  ClusterOutlined,
  ControlOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  DeploymentUnitOutlined,
  FileOutlined,
  FormOutlined,
  InboxOutlined,
  LockOutlined,
  MailOutlined,
  NotificationOutlined,
  PieChartOutlined,
  ProfileOutlined,
  ProjectOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  SlidersOutlined,
  SolutionOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import PermissionButton from '@/components/PermissionButton';
import {
  MENU_ICON_OPTIONS,
  MENU_TYPE_OPTIONS,
  VISIBLE_STATUS_OPTIONS,
  getMenuTypeLabel,
} from '@/constants/select-options';
import {
  createMenu,
  deleteMenus,
  fetchMenuDetail,
  fetchMenuTree,
  updateMenu,
  type CreateMenuPayload,
  type DeleteMenusPayload,
  type MenuRecord,
  type MenuTreeQuery,
  type UpdateMenuPayload,
} from '@/services/menu.service';
import { showErrorMessageOnce } from '@/services/error-message';

interface SearchFormValues {
  name?: string;
  type?: number;
  visible?: number;
}

interface MenuFormValues {
  parentId?: number;
  type: number;
  name: string;
  permission?: string;
  path?: string;
  component?: string;
  icon?: string;
  sortOrder?: number;
  visible: 0 | 1;
  status: 0 | 1;
}

interface TreeSelectOption {
  title: string;
  value: number;
  disabled?: boolean;
  children?: TreeSelectOption[];
}

const initialQuery: MenuTreeQuery = {};

const menuIconMap = {
  alert: <AlertOutlined />,
  apartment: <ApartmentOutlined />,
  api: <ApiOutlined />,
  appstore: <AppstoreOutlined />,
  audit: <AuditOutlined />,
  barchart: <BarChartOutlined />,
  bars: <BarsOutlined />,
  book: <BookOutlined />,
  build: <BuildOutlined />,
  calendar: <CalendarOutlined />,
  cloud: <CloudOutlined />,
  cluster: <ClusterOutlined />,
  control: <ControlOutlined />,
  dashboard: <DashboardOutlined />,
  database: <DatabaseOutlined />,
  desktop: <DesktopOutlined />,
  deployment: <DeploymentUnitOutlined />,
  file: <FileOutlined />,
  form: <FormOutlined />,
  // 这组三个业务语义图标给“收件箱 / 代办箱 / 查询箱”复用，
  // 页面预览和菜单实际渲染共用同一组稳定 key，避免保存值和展示值不一致。
  inbox: <InboxOutlined />,
  lock: <LockOutlined />,
  mail: <MailOutlined />,
  notification: <NotificationOutlined />,
  piechart: <PieChartOutlined />,
  profile: <ProfileOutlined />,
  project: <ProjectOutlined />,
  read: <ReadOutlined />,
  safety: <SafetyCertificateOutlined />,
  schedule: <ScheduleOutlined />,
  search: <SearchOutlined />,
  setting: <SettingOutlined />,
  shop: <ShopOutlined />,
  sliders: <SlidersOutlined />,
  solution: <SolutionOutlined />,
  tag: <TagOutlined />,
  team: <TeamOutlined />,
  tool: <ToolOutlined />,
  unordered: <UnorderedListOutlined />,
  user: <UserOutlined />,
} as const;

function getVisibleTagColor(visible: number) {
  return visible === 1 ? 'blue' : 'default';
}

function getMenuTypeTagColor(type: number) {
  // 菜单类型在树表格里需要快速区分“目录 / 菜单 / 按钮”，
  // 这里直接映射成稳定的标签色，后续如果新增类型也只需要补这里。
  switch (type) {
    case 1:
      return 'purple';
    case 2:
      return 'processing';
    case 3:
      return 'orange';
    default:
      return 'default';
  }
}

function flattenMenuTree(nodes: MenuRecord[]): MenuRecord[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenMenuTree(node.children ?? []),
  ]);
}

function collectDescendantIds(nodes: MenuRecord[], targetId: number): number[] {
  for (const node of nodes) {
    if (node.id === targetId) {
      return flattenMenuTree(node.children ?? []).map((child) => child.id);
    }

    if (node.children?.length) {
      const descendantIds = collectDescendantIds(node.children, targetId);

      if (descendantIds.length) {
        return descendantIds;
      }
    }
  }

  return [];
}

function buildParentMenuOptions(
  nodes: MenuRecord[],
  disabledIds: Set<number>,
): TreeSelectOption[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    disabled: disabledIds.has(node.id),
    children: node.children
      ? buildParentMenuOptions(node.children, disabledIds)
      : undefined,
  }));
}

function MenuManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [menuForm] = Form.useForm<MenuFormValues>();
  const [query, setQuery] = useState<MenuTreeQuery>(initialQuery);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [menuTreeData, setMenuTreeData] = useState<MenuRecord[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MenuRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const selectedIcon = Form.useWatch('icon', menuForm);
  const menuNameMap = useMemo(
    () => new Map(flattenMenuTree(menuTreeData).map((menu) => [menu.id, menu.name] as const)),
    [menuTreeData],
  );
  const disabledParentIds = useMemo(() => {
    if (!editingMenuId) {
      return new Set<number>();
    }

    return new Set<number>([
      editingMenuId,
      ...collectDescendantIds(menuTreeData, editingMenuId),
    ]);
  }, [editingMenuId, menuTreeData]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextTree = await fetchMenuTree(query);

        if (!canceled) {
          setMenuTreeData(nextTree);
          // 菜单树默认保持收起，不再像组织树那样自动展开全部节点。
          // 如果用户已经手动展开过一部分节点，这里只保留仍然存在的展开项，避免刷新后状态丢失。
          setExpandedRowKeys((previousExpandedRowKeys) => {
            const nextMenuIdSet = new Set(flattenMenuTree(nextTree).map((menu) => menu.id));

            return previousExpandedRowKeys.filter((menuId) => nextMenuIdSet.has(menuId));
          });
        }
      } catch (error) {
        if (!canceled) {
          showErrorMessageOnce(error, '菜单列表加载失败');
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

  function triggerReload() {
    setReloadVersion((previousVersion) => previousVersion + 1);
  }

  async function loadDetail(menuId: number, openDrawer = true) {
    try {
      setDetailLoading(true);
      const detail = await fetchMenuDetail(menuId);
      setDetailRecord(detail);

      if (openDrawer) {
        setDetailOpen(true);
      }
    } catch (error) {
      showErrorMessageOnce(error, '菜单详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreateModal(parentId?: number) {
    setEditingMenuId(null);
    menuForm.resetFields();
    menuForm.setFieldsValue({
      parentId,
      type: 2,
      visible: 1,
      status: 1,
      sortOrder: 1,
    });
    setEditorOpen(true);
  }

  async function openEditModal(menuId: number) {
    try {
      setEditorLoading(true);
      const detail = await fetchMenuDetail(menuId);

      setEditingMenuId(menuId);
      menuForm.setFieldsValue({
        parentId: detail.parentId || undefined,
        type: detail.type,
        name: detail.name,
        permission: detail.permission,
        path: detail.path,
        component: detail.component,
        icon: detail.icon,
        sortOrder: detail.sortOrder,
        visible: detail.visible,
        status: detail.status,
      });
      setEditorOpen(true);
    } catch (error) {
      showErrorMessageOnce(error, '菜单详情加载失败');
    } finally {
      setEditorLoading(false);
    }
  }

  async function handleSubmitMenuForm(values: MenuFormValues) {
    try {
      setEditorSubmitting(true);

      if (editingMenuId) {
        const payload: UpdateMenuPayload = {
          id: editingMenuId,
          parentId: values.parentId,
          type: values.type as 1 | 2 | 3,
          name: values.name.trim(),
          permission: values.permission?.trim() || undefined,
          path: values.path?.trim() || undefined,
          component: values.component?.trim() || undefined,
          icon: values.icon?.trim() || undefined,
          sortOrder: values.sortOrder,
          visible: values.visible,
          status: values.status,
        };

        await updateMenu(payload);
        message.success('菜单修改成功');
      } else {
        const payload: CreateMenuPayload = {
          parentId: values.parentId,
          type: values.type as 1 | 2 | 3,
          name: values.name.trim(),
          permission: values.permission?.trim() || undefined,
          path: values.path?.trim() || undefined,
          component: values.component?.trim() || undefined,
          icon: values.icon?.trim() || undefined,
          sortOrder: values.sortOrder,
          visible: values.visible,
          status: values.status,
        };

        await createMenu(payload);
        message.success('菜单新增成功');
      }

      setEditorOpen(false);
      setEditingMenuId(null);
      menuForm.resetFields();
      triggerReload();
    } catch (error) {
      showErrorMessageOnce(error, editingMenuId ? '菜单修改失败' : '菜单新增失败');
    } finally {
      setEditorSubmitting(false);
    }
  }

  async function handleDeleteMenu(record: MenuRecord) {
    if (record.children?.length) {
      message.warning('存在下级菜单，不能直接删除，请先处理下级节点');
      return;
    }

    modal.confirm({
      content: `删除后无法恢复，菜单 ${record.name} 将被永久移除。`,
      okButtonProps: {
        danger: true,
      },
      okText: '确认删除',
      title: '确认删除该菜单？',
      onOk: async () => {
        try {
          await deleteMenus({
            id: record.id,
          } satisfies DeleteMenusPayload);
          message.success('菜单删除成功');

          if (detailRecord?.id === record.id) {
            setDetailOpen(false);
            setDetailRecord(null);
          }

          triggerReload();
        } catch (error) {
          showErrorMessageOnce(error, '菜单删除失败');
        }
      },
    });
  }

  const columns: ColumnsType<MenuRecord> = [
    {
      dataIndex: 'name',
      title: '名称',
      width: 220,
    },
    {
      dataIndex: 'typeMsg',
      title: '类型',
      render: (_, record) => (
        <Tag color={getMenuTypeTagColor(record.type)}>
          {record.typeMsg || getMenuTypeLabel(record.type)}
        </Tag>
      ),
      width: 100,
    },
    {
      dataIndex: 'path',
      title: '路由地址',
      render: (path?: string) => path || '-',
      width: 220,
    },
    {
      dataIndex: 'component',
      title: '前端组件',
      render: (component?: string) => component || '-',
      width: 240,
    },
    {
      dataIndex: 'permission',
      title: '权限标识',
      render: (permission?: string) => permission || '-',
      width: 220,
    },
    {
      dataIndex: 'visibleMsg',
      title: '显示',
      render: (_, record) => (
        <Tag color={getVisibleTagColor(record.visible)}>{record.visibleMsg}</Tag>
      ),
      width: 100,
    },
    {
      dataIndex: 'sortOrder',
      title: '排序',
      render: (sortOrder?: number) => sortOrder ?? '-',
      width: 90,
    },
    {
      key: 'action',
      title: '操作',
      width: 320,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button onClick={() => void loadDetail(record.id)} size="small" type="link">
            详情
          </Button>
          <PermissionButton
            onClick={() => openCreateModal(record.id)}
            permissionCode="system:menu:edit"
            size="small"
            type="link"
          >
            新增下级
          </PermissionButton>
          <PermissionButton
            onClick={() => void openEditModal(record.id)}
            permissionCode="system:menu:edit"
            size="small"
            type="link"
          >
            编辑
          </PermissionButton>
          <PermissionButton
            danger
            onClick={() => void handleDeleteMenu(record)}
            permissionCode="system:menu:edit"
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
      description="菜单管理页当前已对接真实菜单接口，支持树查询、详情、新增、修改和删除。"
      title="菜单管理"
    >
      <Space className="toolbar" direction="vertical" size={16}>
        <div className="management-toolbar">
          <Form<SearchFormValues>
            className="management-toolbar__form"
            form={searchForm}
            layout="inline"
            onFinish={(values) => {
              setQuery({
                name: values.name?.trim() || undefined,
                type: values.type as 1 | 2 | 3 | undefined,
                visible: values.visible as 0 | 1 | undefined,
              });
            }}
          >
            <Form.Item label="名称" name="name">
              <Input allowClear placeholder="请输入菜单名称" />
            </Form.Item>
            <Form.Item label="类型" name="type">
              <Select
                allowClear
                options={MENU_TYPE_OPTIONS}
                placeholder="请选择类型"
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item label="显示" name="visible">
              <Select
                allowClear
                options={VISIBLE_STATUS_OPTIONS}
                placeholder="请选择显示状态"
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
                    setQuery(initialQuery);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <PermissionButton
            onClick={() => openCreateModal()}
            permissionCode="system:menu:edit"
            type="primary"
          >
            新增菜单
          </PermissionButton>
        </div>

        <Table
          columns={columns}
          dataSource={menuTreeData}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as number[]),
          }}
          loading={tableLoading}
          pagination={false}
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
        title="菜单详情"
        width={680}
      >
        {detailRecord && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="上级菜单">
              {detailRecord.parentId ? menuNameMap.get(detailRecord.parentId) || detailRecord.parentId : '顶级菜单'}
            </Descriptions.Item>
            <Descriptions.Item label="菜单名称">{detailRecord.name}</Descriptions.Item>
            <Descriptions.Item label="菜单类型">
              {detailRecord.typeMsg || getMenuTypeLabel(detailRecord.type)}
            </Descriptions.Item>
            <Descriptions.Item label="路由地址">
              {detailRecord.path || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="前端组件">
              {detailRecord.component || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="权限标识">
              {detailRecord.permission || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="图标标识">
              {detailRecord.icon || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="显示状态">
              <Tag color={getVisibleTagColor(detailRecord.visible)}>
                {detailRecord.visibleMsg}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="排序值">
              {detailRecord.sortOrder ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailRecord.createdAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        confirmLoading={editorSubmitting}
        destroyOnHidden
        onCancel={() => {
          setEditorOpen(false);
          setEditingMenuId(null);
          menuForm.resetFields();
        }}
        okButtonProps={{
          loading: editorSubmitting,
        }}
        onOk={() => void menuForm.submit()}
        open={editorOpen}
        title={editingMenuId ? '编辑菜单' : '新增菜单'}
      >
        <Form<MenuFormValues>
          form={menuForm}
          initialValues={{
            type: 2,
            visible: 1,
            status: 1,
            sortOrder: 1,
          }}
          layout="vertical"
          onFinish={(values) => void handleSubmitMenuForm(values)}
        >
          <Form.Item label="上级菜单" name="parentId">
            <TreeSelect
              allowClear
              placeholder="顶级菜单可不选"
              style={{ width: '100%' }}
              treeData={buildParentMenuOptions(menuTreeData, disabledParentIds)}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item
            label="菜单类型"
            name="type"
            rules={[{ required: true, message: '请选择菜单类型' }]}
          >
            <Select options={MENU_TYPE_OPTIONS} placeholder="请选择菜单类型" />
          </Form.Item>
          <Form.Item
            label="菜单名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入菜单名称' }]}
          >
            <Input maxLength={64} placeholder="请输入菜单名称" />
          </Form.Item>
          <Form.Item label="权限标识" name="permission">
            <Input maxLength={128} placeholder="请输入权限标识" />
          </Form.Item>
          <Form.Item label="路由地址" name="path">
            <Input maxLength={256} placeholder="请输入路由地址" />
          </Form.Item>
          <Form.Item label="前端组件" name="component">
            <Input maxLength={256} placeholder="请输入前端组件路径" />
          </Form.Item>
          <Form.Item label="图标标识" name="icon">
            <Select
              allowClear
              optionFilterProp="label"
              options={MENU_ICON_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              optionRender={(option) => {
                const optionValue = String(option.value);

                return (
                  <Space>
                    {menuIconMap[optionValue as keyof typeof menuIconMap]}
                    <span>{option.label}</span>
                    <Tag>{optionValue}</Tag>
                  </Space>
                );
              }}
              placeholder="请选择图标标识"
              showSearch
            />
          </Form.Item>
          {selectedIcon && (
            <Form.Item label="图标预览">
              <Space>
                {menuIconMap[selectedIcon as keyof typeof menuIconMap]}
                <Tag>{selectedIcon}</Tag>
              </Space>
            </Form.Item>
          )}
          <Form.Item label="排序值" name="sortOrder">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="是否显示"
            name="visible"
            rules={[{ required: true, message: '请选择显示状态' }]}
          >
            <Select options={VISIBLE_STATUS_OPTIONS} placeholder="请选择显示状态" />
          </Form.Item>
          <Form.Item hidden name="status">
            <Input />
          </Form.Item>
          {editorLoading && <Tag color="processing">正在加载菜单详情，请稍候</Tag>}
        </Form>
      </Modal>
    </PageContainer>
  );
}

export default MenuManagementPage;
