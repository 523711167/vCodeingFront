import { Card, Space, Typography } from 'antd';
import PageContainer from '@/components/PageContainer';

// 流程定义页当前先提供一个稳定的空页面壳子。
// 这样做是为了先把后端菜单、前端动态路由和页面入口打通，后续再在这里接流程定义列表、发布和设计器能力。
const reservedCapabilities = [
  '流程定义列表',
  '流程定义状态切换',
  '版本管理',
  '发布与停用',
];

function ProcessDefinitionPage() {
  return (
    <PageContainer
      description="流程定义页面当前先作为预留入口，后续可直接在这里接流程定义列表、设计器跳转和发布操作。"
      title="流程定义"
    >
      <Card>
        <Space direction="vertical" size={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            流程定义
          </Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            当前页面已创建完成，后续可以在这里继续接入流程定义相关接口和编辑器能力。
          </Typography.Paragraph>
          <Space direction="vertical" size={4}>
            {reservedCapabilities.map((capability) => (
              <Typography.Text key={capability}>{capability}</Typography.Text>
            ))}
          </Space>
        </Space>
      </Card>
    </PageContainer>
  );
}

export default ProcessDefinitionPage;
