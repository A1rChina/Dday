import { useEffect, useState } from 'react';
import { useInvalidate } from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import { App, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Select, Space, Tag, Typography } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { apiRequest } from '../api';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppDrawerForm,
  AppActionButton,
} from './components';

const { Text } = Typography;

type Plan = {
  id: string;
  code: string;
  title: string;
  demand_line_id: string;
  demand_line_code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  material_code: string;
  material_name: string;
  planned_quantity: number;
  planned_start_at: string;
  planned_finish_at: string;
  material_ready_status: string;
  risk_level: string;
  source_order_code?: string;
  source_customer_name?: string;
  source_project_name?: string;
  source_order_quantity?: number;
  source_delivery_date?: string;
  due_date?: string;
  priority?: string;
  status: string;
  created_by: string;
};

type OptionRecord = {
  id: string;
  code?: string;
  name?: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  quantity?: number;
};

const planStatusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  released: { text: '已释放', color: 'blue' },
  pending: { text: '待生产', color: 'cyan' },
  running: { text: '生产中', color: 'processing' },
  completed: { text: '已完成', color: 'green' },
  paused: { text: '已暂停', color: 'orange' },
  cancelled: { text: '已取消', color: 'error' },
  abnormal_closed: { text: '异常关闭', color: 'red' },
};

const materialText: Record<string, string> = {
  ready: '物料齐套',
  partial: '部分齐套',
  shortage: '物料短缺',
  unknown: '未知',
};

const riskColor: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const formatDateTime = (value?: Dayjs) => value?.format('YYYY-MM-DD HH:mm') ?? '';

function normalizeList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

export function PlanResource({ focusedPlanId }: { focusedPlanId?: string }) {
  const invalidate = useInvalidate();
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Plan | null>(null);
  const [form] = Form.useForm();
  const [products, setProducts] = useState<OptionRecord[]>([]);
  const [processes, setProcesses] = useState<OptionRecord[]>([]);
  const [machines, setMachines] = useState<OptionRecord[]>([]);

  const { tableProps, searchFormProps } = useTable<Plan>({
    resource: 'production-plans',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }],
  });

  useEffect(() => {
    Promise.all([
      apiRequest('/products?current=1&pageSize=200'),
      apiRequest('/processes'),
      apiRequest('/machines'),
    ])
      .then(([productRes, processRes, machineRes]) => {
        setProducts(normalizeList<OptionRecord>(productRes));
        setProcesses(normalizeList<OptionRecord>(processRes));
        setMachines(normalizeList<OptionRecord>(machineRes));
      })
      .catch((e: Error) => message.error(e.message || '基础数据加载失败'));
  }, [message]);

  useEffect(() => {
    if (!focusedPlanId) return;
    apiRequest<Plan>(`/production-plans/${focusedPlanId}`)
      .then((plan) => {
        setDetail(plan);
        setDetailOpen(true);
      })
      .catch((e: Error) => message.error(e.message || '生产计划详情加载失败'));
  }, [focusedPlanId, message]);

  const refresh = async () => {
    await invalidate({ resource: 'production-plans', invalidates: ['list'] });
    await invalidate({ resource: 'work-orders', invalidates: ['list'] });
    await invalidate({ resource: 'work-resources', invalidates: ['list'] });
  };

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      await apiRequest('/production-plans', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          planned_start_at: formatDateTime(values.planned_start_at),
          planned_finish_at: formatDateTime(values.planned_finish_at),
        }),
      });
      message.success('生产计划已创建');
      setCreateOpen(false);
      form.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e.message || '创建生产计划失败');
    }
  };

  const releasePlan = async (record: Plan) => {
    try {
      await apiRequest(`/production-plans/${record.id}/release`, { method: 'POST' });
      message.success('生产计划已释放并生成工单');
      await refresh();
    } catch (e: any) {
      message.error(e.message || '释放失败');
    }
  };

  const columns = [
    { title: '计划单号', dataIndex: 'code', width: 170, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '来源订单', dataIndex: 'source_order_code', width: 160, render: (value: string, record: Plan) => value || record.order_line_code || '-' },
    { title: '客户', dataIndex: 'source_customer_name', width: 150, render: (value: string) => value || '-' },
    { title: '项目', dataIndex: 'source_project_name', width: 150, render: (value: string) => value || '-' },
    { title: '产品', width: 230, render: (_: any, record: Plan) => <Text>{record.product_code} <Text type="secondary">{record.product_name}</Text></Text> },
    { title: '物料', width: 200, render: (_: any, record: Plan) => record.material_code ? <Text>{record.material_code} <Text type="secondary">{record.material_name}</Text></Text> : '-' },
    { title: '数量', dataIndex: 'planned_quantity', width: 90, render: (value: number) => <Text strong>{value}</Text> },
    { title: '交付日期', dataIndex: 'source_delivery_date', width: 120, render: (value: string, record: Plan) => value || record.due_date || '-' },
    { title: '开始时间', dataIndex: 'planned_start_at', width: 150 },
    { title: '完成时间', dataIndex: 'planned_finish_at', width: 150 },
    {
      title: '物料状态', dataIndex: 'material_ready_status', width: 120,
      render: (value: string) => <Tag color={value === 'ready' ? 'green' : value === 'shortage' ? 'red' : 'orange'}>{materialText[value] || value}</Tag>,
    },
    {
      title: '风险', dataIndex: 'risk_level', width: 90,
      render: (value: string) => <Tag color={riskColor[value] || 'default'}>{value}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (value: string) => <AppStatusTag status={value} statusMap={planStatusMap} />,
    },
    {
      title: '操作', fixed: 'right' as const, width: 120,
      render: (_: any, record: Plan) => (
        <AppActionButton
          icon={<RocketOutlined />}
          label="释放"
          type="primary"
          disabledReason={record.status !== 'draft' ? '仅草稿状态可释放' : ''}
          onClick={() => releasePlan(record)}
        />
      ),
    },
  ];

  return (
    <AppPage>
      <AppPageHeader
        title="生产计划"
        description="计划员基于订单、产品、物料状态和机台资源创建生产计划，释放后生成现场工单"
        extra={
          <Space>
            <AppSearchForm searchFormProps={searchFormProps} placeholder="搜索计划/产品" />
            <AppActionButton type="primary" icon={<PlusOutlined />} label="新建计划" onClick={() => setCreateOpen(true)} />
          </Space>
        }
      />

      <AppProTable<Plan>
        {...tableProps}
        columns={columns}
        scroll={{ x: 1500 }}
      />

      <Drawer title="生产计划详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={620}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="计划单号">{detail.code}</Descriptions.Item>
            <Descriptions.Item label="来源订单">{detail.source_order_code || detail.order_line_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{detail.source_customer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="项目">{detail.source_project_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="产品">{detail.product_code} {detail.product_name}</Descriptions.Item>
            <Descriptions.Item label="订单数量">{detail.source_order_quantity || detail.planned_quantity}</Descriptions.Item>
            <Descriptions.Item label="计划数量">{detail.planned_quantity}</Descriptions.Item>
            <Descriptions.Item label="交付日期">{detail.source_delivery_date || detail.due_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="优先级">{detail.priority || 'medium'}</Descriptions.Item>
            <Descriptions.Item label="状态"><AppStatusTag status={detail.status} statusMap={planStatusMap} /></Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <AppDrawerForm
        title="新建生产计划"
        open={createOpen}
        onOpenChange={(open) => { if (!open) { setCreateOpen(false); form.resetFields(); } }}
        submitter={{ searchConfig: { submitText: '创建', resetText: '取消' } }}
        onFinish={async () => { await submitCreate(); return true; }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label="产品" rules={[{ required: true, message: '请选择产品' }]}>
            <Select showSearch optionFilterProp="label" options={products.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name || ''}` }))} />
          </Form.Item>
          <Form.Item name="planned_quantity" label="计划数量" rules={[{ required: true, message: '请输入计划数量' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="planned_start_at" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
            <Form.Item name="planned_finish_at" label="完成时间" rules={[{ required: true, message: '请选择完成时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="process_id" label="工序">
            <Select allowClear showSearch optionFilterProp="label" options={processes.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name || ''}` }))} />
          </Form.Item>
          <Form.Item name="machine_id" label="机台">
            <Select allowClear showSearch optionFilterProp="label" options={machines.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name || ''}` }))} />
          </Form.Item>
          <Form.Item name="title" label="计划标题">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </AppDrawerForm>
    </AppPage>
  );
}
