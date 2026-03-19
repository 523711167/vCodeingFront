import type { PropsWithChildren, ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';

interface PageContainerProps extends PropsWithChildren {
  title: string;
  description?: string;
  extra?: ReactNode;
}

function PageContainer({
  title,
  description,
  extra,
  children,
}: PageContainerProps) {
  return (
    // PageContainer 统一了页面标题区和内容卡片外壳。
    // 这样列表页、表单页、详情页至少在第一层视觉结构上保持一致。
    <Space className="page-container" direction="vertical" size={16}>
      <div className="page-container__header">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          {description && (
            <Typography.Paragraph type="secondary">
              {description}
            </Typography.Paragraph>
          )}
        </div>
      </div>
      {/* 页面操作按钮放进白色卡片内部，是为了让“查询区 + 新增按钮 + 表格区”形成同一块业务区域。 */}
      <Card>
        {extra && <div className="page-container__card-extra">{extra}</div>}
        {children}
      </Card>
    </Space>
  );
}

export default PageContainer;
