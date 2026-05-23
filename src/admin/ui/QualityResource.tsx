import { useEffect, useMemo, useState } from 'react';
import { useCreate, useInvalidate } from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import { App, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Tag, Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiRequest } from '../api';

import {
  AppPage,
  AppPageHeader,
  AppToolbar,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppActionButton,
  AppDrawerForm,
} from './components';

const { Text } = Typography;

type QualityIssue = {
  id: string;
  code: string;
  source_type: string;
  title: string;
  severity: string;
  status: string;
  quantity: number;
  inventory_lock_id: string | null;
  handling_method: string;
  warehouse_code: string;
  location_code: string;
  batch_no: string;
  owner: string;
  created_at: string;
};

type Material = { id: string; code: string; name: string; unit: string };
type Product = { id: string; code: string; name: string; unit: string };

const sourceOptions = [
  { value: 'incoming', label: '来料' },
  { value: 'production', label: '生产' },
  { value: 'customer', label: '客户' },
  { value: 'warehouse', label: '仓库' },
];

const severityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '紧急' },
];

const handlingOptions = [
  { value: 'use_as_is', label: '让步使用' },
  { value: 'adjust_machine', label: '调机后加工' },
  { value: 'sort_use', label: '挑选使用' },
  { value: 'rework', label: '返工' },
  { value: 'scrap', label: '报废' },
  { value: 'return_replace', label: '退换料' },
  { value: 'wait_customer', label: '待客户确认' },
  { value: 'wait_supplier', label: '待型材厂确认' },
];

const qualityStatusMap: Record<string, { text: string; color: string }> = {
  open: { text: '待处理', color: 'blue' },
  confirmed: { text: '已确认', color: 'cyan' },
  processing: { text: '处理中', color: 'processing' },
  frozen: { text: '已冻结', color: 'volcano' },
  resolved: { text: '已处理', color: 'green' },
  closed: { text: '已关闭', color: 'default' },
};

const txText: Record<string, string> = {
  use_as_is: '让步使用',
  adjust_machine: '调机后加工',
  sort_use: '挑选使用',
  rework: '返工',
  scrap: '报废',
  return_replace: '退换料',
  wait_customer: '待客户确认',
  wait_supplier: '待型材厂确认',
};

export function QualityResource() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [actionIssue, setActionIssue] = useState<QualityIssue | null>(null);
  const [actionType, setActionType] = useState<'unfreeze' | 'scrap' | null>(null);
  const [form] = Form.useForm();
  const [actionForm] = Form.useForm();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const invalidate = useInvalidate();
  const { mutateAsync: create } = useCreate();

  const { tableProps, searchFormProps } = useTable<QualityIssue>({
    resource: 'quality-issues',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });
  useEffect(() => {
    void Promise.all([
      apiRequest<Material[]>('/materials'),
      apiRequest<{ items: Product[] }>('/products?current=1&pageSize=1000'),
    ]).then(([materialRows, productRows]) => {
      setMaterials(materialRows);
      setProducts(productRows.items);
    });
  }, []);

  const materialOptions = useMemo(
    () => materials.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })),
    [materials]
  );
  const productOptions = useMemo(
    () => products.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })),
    [products]
  );

  const refreshAll = async () => {
    await invalidate({ resource: 'quality-issues', invalidates: ['list'] });
    await invalidate({ resource: 'inventory-balances', invalidates: ['list'] });
    await invalidate({ resource: 'inventory-transactions', invalidates: ['list'] });
    await invalidate({ resource: 'inventory-locks', invalidates: ['list'] });
  };

  const submit = async () => {
    const values = await form.validateFields();
    const targetType = values.target_type;
    await create({
      resource: 'quality-issues',
      values: {
        ...values,
        material_id: targetType === 'material' ? values.target_id : undefined,
        product_id: targetType === 'product' ? values.target_id : undefined,
        freeze_qty: values.freeze_inventory ? values.freeze_qty : 0,
      },
    });
    await refreshAll();
    message.success('品质异常已创建');
    setOpen(false);
    form.resetFields();
  };

  const runAction = async () => {
    if (!actionIssue || !actionType) return;
    const values = await actionForm.validateFields();
    await apiRequest(`/quality-issues/${actionIssue.id}/${actionType}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    await refreshAll();
    message.success(actionType === 'scrap' ? '已报废并生成库存流水' : '已解冻并生成库存流水');
    setActionIssue(null);
    setActionType(null);
    actionForm.resetFields();
  };

  const closeIssue = async (record: QualityIssue) => {
    await apiRequest(`/quality-issues/${record.id}/close`, {
      method: 'POST',
      body: JSON.stringify({ handling_method: record.handling_method }),
    });
    await refreshAll();
    message.success('异常已关闭');
  };

  const columns = [
    { title: '异常单号', dataIndex: 'code', width: 170, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '来源', dataIndex: 'source_type', width: 90, render: (value: string) => sourceOptions.find((item) => item.value === value)?.label ?? value },
    { title: '标题', dataIndex: 'title', width: 220 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    {
      title: '严重度', dataIndex: 'severity', width: 90,
      render: (value: string) => <Tag color={value === 'critical' || value === 'high' ? 'red' : 'orange'}>{severityOptions.find((item) => item.value === value)?.label ?? value}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (value: string) => <AppStatusTag status={value} statusMap={qualityStatusMap} />,
    },
    { title: '处理方案', dataIndex: 'handling_method', width: 130, render: (value: string) => value ? <Tag color="geekblue">{txText[value] ?? value}</Tag> : <Text type="secondary">未定</Text> },
    { title: '仓库', dataIndex: 'warehouse_code', width: 100 },
    { title: '库位', dataIndex: 'location_code', width: 100, render: (value: string) => value || '-' },
    { title: '批次', dataIndex: 'batch_no', width: 130 },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
    {
      title: '操作', fixed: 'right' as const, width: 250,
      render: (_: any, record: QualityIssue) => (
        <Space>
          {record.inventory_lock_id && record.status === 'frozen' && (
            <>
              <Button size="small" onClick={() => { setActionIssue(record); setActionType('unfreeze'); actionForm.setFieldsValue({ quantity: record.quantity, handling_method: record.handling_method || 'use_as_is' }); }}>解冻</Button>
              <Button size="small" danger onClick={() => { setActionIssue(record); setActionType('scrap'); actionForm.setFieldsValue({ quantity: record.quantity, handling_method: record.handling_method || 'scrap' }); }}>报废</Button>
            </>
          )}
          <Popconfirm
            title="关闭异常"
            description={record.handling_method ? '确认关闭该异常？' : '关闭前必须先选择处理方案。'}
            disabled={!record.handling_method || record.status === 'closed'}
            onConfirm={() => closeIssue(record)}
          >
            <Button size="small" disabled={!record.handling_method || record.status === 'closed'}>关闭</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppPage>
      <AppPageHeader
        title="品质异常"
        description="品质异常发生后先冻结可用库存，再按处理方案解冻、报废或退换"
        extra={<AppSearchForm searchFormProps={searchFormProps} placeholder="搜索异常单/标题" />}
      />

      <AppToolbar>
        <AppActionButton type="primary" icon={<PlusOutlined />} label="新建异常" onClick={() => setOpen(true)} />
      </AppToolbar>

      <AppProTable<QualityIssue>
        {...tableProps}
        columns={columns}
        scroll={{ x: 1320 }}
      />

      <AppDrawerForm
        title="登记品质异常"
        open={open}
        onOpenChange={(o) => { if (!o) { setOpen(false); form.resetFields(); } }}
        width={720}
        onFinish={async () => { await submit(); return true; }}
      >
        <Form form={form} layout="vertical" initialValues={{ source_type: 'warehouse', severity: 'medium', quantity: 1, freeze_qty: 1, warehouse_code: 'MAIN', target_type: 'material', freeze_inventory: true }}>
          <Form.Item name="title" label="异常标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="source_type" label="异常来源" rules={[{ required: true }]} style={{ width: '33%' }}>
              <Select options={sourceOptions} />
            </Form.Item>
            <Form.Item name="severity" label="严重度" style={{ width: '33%' }}>
              <Select options={severityOptions} />
            </Form.Item>
            <Form.Item name="quantity" label="异常数量" rules={[{ required: true }]} style={{ width: '34%' }}>
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="target_type" label="库存对象" rules={[{ required: true }]} style={{ width: '30%' }}>
              <Select options={[{ value: 'material', label: '物料' }, { value: 'product', label: '产品' }]} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, next) => prev.target_type !== next.target_type}>
              {({ getFieldValue }) => (
                <Form.Item name="target_id" label="物料/产品" rules={[{ required: true }]} style={{ width: '70%' }}>
                  <Select showSearch optionFilterProp="label" options={getFieldValue('target_type') === 'product' ? productOptions : materialOptions} />
                </Form.Item>
              )}
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="warehouse_code" label="仓库" style={{ width: '33%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="location_code" label="库位" style={{ width: '33%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="batch_no" label="批次" style={{ width: '34%' }}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="freeze_inventory" label="同步冻结库存" valuePropName="checked" style={{ width: '33%' }}>
              <Switch />
            </Form.Item>
            <Form.Item name="freeze_qty" label="冻结数量" dependencies={['freeze_inventory']} style={{ width: '67%' }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="description" label="异常描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </AppDrawerForm>

      <AppDrawerForm
        title={actionType === 'scrap' ? '报废冻结库存' : '解冻库存'}
        open={Boolean(actionIssue)}
        onOpenChange={(o) => { if (!o) { setActionIssue(null); setActionType(null); actionForm.resetFields(); } }}
        onFinish={async () => { await runAction(); return true; }}
      >
        <Form form={actionForm} layout="vertical">
          <Form.Item name="handling_method" label="处理方案" rules={[{ required: true }]}>
            <Select options={handlingOptions} />
          </Form.Item>
          <Form.Item name="quantity" label="处理数量" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </AppDrawerForm>
    </AppPage>
  );
}
