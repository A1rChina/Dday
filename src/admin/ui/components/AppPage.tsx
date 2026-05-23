import type { CSSProperties, ReactNode } from 'react';

interface AppPageProps {
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * 页面根容器
 * 统一 padding、gap、最大宽度
 */
export function AppPage({ children, style }: AppPageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
