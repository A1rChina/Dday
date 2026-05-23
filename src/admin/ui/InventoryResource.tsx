import { useEffect, useMemo, useState } from 'react';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import {
  ApartmentOutlined,
  BarChartOutlined,
  ClearOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  LinkOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { AppDrawerForm, AppPage, AppPageHeader, AppProTable } from './components';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type InventoryBalance = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  projectId: string | null;
  projectCode: string;
  customerId: string | null;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string | null;
  locationCode: string;
  inventoryStatus: string;
  quantity: number;
  unit: string;
  sourceNo: string;
  lastTransactionAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InventoryTransaction = {
  id: string;
  transactionNo: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  projectId: string | null;
  projectCode: string;
  customerId: string | null;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string | null;
  locationCode: string;
  transactionType: string;
  quantityChange: number;
  beforeQuantity: number;
  afterQuantity: number;
  fromStatus: string;
  toStatus: string;
  sourceNo: string;
  sourceId: string;
  sourceType: string;
  operatorName: string;
  remark: string;
  occurredAt: string;
  createdAt: string;
};

type QueryScheme = {
  name: string;
  view: string;
  values: Record<string, any>;
};

const storageKey = 'dday.inventory.querySchemes';

const statusOptions = [
  { label: '可用', value: 'available' },
  { label: '冻结', value: 'frozen' },
  { label: '质检冻结', value: 'held' },
  { label: '报废', value: 'scrap' },
  { label: '已报废', value: 'scrapped' },
];

const transactionTypeOptions = [
  { label: '入库', value: 'receipt' },
  { label: '出库', value: 'issue' },
  { label: '生产入库', value: 'production_good_in' },
  { label: '生产报废', value: 'production_scrap' },
  { label: '库存调整', value: 'adjustment' },
  { label: '库存冻结', value: 'inventory_freeze' },
  { label: '库存解冻', value: 'inventory_unfreeze' },
];

const statusColors: Record<string, string> = {
  available: 'green',
  frozen: 'volcano',
  held: 'orange',
  scrap: 'default',
  scrapped: 'default',
};

const statusText: Record<string, string> = {
  available: '可用',
  frozen: '冻结',
  held: '质检冻结',
  scrap: '报废',
  scrapped: '已报废',
};

const transactionTypeText: Record<string, string> = {
  receipt: '入库',
  issue: '出库',
  adjustment: '调整',
  production_good_in: '生产入库',
  production_scrap: '生产报废',
  inventory_freeze: '冻结',
  inventory_unfreeze: '解冻',
};

const sourceTypeText: Record<string, string> = {
  warehouse_receipt: '入库单',
  warehouse_issue: '出库单',
  stocktake: '盘点单',
  production: '生产单',
  shipment: '发货单',
};

function compactFilters(values: Record<string, any>) {
  const next: Record<string, string> = {};
  const set = (key: string, value: any) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;
    next[key] = Array.isArray(value) ? value.join(',') : String(value);
  };

  set('q', values.q);
  set('project_code', values.project_code);
  set('item_code', values.item_code);
  set('item_name', values.item_name);
  set('warehouse_ids', values.warehouse_ids);
  set('inventory_statuses', values.inventory_statuses);
  set('customer_name', values.customer_name);
  set('source_no', values.source_no);
  set('location_code', values.location_code);
  set('operator_name', values.operator_name);
  set('source_type', values.source_type);
  set('quantity_min', values.quantity_min);
  set('quantity_max', values.quantity_max);
  set('transaction_types', values.transaction_types);
  set('abnormal_only', values.abnormal_only ? 'true' : '');
  set('overdue_only', values.overdue_only ? 'true' : '');
  set('low_stock_only', values.low_stock_only ? 'true' : '');

  if (values.date_range?.[0] && values.date_range?.[1]) {
    next.updated_from = values.date_range[0].format('YYYY-MM-DD');
    next.updated_to = values.date_range[1].format('YYYY-MM-DD');
    next.occurred_from = next.updated_from;
    next.occurred_to = next.updated_to;
  }
  return next;
}

function buildPermanentFilters(filters: Record<string, string>, view: string) {
  return {
    permanent: Object.entries(filters)
      .filter(([key, value]) => value && !(view === 'balances' && key.startsWith('occurred_')) && !(view === 'transactions' && key.startsWith('updated_')))
      .map(([field, value]) => ({ field, operator: 'eq' as const, value })),
  };
}

function readSchemes(): QueryScheme[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    message.warning('当前没有可导出的数据');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function itemLabel(record: { itemCode: string; itemName: string }) {
  return record.itemCode ? `${record.itemCode} ${record.itemName || ''}` : record.itemName || '-';
}

function statusTag(value: string) {
  return <Tag color={statusColors[value] ?? 'default'}>{statusText[value] ?? (value || '-')}</Tag>;
}

async function fetchSummary(resource: string, filters: Record<string, string>) {
  const params = new URLSearchParams({ current: '1', pageSize: '1' });
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const token = localStorage.getItem('APP_TOKEN') || '';
  const role = localStorage.getItem('APP_ROLE') || 'admin';
  const res = await fetch(`/api/${resource}?${params.toString()}`, {
    headers: { 'x-app-token': token, 'x-app-role': role },
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) throw new Error(json.error || 'summary request failed');
  return json.data?.summary ?? null;
}

export function InventoryResource() {
  const [form] = Form.useForm();
  const [schemeForm] = Form.useForm();
  const [activeView, setActiveView] = useState('balances');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [schemes, setSchemes] = useState<QueryScheme[]>(() => readSchemes());
  const [selected, setSelected] = useState<InventoryBalance | InventoryTransaction | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const { data: user } = useGetIdentity<{ displayName: string }>();

  const balanceFilters = useMemo(() => buildPermanentFilters(filters, 'balances'), [filters]);
  const transactionFilters = useMemo(() => buildPermanentFilters(filters, 'transactions'), [filters]);

  const { tableProps: balancesTable } = useTable<InventoryBalance>({
    resource: 'inventory-balances',
    pagination: { pageSize: 10 },
    filters: balanceFilters,
  });

  const { tableProps: transactionsTable } = useTable<InventoryTransaction>({
    resource: 'inventory-transactions',
    pagination: { pageSize: 10 },
    filters: transactionFilters,
  });

  useEffect(() => {
    fetchSummary(activeView === 'transactions' ? 'inventory-transactions' : 'inventory-balances', filters)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [activeView, filters]);

  const applySearch = () => {
    const values = form.getFieldsValue();
    setFilters(compactFilters(values));
    setSelected(null);
  };

  const resetSearch = () => {
    form.resetFields();
    setFilters({});
    setSelected(null);
  };

  const saveScheme = async () => {
    const { name } = await schemeForm.validateFields();
    const next = [
      ...schemes.filter((scheme) => scheme.name !== name),
      { name, view: activeView, values: form.getFieldsValue() },
    ];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSchemes(next);
    schemeForm.resetFields();
    message.success('查询方案已保存');
  };

  const loadScheme: MenuProps['onClick'] = ({ key }) => {
    const scheme = schemes.find((item) => item.name === key);
    if (!scheme) return;
    setActiveView(scheme.view);
    form.setFieldsValue(scheme.values);
    setFilters(compactFilters(scheme.values));
  };

  const drillDown = (nextFilters: Record<string, string>, view = 'balances') => {
    setActiveView(view);
    setFilters({ ...filters, ...nextFilters });
  };

  const balanceRows = (balancesTable.dataSource ?? []) as InventoryBalance[];
  const transactionRows = (transactionsTable.dataSource ?? []) as InventoryTransaction[];

  const balanceColumns = [
    { title: '物料', dataIndex: 'itemCode', width: 220, sorter: true, render: (_: string, record: InventoryBalance) => <Text strong>{itemLabel(record)}</Text> },
    { title: '项目', dataIndex: 'projectCode', width: 130 },
    { title: '客户', dataIndex: 'customerName', width: 140 },
    { title: '仓库', dataIndex: 'warehouseId', width: 110, sorter: true, render: (value: string) => <Tag icon={<ApartmentOutlined />}>{value || '-'}</Tag> },
    { title: '库位', dataIndex: 'locationCode', width: 110, render: (value: string, record: InventoryBalance) => value || record.locationId || '默认' },
    { title: '状态', dataIndex: 'inventoryStatus', width: 110, sorter: true, render: statusTag },
    { title: '数量', dataIndex: 'quantity', width: 120, sorter: true, render: (value: number, record: InventoryBalance) => <Text strong>{value} {record.unit}</Text> },
    { title: '来源单据', dataIndex: 'sourceNo', width: 160, render: (value: string) => value ? <Text copyable>{value}</Text> : '-' },
    { title: '最后变动', dataIndex: 'lastTransactionAt', width: 180, sorter: true, render: (value: string) => value || '-' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, sorter: true },
  ];

  const transactionColumns = [
    { title: '流水号', dataIndex: 'transactionNo', width: 170, sorter: true, render: (value: string) => <Text copyable strong>{value}</Text> },
    { title: '类型', dataIndex: 'transactionType', width: 120, sorter: true, render: (value: string) => <Tag color="blue">{transactionTypeText[value] ?? value}</Tag> },
    { title: '物料', dataIndex: 'itemCode', width: 220, render: (_: string, record: InventoryTransaction) => itemLabel(record) },
    { title: '项目', dataIndex: 'projectCode', width: 130 },
    { title: '仓库', dataIndex: 'warehouseId', width: 100, sorter: true },
    { title: '库位', dataIndex: 'locationCode', width: 110, render: (value: string, record: InventoryTransaction) => value || record.locationId || '默认' },
    { title: '状态', dataIndex: 'toStatus', width: 110, render: statusTag },
    { title: '变动数量', dataIndex: 'quantityChange', width: 120, sorter: true, render: (value: number) => <Text type={value < 0 ? 'danger' : 'success'}>{value > 0 ? `+${value}` : value}</Text> },
    { title: '变动前', dataIndex: 'beforeQuantity', width: 100 },
    { title: '变动后', dataIndex: 'afterQuantity', width: 100 },
    { title: '来源单据', dataIndex: 'sourceNo', width: 170, render: (value: string, record: InventoryTransaction) => <Text copyable>{value || record.sourceId}</Text> },
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
    { title: '发生时间', dataIndex: 'occurredAt', width: 180, sorter: true },
  ];

  const schemeItems = schemes.map((scheme) => ({ key: scheme.name, label: scheme.name }));

  const filterPanel = (
    <Card size="small" bodyStyle={{ padding: 16 }} style={{ marginBottom: 12 }}>
      <Form form={form} layout="vertical" onFinish={applySearch}>
        <Row gutter={12}>
          <Col xs={24} md={8} lg={4}><Form.Item label="项目" name="project_code"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} lg={4}><Form.Item label="物料编码" name="item_code"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} lg={4}><Form.Item label="物料名称" name="item_name"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} lg={4}><Form.Item label="仓库" name="warehouse_ids"><Select mode="tags" allowClear tokenSeparators={[',']} /></Form.Item></Col>
          <Col xs={24} md={8} lg={4}><Form.Item label="库存状态" name="inventory_statuses"><Select mode="multiple" allowClear options={statusOptions} /></Form.Item></Col>
          <Col xs={24} md={8} lg={4}><Form.Item label="时间范围" name="date_range"><RangePicker style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item noStyle shouldUpdate>
          {() => (
            <Tabs
              size="small"
              items={[{
                key: 'advanced',
                label: '高级筛选',
                children: (
                  <Row gutter={12}>
                    <Col xs={24} md={8} lg={4}><Form.Item label="客户" name="customer_name"><Input allowClear /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="供应商" name="supplier_name"><Input allowClear disabled placeholder="待接主数据" /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="批次" name="batch_no"><Input allowClear disabled placeholder="待接批次表" /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="库位" name="location_code"><Input allowClear /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="责任方" name="responsible_party"><Input allowClear disabled placeholder="异常单字段" /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="操作人" name="operator_name"><Input allowClear /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="来源单据" name="source_no"><Input allowClear /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="来源类型" name="source_type"><Select allowClear options={Object.entries(sourceTypeText).map(([value, label]) => ({ value, label }))} /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="数量下限" name="quantity_min"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="数量上限" name="quantity_max"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="流水类型" name="transaction_types"><Select mode="multiple" allowClear options={transactionTypeOptions} /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="是否异常" name="abnormal_only" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="是否超期" name="overdue_only" valuePropName="checked"><Switch disabled /></Form.Item></Col>
                    <Col xs={24} md={8} lg={4}><Form.Item label="低于安全库存" name="low_stock_only" valuePropName="checked"><Switch disabled /></Form.Item></Col>
                  </Row>
                ),
              }]}
            />
          )}
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
          <Button icon={<ClearOutlined />} onClick={resetSearch}>重置</Button>
          <Form form={schemeForm} layout="inline">
            <Form.Item name="name" rules={[{ required: true, message: '请输入方案名' }]}>
              <Input placeholder="查询方案名" style={{ width: 160 }} />
            </Form.Item>
            <Button icon={<SaveOutlined />} onClick={saveScheme}>保存查询方案</Button>
          </Form>
          <Dropdown menu={{ items: schemeItems, onClick: loadScheme }} disabled={!schemes.length}>
            <Button>加载方案</Button>
          </Dropdown>
          <Button icon={<DownloadOutlined />} onClick={() => saveCsv(`${activeView}-${dayjs().format('YYYYMMDDHHmm')}.csv`, activeView === 'transactions' ? transactionRows : balanceRows)}>
            导出 Excel
          </Button>
        </Space>
      </Form>
    </Card>
  );

  const summaryPanel = (
    <Row gutter={12} style={{ marginBottom: 12 }}>
      <Col xs={12} md={6}>
        <Card size="small" onClick={() => drillDown({}, 'balances')}>
          <Statistic title="库存总量" value={summary?.totalQuantity ?? summary?.netQuantity ?? 0} prefix={<DatabaseOutlined />} />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card size="small" onClick={() => drillDown({ inventory_statuses: 'available' }, 'balances')}>
          <Statistic title="可用库存" value={summary?.availableQuantity ?? summary?.inQuantity ?? 0} valueStyle={{ color: '#16a34a' }} />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card size="small" onClick={() => drillDown({ abnormal_only: 'true' }, 'balances')}>
          <Statistic title="异常/冻结" value={summary?.abnormalQuantity ?? summary?.outQuantity ?? 0} valueStyle={{ color: '#dc2626' }} />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card size="small" onClick={() => setActiveView('transactions')}>
          <Statistic title="记录数" value={summary?.skuCount ?? summary?.movementCount ?? 0} prefix={<BarChartOutlined />} />
        </Card>
      </Col>
    </Row>
  );

  return (
    <AppPage>
      <AppPageHeader title="库存管理" description="库存总览、明细、流水与关联单据追溯" />
      {filterPanel}
      {summaryPanel}

      <Tabs
        activeKey={activeView}
        onChange={setActiveView}
        items={[
          {
            key: 'overview',
            label: <span><BarChartOutlined /> 库存总览</span>,
            children: (
              <Row gutter={12}>
                <Col xs={24} lg={12}>
                  <AppProTable<InventoryBalance>
                    {...balancesTable}
                    columns={balanceColumns.slice(0, 7)}
                    options={{ setting: true, density: true, reload: false }}
                    scroll={{ x: 1000 }}
                    onRow={(record) => ({ onClick: () => setSelected(record) })}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <AppProTable<InventoryTransaction>
                    {...transactionsTable}
                    columns={transactionColumns.slice(0, 8)}
                    options={{ setting: true, density: true, reload: false }}
                    scroll={{ x: 1100 }}
                    onRow={(record) => ({ onClick: () => setSelected(record) })}
                  />
                </Col>
              </Row>
            ),
          },
          {
            key: 'balances',
            label: <span><FileSearchOutlined /> 库存明细</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <AppDrawerForm
                  title="手工库存调整"
                  trigger={<Button type="primary">手工调整</Button>}
                  drawerProps={{ width: 480, className: 'mes-entity-drawer' }}
                  useMutationProps={{
                    mutationOptions: {
                      mutationFn: async (values: any) => {
                        const res = await fetch('/api/inventory/adjust', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            itemId: values.item_id,
                            warehouseId: values.warehouse_id,
                            locationId: values.location_id || '',
                            qtyDelta: values.qty_delta,
                            reason: values.reason,
                            actorName: user?.displayName || 'admin',
                          }),
                        });
                        if (!res.ok) throw new Error('调整失败');
                        return res.json();
                      },
                      onSuccess: () => {
                        balancesTable.onChange?.({ current: 1 } as any, {}, {}, {} as any);
                        transactionsTable.onChange?.({ current: 1 } as any, {}, {}, {} as any);
                      },
                    },
                  }}
                >
                  <Form.Item label="物料ID" name="item_id" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="仓库ID" name="warehouse_id" initialValue="MAIN" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="库位ID" name="location_id"><Input /></Form.Item>
                  <Form.Item label="调整数量" name="qty_delta" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                  <Form.Item label="调整原因" name="reason"><Input.TextArea /></Form.Item>
                </AppDrawerForm>
                <AppProTable<InventoryBalance>
                  {...balancesTable}
                  columns={balanceColumns}
                  options={{ setting: true, density: true, reload: false }}
                  scroll={{ x: 1500 }}
                  onRow={(record) => ({ onClick: () => setSelected(record) })}
                />
              </Space>
            ),
          },
          {
            key: 'transactions',
            label: <span><HistoryOutlined /> 库存流水</span>,
            children: (
              <AppProTable<InventoryTransaction>
                {...transactionsTable}
                columns={transactionColumns}
                options={{ setting: true, density: true, reload: false }}
                scroll={{ x: 1700 }}
                onRow={(record) => ({ onClick: () => setSelected(record) })}
              />
            ),
          },
          {
            key: 'documents',
            label: <span><LinkOutlined /> 关联单据</span>,
            children: (
              <AppProTable<InventoryTransaction>
                {...transactionsTable}
                columns={transactionColumns.filter((column: any) => ['transactionNo', 'transactionType', 'itemCode', 'sourceNo', 'operatorName', 'occurredAt'].includes(column.dataIndex))}
                options={{ setting: true, density: true, reload: false }}
                scroll={{ x: 1000 }}
                onRow={(record) => ({ onClick: () => setSelected(record) })}
              />
            ),
          },
        ]}
      />

      <Drawer title="库存追溯详情" open={Boolean(selected)} onClose={() => setSelected(null)} width={560}>
        {selected && (
          <Descriptions bordered column={1} size="small">
            {'transactionNo' in selected && <Descriptions.Item label="流水号">{selected.transactionNo}</Descriptions.Item>}
            <Descriptions.Item label="物料">{itemLabel(selected)}</Descriptions.Item>
            <Descriptions.Item label="项目">{selected.projectCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{selected.customerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="仓库">{selected.warehouseName || selected.warehouseId || '-'}</Descriptions.Item>
            <Descriptions.Item label="库位">{selected.locationCode || selected.locationId || '默认'}</Descriptions.Item>
            {'inventoryStatus' in selected && <Descriptions.Item label="库存状态">{statusTag(selected.inventoryStatus)}</Descriptions.Item>}
            {'quantity' in selected && <Descriptions.Item label="当前数量">{selected.quantity} {selected.unit}</Descriptions.Item>}
            {'quantityChange' in selected && <Descriptions.Item label="变动数量">{selected.quantityChange}</Descriptions.Item>}
            {'beforeQuantity' in selected && <Descriptions.Item label="变动前后">{selected.beforeQuantity} / {selected.afterQuantity}</Descriptions.Item>}
            {'sourceNo' in selected && <Descriptions.Item label="来源单据"><Text copyable>{selected.sourceNo || selected.sourceId || '-'}</Text></Descriptions.Item>}
            {'sourceType' in selected && <Descriptions.Item label="来源类型">{sourceTypeText[selected.sourceType] ?? selected.sourceType}</Descriptions.Item>}
            {'operatorName' in selected && <Descriptions.Item label="操作人">{selected.operatorName || '-'}</Descriptions.Item>}
            {'occurredAt' in selected && <Descriptions.Item label="发生时间">{selected.occurredAt}</Descriptions.Item>}
            {'updatedAt' in selected && <Descriptions.Item label="更新时间">{selected.updatedAt}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </AppPage>
  );
}
