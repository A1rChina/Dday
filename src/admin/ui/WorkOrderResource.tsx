import { useState } from 'react';
import { useInvalidate } from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import { App, Form, Input, Progress, Select, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { apiRequest } from '../api';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppDrawerForm,
} from './components';

const { Text } = Typography;

type WorkOrder = {
  id: string;
  code: string;
  production_plan_id: string;
  production_plan_code: string;
  demand_line_id: string;
  demand_line_code: string;
  product_code: string;
  product_name: string;
  material_code: string;
  material_name: string;
  planned_quantity: number;
  reported_quantity?: number;
  good_quantity?: number;
  completed_quantity: number;
  defect_quantity: number;
  scrap_quantity: number;
  status: string;
  planned_start_date: string;
  planned_finish_date: string;
  notes: string;
};

const statusOptions = [
  { value: 'created', label: '已创建' },
  { value: 'released', label: '已释放' },
  { value: 'running', label: '生产中' },
  { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const workOrderStatusMap: Record<string, { text: string; color: string }> = {
  created: { text: '已创建', color: 'default' },
  released: { text: '已释放', color: 'cyan' },
  running: { text: '生产中', color: 'processing' },
  paused: { text: '已暂停', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'error' },
};

import { Tag } from 'antd';

export function WorkOrderResource() {
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [form] = Form.useForm();
  const invalidate = useInvalidate();
  const { message } = App.useApp();

  const { tableProps, searchFormProps } = useTable<WorkOrder>({
    resource: 'work-orders',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });

  const openEdit = (record: WorkOrder) => {
    setEditing(record);
    form.setFieldsValue({
      status: record.status,
      planned_start_date: record.planned_start_date,
      planned_finish_date: record.planned_finish_date,
      notes: record.notes,
    });
  };

  const submit = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await apiRequest(`/work-orders/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      message.success('工单已更新');
      setEditing(null);
      form.resetFields();
      await invalidate({ resource: 'work-orders', invalidates: ['list'] });
      await invalidate({ resource: 'production-plans', invalidates: ['list'] });
    } catch (e: any) {
      message.error(e.message || '工单更新失败');
    }
  };

  const columns = [
    { title: '工单号', dataIndex: 'code', width: 170, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '计划单号', dataIndex: 'production_plan_code', width: 170, render: (value: string) => value ? <Tag color="blue">{value}</Tag> : '-' },
    { title: '订单行', dataIndex: 'order_line_code', width: 150, render: (value: string) => value || '-' },
    { title: '产品', width: 230, render: (_: any, record: WorkOrder) => <Text>{record.product_code} <Text type="secondary">{record.product_name}</Text></Text> },
    { title: '物料', width: 200, render: (_: any, record: WorkOrder) => record.material_code ? <Text>{record.material_code} <Text type="secondary">{record.material_name}</Text></Text> : '-' },
    { title: '计划数量', dataIndex: 'planned_quantity', width: 100, render: (value: number) => <Text strong>{value}</Text> },
    {
      title: '进度', width: 160,
      render: (_: any, record: WorkOrder) => {
        const reported = record.reported_quantity ?? record.completed_quantity + record.defect_quantity + record.scrap_quantity;
        const percent = record.planned_quantity ? Math.round((reported / record.planned_quantity) * 100) : 0;
        return <Progress percent={percent} size="small" />;
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (value: string) => <AppStatusTag status={value} statusMap={workOrderStatusMap} />,
    },
    { title: '计划开始', dataIndex: 'planned_start_date', width: 150 },
    { title: '计划完成', dataIndex: 'planned_finish_date', width: 150 },
    {
      title: '操作', fixed: 'right' as const, width: 100,
      render: (_: any, record: WorkOrder) => (
        <a onClick={() => openEdit(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <EditOutlined /> 状态
        </a>
      ),
    },
  ];

  return (
    <AppPage>
      <AppPageHeader
        title="生产工单"
        description="生产计划释放后生成现场工单，工单保留订单、计划、产品、物料和资源关联"
        extra={<AppSearchForm searchFormProps={searchFormProps} placeholder="搜索工单/计划/产品" />}
      />

      <AppProTable<WorkOrder>
        {...tableProps}
        columns={columns}
        scroll={{ x: 1450 }}
      />

      <AppDrawerForm
        title={`维护工单状态 - ${editing?.code || ''}`}
        open={Boolean(editing)}
        onOpenChange={(open) => { if (!open) { setEditing(null); form.resetFields(); } }}
        submitter={{ searchConfig: { submitText: '保存', resetText: '取消' } }}
        onFinish={async () => { await submit(); return true; }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="工单状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="planned_start_date" label="计划开始时间">
            <Input />
          </Form.Item>
          <Form.Item name="planned_finish_date" label="计划完成时间">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </AppDrawerForm>
    </AppPage>
  );
}
