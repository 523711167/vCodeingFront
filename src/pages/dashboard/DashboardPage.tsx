import { useEffect, useState } from 'react';
import { Card, Col, List, Row, Skeleton, Statistic } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchDashboardOverview, type DashboardOverview } from '@/services/dashboard.service';

// 这两组静态数据是工作台里的辅助信息块。
// 它们不属于核心指标，所以先放在页面文件内做演示占位。
const quickEntries = ['新增内容', '创建活动', '分配角色', '查看待办'];
const todoList = ['确认活动物料', '审核待发布内容', '整理周报数据'];

function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    // 工作台通常在进入页面时立即加载概览数据。
    // 当前数据只服务本页，因此直接用局部 state 即可。
    fetchDashboardOverview().then(setOverview);
  }, []);

  return (
    <PageContainer
      description="首版工作台提供核心指标、快捷入口与待处理事项。"
      title="工作台"
    >
      {!overview ? (
        // 首屏用 Skeleton 占位，提前把卡片布局感知给用户。
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {/* 四张统计卡代表后台首页最常见的“关键指标概览”结构。 */}
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
              {/* 这里先用 List 表达快捷入口区域，后续可替换成图标卡片或跳转按钮。 */}
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
