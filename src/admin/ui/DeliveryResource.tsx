import { useEffect, useState } from 'react';
import { useInvalidate } from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import {
  App,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  PlusOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { apiRequest } from '../api';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppActionButton,
  AppDrawerForm,
} from './components';

const { Text } = Typography;

type DeliveryStatus = 'pending' | 'shipped' | 'arrived' | 'delayed' | 'abnormal' | 'closed';

type MaterialOption = {
  id: string;
  code: string;
  name: string;
};

type MaterialDeliveryPlan = {
  id: string;
  code: string;
  material_id: string;
  material_name: string;
  supplier_name: string;
  quantity: number;
  planned_ship_at: string;
  estimated_arrival_at: string;
  actual_arrival_at: string;
  logistics_tracking_no: string;
  vehicle_info: string;
  delay_reason: string;
  status: DeliveryStatus;
  created_by: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type WarehouseReceipt = {
  id: string;
  code: string;
  material_delivery_plan_id: string;
  material_name: string;
  supplier_name: string;
  warehouse_code: string;
  batch_no: string;
  quantity: number;
  received_at: string;
  received_by: string;
  status: string;
  notes: string;
};

const statusOptions: Array<{ value: DeliveryStatus; label: string }> = [
  { value: 'pending', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'arrived', label: '已到货' },
  { value: 'delayed', label: '延期' },
  { value: 'abnormal', label: '异常' },
  { value: 'closed', label: '关闭' },
];

const deliveryStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待发货', color: 'default' },
  shipped: { text: '已发货', color: 'blue' },
  arrived: { text: '已到货', color: 'green' },
  delayed: { text: '延期', color: 'orange' },
  abnormal: { text: '异常', color: 'red' },
  closed: { text: '关闭', color: 'default' },
};

const formatDateTime = (value?: Dayjs) => value?.format('YYYY-MM-DD HH:mm') ?? '';
const toDayjs = (value?: string) => (value ? dayjs(value) : undefined);

export function DeliveryResource() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<MaterialDeliveryPlan | null>(null);
  const [receiptPlan, setReceiptPlan] = useState<MaterialDeliveryPlan | null>(null);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [receiptForm] = Form.useForm();
  const invalidate = useInvalidate();
  const { message } = App.useApp();

  const { tableProps: planTableProps, searchFormProps: planSearch } = useTable<MaterialDeliveryPlan>({
    resource: 'material-delivery-plans',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });

  const { tableProps: receiptTableProps, searchFormProps: receiptSearch } = useTable<WarehouseReceipt>({
    resource: 'warehouse-receipts',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });

  useEffect(() => {
    apiRequest<MaterialOption[]>('/materials')
      .then(setMaterials)
      .catch((e: Error) => message.error(e.message || '型材列表加载失败'));
  }, [message]);

  const materialOptions = materials.map((item) => ({
    value: item.id,
    label: `${item.code} ${item.name}`,
    materialName: item.name,
  }));

  const refresh = async () => {
    await invalidate({ resource: 'material-delivery-plans', invalidates: ['list'] });
    await invalidate({ resource: 'warehouse-receipts', invalidates: ['list'] });
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const material = materialOptions.find((item) => item.value === values.material_id);
      await apiRequest('/material-delivery-plans', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          material_name: material?.materialName ?? '',
          planned_ship_at: formatDateTime(values.planned_ship_at),
          estimated_arrival_at: formatDateTime(values.estimated_arrival_at),
        }),
      });
      message.success('型材交付计划已创建');
      setCreateOpen(false);
      createForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e.message || '创建失败');
    }
  };

  const openEdit = (record: MaterialDeliveryPlan) => {
    setEditPlan(record);
    editForm.setFieldsValue({
      material_id: record.material_id,
      supplier_name: record.supplier_name,
      quantity: record.quantity,
      planned_ship_at: toDayjs(record.planned_ship_at),
      estimated_arrival_at: toDayjs(record.estimated_arrival_at),
      actual_arrival_at: toDayjs(record.actual_arrival_at),
      logistics_tracking_no: record.logistics_tracking_no,
      vehicle_info: record.vehicle_info,
      delay_reason: record.delay_reason,
      status: record.status,
      notes: record.notes,
    });
  };

  const submitEdit = async () => {
    if (!editPlan) return;
    try {
      const values = await editForm.validateFields();
      const material = materialOptions.find((item) => item.value === values.material_id);
      await apiRequest(`/material-delivery-plans/${editPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...values,
          material_name: material?.materialName,
          planned_ship_at: formatDateTime(values.planned_ship_at),
          estimated_arrival_at: formatDateTime(values.estimated_arrival_at),
          actual_arrival_at: formatDateTime(values.actual_arrival_at),
        }),
      });
      message.success('交付计划已更新');
      setEditPlan(null);
      editForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e.message || '更新失败');
    }
  };

  const openReceipt = (record: MaterialDeliveryPlan) => {
    setReceiptPlan(record);
    receiptForm.setFieldsValue({
      warehouse_code: 'YB_WH',
      location_code: '',
      batch_no: dayjs().format('YYYYMMDD'),
      quantity: record.quantity,
      received_at: dayjs(),
      received_by: localStorage.getItem('APP_USER') || '',
      status: 'received',
      notes: '',
    });
  };

  const submitReceipt = async () => {
    if (!receiptPlan) return;
    try {
      const values = await receiptForm.validateFields();
      await apiRequest(`/material-delivery-plans/${receiptPlan.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          received_at: formatDateTime(values.received_at),
        }),
      });
      message.success('仓库收货记录已生成');
      setReceiptPlan(null);
      receiptForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e.message || '收货失败');
    }
  };

  const planColumns = [
    { title: '计划号', dataIndex: 'code', width: 170, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '型材名称', dataIndex: 'material_name', width: 170 },
    { title: '数量', dataIndex: 'quantity', width: 90, render: (value: number) => <Text strong>{value}</Text> },
    { title: '型材厂商', dataIndex: 'supplier_name', width: 140 },
    { title: '计划发货', dataIndex: 'planned_ship_at', width: 150 },
    { title: '预计到达', dataIndex: 'estimated_arrival_at', width: 150 },
    { title: '实际到达', dataIndex: 'actual_arrival_at', width: 150, render: (value: string) => value || <Text type="secondary">未到货</Text> },
    { title: '物流单号', dataIndex: 'logistics_tracking_no', width: 150, render: (value: string) => value || '-' },
    { title: '车辆信息', dataIndex: 'vehicle_info', width: 130, render: (value: string) => value || '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (value: string) => <AppStatusTag status={value} statusMap={deliveryStatusMap} />,
    },
    { title: '延期原因', dataIndex: 'delay_reason', width: 180, render: (value: string) => value || '-' },
    {
      title: '操作', fixed: 'right' as const, width: 170,
      render: (_: any, record: MaterialDeliveryPlan) => (
        <Space>
          <a onClick={() => openEdit(record)}>更新</a>
          <a onClick={() => openReceipt(record)} style={record.status === 'closed' ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>收货</a>
        </Space>
      ),
    },
  ];

  const receiptColumns = [
    { title: '收货单号', dataIndex: 'code', width: 170, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '关联计划', dataIndex: 'material_delivery_plan_id', width: 190, render: (value: string) => <Text copyable>{value}</Text> },
    { title: '型材名称', dataIndex: 'material_name', width: 170 },
    { title: '厂商', dataIndex: 'supplier_name', width: 140 },
    { title: '收货数量', dataIndex: 'quantity', width: 100, render: (value: number) => <Text strong>{value}</Text> },
    { title: '仓库', dataIndex: 'warehouse_code', width: 120, render: (value: string) => <Tag>{value}</Tag> },
    { title: '批次', dataIndex: 'batch_no', width: 120 },
    { title: '实际到达', dataIndex: 'received_at', width: 160 },
    { title: '收货人', dataIndex: 'received_by', width: 120 },
    { title: '备注', dataIndex: 'notes' },
  ];

  const planContent = (
    <>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppSearchForm searchFormProps={planSearch} placeholder="搜索计划号/型材/厂商/物流" />
        <AppActionButton type="primary" icon={<PlusOutlined />} label="新建计划" onClick={() => setCreateOpen(true)} />
      </div>
      <AppProTable<MaterialDeliveryPlan>
        {...planTableProps}
        columns={planColumns}
        scroll={{ x: 1500 }}
      />
    </>
  );

  const receiptContent = (
    <>
      <div style={{ marginBottom: 12 }}>
        <AppSearchForm searchFormProps={receiptSearch} placeholder="搜索收货单/型材/批次" />
      </div>
      <AppProTable<WarehouseReceipt>
        {...receiptTableProps}
        columns={receiptColumns}
      />
    </>
  );

  return (
    <AppPage>
      <AppPageHeader
        title="型材交付计划"
        description="管理型材从供应商发货到仓库收货的全流程"
      />

      <Tabs
        items={[
          { key: 'plans', label: <span><TruckOutlined /> 交付计划</span>, children: planContent },
          { key: 'receipts', label: <span><CheckCircleOutlined /> 仓库收货</span>, children: receiptContent },
        ]}
      />

      <AppDrawerForm
        title="新建型材交付计划"
        open={createOpen}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); createForm.resetFields(); } }}
        submitter={{ searchConfig: { submitText: '创建', resetText: '取消' } }}
        onFinish={async () => { await submitCreate(); return true; }}
      >
        <Form form={createForm} layout="vertical" initialValues={{ status: 'pending' }}>
          <Form.Item name="material_id" label="型材" rules={[{ required: true, message: '请选择型材' }]}>
            <Select showSearch placeholder="选择型材" optionFilterProp="label" options={materialOptions} />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier_name" label="型材厂商">
            <Input placeholder="例如: 佳坤型材" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="planned_ship_at" label="计划发货时间" rules={[{ required: true, message: '请选择计划发货时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
            <Form.Item name="estimated_arrival_at" label="预计到达时间" rules={[{ required: true, message: '请选择预计到达时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="logistics_tracking_no" label="物流单号">
            <Input />
          </Form.Item>
          <Form.Item name="vehicle_info" label="车辆信息">
            <Input placeholder="车牌、司机、电话" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </AppDrawerForm>

      <AppDrawerForm
        title="更新交付计划"
        open={Boolean(editPlan)}
        onOpenChange={(o) => { if (!o) { setEditPlan(null); editForm.resetFields(); } }}
        submitter={{ searchConfig: { submitText: '保存', resetText: '取消' } }}
        onFinish={async () => { await submitEdit(); return true; }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="material_id" label="型材" rules={[{ required: true, message: '请选择型材' }]}>
            <Select showSearch optionFilterProp="label" options={materialOptions} />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier_name" label="型材厂商">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="planned_ship_at" label="计划发货时间" rules={[{ required: true }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
            <Form.Item name="estimated_arrival_at" label="预计到达时间" rules={[{ required: true }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="actual_arrival_at" label="实际到达时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="logistics_tracking_no" label="物流单号">
            <Input />
          </Form.Item>
          <Form.Item name="vehicle_info" label="车辆信息">
            <Input />
          </Form.Item>
          <Form.Item name="delay_reason" label="延期原因">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </AppDrawerForm>

      <AppDrawerForm
        title="生成仓库收货记录"
        open={Boolean(receiptPlan)}
        onOpenChange={(o) => { if (!o) { setReceiptPlan(null); receiptForm.resetFields(); } }}
        submitter={{ searchConfig: { submitText: '生成收货单', resetText: '取消' } }}
        onFinish={async () => { await submitReceipt(); return true; }}
      >
        <Form form={receiptForm} layout="vertical">
          <Form.Item label="关联计划">
            <Text copyable>{receiptPlan?.code}</Text>
          </Form.Item>
          <Form.Item name="quantity" label="收货数量" rules={[{ required: true, message: '请输入收货数量' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="warehouse_code" label="仓库" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="YB_WH">宜宾工厂仓 (YB_WH)</Select.Option>
              <Select.Option value="CQ_WH">重庆工厂仓 (CQ_WH)</Select.Option>
              <Select.Option value="SUB_WH">外协单位仓 (SUB_WH)</Select.Option>
              <Select.Option value="MAIN">主仓 (MAIN)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="location_code" label="库位">
            <Input placeholder="例如: A01-01" />
          </Form.Item>
          <Form.Item name="batch_no" label="批次号">
            <Input />
          </Form.Item>
          <Form.Item name="received_at" label="实际到达时间" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="received_by" label="收货人">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="收货状态">
            <Select>
              <Select.Option value="received"><CheckCircleOutlined /> 已收货</Select.Option>
              <Select.Option value="closed">关闭</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </AppDrawerForm>
    </AppPage>
  );
}
