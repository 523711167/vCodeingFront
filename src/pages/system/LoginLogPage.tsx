import { useEffect, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import PageContainer from '@/components/PageContainer';
import { showErrorMessageOnce } from '@/services/error-message';
import {
  fetchLoginLogDetail,
  fetchLoginLogPage,
  type LoginLogPageQuery,
  type LoginLogPageResult,
  type LoginLogRecord,
} from '@/services/login-log.service';

interface SearchFormValues {
  username?: string;
  result?: string;
  loginAtRange?: [Dayjs, Dayjs];
}

const initialPageQuery: LoginLogPageQuery = {
  pageNum: 1,
  pageSize: 10,
};

const initialPageData: LoginLogPageResult = {
  pageNum: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  records: [],
};

const loginResultOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAIL' },
];

function getLoginResultTagColor(result?: string) {
  return result === 'SUCCESS' ? 'success' : result === 'FAIL' ? 'error' : 'default';
}

function LoginLogPage() {
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [query, setQuery] = useState<LoginLogPageQuery>(initialPageQuery);
  const [pageData, setPageData] = useState<LoginLogPageResult>(initialPageData);
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<LoginLogRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setTableLoading(true);
        const nextPageData = await fetchLoginLogPage(query);

        if (!cancelled) {
          setPageData(nextPageData);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '登录日志列表加载失败');
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const columns = useMemo<ColumnsType<LoginLogRecord>>(
    () => [
      {
        title: '日志ID',
        dataIndex: 'id',
        width: 120,
      },
      {
        title: '登录用户名',
        dataIndex: 'username',
        width: 160,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '登录结果',
        dataIndex: 'resultMsg',
        width: 120,
        render: (_, record) => (
          <Tag color={getLoginResultTagColor(record.result)}>
            {record.resultMsg || record.result || '-'}
          </Tag>
        ),
      },
      {
        title: '失败原因',
        dataIndex: 'failReason',
        ellipsis: true,
        width: 220,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '客户端IP',
        dataIndex: 'clientIp',
        width: 160,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: 'User-Agent',
        dataIndex: 'userAgent',
        ellipsis: true,
        width: 280,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '登录时间',
        dataIndex: 'loginAt',
        width: 180,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              void openDetail(record.id);
            }}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [],
  );

  async function openDetail(id: number) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const nextDetailRecord = await fetchLoginLogDetail(id);
      setDetailRecord(nextDetailRecord);
    } catch (error) {
      setDetailOpen(false);
      setDetailRecord(null);
      showErrorMessageOnce(error, '登录日志详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSearch(values: SearchFormValues) {
    setQuery((previousQuery) => ({
      ...previousQuery,
      username: values.username?.trim() || undefined,
      result: values.result || undefined,
      loginAtStart: values.loginAtRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      loginAtEnd: values.loginAtRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      pageNum: 1,
    }));
  }

  function handleReset() {
    searchForm.resetFields();
    setQuery(initialPageQuery);
  }

  return (
    <PageContainer
      description="登录日志页面已接入后端分页查询和详情接口，方便排查用户登录结果、来源IP和客户端信息。"
      title="登录日志"
    >
      <Form<SearchFormValues> form={searchForm} layout="inline" onFinish={handleSearch}>
        <Form.Item label="登录用户名" name="username">
          <Input allowClear placeholder="请输入登录用户名" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item label="登录结果" name="result">
          <Select
            allowClear
            options={loginResultOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            placeholder="请选择登录结果"
            style={{ width: 160 }}
          />
        </Form.Item>
        <Form.Item label="登录时间" name="loginAtRange">
          <DatePicker.RangePicker
            showTime
            style={{ width: 360 }}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit" type="primary">
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 登录日志页直接消费后端 page 返回值，
          这样后续如果补导出、清理或更多筛选条件，不需要改动列表和分页主干结构。 */}
      <Table<LoginLogRecord>
        columns={columns}
        dataSource={pageData.records}
        loading={tableLoading}
        pagination={{
          current: pageData.pageNum,
          pageSize: pageData.pageSize,
          showSizeChanger: true,
          total: pageData.total,
          onChange: (pageNum, pageSize) => {
            setQuery((previousQuery) => ({
              ...previousQuery,
              pageNum,
              pageSize,
            }));
          },
        }}
        rowKey="id"
        scroll={{ x: 1500 }}
        style={{ marginTop: 16 }}
      />

      <Drawer
        destroyOnClose
        loading={detailLoading}
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        open={detailOpen}
        title="登录日志详情"
        width={720}
      >
        <Descriptions
          column={2}
          items={[
            {
              key: 'id',
              label: '日志ID',
              children: detailRecord?.id ?? '-',
            },
            {
              key: 'userId',
              label: '用户ID',
              children: detailRecord?.userId ?? '-',
            },
            {
              key: 'username',
              label: '登录用户名',
              children: detailRecord?.username || '-',
            },
            {
              key: 'result',
              label: '登录结果',
              children: detailRecord?.resultMsg || detailRecord?.result || '-',
            },
            {
              key: 'failReason',
              label: '失败原因',
              children: detailRecord?.failReason || '-',
            },
            {
              key: 'clientIp',
              label: '客户端IP',
              children: detailRecord?.clientIp || '-',
            },
            {
              key: 'loginAt',
              label: '登录发生时间',
              children: detailRecord?.loginAt || '-',
            },
            {
              key: 'createdAt',
              label: '创建时间',
              children: detailRecord?.createdAt || '-',
            },
            {
              key: 'userAgent',
              label: 'User-Agent',
              children: detailRecord?.userAgent || '-',
            },
          ]}
        />
      </Drawer>
    </PageContainer>
  );
}

export default LoginLogPage;
