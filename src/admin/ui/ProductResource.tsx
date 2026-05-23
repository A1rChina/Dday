import { useEffect, useMemo, useState } from 'react';
import { useCreate, useInvalidate, useList, useUpdate } from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import { App, Button, Form, Input, InputNumber, Select, Space, Tabs, Typography } from 'antd';
import {
  AppstoreOutlined,
  EditOutlined,
  PlusOutlined,
  ProjectOutlined,
  ReloadOutlined,
  TeamOutlined,
  TruckOutlined,
} from '@ant-design/icons';

import {
  AppDrawerForm,
  AppPage,
  AppPageHeader,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppToolbar,
} from './components';

const { Text } = Typography;

type MasterTab = 'customers' | 'suppliers' | 'projects' | 'products';
type Option = { value: string; label: string };
type ProjectOption = Option & { code?: string; customerId?: string };

type Customer = {
  id: string;
  code: string;
  name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  delivery_address?: string;
  is_active: number;
};

type Supplier = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_short_name: string;
  contact_person: string;
  contact_phone: string;
  address: string;
  default_lead_time: number;
  status: string;
  is_active: number;
  remark: string;
};

type ManufacturingFactory = {
  id: string;
  factory_id: string;
  factory_name: string;
  factory_code: string;
  status: string;
  is_active: number;
};

type Project = {
  id: string;
  code: string;
  name: string;
  customer_id?: string;
  customer_name?: string;
  customer_id?: string;
  remark?: string;
  notes?: string;
  is_active: number;
};

type Product = {
  id: string;
  code: string;
  name: string;
  customer_id?: string;
  customer_name: string;
  project_id?: string;
  project_code: string;
  project_name: string;
  supplier_id?: string;
  supplier_name: string;
  manufacturing_factory: string;
  material_id: string;
  profile_material_name: string;
  unit_usage: number;
  safety_stock: number;
  warning_stock: number;
  unit: string;
  notes: string;
  is_active: number;
};

const statusMap = {
  active: { text: '启用', color: 'green' },
  inactive: { text: '停用', color: 'default' },
};

const activeValue = (record: { status?: string; is_active?: number }) =>
  record.status || (record.is_active ? 'active' : 'inactive');

const dataArray = (data: any): any[] => {
  const value = data?.data?.data || data?.data || [];
  return Array.isArray(value) ? value : [];
};

export function ProductResource() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [activeTab, setActiveTab] = useState<MasterTab>('customers');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<MasterTab>('customers');
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const [baseOptions, setBaseOptions] = useState<{
    customers: Option[];
    suppliers: Option[];
    projects: ProjectOption[];
    factories: Option[];
  }>({
    customers: [],
    suppliers: [],
    projects: [],
    factories: [],
  });

  const { mutateAsync: createRecord } = useCreate();
  const { mutateAsync: updateRecord } = useUpdate();

  const customersTable = useTable<Customer>({
    resource: 'customers',
    pagination: { pageSize: 20 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });
  const suppliersTable = useTable<Supplier>({
    resource: 'profile-suppliers',
    pagination: { pageSize: 20 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });
  const projectsTable = useTable<Project>({
    resource: 'projects',
    pagination: { pageSize: 20 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });
  const productsTable = useTable<Product>({
    resource: 'products',
    pagination: { pageSize: 50 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });

  const fetchBaseOptions = async () => {
    try {
      const headers = {
        'content-type': 'application/json',
        'x-app-token': localStorage.getItem('APP_TOKEN') || '',
        'x-app-role': localStorage.getItem('APP_ROLE') || 'admin'
      };
      
      const [cRes, sRes, pRes, fRes] = await Promise.all([
        fetch('/api/customers?current=1&pageSize=1000', { headers }).catch(() => null),
        fetch('/api/profile-suppliers?current=1&pageSize=1000', { headers }).catch(() => null),
        fetch('/api/projects?current=1&pageSize=1000', { headers }).catch(() => null),
        fetch('/api/manufacturing-factories?current=1&pageSize=1000', { headers }).catch(() => null),
      ]);
      
      const parseSafe = async (res: Response | null) => {
        if (!res || !res.ok) return [];
        const json = await res.json().catch(() => ({}));
        const rawData = json.data?.items || json.data || json.items || [];
        return Array.isArray(rawData) ? rawData : [];
      };

      const [cRaw, sRaw, pRaw, fRaw] = await Promise.all([
        parseSafe(cRes),
        parseSafe(sRes),
        parseSafe(pRes),
        parseSafe(fRes),
      ]);

      const customers = cRaw
        .filter((item: any) => item.status === 'active' || item.is_active === 1 || item.status !== 'inactive')
        .map((item: any) => ({ value: item.customerId || item.id || item.customer_id, label: item.customerName || item.name || item.customer_name }))
        .filter((item: any) => item.value !== undefined && item.label !== undefined);

      const suppliers = sRaw
        .filter((item: any) => item.status === 'active' || item.is_active === 1 || item.status !== 'inactive')
        .map((item: any) => ({ value: item.supplierId || item.id || item.supplier_id, label: item.supplierName || item.name || item.supplier_name }))
        .filter((item: any) => item.value !== undefined && item.label !== undefined);

      const projects = pRaw
        .filter((item: any) => item.status === 'active' || item.is_active === 1 || item.status !== 'inactive')
        .map((item: any) => ({ value: item.projectId || item.id || item.project_id, label: item.projectName || item.name || item.project_name, code: item.code || item.projectCode || item.project_code, customerId: item.customerId || item.customer_id }))
        .filter((item: any) => item.value !== undefined && item.label !== undefined);

      const factories = fRaw
        .filter((item: any) => item.status === 'active' || item.is_active === 1 || item.status !== 'inactive')
        .map((item: any) => ({ value: item.factoryId || item.id || item.factory_id, label: item.factoryName || item.name || item.factory_name }))
        .filter((item: any) => item.value !== undefined && item.label !== undefined);

      setBaseOptions({ customers, suppliers, projects, factories });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBaseOptions();
  }, []);

  const openDrawer = (type: MasterTab, record?: any, mode: 'add' | 'edit' | 'view' = 'add') => {
    setDrawerType(type);
    setDrawerMode(mode);
    setEditing(record || null);
    form.resetFields(); // form.resetFields DO NOT clear options.
    
    setTimeout(() => {
      if (record) {
        const normalized = normalizeRecordForForm(type, record);
        form.setFieldsValue(normalized);
        console.log('editingRecord:', record);
        console.log('form.getFieldsValue():', form.getFieldsValue());
      } else {
        form.setFieldsValue(defaultValues(type));
      }
    }, 0);
    
    setDrawerOpen(true);
    if (type === 'products') {
      void fetchBaseOptions();
      void invalidate({ resource: 'customers', invalidates: ['list'] });
      void invalidate({ resource: 'projects', invalidates: ['list'] });
      void invalidate({ resource: 'profile-suppliers', invalidates: ['list'] });
      void invalidate({ resource: 'manufacturing-factories', invalidates: ['list'] });
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const submitDrawer = async () => {
    const values = await form.validateFields();
    const resource = resourceOf(drawerType);
    try {
      await (editing
        ? updateRecord({ resource, id: editing.id, values })
        : createRecord({ resource, values }));
      await invalidate({ resource, invalidates: ['list'] });
      if (drawerType === 'products') await invalidate({ resource: 'products', invalidates: ['list'] });
      message.success('保存成功');
      closeDrawer();
      return true;
    } catch (error: any) {
      message.error(error?.message || '保存失败');
      return false;
    }
  };

  const refreshCurrent = async () => {
    await invalidate({ resource: resourceOf(activeTab), invalidates: ['list'] });
    message.success('已刷新');
  };

  const setActive = async (type: MasterTab, record: any, active: boolean) => {
    await updateRecord({ resource: resourceOf(type), id: record.id, values: { is_active: active ? 1 : 0 } });
    await invalidate({ resource: resourceOf(type), invalidates: ['list'] });
    message.success(active ? '已启用' : '已停用');
  };

  const customerColumns = [
    { title: '客户名称', dataIndex: 'name', width: 220 },
    { title: '联系人', dataIndex: 'contact_person', width: 120 },
    { title: '联系电话', dataIndex: 'contact_phone', width: 140 },
    { title: '交付地址', dataIndex: 'delivery_address', ellipsis: true },
    { title: '状态', width: 90, render: (_: any, record: Customer) => <AppStatusTag status={activeValue(record)} statusMap={statusMap} /> },
    { title: '操作', width: 150, render: (_: any, record: Customer) => rowActions('customers', record) },
  ];

  const supplierColumns = [
    { title: '型材厂商名称', dataIndex: 'supplier_name', width: 260 },
    { title: '联系人', dataIndex: 'contact_person', width: 120 },
    { title: '联系电话', dataIndex: 'contact_phone', width: 140 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '默认交期/运输周期', dataIndex: 'default_lead_time', width: 150, render: (value: number) => `${value || 0} 天` },
    { title: '状态', width: 90, render: (_: any, record: Supplier) => <AppStatusTag status={activeValue(record)} statusMap={statusMap} /> },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '操作', width: 150, render: (_: any, record: Supplier) => rowActions('suppliers', record) },
  ];

  const projectColumns = [
    { title: '项目名称', dataIndex: 'name', width: 260 },
    {
      title: '客户',
      dataIndex: 'customer_name',
      width: 180,
      render: (value: string, record: Project) =>
        value || baseOptions.customers.find((item) => item.value === record.customer_id)?.label || '-',
    },
    { title: '状态', width: 90, render: (_: any, record: Project) => <AppStatusTag status={activeValue(record)} statusMap={statusMap} /> },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '操作', width: 150, render: (_: any, record: Project) => rowActions('projects', record) },
  ];

  const productColumns = [
    { title: '零件号', dataIndex: 'code', width: 160, render: (value: string) => <Text strong>{value}</Text> },
    { title: '零件名称', dataIndex: 'name', width: 180 },
    { title: '客户', dataIndex: 'customer_name', width: 160 },
    { title: '项目', dataIndex: 'project_name', width: 160, render: (value: string, record: Product) => value || record.project_code || '-' },
    { title: '型材厂商', dataIndex: 'supplier_name', width: 220 },
    { title: '制造工厂', dataIndex: 'manufacturing_factory', width: 120 },
    { title: '型材', dataIndex: 'material_id', width: 160 },
    { title: '型材名称', dataIndex: 'profile_material_name', width: 180, ellipsis: true },
    { title: '单位用量', dataIndex: 'unit_usage', width: 100 },
    { title: '安全/预警库存', width: 130, render: (_: any, record: Product) => `${record.safety_stock || 0} / ${record.warning_stock || 0}` },
    { title: '状态', width: 90, render: (_: any, record: Product) => <AppStatusTag status={activeValue(record)} statusMap={statusMap} /> },
    { title: '操作', width: 150, render: (_: any, record: Product) => rowActions('products', record) },
  ];

  function rowActions(type: MasterTab, record: any) {
    const enabled = activeValue(record) === 'active';
    return (
      <Space>
        <Button size="small" type="text" onClick={() => openDrawer(type, record, 'view')}>
          查看
        </Button>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openDrawer(type, record, 'edit')}>
          编辑
        </Button>
        <Button size="small" type="text" danger={enabled} onClick={() => setActive(type, record, !enabled)}>
          {enabled ? '停用' : '启用'}
        </Button>
      </Space>
    );
  }

  const tabItems = [
    {
      key: 'customers',
      label: '客户信息',
      children: (
        <MasterTable searchFormProps={customersTable.searchFormProps} placeholder="搜索客户名称" tableProps={customersTable.tableProps} columns={customerColumns} />
      ),
    },
    {
      key: 'suppliers',
      label: '型材厂商信息',
      children: (
        <MasterTable searchFormProps={suppliersTable.searchFormProps} placeholder="搜索型材厂商名称" tableProps={suppliersTable.tableProps} columns={supplierColumns} />
      ),
    },
    {
      key: 'projects',
      label: '项目信息',
      children: (
        <MasterTable searchFormProps={projectsTable.searchFormProps} placeholder="搜索项目名称" tableProps={projectsTable.tableProps} columns={projectColumns} />
      ),
    },
    {
      key: 'products',
      label: '产品主数据 / 精密型材产品档案',
      children: (
        <MasterTable searchFormProps={productsTable.searchFormProps} placeholder="搜索零件号/零件名称/项目/型材厂商" tableProps={productsTable.tableProps} columns={productColumns} />
      ),
    },
  ];

  return (
    <AppPage>
      <AppPageHeader
        title="主数据与基础信息中心"
        description="统一维护客户、型材厂商、项目、零件及项目零件关系，为需求、计划、到料、库存和发货提供稳定基础数据。"
      />

      <AppToolbar selectionTip="基础资料变更后，将作为后续业务单据自动带出的数据来源。">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer(activeTab, null, 'add')}>
          {addButtonText(activeTab)}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={refreshCurrent}>
          刷新
        </Button>
      </AppToolbar>

      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as MasterTab)} items={tabItems} />

      <AppDrawerForm
        className="mes-entity-drawer"
        title={<DrawerTitle type={drawerType} mode={drawerMode} />}
        form={form}
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        submitter={drawerMode === 'view' ? false : { searchConfig: { submitText: '保存', resetText: '取消' } }}
        onFinish={submitDrawer}
      >
        <div className="mes-drawer-content">
          {drawerType === 'customers' && <CustomerForm mode={drawerMode} initialValues={form.getFieldsValue()} />}
          {drawerType === 'suppliers' && <SupplierForm mode={drawerMode} initialValues={form.getFieldsValue()} />}
          {drawerType === 'projects' && <ProjectForm mode={drawerMode} customerOptions={baseOptions.customers} initialValues={form.getFieldsValue()} />}
          {drawerType === 'products' && (
            <ProductForm
              mode={drawerMode}
              customerOptions={baseOptions.customers}
              supplierOptions={baseOptions.suppliers}
              projectOptions={baseOptions.projects}
              factoryOptions={baseOptions.factories}
              initialValues={form.getFieldsValue()}
            />
          )}
        </div>
      </AppDrawerForm>
    </AppPage>
  );
}

function MasterTable({
  searchFormProps,
  placeholder,
  tableProps,
  columns,
}: {
  searchFormProps: any;
  placeholder: string;
  tableProps: any;
  columns: any[];
}) {
  return (
    <>
      <AppSearchForm searchFormProps={searchFormProps} placeholder={placeholder} />
      <AppProTable {...tableProps} columns={columns} scroll={{ x: 'max-content' }} />
    </>
  );
}

// Forms
function FieldView({ label, value }: { label: string; value: any }) {
  return (
    <div className="mes-drawer-view-field">
      <div className="mes-drawer-view-field-label">{label}</div>
      <div className="mes-drawer-view-field-value">{value !== undefined && value !== null && value !== '' ? String(value) : '-'}</div>
    </div>
  );
}

function CustomerForm({ mode, initialValues }: { mode: 'add' | 'edit' | 'view'; initialValues: any }) {
  if (mode === 'view') {
    return (
      <div className="mes-drawer-card">
        <div className="mes-drawer-card-title">基本信息</div>
        <div className="mes-drawer-form-grid">
          <FieldView label="客户编码" value={initialValues?.code} />
          <FieldView label="客户名称" value={initialValues?.name} />
          <FieldView label="简称" value={initialValues?.short_name} />
          <FieldView label="联系人" value={initialValues?.contact_person} />
          <FieldView label="联系电话" value={initialValues?.contact_phone} />
          <div className="mes-drawer-form-item-full"><FieldView label="交付地址" value={initialValues?.delivery_address} /></div>
          <div className="mes-drawer-form-item-full"><FieldView label="备注" value={initialValues?.notes} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mes-drawer-card">
      <div className="mes-drawer-card-title">基本信息</div>
      <div className="mes-drawer-form-grid">
        <Form.Item name="code" label="客户编码" rules={[{ required: true, message: '请输入客户编码' }]}>
          <Input placeholder="例如: CUST-001" />
        </Form.Item>
        <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
          <Input placeholder="例如: 长盈" />
        </Form.Item>
        <Form.Item name="short_name" label="简称">
          <Input />
        </Form.Item>
        <Form.Item name="contact_person" label="联系人">
          <Input />
        </Form.Item>
        <Form.Item name="contact_phone" label="联系电话">
          <Input />
        </Form.Item>
        <Form.Item name="delivery_address" label="交付地址" className="mes-drawer-form-item-full">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="notes" label="备注" className="mes-drawer-form-item-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </div>
    </div>
  );
}

function SupplierForm({ mode, initialValues }: { mode: 'add' | 'edit' | 'view'; initialValues: any }) {
  if (mode === 'view') {
    return (
      <div className="mes-drawer-card">
        <div className="mes-drawer-card-title">基本信息</div>
        <div className="mes-drawer-form-grid">
          <FieldView label="型材厂商编码" value={initialValues?.supplier_id} />
          <FieldView label="型材厂商名称" value={initialValues?.supplier_name} />
          <FieldView label="简称" value={initialValues?.supplier_short_name} />
          <FieldView label="联系人" value={initialValues?.contact_person} />
          <FieldView label="联系电话" value={initialValues?.contact_phone} />
          <FieldView label="默认交期/运输周期" value={initialValues?.default_lead_time ? `${initialValues.default_lead_time} 天` : '-'} />
          <FieldView label="状态" value={initialValues?.status === 'active' ? '启用' : initialValues?.status === 'inactive' ? '停用' : '-'} />
          <div className="mes-drawer-form-item-full"><FieldView label="地址" value={initialValues?.address} /></div>
          <div className="mes-drawer-form-item-full"><FieldView label="备注" value={initialValues?.remark} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mes-drawer-card">
      <div className="mes-drawer-card-title">基本信息</div>
      <div className="mes-drawer-form-grid">
        <Form.Item name="supplier_id" label="型材厂商编码" rules={[{ required: true, message: '请输入型材厂商编码' }]}>
          <Input placeholder="例如: SUP-JIAKUN" />
        </Form.Item>
        <Form.Item name="supplier_name" label="型材厂商名称" rules={[{ required: true, message: '请输入型材厂商名称' }]}>
          <Input placeholder="例如: 南通佳坤新材料科技有限公司" />
        </Form.Item>
        <Form.Item name="supplier_short_name" label="简称">
          <Input />
        </Form.Item>
        <Form.Item name="contact_person" label="联系人">
          <Input />
        </Form.Item>
        <Form.Item name="contact_phone" label="联系电话">
          <Input />
        </Form.Item>
        <Form.Item name="default_lead_time" label="默认交期/运输周期">
          <InputNumber min={0} addonAfter="天" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
        </Form.Item>
        <Form.Item name="address" label="地址" className="mes-drawer-form-item-full">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="remark" label="备注" className="mes-drawer-form-item-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </div>
    </div>
  );
}

function ProjectForm({ mode, customerOptions, initialValues }: { mode: 'add' | 'edit' | 'view'; customerOptions: Option[]; initialValues: any }) {
  if (mode === 'view') {
    return (
      <div className="mes-drawer-card">
        <div className="mes-drawer-card-title">基本信息</div>
        <div className="mes-drawer-form-grid">
          <FieldView label="项目编码" value={initialValues?.code} />
          <FieldView label="项目名称" value={initialValues?.name} />
          <FieldView label="客户" value={customerOptions.find(o => o.value === initialValues?.customer_id)?.label || initialValues?.customer_id} />
          <FieldView label="状态" value={initialValues?.status === 'active' ? '启用' : initialValues?.status === 'inactive' ? '停用' : '-'} />
          <div className="mes-drawer-form-item-full"><FieldView label="备注" value={initialValues?.remark} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mes-drawer-card">
      <div className="mes-drawer-card-title">基本信息</div>
      <div className="mes-drawer-form-grid">
        <Form.Item name="code" label="项目编码" rules={[{ required: true, message: '请输入项目编码' }]}>
          <Input placeholder="例如: PP-0168" />
        </Form.Item>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="customer_id" label="客户">
          <Select showSearch optionFilterProp="label" options={customerOptions} placeholder="请选择客户" />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
        </Form.Item>
        <Form.Item name="remark" label="备注" className="mes-drawer-form-item-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </div>
    </div>
  );
}

function ProductForm({
  mode,
  customerOptions,
  supplierOptions,
  projectOptions,
  factoryOptions,
  initialValues,
}: {
  mode: 'add' | 'edit' | 'view';
  customerOptions: Option[];
  supplierOptions: Option[];
  projectOptions: ProjectOption[];
  factoryOptions: Option[];
  initialValues: any;
}) {
  const form = Form.useFormInstance();

  if (mode === 'view') {
    return (
      <>
        <div className="mes-drawer-card">
          <div className="mes-drawer-card-title">基本信息</div>
          <div className="mes-drawer-form-grid">
            <FieldView label="零件号" value={initialValues?.code} />
            <FieldView label="零件名称" value={initialValues?.name} />
            <FieldView label="客户" value={customerOptions.find(o => o.value === initialValues?.customer_id)?.label || initialValues?.customer_id} />
            <FieldView label="项目" value={projectOptions.find(o => o.value === initialValues?.project_id)?.label || initialValues?.project_id} />
          </div>
        </div>

        <div className="mes-drawer-card">
          <div className="mes-drawer-card-title">生产与库存</div>
          <div className="mes-drawer-form-grid">
            <FieldView label="型材厂商" value={supplierOptions.find(o => o.value === initialValues?.supplier_id)?.label || initialValues?.supplier_id} />
            <FieldView label="制造工厂" value={factoryOptions.find(o => o.value === initialValues?.manufacturing_factory)?.label || initialValues?.manufacturing_factory} />
            <FieldView label="型材" value={initialValues?.material_id} />
            <FieldView label="型材名称" value={initialValues?.profile_material_name} />
            <FieldView label="单位" value={initialValues?.unit} />
            <FieldView label="单位用量" value={initialValues?.unit_usage} />
            <FieldView label="安全库存" value={initialValues?.safety_stock} />
            <FieldView label="预警库存" value={initialValues?.warning_stock} />
            <div className="mes-drawer-form-item-full"><FieldView label="备注" value={initialValues?.notes} /></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mes-drawer-card">
        <div className="mes-drawer-card-title">基本信息</div>
        <div className="mes-drawer-form-grid">
          <Form.Item name="code" label="零件号" rules={[{ required: true, message: '请输入零件号' }]}>
            <Input placeholder="例如: PROD-PP0168-YBL-R" />
          </Form.Item>
          <Form.Item name="name" label="零件名称" rules={[{ required: true, message: '请输入零件名称' }]}>
            <Input placeholder="例如: 右边梁" />
          </Form.Item>
          <Form.Item name="customer_id" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
            <Select showSearch optionFilterProp="label" options={customerOptions} placeholder="请选择客户" />
          </Form.Item>
          <Form.Item name="project_id" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={projectOptions}
              placeholder="请选择项目"
              onChange={(projectId) => {
                const project = projectOptions.find((item) => item.value === projectId);
                if (project?.customerId) form.setFieldValue('customer_id', project.customerId);
              }}
            />
          </Form.Item>
        </div>
      </div>

      <div className="mes-drawer-card">
        <div className="mes-drawer-card-title">生产与库存</div>
        <div className="mes-drawer-form-grid">
          <Form.Item name="supplier_id" label="型材厂商" rules={[{ required: true, message: '请选择型材厂商' }]}>
            <Select showSearch optionFilterProp="label" options={supplierOptions} placeholder="请选择型材厂商" />
          </Form.Item>
          <Form.Item name="manufacturing_factory" label="制造工厂" rules={[{ required: true, message: '请选择制造工厂' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={factoryOptions}
              placeholder="请选择制造工厂"
            />
          </Form.Item>
          <Form.Item name="material_id" label="型材">
            <Input placeholder="留空时按零件号自动生成" />
          </Form.Item>
          <Form.Item name="profile_material_name" label="型材名称">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请输入单位' }]}>
            <Input placeholder="PCS" />
          </Form.Item>
          <Form.Item name="unit_usage" label="单位用量">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="safety_stock" label="安全库存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="warning_stock" label="预警库存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注" className="mes-drawer-form-item-full">
            <Input.TextArea rows={2} />
          </Form.Item>
        </div>
      </div>
    </>
  );
}


function DrawerTitle({ type, mode }: { type: MasterTab; mode: 'add' | 'edit' | 'view' }) {
  const icon =
    type === 'customers' ? <TeamOutlined /> : type === 'suppliers' ? <TruckOutlined /> : type === 'projects' ? <ProjectOutlined /> : <AppstoreOutlined />;
  return (
    <span className="app-drawer-title">
      {icon}
      {mode === 'view' ? viewTitle(type) : mode === 'edit' ? editTitle(type) : addTitle(type)}
    </span>
  );
}

function resourceOf(type: MasterTab) {
  if (type === 'suppliers') return 'profile-suppliers';
  return type;
}

function addButtonText(type: MasterTab) {
  if (type === 'customers') return '新增客户';
  if (type === 'suppliers') return '新增型材厂商';
  if (type === 'projects') return '新增项目';
  return '新增产品档案';
}

// Modal/Drawer Titles
function addTitle(type: MasterTab) {
  if (type === 'customers') return '新增客户';
  if (type === 'suppliers') return '新增型材厂商';
  if (type === 'projects') return '新增项目';
  return '新增产品档案';
}

function editTitle(type: MasterTab) {
  if (type === 'customers') return '编辑客户';
  if (type === 'suppliers') return '编辑型材厂商';
  if (type === 'projects') return '编辑项目';
  return '编辑产品档案';
}

function viewTitle(type: MasterTab) {
  if (type === 'customers') return '查看客户';
  if (type === 'suppliers') return '查看型材厂商';
  if (type === 'projects') return '查看项目';
  return '查看产品档案';
}

function defaultValues(type: MasterTab) {
  if (type === 'suppliers') return { status: 'active', default_lead_time: 0 };
  if (type === 'projects') return { status: 'active' };
  if (type === 'products') return { unit: 'PCS', unit_usage: 1, safety_stock: 0, warning_stock: 0 };
  return {};
}

function normalizeRecordForForm(type: MasterTab, record: any) {
  if (type === 'customers') {
    return {
      code: record.code,
      name: record.name,
      short_name: record.short_name || record.customer_short_name,
      contact_person: record.contact_person,
      contact_phone: record.contact_phone,
      delivery_address: record.delivery_address,
      notes: record.notes,
    };
  }
  if (type === 'projects') {
    return {
      code: record.code,
      name: record.name,
      customer_id: record.customer_id,
      status: activeValue(record),
      remark: record.remark || record.notes,
    };
  }
  if (type === 'products') {
    return {
      code: record.code,
      name: record.name,
      customer_id: record.customer_id,
      project_id: record.project_id,
      supplier_id: record.supplier_id,
      manufacturing_factory: record.manufacturing_factory,
      unit: record.unit,
      material_id: record.material_id,
      profile_material_name: record.profile_material_name,
      unit_usage: record.unit_usage,
      safety_stock: record.safety_stock,
      warning_stock: record.warning_stock,
      notes: record.notes,
    };
  }
  return { ...record, status: activeValue(record) };
}
