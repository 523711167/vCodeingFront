import { useEffect, useState } from 'react';
import type { DataNode } from 'antd/es/tree';
import { Card, Tree } from 'antd';
import PageContainer from '@/components/PageContainer';
import { fetchMenuTree, type MenuRecord } from '@/services/menu.service';

function toTreeData(nodes: MenuRecord[]): DataNode[] {
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
        <Tree defaultExpandAll treeData={toTreeData(data)} />
      </Card>
    </PageContainer>
  );
}

export default MenuManagementPage;
