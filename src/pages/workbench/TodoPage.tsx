import { Card, List, Typography } from 'antd';
import PageContainer from '@/components/PageContainer';

// 代办箱通常会从“列表 + 操作”开始演进，
// 这里先用静态条目占住结构，避免后续联调时还要先补路由页壳子。
const placeholderTodos = [
  '待办列表接口预留',
  '批量处理动作预留',
  '待办详情联动预留',
];

function TodoPage() {
  return (
    <PageContainer
      description="代办箱先保留基础页面，后续接入待办数据流时不需要再补路由和菜单配置。"
      title="代办箱"
    >
      <Card>
        <Typography.Paragraph>
          当前页面只负责占住代办箱入口，后续可以直接在这里扩展列表、筛选和处理动作。
        </Typography.Paragraph>
        <List
          bordered
          dataSource={placeholderTodos}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </PageContainer>
  );
}

export default TodoPage;
