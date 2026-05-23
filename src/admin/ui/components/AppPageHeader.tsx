import type { ReactNode } from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

interface AppPageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
}

/**
 * 页面头部
 * 白色卡片 · 标题 + 说明 + 右侧操作区
 */
export function AppPageHeader({ title, description, extra }: AppPageHeaderProps) {
  return (
    <div className="app-page-header">
      <div style={{ minWidth: 0 }}>
        <Title level={4} style={{ margin: 0, fontSize: 18, lineHeight: 1.4 }}>
          {title}
        </Title>
        {description && (
          <Text type="secondary" style={{ fontSize: 13, marginTop: 2, display: 'block' }}>
            {description}
          </Text>
        )}
      </div>
      {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
    </div>
  );
}
