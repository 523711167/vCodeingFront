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
        {extra}
      </div>
      <Card>{children}</Card>
    </Space>
  );
}

export default PageContainer;
