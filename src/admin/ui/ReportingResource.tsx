import { useEffect, useRef, useState } from 'react';
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  BarcodeOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  PrinterOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../api';
import { AppActionButton, AppPage, AppPageHeader, AppProTable, AppToolbar } from './components';

const { Text, Title } = Typography;

type PageResult<T> = { items: T[]; total: number };
type WorkOrder = { id: string; code: string; product_code: string; product_name: string; planned_quantity: number };
type ProcessCard = {
  id: string;
  card_code: string;
  production_order_id: string;
  production_order_code: string;
  product_name: string;
  product_code: string;
  drawing_no: string;
  unit: string;
  card_qty: number;
  current_operation: string;
  status: string;
  printed_at: string | null;
  remarks: string;
  process_hint: string;
  special_remarks: string;
  created_at: string;
};
type RouteOperation = {
  id: string;
  operation_name: string;
  sequence: number;
  planned_qty: number;
  good_qty: number;
  defect_qty: number;
  scrap_qty: number;
  rework_qty: number;
  status: string;
};
type CardDetail = {
  card: ProcessCard;
  operations: RouteOperation[];
  current_operation: RouteOperation | null;
  previous_completed_qty: number;
  current_reported_qty: number;
  current_available_qty: number;
  history: OperationReport[];
  abnormalities: AbnormalRecord[];
  has_abnormal: boolean;
};
type OperationReport = {
  id: string;
  report_no: string;
  card_code: string;
  production_order_code?: string;
  product_code?: string;
  product_name?: string;
  operation_name: string;
  report_type: string;
  good_qty: number;
  defect_qty: number;
  scrap_qty: number;
  rework_qty: number;
  operator: string;
  inspector: string;
  defect_reason: string;
  manual_reason: string;
  remark: string;
  created_at: string;
};
type AbnormalRecord = {
  id: string;
  abnormal_no: string;
  card_code: string;
  product_code?: string;
  product_name?: string;
  operation_name: string;
  abnormal_type: string;
  quantity: number;
  reason: string;
  status: string;
  handling_method: string;
  handled_by: string;
  remark: string;
  created_at: string;
};

const cardStatusMap: Record<string, { text: string; color: string }> = {
  created: { text: '已创建', color: 'default' },
  running: { text: '流转中', color: 'processing' },
  abnormal: { text: '异常', color: 'error' },
  completed: { text: '已完成', color: 'success' },
  void: { text: '已作废', color: 'default' },
};

const operationStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待执行', color: 'default' },
  running: { text: '执行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  blocked: { text: '阻塞', color: 'error' },
  skipped: { text: '跳过', color: 'warning' },
};

const abnormalTypeText: Record<string, string> = {
  defect: '不良',
  scrap: '报废',
  rework: '返修',
};

const handlingOptions = [
  { value: 'continue', label: '继续加工' },
  { value: 'rework', label: '返修' },
  { value: 'scrap', label: '报废' },
  { value: 'return_replace', label: '退换' },
  { value: 'wait_confirm', label: '等待确认' },
];

function StatusTag({ value, map }: { value: string; map: Record<string, { text: string; color: string }> }) {
  const item = map[value] ?? { text: value, color: 'default' };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export function ReportingResource() {
  const [activeKey, setActiveKey] = useState('scan');

  return (
    <AppPage>
      <AppPageHeader
        title="报工管理"
        description="以工序流转卡为核心，支持扫码报工、手动补录、异常闭环与流转卡打印"
      />
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'scan', label: '扫码报工', children: <ScanReportPanel /> },
          { key: 'manual', label: '手动报工', children: <ManualReportPanel /> },
          { key: 'cards', label: '流转卡管理', children: <CardManagementPanel /> },
          { key: 'reports', label: '报工记录查询', children: <ReportQueryPanel /> },
          { key: 'abnormal', label: '异常 / 不良处理', children: <AbnormalPanel /> },
        ]}
      />
    </AppPage>
  );
}

function ScanReportPanel() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [scanForm] = Form.useForm();
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const qtyRef = useRef<any>(null);

  const scan = async () => {
    const values = await scanForm.validateFields();
    setLoading(true);
    try {
      const data = await apiRequest<CardDetail>('/reporting/scan', {
        method: 'POST',
        body: JSON.stringify({ code: values.code }),
      });
      setDetail(data);
      form.resetFields();
      form.setFieldsValue({ good_qty: data.current_available_qty, defect_qty: 0, scrap_qty: 0, rework_qty: 0 });
      setTimeout(() => qtyRef.current?.focus?.(), 80);
    } catch (e: any) {
      setDetail(null);
      message.error(e.message || '扫码失败');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!detail) return;
    const values = await form.validateFields();
    await apiRequest('/reporting/reports', {
      method: 'POST',
      body: JSON.stringify({ ...values, card_id: detail.card.id, report_type: 'scan' }),
    });
    message.success('报工已提交，等待下一张流转卡');
    setDetail(null);
    form.resetFields();
    scanForm.resetFields();
    setTimeout(() => scanForm.getFieldInstance('code')?.focus?.(), 80);
  };

  return (
    <div className="reporting-scan-panel">
      <Form form={scanForm} layout="inline" onFinish={scan} className="reporting-scan-bar">
        <Form.Item name="code" rules={[{ required: true, message: '请扫码或输入流转卡号' }]} style={{ flex: 1 }}>
          <Input size="large" prefix={<BarcodeOutlined />} placeholder="扫描流转卡号，例如 R20260518-5735-CQYXL-1199" autoFocus />
        </Form.Item>
        <Button size="large" type="primary" htmlType="submit" loading={loading}>查询</Button>
      </Form>

      {detail && (
        <div className="reporting-scan-workspace">
          <div className="reporting-scan-summary">
            <Statistic title="本卡数量" value={detail.card.card_qty} suffix={detail.card.unit} />
            <Statistic title="上道完成" value={detail.previous_completed_qty} />
            <Statistic title="本工序已报" value={detail.current_reported_qty} />
            <Statistic title="本工序可报" value={detail.current_available_qty} />
          </div>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="流转卡号">{detail.card.card_code}</Descriptions.Item>
            <Descriptions.Item label="产品">{detail.card.product_code} / {detail.card.product_name}</Descriptions.Item>
            <Descriptions.Item label="当前工序">{detail.current_operation?.operation_name || detail.card.current_operation}</Descriptions.Item>
            <Descriptions.Item label="状态"><StatusTag value={detail.card.status} map={cardStatusMap} /></Descriptions.Item>
            <Descriptions.Item label="是否异常">{detail.has_abnormal ? <Tag color="red">存在异常</Tag> : <Tag color="green">无异常</Tag>}</Descriptions.Item>
            <Descriptions.Item label="图号">{detail.card.drawing_no || '-'}</Descriptions.Item>
          </Descriptions>

          <Form form={form} layout="vertical" onFinish={submit} className="reporting-scan-form">
            <Space.Compact block>
              <Form.Item name="good_qty" label="完成数量" rules={[{ required: true }]} style={{ width: '25%' }}>
                <InputNumber ref={qtyRef} min={0} precision={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="defect_qty" label="不良数量" style={{ width: '25%' }}>
                <InputNumber min={0} precision={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="scrap_qty" label="报废数量" style={{ width: '25%' }}>
                <InputNumber min={0} precision={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="rework_qty" label="返修数量" style={{ width: '25%' }}>
                <InputNumber min={0} precision={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Space.Compact>
            <Space.Compact block>
              <Form.Item name="operator" label="操作者" rules={[{ required: true }]} style={{ width: '33%' }}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="inspector" label="检验人" rules={[{ required: true }]} style={{ width: '33%' }}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="equipment" label="设备" style={{ width: '34%' }}>
                <Input size="large" />
              </Form.Item>
            </Space.Compact>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <Form.Item
                  name="defect_reason"
                  label="不良原因"
                  rules={[{ required: Number(getFieldValue('defect_qty') || 0) > 0, message: '不良数量大于 0 时必须填写原因' }]}
                >
                  <Input />
                </Form.Item>
              )}
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button size="large" type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>提交报工</Button>
          </Form>

          <HistoryTable data={detail.history} />
        </div>
      )}
    </div>
  );
}

function ManualReportPanel() {
  const { message } = App.useApp();
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<ProcessCard[]>([]);
  const [selected, setSelected] = useState<ProcessCard | null>(null);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const data = await apiRequest<PageResult<ProcessCard>>(`/reporting/cards?current=1&pageSize=20&q=${encodeURIComponent(query)}`);
    setCards(data.items);
  };
  useEffect(() => { void load(); }, []);

  const choose = async (record: ProcessCard) => {
    setSelected(record);
    const data = await apiRequest<CardDetail>(`/reporting/cards/${record.id}`);
    setDetail(data);
    form.resetFields();
    form.setFieldsValue({ good_qty: data.current_available_qty, defect_qty: 0, scrap_qty: 0, rework_qty: 0 });
  };

  const submit = async () => {
    if (!selected) return;
    const values = await form.validateFields();
    await apiRequest('/reporting/reports', {
      method: 'POST',
      body: JSON.stringify({ ...values, card_id: selected.id, report_type: 'manual' }),
    });
    message.success('手动报工已提交');
    setSelected(null);
    setDetail(null);
    form.resetFields();
    await load();
  };

  return (
    <AppPage>
      <AppToolbar selectionTip="先查询并选择一张流转卡">
        <Input.Search placeholder="按订单、产品、流转卡号、工序查询" value={query} onChange={(e) => setQuery(e.target.value)} onSearch={load} style={{ width: 360 }} />
      </AppToolbar>
      <AppProTable<ProcessCard>
        rowKey="id"
        dataSource={cards}
        pagination={false}
        columns={cardColumns()}
        onRow={(record) => ({ onClick: () => choose(record) })}
        scroll={{ x: 1200 }}
      />
      <Modal title={`手动报工 ${selected?.card_code || ''}`} open={Boolean(selected)} onCancel={() => setSelected(null)} onOk={submit} width={760}>
        {detail && <CardBrief detail={detail} />}
        <ReportForm form={form} manual />
      </Modal>
    </AppPage>
  );
}

function CardManagementPanel() {
  const { message } = App.useApp();
  const [cards, setCards] = useState<ProcessCard[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ProcessCard | null>(null);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [form] = Form.useForm();
  const [voidForm] = Form.useForm();

  const loadCards = async () => {
    const data = await apiRequest<PageResult<ProcessCard>>('/reporting/cards?current=1&pageSize=50');
    setCards(data.items);
    setTotal(data.total);
  };
  useEffect(() => {
    void loadCards();
    void apiRequest<PageResult<WorkOrder>>('/work-orders?current=1&pageSize=1000').then((data) => setWorkOrders(data.items));
  }, []);

  const refreshDetail = async (card: ProcessCard) => {
    setSelected(card);
    setDetail(await apiRequest<CardDetail>(`/reporting/cards/${card.id}`));
  };

  const generate = async () => {
    const values = await form.validateFields();
    const quantities = String(values.quantities)
      .split(/[,\n，\s]+/)
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    if (!quantities.length) {
      message.error('请填写批次数量');
      return;
    }
    await apiRequest('/reporting/cards/generate', {
      method: 'POST',
      body: JSON.stringify({ ...values, quantities }),
    });
    message.success('流转卡已生成');
    setGenerateOpen(false);
    form.resetFields();
    await loadCards();
  };

  const voidCard = async () => {
    if (!selected) return;
    const values = await voidForm.validateFields();
    await apiRequest(`/reporting/cards/${selected.id}/void`, { method: 'POST', body: JSON.stringify(values) });
    message.success('流转卡已作废');
    setVoidOpen(false);
    setSelected(null);
    await loadCards();
  };

  const openPrint = async () => {
    if (!selected) return;
    const data = await apiRequest<CardDetail>(`/reporting/cards/${selected.id}`);
    setDetail(data);
    setPrintOpen(true);
    await apiRequest(`/reporting/cards/${selected.id}/print`, { method: 'POST' });
  };

  return (
    <AppPage>
      <AppToolbar selectedCount={selected ? 1 : 0} onClearSelection={() => setSelected(null)} selectionTip={`共 ${total} 张流转卡`}>
        <AppActionButton type="primary" icon={<BarcodeOutlined />} label="生成流转卡" onClick={() => setGenerateOpen(true)} />
        <AppActionButton icon={<PrinterOutlined />} label="打印" disabledReason={!selected ? '请选择流转卡' : undefined} onClick={openPrint} />
        <AppActionButton icon={<FileSearchOutlined />} label="查看进度" disabledReason={!selected ? '请选择流转卡' : undefined} onClick={() => selected && refreshDetail(selected)} />
        <AppActionButton danger icon={<StopOutlined />} label="作废" disabledReason={!selected ? '请选择流转卡' : undefined} onClick={() => setVoidOpen(true)} />
      </AppToolbar>
      <AppProTable<ProcessCard>
        rowKey="id"
        dataSource={cards}
        pagination={{ pageSize: 10 }}
        columns={cardColumns()}
        rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected.id] : [], onChange: (_, rows) => setSelected(rows[0] ?? null) }}
        onRow={(record) => ({ onClick: () => setSelected(record) })}
        scroll={{ x: 1280 }}
      />
      {detail && !printOpen && (
        <Modal title={`流转进度 ${detail.card.card_code}`} open={Boolean(detail)} onCancel={() => setDetail(null)} footer={null} width={900}>
          <CardBrief detail={detail} />
          <RouteTable data={detail.operations} />
          <HistoryTable data={detail.history} />
        </Modal>
      )}
      <Modal title="根据生产订单生成流转卡" open={generateOpen} onCancel={() => setGenerateOpen(false)} onOk={generate} width={720}>
        <Form form={form} layout="vertical">
          <Form.Item name="production_order_id" label="生产订单" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={workOrders.map((item) => ({ value: item.id, label: `${item.code} - ${item.product_code || ''} ${item.product_name || ''}` }))}
            />
          </Form.Item>
          <Form.Item name="quantities" label="拆分批次数量" rules={[{ required: true }]} tooltip="用逗号、空格或换行分隔，例如 50, 50, 30">
            <Input.TextArea rows={3} placeholder="50, 50, 30" />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="drawing_no" label="产品图号" style={{ width: '50%' }}><Input /></Form.Item>
            <Form.Item name="created_by" label="创建人" style={{ width: '50%' }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item name="process_hint" label="注意区分 / 工艺提示"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="special_remarks" label="产品特殊备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="remarks" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="作废流转卡" open={voidOpen} onCancel={() => setVoidOpen(false)} onOk={voidCard}>
        <Form form={voidForm} layout="vertical">
          <Form.Item name="reason" label="作废原因" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="actor" label="操作人"><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title="打印工序流转卡" open={printOpen} onCancel={() => setPrintOpen(false)} footer={<Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>} width={900}>
        {detail && <PrintCard detail={detail} />}
      </Modal>
    </AppPage>
  );
}

function ReportQueryPanel() {
  const [reports, setReports] = useState<OperationReport[]>([]);
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();

  const load = async () => {
    const values = form.getFieldsValue();
    const params = new URLSearchParams({ current: '1', pageSize: '50' });
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const data = await apiRequest<PageResult<OperationReport>>(`/reporting/reports?${params.toString()}`);
    setReports(data.items);
    setTotal(data.total);
  };
  useEffect(() => { void load(); }, []);

  const columns = [
    { title: '报工单号', dataIndex: 'report_no', width: 160, render: (value: string) => <Text copyable>{value}</Text> },
    { title: '流转卡号', dataIndex: 'card_code', width: 210 },
    { title: '订单', dataIndex: 'production_order_code', width: 150 },
    { title: '产品', width: 220, render: (_: any, r: OperationReport) => `${r.product_code || ''} ${r.product_name || ''}` },
    { title: '工序', dataIndex: 'operation_name', width: 120 },
    { title: '类型', dataIndex: 'report_type', width: 80, render: (value: string) => value === 'manual' ? <Tag color="orange">手动</Tag> : <Tag color="blue">扫码</Tag> },
    { title: '良品', dataIndex: 'good_qty', width: 80 },
    { title: '不良', dataIndex: 'defect_qty', width: 80 },
    { title: '报废', dataIndex: 'scrap_qty', width: 80 },
    { title: '返修', dataIndex: 'rework_qty', width: 80 },
    { title: '操作者', dataIndex: 'operator', width: 100 },
    { title: '检验人', dataIndex: 'inspector', width: 100 },
    { title: '时间', dataIndex: 'created_at', width: 180 },
  ];

  return (
    <AppPage>
      <AppToolbar selectionTip={`共 ${total} 条报工记录`}>
        <Form form={form} layout="inline" onFinish={load}>
          <Form.Item name="date_from"><Input placeholder="开始日期 YYYY-MM-DD" /></Form.Item>
          <Form.Item name="production_order_id"><Input placeholder="订单" /></Form.Item>
          <Form.Item name="product"><Input placeholder="产品" /></Form.Item>
          <Form.Item name="operation"><Input placeholder="工序" /></Form.Item>
          <Form.Item name="operator"><Input placeholder="操作者" /></Form.Item>
          <Form.Item name="abnormal"><Select allowClear placeholder="不良情况" style={{ width: 120 }} options={[{ value: true, label: '有不良' }]} /></Form.Item>
          <Button htmlType="submit" type="primary">查询</Button>
        </Form>
      </AppToolbar>
      <AppProTable<OperationReport> rowKey="id" dataSource={reports} pagination={{ pageSize: 10 }} columns={columns} scroll={{ x: 1600 }} />
    </AppPage>
  );
}

function AbnormalPanel() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AbnormalRecord[]>([]);
  const [selected, setSelected] = useState<AbnormalRecord | null>(null);
  const [handleOpen, setHandleOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const data = await apiRequest<PageResult<AbnormalRecord>>('/reporting/abnormals?current=1&pageSize=50');
    setRows(data.items);
  };
  useEffect(() => { void load(); }, []);

  const handle = async () => {
    if (!selected) return;
    const values = await form.validateFields();
    await apiRequest(`/reporting/abnormals/${selected.id}/handle`, { method: 'POST', body: JSON.stringify(values) });
    message.success('异常已关闭并回写流转卡状态');
    setSelected(null);
    setHandleOpen(false);
    form.resetFields();
    await load();
  };

  const columns = [
    { title: '异常单号', dataIndex: 'abnormal_no', width: 160 },
    { title: '流转卡', dataIndex: 'card_code', width: 210 },
    { title: '产品', width: 220, render: (_: any, r: AbnormalRecord) => `${r.product_code || ''} ${r.product_name || ''}` },
    { title: '工序', dataIndex: 'operation_name', width: 120 },
    { title: '类型', dataIndex: 'abnormal_type', width: 90, render: (value: string) => <Tag color="red">{abnormalTypeText[value] ?? value}</Tag> },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '原因', dataIndex: 'reason', width: 220 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => value === 'closed' ? <Tag color="green">已关闭</Tag> : <Tag color="red">待处理</Tag> },
    { title: '处理方式', dataIndex: 'handling_method', width: 120, render: (value: string) => handlingOptions.find((item) => item.value === value)?.label ?? (value || '-') },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
  ];

  return (
    <AppPage>
      <AppToolbar selectedCount={selected ? 1 : 0} onClearSelection={() => setSelected(null)} selectionTip="选择一条异常后处理">
        <AppActionButton
          type="primary"
          icon={<ToolOutlined />}
          label="处理异常"
          disabledReason={!selected ? '请选择异常记录' : selected.status === 'closed' ? '该异常已关闭' : undefined}
          onClick={() => { form.setFieldsValue({ handling_method: 'continue' }); setHandleOpen(true); }}
        />
      </AppToolbar>
      <AppProTable<AbnormalRecord>
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={columns}
        rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected.id] : [], onChange: (_, selectedRows) => setSelected(selectedRows[0] ?? null) }}
        onRow={(record) => ({ onClick: () => setSelected(record) })}
        scroll={{ x: 1400 }}
      />
      <Modal title={`处理异常 ${selected?.abnormal_no || ''}`} open={handleOpen} onCancel={() => setHandleOpen(false)} onOk={handle}>
        <Form form={form} layout="vertical">
          <Form.Item name="handling_method" label="处理方式" rules={[{ required: true }]}>
            <Select options={handlingOptions} />
          </Form.Item>
          <Form.Item name="handled_by" label="处理人"><Input /></Form.Item>
          <Form.Item name="remark" label="处理备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}

function ReportForm({ form, manual }: { form: any; manual?: boolean }) {
  return (
    <Form form={form} layout="vertical">
      <Space.Compact block>
        <Form.Item name="good_qty" label="完成数量" rules={[{ required: true }]} style={{ width: '25%' }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="defect_qty" label="不良数量" style={{ width: '25%' }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="scrap_qty" label="报废数量" style={{ width: '25%' }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="rework_qty" label="返修数量" style={{ width: '25%' }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
      </Space.Compact>
      <Space.Compact block>
        <Form.Item name="operator" label="操作者" rules={[{ required: true }]} style={{ width: '33%' }}><Input /></Form.Item>
        <Form.Item name="inspector" label="检验人" rules={[{ required: true }]} style={{ width: '33%' }}><Input /></Form.Item>
        <Form.Item name="equipment" label="设备" style={{ width: '34%' }}><Input /></Form.Item>
      </Space.Compact>
      <Form.Item name="defect_reason" label="不良原因"><Input /></Form.Item>
      {manual && <Form.Item name="manual_reason" label="手动原因 / 修正原因" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>}
      <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
    </Form>
  );
}

function CardBrief({ detail }: { detail: CardDetail }) {
  return (
    <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
      <Descriptions.Item label="流转卡号">{detail.card.card_code}</Descriptions.Item>
      <Descriptions.Item label="状态"><StatusTag value={detail.card.status} map={cardStatusMap} /></Descriptions.Item>
      <Descriptions.Item label="产品">{detail.card.product_code} / {detail.card.product_name}</Descriptions.Item>
      <Descriptions.Item label="本卡数量">{detail.card.card_qty} {detail.card.unit}</Descriptions.Item>
      <Descriptions.Item label="当前工序">{detail.card.current_operation}</Descriptions.Item>
      <Descriptions.Item label="可报数量">{detail.current_available_qty}</Descriptions.Item>
    </Descriptions>
  );
}

function RouteTable({ data }: { data: RouteOperation[] }) {
  return (
    <Table
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={data}
      columns={[
        { title: '序号', dataIndex: 'sequence', width: 80 },
        { title: '执行工序', dataIndex: 'operation_name' },
        { title: '良品', dataIndex: 'good_qty', width: 80 },
        { title: '不良', dataIndex: 'defect_qty', width: 80 },
        { title: '报废', dataIndex: 'scrap_qty', width: 80 },
        { title: '返修', dataIndex: 'rework_qty', width: 80 },
        { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <StatusTag value={value} map={operationStatusMap} /> },
      ]}
    />
  );
}

function HistoryTable({ data }: { data: OperationReport[] }) {
  return (
    <Table
      title={() => '历史报工记录'}
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={data}
      columns={[
        { title: '时间', dataIndex: 'created_at', width: 180 },
        { title: '工序', dataIndex: 'operation_name', width: 120 },
        { title: '良品', dataIndex: 'good_qty', width: 80 },
        { title: '不良', dataIndex: 'defect_qty', width: 80 },
        { title: '报废', dataIndex: 'scrap_qty', width: 80 },
        { title: '返修', dataIndex: 'rework_qty', width: 80 },
        { title: '操作者', dataIndex: 'operator', width: 100 },
        { title: '备注', dataIndex: 'remark' },
      ]}
    />
  );
}

function PrintCard({ detail }: { detail: CardDetail }) {
  return (
    <div className="process-card-print">
      <div className="print-head">
        <div>
          <Text strong>公司名称</Text>
          <Title level={3}>工序流转卡</Title>
          <Text copyable>{detail.card.card_code}</Text>
        </div>
        <QRCode value={detail.card.card_code} size={118} bordered={false} />
      </div>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="产品名称">{detail.card.product_name}</Descriptions.Item>
        <Descriptions.Item label="物料编码">{detail.card.product_code}</Descriptions.Item>
        <Descriptions.Item label="单位">{detail.card.unit}</Descriptions.Item>
        <Descriptions.Item label="本卡数量">{detail.card.card_qty}</Descriptions.Item>
        <Descriptions.Item label="产品图号">{detail.card.drawing_no || '-'}</Descriptions.Item>
        <Descriptions.Item label="备注">{detail.card.remarks || '-'}</Descriptions.Item>
        <Descriptions.Item label="注意区分 / 工艺提示" span={2}>{detail.card.process_hint || '-'}</Descriptions.Item>
        <Descriptions.Item label="产品特殊备注" span={2}>{detail.card.special_remarks || '-'}</Descriptions.Item>
      </Descriptions>
      <Table
        className="print-route-table"
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={detail.operations}
        columns={[
          { title: '日期', render: () => '' },
          { title: '执行工序', dataIndex: 'operation_name' },
          { title: '完成流转数', dataIndex: 'good_qty' },
          { title: '不良扣减数 / 单号', render: (_: any, r: RouteOperation) => r.defect_qty || '' },
          { title: '检验人', render: () => '' },
          { title: '操作者', render: () => '' },
          { title: '备注', render: () => '' },
        ]}
      />
    </div>
  );
}

function cardColumns() {
  return [
    { title: '流转卡号', dataIndex: 'card_code', width: 220, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '生产订单', dataIndex: 'production_order_code', width: 150 },
    { title: '产品', width: 230, render: (_: any, r: ProcessCard) => `${r.product_code} ${r.product_name}` },
    { title: '本卡数量', dataIndex: 'card_qty', width: 100 },
    { title: '当前工序', dataIndex: 'current_operation', width: 130 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <StatusTag value={value} map={cardStatusMap} /> },
    { title: '打印时间', dataIndex: 'printed_at', width: 180, render: (value: string | null) => value || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
  ];
}
