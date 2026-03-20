import { Card, Descriptions } from 'antd';
import PageContainer from '@/components/PageContainer';

// 查询箱当前先展示“查询输入、结果列表、结果详情”三个预留位，
// 这样后续接搜索接口时可以直接把占位值替换成真实组件。
const queryPlaceholders = [
  {
    key: '查询条件',
    value: '后续接入查询表单',
  },
  {
    key: '查询结果',
    value: '后续接入结果列表',
  },
  {
    key: '结果详情',
    value: '后续接入详情面板',
  },
];

function QueryPage() {
  return (
    <PageContainer
      description="查询箱页面先提供基础容器，后续接入检索接口时直接替换占位内容即可。"
      title="查询箱"
    >
      <Card>
        <Descriptions
          column={1}
          items={queryPlaceholders.map((item) => ({
            key: item.key,
            label: item.key,
            children: item.value,
          }))}
        />
      </Card>
    </PageContainer>
  );
}

export default QueryPage;
