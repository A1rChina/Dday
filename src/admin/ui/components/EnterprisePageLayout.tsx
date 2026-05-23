import type { ReactNode } from 'react';
import { Button, Card, Tabs } from 'antd';
import type { TabsProps } from 'antd';

type StatusTabItem = {
  key: string;
  label: string;
  count?: number;
};

interface EnterprisePageLayoutProps {
  children: ReactNode;
}

interface SearchFilterCardProps {
  statusTabs?: ReactNode;
  searchForm?: ReactNode;
  advancedContent?: ReactNode;
}

interface TableActionToolbarProps {
  actions?: ReactNode;
  tools?: ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
}

interface StatusTabsProps {
  items: StatusTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function EnterprisePageLayout({ children }: EnterprisePageLayoutProps) {
  return <div className="enterprise-page-layout">{children}</div>;
}

export function SearchFilterCard({ statusTabs, searchForm, advancedContent }: SearchFilterCardProps) {
  return (
    <Card className="enterprise-filter-card" bordered>
      {statusTabs && <div className="enterprise-filter-status-row">{statusTabs}</div>}
      {searchForm && <div className="enterprise-filter-query-row">{searchForm}</div>}
      <div className={`enterprise-filter-advanced ${advancedContent ? 'is-open' : ''}`}>
        {advancedContent}
      </div>
    </Card>
  );
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="enterprise-table-card" bordered>
      {children}
    </Card>
  );
}

export function TableActionToolbar({ actions, tools, selectedCount = 0, onClearSelection }: TableActionToolbarProps) {
  return (
    <div className="enterprise-table-toolbar">
      <div className="enterprise-table-actions">{actions}</div>
      <div className="enterprise-table-tools">
        <span className="enterprise-selection-count">
          已选 <strong>{selectedCount}</strong> 项
        </span>
        {selectedCount > 0 && onClearSelection && (
          <Button type="link" size="small" onClick={onClearSelection}>
            取消选择
          </Button>
        )}
        {tools}
      </div>
    </div>
  );
}

export function StatusTabs({ items, activeKey, onChange }: StatusTabsProps) {
  const tabItems: TabsProps['items'] = items.map((item) => ({
    key: item.key,
    label: (
      <span>
        {item.label}
        {typeof item.count === 'number' && <span className="enterprise-status-count">({item.count})</span>}
      </span>
    ),
  }));

  return (
    <Tabs
      className="enterprise-status-tabs"
      activeKey={activeKey}
      onChange={onChange}
      items={tabItems}
      tabBarGutter={8}
    />
  );
}
