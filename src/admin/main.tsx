import React from 'react';
import { createRoot } from 'react-dom/client';
import { Refine } from '@refinedev/core';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import '@refinedev/antd/dist/reset.css';
import 'antd/dist/reset.css';
import { dataProvider } from './resourceDataProvider';
import { authProvider } from './authProvider';
import { AdminApp } from './ui/AdminApp';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#111827',
          colorBgLayout: '#f6f7f9',
          colorBorderSecondary: '#e5e7eb',
          fontSize: 13,
          controlHeight: 34,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#374151',
            headerSplitColor: '#e5e7eb',
            rowHoverBg: '#f1f5f9',
            borderColor: '#e5e7eb',
            cellPaddingBlockMD: 10,
            cellPaddingInlineMD: 12,
            headerBorderRadius: 0,
          },
          Form: {
            itemMarginBottom: 16,
          },
          Card: {
            paddingLG: 16,
          },
        },
      }}
    >
      <AntdApp>
        <Refine
          dataProvider={dataProvider('/api')}
          authProvider={authProvider}
          resources={[
            { name: 'customers', list: '/customers' },
            { name: 'profile-suppliers', list: '/profile-suppliers' },
            { name: 'manufacturing-factories', list: '/manufacturing-factories' },
            { name: 'materials', list: '/materials' },
            { name: 'products', list: '/products' },
            { name: 'projects', list: '/projects' },
            { name: 'orders', list: '/orders' },
            { name: 'production-plans', list: '/production-plans' },
            { name: 'work-orders', list: '/work-orders' },
            { name: 'reporting-cards', list: '/reporting/cards' },
            { name: 'operation-reports', list: '/reporting/reports' },
            { name: 'work-resources', list: '/work-resources' },
            { name: 'inventory-balances', list: '/inventory-balances' },
            { name: 'inventory-locks', list: '/inventory-locks' },
            { name: 'inventory-transactions', list: '/inventory-transactions' },
            { name: 'delivery-plans', list: '/delivery-plans' },
            { name: 'material-delivery-plans', list: '/material-delivery-plans' },
            { name: 'warehouse-receipts', list: '/warehouse-receipts' },
            { name: 'quality-issues', list: '/quality-issues' },
            { name: 'receipts', list: '/receipts' },
            { name: 'users', list: '/users' },
            { name: 'roles', list: '/roles' },
            { name: 'permissions', list: '/permissions' },
          ]}
          options={{ syncWithLocation: false, warnWhenUnsavedChanges: false }}
        >
          <AdminApp />
        </Refine>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
