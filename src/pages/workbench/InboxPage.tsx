import { Card, Space, Tag, Typography } from 'antd';
import PageContainer from '@/components/PageContainer';

// 收件箱先把后续常见的三块内容占住：
// 列表、筛选和详情。这样后续接接口时可以直接在原位置替换，不需要重排页面骨架。
const reservedSections = ['待接入收件列表', '待接入筛选条件', '待接入详情抽屉'];

function InboxPage() {
  return (
    <PageContainer
      description="收件箱目前先保留页面壳子，后续对接接口时直接在当前结构里补列表和状态即可。"
      title="收件箱"
    >
      <Card>
        <Space direction="vertical" size={12}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            当前页面是收件箱的预留入口，先用于承接真实菜单和后续接口联调。
          </Typography.Paragraph>
          <Space size={[8, 8]} wrap>
            {reservedSections.map((section) => (
              <Tag color="blue" key={section}>
                {section}
              </Tag>
            ))}
          </Space>
        </Space>
      </Card>
    </PageContainer>
  );
}

export default InboxPage;
