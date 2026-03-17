import { useEffect, useState } from 'react';
import { Card, Col, List, Row, Skeleton, Statistic } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchDashboardOverview, type DashboardOverview } from '@/services/dashboard.service';

const quickEntries = ['新增内容', '创建活动', '分配角色', '查看待办'];
const todoList = ['确认活动物料', '审核待发布内容', '整理周报数据'];

function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    fetchDashboardOverview().then(setOverview);
  }, []);

  return (
    <PageContainer
      description="首版工作台提供核心指标、快捷入口与待处理事项。"
      title="工作台"
    >
      {!overview ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic title="内容总量" value={overview.totalContents} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="在线活动" value={overview.onlineActivities} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待处理事项" value={overview.pendingTasks} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="本周访问量" value={overview.weeklyVisits} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="快捷入口">
              <List dataSource={quickEntries} renderItem={(item) => <List.Item>{item}</List.Item>} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="待处理事项">
              <List dataSource={todoList} renderItem={(item) => <List.Item>{item}</List.Item>} />
            </Card>
          </Col>
        </Row>
      )}
    </PageContainer>
  );
}

export default DashboardPage;
