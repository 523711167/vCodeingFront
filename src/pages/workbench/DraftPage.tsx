import { Card, Descriptions } from 'antd';
import PageContainer from '@/components/PageContainer';

// 草稿箱初始化页先把后续最常见的三块能力占住：
// 草稿列表、草稿筛选和草稿恢复编辑。
// 这样后端菜单一旦指向这个组件，前端就已经有稳定入口，后续再逐步替换成真实数据流。
const draftPlaceholders = [
  {
    key: '草稿列表',
    value: '后续接入业务申请草稿分页列表',
  },
  {
    key: '筛选条件',
    value: '后续接入按标题、状态、时间等条件查询',
  },
  {
    key: '继续编辑',
    value: '后续接入点击草稿后回到业务办理页继续录入',
  },
];

function DraftPage() {
  return (
    <PageContainer
      description="草稿箱先提供一个最小可用页面，便于后端菜单和前端路由先打通。"
      title="草稿箱"
    >
      <Card>
        <Descriptions
          column={1}
          items={draftPlaceholders.map((item) => ({
            key: item.key,
            label: item.key,
            children: item.value,
          }))}
        />
      </Card>
    </PageContainer>
  );
}

export default DraftPage;
