import { Card, Col, Row, Space, Typography } from 'antd';
import PageContainer from '@/components/PageContainer';

// 工作台首页先只保留最小内容块。
// 这样做是为了先打通后端菜单、前端路由和默认首页链路，后续再逐步替换成真实统计与待办数据。
const quickNotes = [
  '欢迎进入工作台',
  '这里先提供一个稳定的默认首页占位',
  '后续如果要接待办、消息、统计卡片，都可以从这个页面继续扩展',
];

function WorkbenchPage() {
  return (
    <PageContainer
      description="工作台先提供一个轻量首页，确保后端菜单指向该路由时前端有稳定页面可展示。"
      title="工作台"
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space direction="vertical" size={8}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                欢迎使用后台管理系统
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                当前页面是工作台的初始版本，先用于承接登录后的默认落点。
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="初始化说明">
            <Space direction="vertical" size={12}>
              {quickNotes.map((note) => (
                <Typography.Text key={note}>{note}</Typography.Text>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}

export default WorkbenchPage;
