import { type Key, useEffect, useMemo, useState } from 'react';
import type { DataNode } from 'antd/es/tree';
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Tree,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import {
  fetchDeptDetail,
  fetchDeptTree,
  type DeptRecord,
  type DeptTreeQuery,
  type DeptTreeRecord,
} from '@/services/dept.service';

const isDeptMock = import.meta.env.VITE_USE_DEPT_MOCK
  ? import.meta.env.VITE_USE_DEPT_MOCK !== 'false'
  : import.meta.env.VITE_USE_USER_MOCK
    ? import.meta.env.VITE_USE_USER_MOCK !== 'false'
    : import.meta.env.VITE_USE_MOCK !== 'false';

interface SearchFormValues {
  name?: string;
  status?: number;
}

function getStatusTagColor(status: number) {
  return status === 1 ? 'green' : 'default';
}

function toTreeData(nodes: DeptTreeRecord[]): DataNode[] {
  // Tree 组件只消费 DataNode，所以页面层在这里做一次映射，
  // 让 service 继续保持后端语义，后续接拖拽排序时也更容易复用原始字段。
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    children: node.children ? toTreeData(node.children) : undefined,
  }));
}

function DeptManagementPage() {
  const { message } = AntdApp.useApp();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [query, setQuery] = useState<DeptTreeQuery>({});
  const [treeLoading, setTreeLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [treeData, setTreeData] = useState<DeptTreeRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [detail, setDetail] = useState<DeptRecord | null>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setTreeLoading(true);
        const nextTreeData = await fetchDeptTree(query);

        if (!canceled) {
          setTreeData(nextTreeData);
        }
      } catch (error) {
        if (!canceled && isDeptMock && error instanceof Error) {
          message.error(error.message);
        }
      } finally {
        if (!canceled) {
          setTreeLoading(false);
        }
      }
    }

    void run();

    return () => {
      canceled = true;
    };
  }, [message, query]);

  async function handleSelectDept(keys: Key[]) {
    const selectedId = Number(keys[0]);

    setSelectedKeys(keys);

    if (!selectedId) {
      setDetail(null);
      return;
    }

    try {
      setDetailLoading(true);
      const nextDetail = await fetchDeptDetail(selectedId);
      setDetail(nextDetail);
    } catch (error) {
      if (isDeptMock && error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  const treeNodes = useMemo(() => toTreeData(treeData), [treeData]);

  return (
    <PageContainer
      description="组织管理作为一级模块独立展示，当前支持组织树查询和详情查看，后续新增、修改、移动都从这里继续扩展。"
      title="组织维护"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card>
          <Form<SearchFormValues>
            form={searchForm}
            layout="inline"
            onFinish={(values) => {
              setQuery({
                name: values.name?.trim() || undefined,
                status: values.status,
              });
            }}
          >
            <Form.Item label="组织名称" name="name">
              <Input allowClear placeholder="请输入组织名称" />
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
                  htmlType="button"
                  onClick={() => {
                    searchForm.resetFields();
                    setQuery({});
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Space align="start" size={16} style={{ width: '100%' }}>
          <Card style={{ flex: 1, minHeight: 480 }} title="组织树">
            <Spin spinning={treeLoading}>
              {treeNodes.length ? (
                <Tree
                  defaultExpandAll
                  onSelect={(keys) => void handleSelectDept(keys)}
                  selectedKeys={selectedKeys}
                  treeData={treeNodes}
                />
              ) : (
                <Empty description="暂无组织数据" />
              )}
            </Spin>
          </Card>

          <Card style={{ flex: 1, minHeight: 480 }} title="组织详情">
            <Spin spinning={detailLoading}>
              {detail ? (
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="组织名称">{detail.name}</Descriptions.Item>
                  <Descriptions.Item label="组织编码">
                    {detail.code || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={getStatusTagColor(detail.status)}>
                      {detail.statusMsg}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="组织路径">
                    {detail.path || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="层级">
                    {detail.level ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="排序">
                    {detail.sortOrder ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="主管">
                    {detail.leaderName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {detail.createdAt || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {detail.updatedAt || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="请选择左侧组织节点" />
              )}
            </Spin>
          </Card>
        </Space>
      </Space>
    </PageContainer>
  );
}

export default DeptManagementPage;
