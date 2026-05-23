import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';

const { Text } = Typography;

interface AppToolbarProps {
  children: ReactNode;
  selectedCount?: number;
  selectionTip?: string;
  onClearSelection?: () => void;
}

/**
 * 操作工具栏
 * 浅灰背景条 · 左侧按钮组 · 右侧选中状态提示
 */
export function AppToolbar({ children, selectedCount = 0, selectionTip, onClearSelection }: AppToolbarProps) {
  return (
    <div className="app-toolbar">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {children}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        {selectedCount > 0 ? (
          <>
            <Text type="secondary" style={{ fontSize: 13 }}>
              已选择 <Text strong style={{ color: '#111827' }}>{selectedCount}</Text> 项
            </Text>
            {onClearSelection && (
              <Button type="link" size="small" onClick={onClearSelection} style={{ padding: 0, height: 'auto', fontSize: 13 }}>
                取消选择
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {selectionTip || '请在表格中选择数据'}
          </Text>
        )}
      </div>
    </div>
  );
}
