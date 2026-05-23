import { useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProTableProps, ActionType } from '@ant-design/pro-components';
import { Empty, Spin } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

// Default pagination config
const defaultPagination = {
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  size: 'small' as const,
  pageSizeOptions: ['10', '20', '50', '100'],
};

/**
 * AppProTable — 统一表格组件
 *
 * 封装 ProTable，预置所有样式与行为默认值。
 * 页面只需传 columns + dataSource/request 即可。
 *
 * 禁用了 ProTable 自带的 toolbar / search / options 等功能，
 * 这些由外部的 AppPageHeader / AppToolbar / AppSearchForm 统一处理。
 */
export function AppProTable<T extends Record<string, any>>(
  props: ProTableProps<T, any> & { className?: string }
) {
  const actionRef = useRef<ActionType>();

  const {
    pagination,
    search,
    options,
    toolBarRender,
    cardBordered,
    className,
    rowKey = 'id',
    size = 'middle',
    tableLayout = 'fixed',
    ...rest
  } = props;

  return (
    <div className={`app-pro-table-card ${className || ''}`}>
      <ProTable<T>
        actionRef={actionRef}
        rowKey={rowKey}
        size={size}
        tableLayout={tableLayout}
        // Disable ProTable's built-in features — we use our own components
        search={search ?? false}
        options={options ?? false}
        toolBarRender={toolBarRender ?? false}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        sticky
        cardBordered={false}
        cardProps={{ bodyStyle: { padding: 0 }, style: { boxShadow: 'none' } }}
        // Pagination
        pagination={
          pagination === false
            ? false
            : { ...defaultPagination, ...(typeof pagination === 'object' ? pagination : {}) }
        }
        // Default column behavior
        columnsState={{ persistenceType: undefined } as any}
        // Empty state
        locale={{
          emptyText: (
            <Empty
              image={<InboxOutlined style={{ fontSize: 40, color: '#d1d5db' }} />}
              description="暂无数据"
              style={{ padding: '32px 0' }}
            />
          ),
        }}
        // Loading
        loading={
          typeof rest.loading === 'boolean'
            ? {
                spinning: rest.loading,
                indicator: <Spin />,
              }
            : rest.loading
        }
        {...rest}
      />
    </div>
  );
}
