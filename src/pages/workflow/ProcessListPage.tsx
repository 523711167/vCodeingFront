import { Card, Space, Typography } from 'antd';
import PageContainer from '@/components/PageContainer';

// 流程列表页先保留最小占位结构。
// 这样后续接流程分页、筛选和状态展示时，可以直接在当前页面扩展，不需要再补菜单承接页。
const reservedCapabilities = [
  '流程列表查询',
  '流程状态展示',
  '流程分类筛选',
  '流程详情跳转',
];

function ProcessListPage() {
  return (
    <PageContainer
      description="流程列表页面当前先作为预留入口，后续可直接在这里接流程分页查询、筛选和跳转能力。"
      title="流程列表"
    >
      <Card>
        <Space direction="vertical" size={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            流程列表
          </Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            当前页面已创建完成，后续可以在这里继续接入流程列表、筛选条件和详情跳转。
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

export default ProcessListPage;
