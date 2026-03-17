import { useEffect, useState } from 'react';
import type { DataNode } from 'antd/es/tree';
import { Card, Tree } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchMenuTree, type MenuRecord } from '@/services/menu.service';

function toTreeData(nodes: MenuRecord[]): DataNode[] {
  // Tree 组件消费的是 antd 自己的 DataNode 结构，
  // 所以这里做一层轻量映射，避免 UI 组件直接绑定 service 返回类型。
  return nodes.map((node) => ({
    key: node.key,
    title: node.title,
    children: node.children ? toTreeData(node.children) : undefined,
  }));
}

function MenuManagementPage() {
  const [data, setData] = useState<MenuRecord[]>([]);

  useEffect(() => {
    fetchMenuTree().then(setData);
  }, []);

  return (
    <PageContainer title="菜单权限">
      <Card>
        {/* 菜单树默认展开，便于在中后台场景下快速检查整棵权限结构。 */}
        <Tree defaultExpandAll treeData={toTreeData(data)} />
      </Card>
    </PageContainer>
  );
}

export default MenuManagementPage;
