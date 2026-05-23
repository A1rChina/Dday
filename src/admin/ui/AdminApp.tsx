import { useMemo, useState } from 'react';
import { App, Button, Dropdown, Layout, Menu, Space, Typography, Spin, Drawer, Badge } from 'antd';
import {
  BarcodeOutlined,
  CheckCircleOutlined,
  DropboxOutlined,
  PartitionOutlined,
  ProductOutlined,
  ScheduleOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useIsAuthenticated, useLogout, useGetIdentity } from '@refinedev/core';
import { ProductResource } from './ProductResource';
import { ReportingResource } from './ReportingResource';
import { OrderResource } from './OrderResource';
import { PlanResource } from './PlanResource';
import { InventoryResource } from './InventoryResource';
import { InventoryHoldResource } from './InventoryHoldResource';
import { WarehouseConfigResource } from './WarehouseConfigResource';
import { ReceiptResource } from './ReceiptResource';
import { IssueResource } from './IssueResource';
import { StocktakeResource } from './StocktakeResource';
import { QualityResource } from './QualityResource';
import { DeliveryResource } from './DeliveryResource';
import { UserResource } from './UserResource';
import { RoleResource } from './RoleResource';
import { PermissionResource } from './PermissionResource';
import { Login } from './Login';

const { Header, Sider, Content } = Layout;

export function AdminApp() {
  const { data: authResult, isLoading: authLoading } = useIsAuthenticated();
  const { mutate: logout } = useLogout();
  const { data: user } = useGetIdentity<{ username: string; displayName: string; role: string }>();

  const initialPlanId = window.location.pathname.startsWith('/production-plans/')
    ? window.location.pathname.split('/')[2]
    : '';
  const [resource, setResource] = useState(window.location.pathname.startsWith('/production-plans') ? 'plans' : 'orders');
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selected = useMemo(() => [resource], [resource]);
  const switchResource = (key: string) => {
    setResource(key);
    if (key !== 'plans') setSelectedPlanId('');
    window.history.pushState({}, '', key === 'plans' ? '/production-plans' : `/${key}`);
    setDrawerOpen(false);
  };

  const menuItems = [
    { key: 'orders', icon: <ShoppingCartOutlined />, label: '需求池' },
    { key: 'plans', icon: <ScheduleOutlined />, label: '生产计划' },
    { 
      key: 'warehouse', 
      icon: <DropboxOutlined />, 
      label: '仓储管理',
      children: [
        { key: 'inventory', label: '库存台账' },
          { key: 'inventory_holds', label: '异常库存冻结' },
        { key: 'receipts', label: '入库管理' },
        { key: 'issues', label: '出库管理' },
        { key: 'stocktakes', label: '库存盘点' },
        { key: 'warehouse_config', label: '仓库设置' },
      ]
    },
    { key: 'production', icon: <BarcodeOutlined />, label: '报工管理' },
    { key: 'quality', icon: <CheckCircleOutlined />, label: '质量异常' },
    { key: 'delivery', icon: <TruckOutlined />, label: '型材到货' },
    { key: 'products', icon: <ProductOutlined />, label: '基础信息' },
    { 
      key: 'system', 
      icon: <SettingOutlined />, 
      label: '系统设置',
      children: [
        { key: 'users', icon: <UserOutlined />, label: '用户管理' },
        { key: 'roles', icon: <TeamOutlined />, label: '角色权限' },
        { key: 'permissions', icon: <KeyOutlined />, label: '权限点定义' },
      ]
    },
  ];
  const primaryModules = [
    { key: 'orders', icon: <ShoppingCartOutlined />, label: '需求池' },
    { key: 'plans', icon: <ScheduleOutlined />, label: '生产计划' },
    { 
      key: 'warehouse', 
      icon: <DropboxOutlined />, 
      label: '仓储管理',
      children: [
        { key: 'inventory', label: '库存台账' },
          { key: 'inventory_holds', label: '异常库存冻结' },
        { key: 'receipts', label: '入库管理' },
        { key: 'issues', label: '出库管理' },
        { key: 'stocktakes', label: '库存盘点' },
        { key: 'warehouse_config', label: '仓库设置' },
      ]
    },
    { key: 'production', icon: <BarcodeOutlined />, label: '报工执行' },
    { key: 'quality', icon: <CheckCircleOutlined />, label: '质量异常' },
    { key: 'delivery', icon: <TruckOutlined />, label: '型材到货' },
    { key: 'products', icon: <ProductOutlined />, label: '基础资料' },
  ];
  const readableMenuItems = [
    ...primaryModules,
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        { key: 'users', icon: <UserOutlined />, label: '用户管理' },
        { key: 'roles', icon: <TeamOutlined />, label: '角色权限' },
        { key: 'permissions', icon: <KeyOutlined />, label: '权限点定义' },
      ],
    },
  ];
  const moduleTabs = [
    { key: 'home', label: '首页', disabled: true },
    ...primaryModules.map((item) => ({ key: item.key, label: item.label })),
  ];

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;
  }

  if (!authResult?.authenticated) {
    return <Login />;
  }

  const renderMenu = (
    <Menu
      mode="inline"
      selectedKeys={selected}
      onClick={(item) => {
        switchResource(item.key);
      }}
      items={readableMenuItems}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <Layout className="app-shell">
      {/* Desktop Sider */}
      <Sider width={232} theme="light" className="app-sider desktop-only">
        <div className="brand">
          <DropboxOutlined />
          <span>Dday MES Lite</span>
        </div>
        {renderMenu}
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        closable={false}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        bodyStyle={{ padding: 0 }}
        width={240}
      >
        <div className="brand">
          <DropboxOutlined />
          <span>Dday MES Lite</span>
        </div>
        {renderMenu}
      </Drawer>

      <Layout>
        <Header className="app-header">
          <Space>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              className="mobile-menu-trigger"
              style={{ fontSize: '18px', padding: 0, width: '40px', height: '40px' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }} className="app-header-title">
              Dday ERP+MES
            </Typography.Title>
          </Space>
          <Space wrap>
            <Badge dot>
              <Button type="text" icon={<SettingOutlined />} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'role', label: `角色: ${user?.role}`, disabled: true },
                  { type: 'divider' },
                  { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: () => logout() }
                ]
              }}
            >
              <Button type="text" icon={<UserOutlined />}>
                {user?.displayName || user?.username}
              </Button>
            </Dropdown>
            <Button href="/scan" target="_blank" type="primary" size="small">
              PDA
            </Button>
          </Space>
        </Header>
        <Content className="app-content">
          {resource === 'orders' && (
            <OrderResource
              onPlanCreated={(planId) => {
                setSelectedPlanId(planId);
                setResource('plans');
                window.history.pushState({}, '', `/production-plans/${planId}`);
              }}
            />
          )}
          {resource === 'plans' && <PlanResource focusedPlanId={selectedPlanId} />}
          {resource === 'inventory' && <InventoryResource />}
          {resource === 'inventory_holds' && <InventoryHoldResource />}
          {resource === 'receipts' && <ReceiptResource />}
          {resource === 'issues' && <IssueResource />}
          {resource === 'stocktakes' && <StocktakeResource />}
          {resource === 'warehouse_config' && <WarehouseConfigResource />}
          {resource === 'production' && <ReportingResource />}
          {resource === 'quality' && <QualityResource />}
          {resource === 'delivery' && <DeliveryResource />}
          {resource === 'products' && <ProductResource />}
          {resource === 'users' && <UserResource />}
          {resource === 'roles' && <RoleResource />}
          {resource === 'permissions' && <PermissionResource />}
        </Content>
      </Layout>
    </Layout>
  );
}
