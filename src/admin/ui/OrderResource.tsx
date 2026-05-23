import { useState, useMemo, useEffect } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { useInvalidate, useList } from '@refinedev/core';
import { useTable, useSelect } from '@refinedev/antd';
import {
  Alert,
  Button,
  Input,
  Modal,
  Drawer,
  Space,
  Table,
  Tag,
  Timeline,
  Form,
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  AutoComplete,
  InputNumber,
  Typography,
  Tooltip,
  Divider,
  Empty,
  App,
  Steps,
  Tabs,
  Collapse,
  Progress
} from 'antd';
import {
  PlusOutlined,
  PushpinOutlined,
  TruckOutlined,
  HistoryOutlined,
  ExportOutlined,
  SearchOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  SettingOutlined,
  WarningOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ColumnHeightOutlined,
  FullscreenOutlined
} from '@ant-design/icons';
import { apiRequest } from '../api';
import dayjs from 'dayjs';

import {
  AppPage,
  AppPageHeader,
  AppToolbar,
  AppProTable,
  AppSearchForm,
  AppStatusTag,
  AppActionButton,
  AppDrawerForm,
  EnterprisePageLayout,
  SearchFilterCard,
  TableActionToolbar,
  TableCard,
} from './components';

const { Title, Text } = Typography;

// ─── Utilities ─────────────────────────────────────────────────────

const getDataArray = (data: any): any[] => {
  const value = data?.data?.data || data?.data || [];
  return Array.isArray(value) ? value : [];
};

const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

const matchesCustomer = (product: any, customerName: unknown) => {
  const selected = normalizeText(customerName);
  if (!selected) return true;
  const customer = normalizeText(product.customer_name);
  return customer === selected || customer.includes(selected);
};

const matchesProject = (product: any, projectName: unknown) => {
  const selected = normalizeText(projectName);
  if (!selected) return true;
  return normalizeText(product.project_name) === selected;
};

const uniqueByValue = (items: Array<{ value: string; label: string }>) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.value || seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
};

// ─── Types ─────────────────────────────────────────────────────────

type OrderItem = {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  delivered_quantity: number;
  material_received_quantity?: number;
  material_registered_quantity?: number;
  due_date: string;
  status: string;
  notes: string;
};

type Order = {
  id: string;
  demand_id: string;
  demand_code: string;
  code: string;
  customer_id: string;
  customer_name: string;
  project_code?: string;
  project_name?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  source_type: string;
  quantity: number;
  delivered_quantity: number;
  unshipped_quantity: number;
  status: string;
  due_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  order_id: string; // compatibility
  order_code: string; // compatibility
  demand_line_id: string;
  delivery_progress?: number;
  material_progress?: number;
  items?: OrderItem[];
};

// ─── Status Configuration ──────────────────────────────────────────

const orderStatusMeta: Record<string, { text: string; color: string }> = {
  imported: { text: '已导入', color: 'default' },
  confirmed: { text: '已确认', color: 'blue' },
  planned: { text: '已计划', color: 'cyan' },
  in_production: { text: '生产中', color: 'processing' },
  ready_to_ship: { text: '待发货', color: 'orange' },
  shipped: { text: '已发货', color: 'green' },
  closed: { text: '已关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'error' },
};

// ─── Helper Components ─────────────────────────────────────────────

function LongText({ value, maxWidth = 180, strong = false }: { value?: string | null; maxWidth?: number; strong?: boolean }) {
  const text = value || '-';
  return (
    <Text
      strong={strong}
      style={{
        maxWidth,
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.45,
      }}
      title={text}
    >
      {text}
    </Text>
  );
}

function WarehouseRouteCell({ index, form, productList }: { index: number; form: any; productList: any }) {
  const productId = Form.useWatch(['items', index, 'product_id'], form);
  const productsArray = productList?.data?.data || productList?.data || [];
  const product = productsArray.find((p: any) => p.id === productId);
  if (!product) return <Text type="secondary">未选择产品</Text>;
  const prodName = product.name || '';
  let defaultWarehouse = '宜宾工厂仓 (YB_WH)';
  let color = 'blue';
  if (prodName.includes('右边梁')) {
    defaultWarehouse = '重庆工厂仓 (CQ_WH)';
    color = 'magenta';
  } else if (['纵梁', '安装梁1', '前边梁'].some(name => prodName.includes(name))) {
    defaultWarehouse = '外协单位仓 (SUB_WH)';
    color = 'purple';
  }
  return <Tag color={color}>{defaultWarehouse}</Tag>;
}

// ─── Business Logic Helpers ────────────────────────────────────────

type PushPlanResult = {
  production_plan_id: string;
  production_plan_code: string;
  existed?: boolean;
};

const actionBlockedReason = (selectedCount: number, actionName: string) => {
  if (selectedCount === 0) return `请先选择一条订单再${actionName}`;
  if (selectedCount > 1) return '暂不支持批量操作';
  return '';
};

const isEditableStatus = (status?: string) => Boolean(status && !['cancelled', 'closed'].includes(status));

// ─── Order Form Fields (shared by Create & Edit) ───────────────────

function OrderFormFields({
  form,
  customerOptions,
  filteredProjects,
  filteredProducts,
  productList,
  onCustomerChange,
  onProjectChange,
  showStatus,
  statusValue,
}: {
  form: any;
  customerOptions: Array<{ value: string; label: string }>;
  filteredProjects: string[];
  filteredProducts: any[];
  productList: any;
  onCustomerChange: (val: string | undefined) => void;
  onProjectChange: (val: string | undefined) => void;
  showStatus?: boolean;
  statusValue?: string;
}) {
  return (
    <>
      <Row gutter={16}>
        <Col span={showStatus ? 6 : 8}>
          <Form.Item name="customer_name" label={<Text strong>客户名称</Text>} rules={[{ required: true, message: '请选择客户' }]}>
            <AutoComplete
              placeholder="点选或输入客户名称"
              showSearch
              options={customerOptions}
              filterOption={(input, option) => normalizeText(option?.label).includes(normalizeText(input))}
              onChange={(val) => onCustomerChange(val)}
              onSelect={(val) => onCustomerChange(val)}
            />
          </Form.Item>
        </Col>
        <Col span={showStatus ? 6 : 8}>
          <Form.Item name="project_name" label={<Text strong>关联项目</Text>}>
            <Select
              placeholder="请选择项目代号联动带入产品"
              allowClear
              onChange={(val) => onProjectChange(val)}
              options={filteredProjects.map((proj) => ({ value: proj, label: proj }))}
            />
          </Form.Item>
        </Col>
        <Col span={showStatus ? 6 : 8}>
          <Form.Item name="requested_date" label={<Text strong>交期要求</Text>} rules={[{ required: true, message: '请选择交期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        {showStatus && (
          <Col span={6}>
            <Form.Item label={<Text strong>订单状态</Text>}>
              <AppStatusTag status={statusValue || ''} statusMap={orderStatusMeta} />
            </Form.Item>
          </Col>
        )}
      </Row>
      <Form.Item name="notes" label={<Text strong>备注说明</Text>}>
        <Input.TextArea placeholder="订单相关特定商务或技术要求备注..." rows={2} />
      </Form.Item>

      <Divider orientation="left" style={{ margin: '16px 0' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>订单明细网格</span>
      </Divider>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Table
              dataSource={fields}
              pagination={false}
              rowKey="key"
              size="middle"
              bordered
              locale={{ emptyText: <Empty description="暂无明细，请选择关联项目自动带入，或点击下方手动添加产品" style={{ padding: '16px 0' }} /> }}
              columns={[
                {
                  title: '产品型材名称',
                  key: 'product_id',
                  width: 320,
                  render: (_, field) => (
                    <Form.Item
                      name={[field.name, 'product_id']}
                      rules={[{ required: true, message: '请选择产品' }]}
                      style={{ margin: 0 }}
                    >
                      <Select
                        placeholder="选择精密型材产品"
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        options={filteredProducts.map(p => ({
                          value: p.id,
                          label: `[${p.code}] ${p.name}`
                        }))}
                        onChange={(val) => {
                          const productsArray = productList?.data?.data || productList?.data || [];
                          const selectedProd = productsArray.find((p: any) => p.id === val);
                          if (selectedProd) {
                            if (selectedProd.customer_name) form.setFieldValue('customer_name', selectedProd.customer_name);
                            if (selectedProd.project_name) form.setFieldValue('project_name', selectedProd.project_name);
                          }
                        }}
                      />
                    </Form.Item>
                  )
                },
                {
                  title: '物理出库仓储路由',
                  key: 'warehouse',
                  width: 150,
                  render: (_, field) => <WarehouseRouteCell index={field.name} form={form} productList={productList} />
                },
                {
                  title: '计划需求数量',
                  key: 'quantity',
                  width: 140,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'quantity']} rules={[{ required: true, message: '数量' }]} style={{ margin: 0 }}>
                      <InputNumber placeholder="需求数量" min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  )
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 60,
                  align: 'center',
                  render: (_, field) => (
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  )
                }
              ]}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button type="dashed" onClick={() => {
                add({});
              }} icon={<PlusOutlined />} style={{ width: 150 }}>
                手动添加产品
              </Button>
              <Text type="secondary">
                明细网格汇总: 共 <Text strong style={{ color: '#111827' }}>{fields.length}</Text> 款精密型材
              </Text>
            </div>
          </div>
        )}
      </Form.List>
    </>
  );
}

// ── Batch Paste Types & Validation ─────────────────────────────────

interface ParsedRow {
  key: string;
  orderNo: string;
  productCode: string;
  productName: string;
  qty: string;
  deliveryDate: string;
  errors?: {
    orderNo?: string;
    productCode?: string;
    qty?: string;
    deliveryDate?: string;
  };
}

const validateRow = (row: ParsedRow): ParsedRow => {
  const errors: Record<string, string> = {};

  if (!row.orderNo || !row.orderNo.trim()) {
    errors.orderNo = '订单号必填';
  }

  if (!row.productCode || !row.productCode.trim()) {
    errors.productCode = '产品编码必填';
  }

  if (!row.qty || !String(row.qty).trim()) {
    errors.qty = '数量必填';
  } else {
    const num = Number(row.qty);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      errors.qty = '数量必须是正整数';
    }
  }

  if (!row.deliveryDate || !row.deliveryDate.trim()) {
    errors.deliveryDate = '交期必填';
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.deliveryDate)) {
      errors.deliveryDate = '交期格式必须为 YYYY-MM-DD';
    } else {
      const d = dayjs(row.deliveryDate);
      if (!d.isValid()) {
        errors.deliveryDate = '交期日期不合法';
      }
    }
  }

  return {
    ...row,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
};

const parsePastedText = (text: string, products: any[]) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const parsed: ParsedRow[] = lines.map((line, index) => {
    const cols = line.split('\t');
    const orderNo = cols[0]?.trim() || '';
    const productCode = cols[1]?.trim() || '';
    const productName = cols[2]?.trim() || '';
    const qty = cols[3]?.trim() || '';
    const deliveryDate = cols[4]?.trim() || '';

    const row: ParsedRow = {
      key: `paste_${index}_${Date.now()}`,
      orderNo,
      productCode,
      productName,
      qty,
      deliveryDate,
    };

    // Auto-fill productName if empty
    if (productCode && !productName) {
      const match = products.find(p => p.code === productCode);
      if (match) {
        row.productName = match.name;
      }
    }

    return row;
  });

  return parsed.map(row => validateRow(row));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OrderResource — 主组件
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function OrderResource({ onPlanCreated }: { onPlanCreated?: (planId: string) => void }) {
  // ── State ──────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Excel Paste States
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteStep, setPasteStep] = useState<'paste' | 'preview'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [defaultCustomer, setDefaultCustomer] = useState<string>('');
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [traceSearchText, setTraceSearchText] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pushPlanLoading, setPushPlanLoading] = useState(false);
  const [tableDensity, setTableDensity] = useState<'middle' | 'small'>('middle');
  const [tableFullscreen, setTableFullscreen] = useState(false);

  // Merged production planning
  const [planCreateOpen, setPlanCreateOpen] = useState(false);
  const [processes, setProcesses] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [planForm] = Form.useForm();

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedItemForReceive, setSelectedItemForReceive] = useState<any>(null);
  const [receiveForm] = Form.useForm();
  const [shipOpen, setShipOpen] = useState(false);
  const [selectedItemForShip, setSelectedItemForShip] = useState<any>(null);
  const [shipForm] = Form.useForm();

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const invalidate = useInvalidate();
  const { message: messageApi, notification: notificationApi, modal: modalApi } = App.useApp();

  // ── Data Sources ───────────────────────────────────────────────
  const { data: materialData } = useList<any>({ resource: 'materials', pagination: { pageSize: 1000 } });
  const materialOptions = useMemo(() => getDataArray(materialData), [materialData]);

  const { selectProps: productSelectProps } = useSelect({
    resource: 'products', optionLabel: 'name', optionValue: 'id', pagination: { pageSize: 100 },
  });

  const { data: customerData } = useList<any>({ resource: 'customers', pagination: { pageSize: 100 } });
  const { data: productList } = useList<any>({ resource: 'products', pagination: { pageSize: 1000 } });

  const [createLookupProducts, setCreateLookupProducts] = useState<any[]>([]);
  const [editLookupProducts, setEditLookupProducts] = useState<any[]>([]);

  const selectedCustomer = Form.useWatch('customer_name', form);
  const selectedProject = Form.useWatch('project_name', form);
  const selectedEditCustomer = Form.useWatch('customer_name', editForm);
  const selectedEditProject = Form.useWatch('project_name', editForm);

  const productsArray = useMemo(() => getDataArray(productList), [productList]);
  const customerOptions = useMemo(() => {
    const fromCustomers = getDataArray(customerData).map((c: any) => ({
      value: String(c.name || '').trim(), label: String(c.name || '').trim(),
    }));
    const fromProducts = productsArray.map((p: any) => ({
      value: String(p.customer_name || '').trim(), label: String(p.customer_name || '').trim(),
    }));
    return uniqueByValue([...fromCustomers, ...fromProducts]);
  }, [customerData, productsArray]);

  useEffect(() => {
    if (customerOptions.length > 0 && !defaultCustomer) {
      setDefaultCustomer(customerOptions[0].value);
    }
  }, [customerOptions, defaultCustomer]);

  useEffect(() => {
    Promise.all([
      apiRequest('/processes').catch(() => ({ items: [] })),
      apiRequest('/machines').catch(() => ({ items: [] })),
    ]).then(([processRes, machineRes]) => {
      const normalizeList = (data: any) => Array.isArray(data) ? data : (data?.items ?? []);
      setProcesses(normalizeList(processRes));
      setMachines(normalizeList(machineRes));
    }).catch(err => {
      console.error('Failed to load processes/machines:', err);
    });
  }, []);

  // ── Product Query & Sync Helpers ───────────────────────────────
  const queryProducts = async (customerName?: string, projectName?: string) => {
    const params = new URLSearchParams({ current: '1', pageSize: '1000' });
    const customer = String(customerName || '').trim();
    const project = String(projectName || '').trim();
    if (customer) params.set('customer_name', customer);
    if (project) params.set('project_name', project);
    const result = await apiRequest<{ items: any[]; total: number }>(`/products?${params.toString()}`);
    return result.items || [];
  };

  const buildItemsFromProducts = (items: any[]) => {
    return items.map((p) => ({ product_id: p.id, quantity: 100 }));
  };

  const syncCustomerProjectSelection = (
    targetForm: typeof form, customerName: string | undefined,
    projectName: string | undefined, sourceProducts = productsArray
  ) => {
    const matchedProducts = sourceProducts.filter(
      (p: any) => matchesCustomer(p, customerName) && matchesProject(p, projectName)
    );
    if (projectName) {
      const productWithCustomer = matchedProducts.find((p: any) => p.customer_name);
      if (productWithCustomer) targetForm.setFieldValue('customer_name', productWithCustomer.customer_name);
      targetForm.setFieldsValue({ items: buildItemsFromProducts(matchedProducts) });
      return;
    }
    targetForm.setFieldsValue({ items: [] });
  };

  const handleCustomerChange = async (
    targetForm: typeof form, customerName: string | undefined,
    setLookupProducts: (items: any[]) => void
  ) => {
    if (!String(customerName || '').trim()) {
      setLookupProducts([]);
      targetForm.setFieldsValue({ project_name: undefined, items: [] });
      return;
    }
    const lookupProducts = await queryProducts(customerName);
    setLookupProducts(lookupProducts);
    const projectName = targetForm.getFieldValue('project_name');
    const projectStillMatches = Boolean(projectName) &&
      lookupProducts.some((p: any) => matchesCustomer(p, customerName) && matchesProject(p, projectName));
    if (projectStillMatches) {
      syncCustomerProjectSelection(targetForm, customerName, projectName, lookupProducts);
      return;
    }
    const projectNames = Array.from(new Set(
      lookupProducts.map((p: any) => p.project_name).filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0)
    ));
    if (projectNames.length === 1) {
      const project = projectNames[0];
      targetForm.setFieldValue('project_name', project);
      syncCustomerProjectSelection(targetForm, customerName, project, lookupProducts);
      return;
    }
    targetForm.setFieldsValue({ project_name: undefined, items: [] });
  };

  const handleProjectChange = async (
    targetForm: typeof form, customerName: string | undefined,
    projectName: string | undefined, setLookupProducts: (items: any[]) => void
  ) => {
    if (!projectName) { targetForm.setFieldsValue({ items: [] }); return; }
    const lookupProducts = await queryProducts(customerName, projectName);
    setLookupProducts(lookupProducts);
    syncCustomerProjectSelection(targetForm, customerName, projectName, lookupProducts);
  };

  // ── Filtered Lists (Create) ────────────────────────────────────
  const filteredProjects = useMemo(() => {
    const sourceProducts = selectedCustomer ? createLookupProducts : productsArray;
    const filtered = selectedCustomer ? sourceProducts.filter((p) => matchesCustomer(p, selectedCustomer)) : sourceProducts;
    const projNames = filtered.map((p) => p.project_name).filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
    return Array.from(new Set(projNames));
  }, [createLookupProducts, productsArray, selectedCustomer]);

  const filteredProductsForCreate = useMemo(() => {
    const sourceProducts = selectedCustomer ? createLookupProducts : productsArray;
    return sourceProducts.filter((p) => matchesCustomer(p, selectedCustomer) && matchesProject(p, selectedProject));
  }, [createLookupProducts, productsArray, selectedCustomer, selectedProject]);

  // ── Filtered Lists (Edit) ─────────────────────────────────────
  const filteredProjectsForEdit = useMemo(() => {
    const sourceProducts = selectedEditCustomer ? editLookupProducts : productsArray;
    const filtered = selectedEditCustomer ? sourceProducts.filter((p) => matchesCustomer(p, selectedEditCustomer)) : sourceProducts;
    const projNames = filtered.map((p) => p.project_name).filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
    return Array.from(new Set(projNames));
  }, [editLookupProducts, productsArray, selectedEditCustomer]);

  const filteredProductsForEdit = useMemo(() => {
    const sourceProducts = selectedEditCustomer ? editLookupProducts : productsArray;
    return sourceProducts.filter((p) => matchesCustomer(p, selectedEditCustomer) && matchesProject(p, selectedEditProject));
  }, [editLookupProducts, productsArray, selectedEditCustomer, selectedEditProject]);

  // ── Table Data ─────────────────────────────────────────────────
  const { tableProps, searchFormProps, tableQueryResult } = useTable<Order>({
    resource: 'orders',
    pagination: { pageSize: 10 },
    onSearch: (values) => [{ field: 'q', operator: 'contains', value: values.q }].filter((item) => item.value),
  });

  const orders = (tableProps.dataSource as Order[]) || [];
  const findOrderByKey = (key: React.Key) => orders.find((o) => String(o.id) === String(key));
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedRowKeys.some((key) => String(key) === String(order.id))),
    [orders, selectedRowKeys]
  );
  const selectedOrder = selectedOrders.length === 1 ? selectedOrders[0] : null;
  const customerFilters = useMemo(
    () => Array.from(new Set(orders.map((order) => order.customer_name).filter(Boolean)))
      .map((value) => ({ text: value, value })),
    [orders]
  );
  const projectFilters = useMemo(
    () => Array.from(new Set(orders.map((order) => order.project_name || '通用项目').filter(Boolean)))
      .map((value) => ({ text: value, value })),
    [orders]
  );
  const statusFilters = useMemo(
    () => Object.entries(orderStatusMeta).map(([value, meta]) => ({ text: meta.text, value })),
    []
  );

  // ── Disabled Reasons ───────────────────────────────────────────
  const singleSelectionReason = actionBlockedReason(selectedRowKeys.length, '执行操作');
  const traceDisabledReason = actionBlockedReason(selectedRowKeys.length, '查看流转追溯');
  const editDisabledReason = singleSelectionReason || (selectedOrder && !isEditableStatus(selectedOrder.status) ? '已取消或已关闭的需求行不能编辑' : '');
  const confirmDisabledReason = singleSelectionReason || (selectedOrder && selectedOrder.status !== 'imported' ? '仅已导入需求行可确认' : '');
  const receiveDisabledReason = singleSelectionReason || (selectedOrder && ['cancelled', 'closed'].includes(selectedOrder.status) ? '当前需求状态不能登记来料' : '');
  const shipDisabledReason = singleSelectionReason || (selectedOrder && ['cancelled', 'closed'].includes(selectedOrder.status) ? '当前需求状态不能发货' : '');
  const closeDisabledReason = singleSelectionReason || (selectedOrder && ['closed', 'cancelled'].includes(selectedOrder.status) ? '已关闭或已取消的需求不能再次关闭' : '');

  const createPlanDisabledReason = useMemo(() => {
    if (selectedRowKeys.length === 0) return '请先选择需要排产的需求行';
    
    // Check product consistency
    const productIds = new Set(selectedOrders.map(o => o.product_id).filter(Boolean));
    if (productIds.size > 1) {
      return '合并排产的各需求行必须是同一种产品';
    }
    
    // Check status consistency: only imported/confirmed are allowed
    const invalidStatusRows = selectedOrders.filter(o => !['imported', 'confirmed'].includes(o.status));
    if (invalidStatusRows.length > 0) {
      return '仅「已导入」或「已确认」状态的需求行可以进行排产';
    }
    
    return '';
  }, [selectedRowKeys, selectedOrders]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Business Handlers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const openReceiveModal = (item: any) => {
    setSelectedItemForReceive(item);
    setReceiveOpen(true);
    const matchedMaterial = materialOptions.find((m: any) => m.code === item.product_code || m.name === item.product_name);
    let defaultWarehouse = 'YB_WH';
    const prodName = item.product_name || '';
    if (prodName.includes('右边梁')) defaultWarehouse = 'CQ_WH';
    else if (['纵梁', '安装梁1', '前边梁'].some(name => prodName.includes(name))) defaultWarehouse = 'SUB_WH';
    
    const receivedQty = item.material_received_quantity || item.material_registered_quantity || (item.material_progress ? Math.round((item.material_progress / 100) * item.quantity) : 0);
    receiveForm.setFieldsValue({
      material_id: matchedMaterial?.id || item.material_id || undefined,
      quantity: Math.max(1, item.quantity - receivedQty),
      warehouse_code: defaultWarehouse,
      batch_no: dayjs().format('YYYYMMDD'),
      supplier_name: item.supplier_name || '',
      notes: `根据需求行 [${item.product_code}] 来料登记`,
    });
  };

  const handleReceive = async (values: any) => {
    try {
      const payload = {
        material_id: values.material_id,
        demand_line_id: selectedItemForReceive?.id,
        supplier_name: values.supplier_name,
        warehouse_code: values.warehouse_code || 'MAIN',
        batch_no: values.batch_no || dayjs().format('YYYYMMDD'),
        quantity: values.quantity,
        notes: values.notes || '',
      };
      await apiRequest('/receipts', { method: 'POST', body: JSON.stringify(payload) });
      messageApi.success(`来料登记已提交！登记批次: ${payload.batch_no}，请通知仓库确认入库。`);
      invalidate({ resource: 'orders', invalidates: ['list'] });
      invalidate({ resource: 'receipts', invalidates: ['list'] });
      setReceiveOpen(false);
      setSelectedItemForReceive(null);
      receiveForm.resetFields();
    } catch (e: any) {
      messageApi.error('下推收料入库失败: ' + e.message);
    }
  };

  const openShipModal = (item: any) => {
    setSelectedItemForShip(item);
    setShipOpen(true);
    shipForm.setFieldsValue({
      quantity: Math.max(1, item.quantity - (item.delivered_quantity || 0)),
      warehouse_code: 'MAIN', location_code: '', batch_no: '',
      shipped_at: dayjs(),
      notes: `Shipment for ${item.product_code}`,
    });
  };

  const handleShip = async (values: any) => {
    try {
      await apiRequest('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          demand_line_id: selectedItemForShip?.id,
          quantity: values.quantity,
          warehouse_code: values.warehouse_code || 'MAIN',
          location_code: values.location_code || '',
          batch_no: values.batch_no || undefined,
          shipped_at: values.shipped_at?.toISOString(),
          notes: values.notes || '',
        }),
      });
      messageApi.success('发货单已创建，库存和需求行交付数量已更新');
      invalidate({ resource: 'orders', invalidates: ['list'] });
      invalidate({ resource: 'shipments', invalidates: ['list'] });
      invalidate({ resource: 'inventory-balances', invalidates: ['list'] });
      invalidate({ resource: 'inventory-transactions', invalidates: ['list'] });
      setShipOpen(false);
      setSelectedItemForShip(null);
      shipForm.resetFields();
    } catch (e: any) {
      messageApi.error('发货失败: ' + e.message);
    }
  };

  const openCreatePlanDrawer = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请选择需要排产的需求行');
      return;
    }
    const disabledReason = createPlanDisabledReason;
    if (disabledReason) {
      messageApi.warning(disabledReason);
      return;
    }

    const totalQty = selectedOrders.reduce((sum, row) => sum + (row.unshipped_quantity ?? row.quantity ?? 0), 0);
    const firstOrder = selectedOrders[0];
    const projectCodes = [...new Set(selectedOrders.map(o => o.project_code).filter(Boolean))];
    const sharedProjectCode = projectCodes.length === 1 ? projectCodes[0] : undefined;

    const dueDates = selectedOrders.map(o => o.due_date).filter(Boolean);
    const earliestDueDate = dueDates.length > 0
      ? dayjs(dueDates.reduce((earliest, current) => earliest < current ? earliest : current))
      : dayjs().add(7, 'day');

    planForm.setFieldsValue({
      product_id: firstOrder.product_id,
      product_code: firstOrder.product_code,
      product_name: firstOrder.product_name,
      planned_quantity: totalQty,
      title: `${firstOrder.product_name || ''} 合并生产计划`,
      project_code: sharedProjectCode || '',
      planned_start_at: dayjs(),
      planned_finish_at: earliestDueDate,
      plan_period: dayjs().format('YYYY-MM'),
      notes: `需求池合并排产：[${selectedOrders.map(o => o.code).join(', ')}]`,
    });
    
    setPlanCreateOpen(true);
  };

  const handleCreatePlan = async (values: any) => {
    setPushPlanLoading(true);
    try {
      const payload = {
        product_id: values.product_id,
        planned_quantity: values.planned_quantity,
        planned_start_at: values.planned_start_at?.format('YYYY-MM-DD HH:mm'),
        planned_finish_at: values.planned_finish_at?.format('YYYY-MM-DD HH:mm'),
        demand_line_ids: selectedRowKeys.map(String),
        process_id: values.process_id,
        machine_id: values.machine_id,
        title: values.title,
        project_code: values.project_code,
        product_code: values.product_code,
        plan_period: values.plan_period,
        notes: values.notes || '',
      };
      const result = await apiRequest<{ id: string; code: string }>(`/production-plans`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      messageApi.success(`合并生产计划创建成功：${result.code}`);
      setPlanCreateOpen(false);
      setSelectedRowKeys([]);
      planForm.resetFields();
      await invalidate({ resource: 'orders', invalidates: ['list'] });
      await invalidate({ resource: 'production-plans', invalidates: ['list'] });
      onPlanCreated?.(result.id);
    } catch (e: any) {
      messageApi.error('创建生产计划失败: ' + e.message);
    } finally {
      setPushPlanLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        customer_name: values.customer_name,
        requested_date: values.requested_date?.format('YYYY-MM-DD'),
        notes: values.notes,
        items: values.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      };
      await apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) });
      messageApi.success('需求创建成功');
      invalidate({ resource: 'orders', invalidates: ['list'] });
      setCreateOpen(false);
      setCreateLookupProducts([]);
      form.resetFields();
    } catch (e: any) {
      messageApi.error('创建失败: ' + e.message);
    }
  };

  const loadTrace = async (orderId: string) => {
    try {
      const data = await apiRequest(`/orders/${orderId}/trace`);
      setTrace(data);
      setTraceOpen(true);
    } catch (e: any) {
      messageApi.error('加载追溯数据失败: ' + e.message);
    }
  };

  const handleTraceSelected = () => {
    if (selectedRowKeys.length !== 1) { messageApi.warning('请选择单笔需求行进行流转追溯'); return; }
    const record = findOrderByKey(selectedRowKeys[0]);
    if (!record) return;
    loadTrace(String(record.order_id || record.id));
  };

  const isEditable = (orderId: string) => {
    const order = orders.find(o => String(o.id) === String(orderId));
    return order ? isEditableStatus(order.status) : false;
  };

  const handleEdit = async (record: Order) => {
    try {
      const fullOrder = await apiRequest(`/orders/${record.order_id || record.id}`);
      const lookupProducts = await queryProducts(fullOrder.customer_name);
      setEditLookupProducts(lookupProducts);
      setEditingOrder(fullOrder);
      editForm.setFieldsValue({
        customer_name: fullOrder.customer_name,
        project_name: fullOrder.project_name || record.project_code || undefined,
        requested_date: fullOrder.requested_date ? dayjs(fullOrder.requested_date) : null,
        notes: fullOrder.notes,
        items: (fullOrder.items || []).map((item: any) => ({
          product_id: item.product_id, quantity: item.quantity,
        })),
      });
      setEditOpen(true);
    } catch (e: any) {
      messageApi.error('加载详情失败: ' + e.message);
    }
  };

  const handleEditSelected = () => {
    if (selectedRowKeys.length !== 1) { messageApi.warning('请选择一个需求行后再编辑'); return; }
    const record = orders.find(o => String(o.id) === String(selectedRowKeys[0]));
    if (!record) { messageApi.warning('未找到选中的需求行，请刷新后重试'); return; }
    if (!isEditable(record.id)) { messageApi.warning('已取消或已关闭的需求行不能编辑'); return; }
    handleEdit(record);
  };

  const handleConfirmSelected = () => {
    const order = selectedRowKeys.length === 1 ? findOrderByKey(selectedRowKeys[0]) : null;
    if (selectedRowKeys.length !== 1 || !order) { messageApi.warning('请选择一个需求行后再确认'); return; }
    if (order.status !== 'imported') {
      messageApi.warning(`当前状态为「${orderStatusMeta[order.status]?.text || order.status}」，仅已导入状态可确认`);
      return;
    }
    modalApi.confirm({
      title: '确认需求?',
      content: `需求行 ${order.code} 确认后将进入可排产状态。`,
      okText: '确认', cancelText: '取消',
      onOk: async () => {
        try {
          await apiRequest(`/orders/${order.order_id || order.id}/confirm`, { method: 'POST' });
          messageApi.success('需求已确认');
          setSelectedRowKeys([]);
          await invalidate({ resource: 'orders', invalidates: ['list'] });
        } catch (e: any) { messageApi.error('确认失败: ' + e.message); }
      },
    });
  };

  const handleReceiveSelected = async () => {
    if (selectedRowKeys.length !== 1) { messageApi.warning('请选择一个需求行后再登记来料'); return; }
    const record = findOrderByKey(selectedRowKeys[0]);
    if (!record) { messageApi.warning('未找到选中的需求行，请刷新后重试'); return; }
    if (['cancelled', 'closed'].includes(record.status)) {
      messageApi.warning('已取消或已关闭的需求行不能登记来料'); return;
    }
    openReceiveModal(record);
  };

  const handleShipSelected = async () => {
    if (selectedRowKeys.length !== 1) { messageApi.warning('请选择一个需求行后再发货'); return; }
    const record = findOrderByKey(selectedRowKeys[0]);
    if (!record) { messageApi.warning('未找到选中的需求行，请刷新后重试'); return; }
    if (['cancelled', 'closed'].includes(record.status)) {
      messageApi.warning('已取消或已关闭的需求行不能发货'); return;
    }
    if ((record.delivered_quantity || 0) >= record.quantity) {
      messageApi.warning('该需求行已全部发货完成'); return;
    }
    openShipModal(record);
  };

  const handleCloseSelected = async () => {
    if (selectedRowKeys.length !== 1) { messageApi.warning('请选择一个需求行后再关闭'); return; }
    const orderId = String(selectedRowKeys[0]);
    const record = orders.find((o) => String(o.id) === orderId);
    if (!record) return;
    if (['closed', 'cancelled'].includes(record.status)) {
      messageApi.warning('已关闭或已取消的需求行不能再次关闭');
      return;
    }
    modalApi.confirm({
      title: '确认关闭需求?',
      content: `需求 ${record.code} 将被关闭。`,
      okText: '关闭', cancelText: '取消',
      onOk: async () => {
        try {
          await apiRequest(`/orders/${record.order_id || orderId}/close`, { method: 'POST' });
          messageApi.success('需求已关闭');
          invalidate({ resource: 'orders', invalidates: ['list'] });
        } catch (e: any) { messageApi.error('关闭失败: ' + e.message); }
      },
    });
  };

  const handleUpdate = async (values: any) => {
    if (!editingOrder) return;
    try {
      const payload = {
        customer_name: values.customer_name,
        requested_date: values.requested_date?.format('YYYY-MM-DD'),
        notes: values.notes,
        items: (values.items || []).map((item: any) => ({
          product_id: item.product_id, quantity: item.quantity,
        })),
      };
      await apiRequest(`/orders/${editingOrder.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      messageApi.success('需求修改成功');
      invalidate({ resource: 'orders', invalidates: ['list'] });
      setEditOpen(false);
      setEditingOrder(null);
      editForm.resetFields();
    } catch (e: any) {
      messageApi.error('修改失败: ' + e.message);
    }
  };

  const exportOrders = () => {
    const data = selectedRowKeys.length > 0
      ? orders.filter(o => selectedRowKeys.includes(o.id))
      : orders;
    if (data.length === 0) return;
    const headers = ['需求行编号', '所属需求编号', '客户', '项目代号', '产品代码', '产品名称', '数量', '已发数量', '交付日期', '状态', '备注'];
    const csvRows = [headers.join(',')];
    data.forEach(order => {
      csvRows.push([
        order.code, order.demand_code || order.order_code, `"${order.customer_name}"`, `"${order.project_code || ''}"`,
        order.product_code, `"${order.product_name}"`, order.quantity, order.delivered_quantity,
        order.due_date, order.status, `"${order.notes || ''}"`
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `需求池导出_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    link.click();
  };

  const handleConfirmSubmit = async () => {
    const hasErrors = previewData.some(row => row.errors);
    if (hasErrors) {
      messageApi.error('请先修正表格中的错误数据');
      return;
    }

    setSubmitting(true);
    try {
      const uniqueOrderNos = Array.from(new Set(previewData.map(r => r.orderNo)));
      let successCount = 0;
      let failCount = 0;

      for (const orderNo of uniqueOrderNos) {
        const orderRows = previewData.filter(r => r.orderNo === orderNo);
        let customerName = '';
        const resolvedProduct = orderRows.map(r => productsArray.find(p => p.code === r.productCode)).find(Boolean);
        if (resolvedProduct?.customer_name) {
          customerName = resolvedProduct.customer_name;
        } else {
          customerName = defaultCustomer || '未知客户';
        }

        const payload = {
          order_code: orderNo,
          customer_code: '',
          customer_name: customerName,
          source_type: 'excel_paste',
          source_file_name: '剪贴板批量粘贴',
          requested_date: orderRows[0]?.deliveryDate,
          change_summary: '批量粘贴导入',
          items: orderRows.map(r => {
            const prod = productsArray.find(p => p.code === r.productCode);
            return {
              product_id: prod?.id,
              product_code: r.productCode,
              product_name: r.productName || prod?.name || '',
              quantity: Number(r.qty),
              due_date: r.deliveryDate,
            };
          })
        };

        try {
          await apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) });
          successCount++;
        } catch (err) {
          console.error(`Import failed for order ${orderNo}:`, err);
          failCount++;
        }
      }

      if (failCount === 0) {
        messageApi.success(`成功导入 ${successCount} 个订单！`);
        setPasteModalOpen(false);
        setPasteText('');
        setPreviewData([]);
        invalidate({ resource: 'orders', invalidates: ['list'] });
        setSelectedRowKeys([]);
      } else {
        messageApi.warning(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个，请检查。`);
        setPasteModalOpen(false);
        invalidate({ resource: 'orders', invalidates: ['list'] });
        setSelectedRowKeys([]);
      }
    } catch (e: any) {
      messageApi.error('提交失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Trace Helpers ──────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const events = trace?.downstream?.events ?? [];
    if (!traceSearchText) return events;
    const q = traceSearchText.toLowerCase();
    return events.filter((e: any) =>
      (e.message || '').toLowerCase().includes(q) ||
      (e.event_type || '').toLowerCase().includes(q) ||
      (e.actor || '').toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q)
    );
  }, [trace?.downstream?.events, traceSearchText]);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'draft': return 0;
      case 'confirmed': return 1;
      case 'planned': return 2;
      case 'in_production': case 'ready_to_ship': return 3;
      case 'shipped': case 'closed': return 4;
      default: return 0;
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Table Columns
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const columns = [
    {
      title: '需求行编号', dataIndex: 'code', fixed: 'left' as const, width: 180,
      sorter: (a: any, b: any) => String(a.code).localeCompare(String(b.code)),
      render: (text: string, record: any) => (
        <Space style={{ width: 170, whiteSpace: 'nowrap' }}>
          <ShoppingCartOutlined style={{ color: '#1890ff' }} />
          <Tooltip title={`所属总需求号: ${record.demand_code || record.order_code || '-'}`}>
            <Text strong ellipsis style={{ maxWidth: 140 }}>{text}</Text>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      width: 180,
      filters: customerFilters,
      filterSearch: true,
      onFilter: (value: any, record: any) => record.customer_name === value,
      sorter: (a: any, b: any) => String(a.customer_name).localeCompare(String(b.customer_name)),
      render: (value: string) => <LongText value={value} maxWidth={170} />
    },
    {
      title: '项目代号',
      dataIndex: 'project_code',
      width: 130,
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value: any, record: any) => (record.project_code || '通用项目') === value,
      sorter: (a: any, b: any) => String(a.project_code || '').localeCompare(String(b.project_code || '')),
      render: (val: string) => <LongText value={val || '通用项目'} maxWidth={120} />
    },
    {
      title: '产品代码',
      dataIndex: 'product_code',
      width: 140,
      sorter: (a: any, b: any) => String(a.product_code || '').localeCompare(String(b.product_code || '')),
      render: (val: string) => <LongText value={val} maxWidth={130} strong />
    },
    {
      title: '产品名称',
      dataIndex: 'product_name',
      width: 180,
      sorter: (a: any, b: any) => String(a.product_name || '').localeCompare(String(b.product_name || '')),
      render: (val: string) => <LongText value={val} maxWidth={170} />
    },
    {
      title: '需求来源',
      dataIndex: 'source_type',
      width: 110,
      render: (val: string) => {
        const map: Record<string, string> = {
          customer_order: '客户订单',
          weekly_plan: '客户周计划',
          monthly_plan: '客户月计划',
          temp_notice: '微信临时通知',
          supply_plan: '型材厂供料计划',
          excel_paste: 'Excel粘贴导入'
        };
        return <Tag>{map[val] || val || '未知'}</Tag>;
      }
    },
    {
      title: '需求数量',
      dataIndex: 'quantity',
      width: 100,
      sorter: (a: any, b: any) => a.quantity - b.quantity,
      render: (val: number) => <Text strong>{val}</Text>
    },
    {
      title: '已发数量',
      dataIndex: 'delivered_quantity',
      width: 100,
      sorter: (a: any, b: any) => a.delivered_quantity - b.delivered_quantity,
      render: (val: number) => <Text type="success">{val || 0}</Text>
    },
    {
      title: '未发数量',
      dataIndex: 'unshipped_quantity',
      width: 100,
      sorter: (a: any, b: any) => a.unshipped_quantity - b.unshipped_quantity,
      render: (val: number) => <Text type="danger">{val ?? 0}</Text>
    },
    {
      title: '交付日期',
      dataIndex: 'due_date',
      width: 120,
      sorter: (a: any, b: any) => String(a.due_date || '').localeCompare(String(b.due_date || '')),
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      filters: statusFilters,
      onFilter: (value: any, record: any) => record.status === value,
      render: (val: string) => <AppStatusTag status={val} statusMap={orderStatusMeta} />
    },
    {
      title: '备注',
      dataIndex: 'notes',
      width: 150,
      render: (val: string) => <LongText value={val} maxWidth={140} />
    }
  ];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <EnterprisePageLayout>
      <SearchFilterCard
        searchForm={
          <AppSearchForm searchFormProps={searchFormProps} placeholder="请输入需求编号 / 客户名称">
            <Form.Item name="q" style={{ marginBottom: 0 }}>
              <Input prefix={<SearchOutlined style={{ color: '#9ca3af' }} />} placeholder="请输入需求行编号/客户名" allowClear style={{ width: 320 }} />
            </Form.Item>
          </AppSearchForm>
        }
      />

      <TableCard>
        <TableActionToolbar
          selectedCount={selectedRowKeys.length}
          onClearSelection={() => setSelectedRowKeys([])}
          actions={
            <>
              <AppActionButton type="primary" icon={<PlusOutlined />} label="新增需求" onClick={() => setCreateOpen(true)} />
              <AppActionButton type="primary" ghost icon={<PlusOutlined />} label="批量粘贴" onClick={() => {
                setPasteModalOpen(true);
                setPasteStep('paste');
                setPasteText('');
                setPreviewData([]);
              }} />
              <AppActionButton type="primary" ghost icon={<PushpinOutlined />} label="创建生产计划" disabledReason={createPlanDisabledReason} loading={pushPlanLoading} triggerWhenDisabled onClick={openCreatePlanDrawer} />
              <AppActionButton icon={<HistoryOutlined />} label="流转追溯" disabledReason={traceDisabledReason} triggerWhenDisabled onClick={handleTraceSelected} />
              <AppActionButton icon={<EditOutlined />} label="编辑需求" disabledReason={editDisabledReason} triggerWhenDisabled onClick={handleEditSelected} />
              <AppActionButton icon={<CheckCircleOutlined />} label="确认需求" disabledReason={confirmDisabledReason} triggerWhenDisabled onClick={handleConfirmSelected} />
              <AppActionButton icon={<DatabaseOutlined />} label="来料登记" disabledReason={receiveDisabledReason} triggerWhenDisabled onClick={handleReceiveSelected} />
              <AppActionButton icon={<TruckOutlined />} label="发货" disabledReason={shipDisabledReason} triggerWhenDisabled onClick={handleShipSelected} />
              <AppActionButton icon={<CheckCircleOutlined />} label="关闭需求" disabledReason={closeDisabledReason} triggerWhenDisabled onClick={handleCloseSelected} />
              <AppActionButton icon={<ExportOutlined />} label="导出数据" onClick={exportOrders} />
            </>
          }
          tools={
            <>
              <Tooltip title="刷新">
                <Button icon={<ReloadOutlined />} onClick={() => tableQueryResult.refetch()} />
              </Tooltip>
              <Tooltip title="密度">
                <Button
                  icon={<ColumnHeightOutlined />}
                  onClick={() => setTableDensity((density) => (density === 'middle' ? 'small' : 'middle'))}
                />
              </Tooltip>
              <Tooltip title="列设置">
                <Button icon={<SettingOutlined />} onClick={() => messageApi.info('列宽、固定列与省略规则已按企业表格规范统一启用')} />
              </Tooltip>
              <Tooltip title={tableFullscreen ? '退出全屏' : '全屏'}>
                <Button icon={<FullscreenOutlined />} onClick={() => setTableFullscreen((open) => !open)} />
              </Tooltip>
            </>
          }
        />
        <div className={tableFullscreen ? 'enterprise-table-fullscreen' : undefined}>
          <AppProTable<Order>
          {...tableProps}
          columns={columns}
          className="order-management-table"
          size={tableDensity}
          onRow={(record) => ({
            onClick: () => {
              const keys = selectedRowKeys.includes(record.id)
                ? selectedRowKeys.filter(k => k !== record.id)
                : [...selectedRowKeys, record.id];
              setSelectedRowKeys(keys);
            },
            style: { cursor: 'pointer' },
          })}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1600, y: 560 }}
          />
        </div>
      </TableCard>

      {/* ── 创建合并生产计划 Modal ── */}
      <AppDrawerForm
        title="创建生产计划 (合并排产)"
        open={planCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPlanCreateOpen(false);
            planForm.resetFields();
          }
        }}
        submitter={{ searchConfig: { submitText: '创建计划', resetText: '取消' } }}
        onFinish={async () => {
          try {
            await planForm.validateFields();
            await handleCreatePlan(planForm.getFieldsValue(true));
            return true;
          } catch { return false; }
        }}
      >
        <Form form={planForm} layout="vertical">
          <Alert
            message="合并排产向导"
            description={`已选中 ${selectedRowKeys.length} 笔需求行，产品代码：${selectedOrders[0]?.product_code || '-'}，正在生成合并生产计划。`}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="product_name" label="排产产品" rules={[{ required: true }]}>
                <Input disabled style={{ color: '#000' }} />
              </Form.Item>
              <Form.Item name="product_id" style={{ display: 'none' }}>
                <Input />
              </Form.Item>
              <Form.Item name="product_code" style={{ display: 'none' }}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="planned_quantity" label="计划生产数量" rules={[{ required: true, message: '请输入计划生产数量' }]}>
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="project_code" label="项目代号">
                <Input placeholder="输入项目代号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="plan_period" label="计划周期 (如 YYYY-MM)" rules={[{ required: true, message: '请输入计划周期' }]}>
                <Input placeholder="例如: 2026-05" />
              </Form.Item>
            </Col>
          </Row>
          <Space style={{ width: '100%', display: 'flex' }} size={12}>
            <Form.Item name="planned_start_at" label="计划开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="planned_finish_at" label="计划完成时间" rules={[{ required: true, message: '请选择完成时间' }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: 220 }} />
            </Form.Item>
          </Space>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="process_id" label="计划指派工序">
                <Select allowClear showSearch optionFilterProp="label" placeholder="请选择生产工序" options={processes.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name || ''}` }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="machine_id" label="计划指派机台">
                <Select allowClear showSearch optionFilterProp="label" placeholder="请选择生产机台" options={machines.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name || ''}` }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label="计划标题" rules={[{ required: true, message: '请输入计划标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="备注说明">
            <Input.TextArea rows={2} placeholder="合并排产备注..." />
          </Form.Item>
        </Form>
      </AppDrawerForm>

      {/* ── 创建需求 DrawerForm ── */}
      <AppDrawerForm
        title={
          <div className="app-drawer-title">
            <ShoppingCartOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <span>创建新客户需求</span>
          </div>
        }
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setCreateLookupProducts([]);
            form.resetFields();
          }
        }}
        width={950}
        submitter={{ searchConfig: { submitText: '确认创建', resetText: '取消' } }}
        onFinish={async () => {
          try {
            await form.validateFields();
            await handleCreate(form.getFieldsValue(true));
            return true;
          } catch { return false; }
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ items: [] }}>
          <Alert
            message="智能需求录入向导"
            description="建议您先选择【关联项目】，系统将自动解析拉取该项目名下的所有精密型材产品明细并自动预填铺满网格，您只需录入需求数量与交期即可，无需手动逐个添加。"
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <OrderFormFields
            form={form}
            customerOptions={customerOptions}
            filteredProjects={filteredProjects}
            filteredProducts={filteredProductsForCreate}
            productList={productList}
            onCustomerChange={(val) => void handleCustomerChange(form, val, setCreateLookupProducts)}
            onProjectChange={(val) => void handleProjectChange(form, form.getFieldValue('customer_name'), val, setCreateLookupProducts)}
          />
        </Form>
      </AppDrawerForm>

      {/* ── 编辑需求 DrawerForm ── */}
      <AppDrawerForm
        title={
          <div className="app-drawer-title">
            <EditOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <span>修改客户需求: {editingOrder?.code}</span>
          </div>
        }
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setEditingOrder(null);
            setEditLookupProducts([]);
            editForm.resetFields();
          }
        }}
        width={950}
        submitter={{ searchConfig: { submitText: '保存修改', resetText: '取消' } }}
        onFinish={async () => {
          try {
            await editForm.validateFields();
            await handleUpdate(editForm.getFieldsValue(true));
            return true;
          } catch { return false; }
        }}
      >
        <Form form={editForm} layout="vertical">
          <OrderFormFields
            form={editForm}
            customerOptions={customerOptions}
            filteredProjects={filteredProjectsForEdit}
            filteredProducts={filteredProductsForEdit}
            productList={productList}
            onCustomerChange={(val) => void handleCustomerChange(editForm, val, setEditLookupProducts)}
            onProjectChange={(val) => void handleProjectChange(editForm, editForm.getFieldValue('customer_name'), val, setEditLookupProducts)}
            showStatus
            statusValue={editingOrder?.status}
          />
        </Form>
      </AppDrawerForm>

      {/* ── 创建发货单 Modal ── */}
      <AppDrawerForm
        title="创建发货单"
        open={shipOpen}
        onOpenChange={(open) => {
          if (!open) { setShipOpen(false); setSelectedItemForShip(null); shipForm.resetFields(); }
        }}
        width={600}
        submitter={{ searchConfig: { submitText: '发货', resetText: '取消' } }}
        onFinish={async () => {
          try {
            await shipForm.validateFields();
            await handleShip(shipForm.getFieldsValue(true));
            return true;
          } catch { return false; }
        }}
      >
        <Form form={shipForm} layout="vertical" initialValues={{ warehouse_code: 'MAIN' }}>
          <Alert
            message={`正在为需求行 [${selectedItemForShip?.product_code}] 创建发货单`}
            description={`产品: ${selectedItemForShip?.product_name} | 需求数量: ${selectedItemForShip?.quantity} | 已交付: ${selectedItemForShip?.delivered_quantity || 0}`}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="发货数量" rules={[{ required: true, message: '请输入发货数量' }]}>
                <InputNumber min={1} max={Math.max(1, (selectedItemForShip?.quantity || 0) - (selectedItemForShip?.delivered_quantity || 0))} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch_no" label="批次号">
                <Input placeholder="留空时自动选择可用批次" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouse_code" label="发货仓库" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="MAIN">MAIN</Select.Option>
                  <Select.Option value="YB_WH">YB_WH</Select.Option>
                  <Select.Option value="CQ_WH">CQ_WH</Select.Option>
                  <Select.Option value="SUB_WH">SUB_WH</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location_code" label="库位">
                <Input placeholder="留空表示默认库位" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="shipped_at" label="发货时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </AppDrawerForm>

      {/* ── 来料登记下推入库 Modal ── */}
      <AppDrawerForm
        title={
          <div className="app-drawer-title">
            <DatabaseOutlined style={{ color: '#faad14' }} />
            <span>型材来料登记 (待库管确认)</span>
          </div>
        }
        open={receiveOpen}
        onOpenChange={(open) => {
          if (!open) { setReceiveOpen(false); setSelectedItemForReceive(null); receiveForm.resetFields(); }
        }}
        width={600}
        onFinish={async () => {
          try {
            await receiveForm.validateFields();
            await handleReceive(receiveForm.getFieldsValue(true));
            return true;
          } catch { return false; }
        }}
      >
        <Form form={receiveForm} layout="vertical" initialValues={{ warehouse_code: 'MAIN' }}>
          <Alert
            message={`正在为需求行 [${selectedItemForReceive?.product_code}] 办理来料登记`}
            description={`产品: ${selectedItemForReceive?.product_name} | 需求数量: ${selectedItemForReceive?.quantity} | 已确认到料: ${selectedItemForReceive?.material_received_quantity || 0}`}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="supplier_name" label="型材厂商 (供应商)" rules={[{ required: true, message: '请输入型材厂商名称' }]}>
                <Input placeholder="例如: 华建铝业 / 南山铝业" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="material_id" label="匹配物料/型材主数据" rules={[{ required: true, message: '请选择或确认对应物料' }]}>
                <Select
                  showSearch placeholder="搜索或确认对应的物料编码/型材名称" optionFilterProp="label"
                  options={materialOptions.map((item: any) => ({
                    value: item.id, label: `[${item.code}] ${item.name} (${item.spec || '规格未指定'})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="计划来料数量" rules={[{ required: true, message: '请输入计划数量' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="输入本次登记数量" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch_no" label="预分配批次号" rules={[{ required: true, message: '请输入批次号' }]}>
                <Input placeholder="输入批次号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouse_code" label="入库仓库" rules={[{ required: true }]}>
                <Select placeholder="选择收货仓库">
                  <Select.Option value="YB_WH">宜宾工厂仓 (YB_WH)</Select.Option>
                  <Select.Option value="CQ_WH">重庆工厂仓 (CQ_WH)</Select.Option>
                  <Select.Option value="SUB_WH">外协单位仓 (SUB_WH)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notes" label="登记说明/备注">
                <Input placeholder="例如: 预计明日到达" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </AppDrawerForm>

      {/* ── 追溯全链路 Modal ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginRight: 24 }}>
            <HistoryOutlined style={{ color: '#1890ff' }} />
            <span>订单全链路追溯系统 <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>(One-Ticket Flow Lifecycle Trace)</Text></span>
          </div>
        }
        open={traceOpen}
        onCancel={() => { setTraceOpen(false); setTraceSearchText(''); }}
        footer={null} width={1200} destroyOnClose style={{ top: 32 }}
      >
        <div style={{ display: 'flex', gap: 24, minHeight: 580 }}>
          {/* 左侧栏 320px: 业务流转事件 */}
          <div style={{ flex: '0 0 320px', borderRight: '1px solid #f0f0f0', paddingRight: 20, display: 'flex', flexDirection: 'column' }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14 }}>
              流转生命周期日志
            </Title>
            <Input
              placeholder="输入关键字搜索日志..." value={traceSearchText}
              onChange={(e) => setTraceSearchText(e.target.value)} allowClear
              style={{ marginBottom: 16 }} prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            />
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 520, paddingRight: 8 }}>
              {filteredEvents.length > 0 ? (
                <Timeline
                  style={{ marginTop: 8 }}
                  items={filteredEvents.map((event: any) => {
                    const isError = event.event_type?.includes('error') || event.event_type?.includes('fail');
                    return {
                      color: isError ? 'red' : 'blue',
                      children: (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <Text strong style={{ fontSize: 12 }}>{event.created_at?.slice(5, 16) || '未知时间'}</Text>
                            {isError && <Tag color="error" style={{ transform: 'scale(0.85)', margin: 0 }}>异常</Tag>}
                          </div>
                          <Text style={{ fontSize: 13, color: '#333' }}>{event.message || event.entity_type}</Text>
                          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                            操作员: <span style={{ color: '#595959', fontWeight: 500 }}>{event.actor || '系统自动化'}</span>
                          </div>
                        </div>
                      )
                    };
                  })}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无符合条件的流转日志" />
              )}
            </div>
          </div>

          {/* 右侧栏: 关联单据拓扑与详情 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 顶层：生命周期 Steps 进度条 */}
            <div style={{ background: '#fafafa', padding: '16px 24px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <Steps
                size="small" current={getStepIndex(trace?.order?.status || 'draft')}
                items={[
                  { title: '订单创建', description: '需求已下达' },
                  { title: '物料准备', description: '原材料齐套' },
                  { title: '计划与排产', description: '释放生产计划' },
                  { title: '生产中/待发货', description: '车间工单执行' },
                  { title: '已交付完成', description: '物流签收交付' },
                ]}
              />
            </div>

            {/* 中层：Tabs 数据明细表格 */}
            <div style={{ flex: 1 }}>
              <Tabs
                defaultActiveKey="1" type="card"
                items={[
                  {
                    key: '1',
                    label: <span><DatabaseOutlined /> 物料准备 ({trace?.upstream?.receipts?.length || 0})</span>,
                    children: (
                      <Table dataSource={trace?.upstream?.receipts || []} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }}
                        columns={[
                          { title: '收料单号', dataIndex: 'code', key: 'rc_code', width: 140, render: (v) => <Text strong style={{ color: '#1890ff' }}>{v}</Text> },
                          { title: '实收数量', dataIndex: 'quantity', key: 'rc_qty', width: 90, render: (v) => <Text strong>{v}</Text> },
                          { title: '批次号', dataIndex: 'batchNo', key: 'rc_batch', width: 130 },
                          { title: '供应商', dataIndex: 'supplierName', key: 'rc_supplier', ellipsis: true },
                          { title: '收料仓库', dataIndex: 'warehouseCode', key: 'rc_wh', width: 90 },
                          { title: '收料人', dataIndex: 'receivedBy', key: 'rc_by', width: 90 },
                          { title: '收货日期', dataIndex: 'receivedAt', key: 'rc_date', width: 110 }
                        ]}
                        locale={{ emptyText: <Empty description="暂无关联收料单（原辅料到货）记录" /> }}
                      />
                    )
                  },
                  {
                    key: '2',
                    label: <span><CalendarOutlined /> 计划排产 ({trace?.downstream?.production_plans?.length || 0})</span>,
                    children: (
                      <Table dataSource={trace?.downstream?.production_plans || []} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }}
                        columns={[
                          { title: '计划单号', dataIndex: 'code', key: 'pl_code', width: 150, render: (v) => <Text strong>{v}</Text> },
                          { title: '计划标题', dataIndex: 'title', key: 'pl_title', ellipsis: true },
                          { title: '计划日期', dataIndex: 'planDate', key: 'pl_date', width: 120 },
                          {
                            title: '状态', dataIndex: 'status', key: 'pl_status', width: 100,
                            render: (v) => {
                              const map: any = { draft: { text: '草稿', color: 'default' }, released: { text: '已释放', color: 'blue' } };
                              const s = map[v] || { text: v, color: 'default' };
                              return <Tag color={s.color}>{s.text}</Tag>;
                            }
                          },
                          { title: '创建人', dataIndex: 'createdBy', key: 'pl_by', width: 100 }
                        ]}
                        locale={{ emptyText: <Empty description="该订单尚未推入生产计划中" /> }}
                      />
                    )
                  },
                  {
                    key: '3',
                    label: <span><SettingOutlined /> 生产执行 ({trace?.downstream?.work_orders?.length || 0})</span>,
                    children: (
                      <Table dataSource={trace?.downstream?.work_orders || []} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }}
                        columns={[
                          { title: '工单号', dataIndex: 'code', key: 'wo_code', width: 140, render: (v) => <Text strong style={{ color: '#722ed1' }}>{v}</Text> },
                          { title: '产品', key: 'wo_prod', render: (_, r) => <span><b>{r.product_code || ''}</b> <span style={{ color: '#8c8c8c' }}>{r.product_name || ''}</span></span>, ellipsis: true },
                          { title: '计划数', dataIndex: 'planned_quantity', key: 'wo_plan', width: 80 },
                          { title: '已完工', dataIndex: 'completed_quantity', key: 'wo_comp', width: 80, render: (v) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{v}</span> },
                          {
                            title: '生产进度', key: 'wo_progress', width: 140,
                            render: (_, r) => {
                              const percent = r.planned_quantity ? Math.min(100, Math.round((r.completed_quantity / r.planned_quantity) * 100)) : 0;
                              return <Progress percent={percent} size="small" strokeColor="#722ed1" />;
                            }
                          },
                          {
                            title: '工单状态', dataIndex: 'status', key: 'wo_status', width: 90,
                            render: (v) => {
                              const map: any = { created: '已创建', printed: '已打印', released: '已释放', running: '进行中', completed: '已完成', closed: '已关闭', cancelled: '已取消' };
                              return <Tag color={v === 'completed' ? 'green' : v === 'running' ? 'blue' : 'default'}>{map[v] || v}</Tag>;
                            }
                          }
                        ]}
                        locale={{ emptyText: <Empty description="暂无关联生产工单" /> }}
                      />
                    )
                  },
                  {
                    key: '4',
                    label: <span><TruckOutlined /> 交付发货 ({trace?.downstream?.delivery_plans?.length || 0})</span>,
                    children: (
                      <Table dataSource={trace?.downstream?.delivery_plans || []} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }}
                        columns={[
                          { title: '发货计划单号', dataIndex: 'code', key: 'dl_code', width: 160, render: (v) => <Text strong style={{ color: '#fa8c16' }}>{v}</Text> },
                          { title: '计划发货期', dataIndex: 'plan_date', key: 'dl_date', width: 120 },
                          {
                            title: '单据状态', dataIndex: 'status', key: 'dl_status', width: 110,
                            render: (v) => {
                              const map: any = { draft: { text: '草稿', color: 'default' }, planned: { text: '已排期', color: 'blue' }, shipped: { text: '已发货', color: 'green' } };
                              const s = map[v] || { text: v, color: 'default' };
                              return <Tag color={s.color}>{s.text}</Tag>;
                            }
                          },
                          { title: '创建人', dataIndex: 'created_by', key: 'dl_by', width: 110 },
                          { title: '登记时间', dataIndex: 'created_at', key: 'dl_at', render: (v) => v?.slice(0, 16) }
                        ]}
                        locale={{ emptyText: <Empty description="该订单目前尚无发货计划单" /> }}
                      />
                    )
                  },
                  {
                    key: '5',
                    label: <span><WarningOutlined /> 质量异常 ({trace?.downstream?.quality_issues?.length || 0})</span>,
                    children: (
                      <Table dataSource={trace?.downstream?.quality_issues || []} rowKey="id" size="small" pagination={{ pageSize: 5, size: 'small' }}
                        columns={[
                          { title: '异常单号', dataIndex: 'code', key: 'qa_code', width: 140, render: (v) => <Text strong style={{ color: '#f5222d' }}>{v}</Text> },
                          { title: '异常详情/问题描述', dataIndex: 'issue_description', key: 'qa_desc', ellipsis: true },
                          {
                            title: '严重性', dataIndex: 'severity', key: 'qa_sev', width: 90,
                            render: (v) => {
                              const map: any = { low: { text: '轻微', color: 'blue' }, medium: { text: '一般', color: 'orange' }, high: { text: '严重拦截', color: 'red' } };
                              const s = map[v] || { text: v, color: 'default' };
                              return <Tag color={s.color}>{s.text}</Tag>;
                            }
                          },
                          {
                            title: '异常状态', dataIndex: 'status', key: 'qa_status', width: 100,
                            render: (v) => <Tag color={v === 'resolved' ? 'green' : 'red'}>{v === 'resolved' ? '已解决' : '质量拦截'}</Tag>
                          },
                          { title: '提报人', dataIndex: 'reported_by', key: 'qa_by', width: 90 },
                          { title: '提报时间', dataIndex: 'created_at', key: 'qa_at', render: (v) => v?.slice(0, 16) }
                        ]}
                        locale={{ emptyText: <Empty description="太棒了，本订单全链路无任何质量拦截与异常记录" /> }}
                      />
                    )
                  }
                ]}
              />
            </div>

            {/* 底层：原始追溯报文（折叠） */}
            <Collapse ghost style={{ marginTop: 8 }}>
              <Collapse.Panel header={<span><FileTextOutlined /> 展开/收起 原始追溯 JSON 报文 (开发者调试使用)</span>} key="raw-json">
                <pre className="json-view" style={{ maxHeight: 180, overflow: 'auto', background: '#f8f8f8', padding: 12, borderRadius: 4, fontSize: 11, border: '1px dashed #d9d9d9', margin: 0 }}>
                  {JSON.stringify(trace, null, 2)}
                </pre>
              </Collapse.Panel>
            </Collapse>
          </div>
        </div>
      </Drawer>

      {/* ── 批量粘贴导入 Modal ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <span>从 Excel 批量粘贴导入订单</span>
          </div>
        }
        open={pasteModalOpen}
        onCancel={() => {
          if (!submitting) {
            setPasteModalOpen(false);
            setPasteText('');
            setPreviewData([]);
            setPasteStep('paste');
          }
        }}
        footer={null}
        width={pasteStep === 'preview' ? 1000 : 650}
        destroyOnClose
        maskClosable={false}
      >
        {pasteStep === 'paste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert
              message="使用说明"
              description={
                <div>
                  <p style={{ marginBottom: 4 }}>1. 在 Excel 中准备好数据，列顺序必须为：<b>订单号</b>、<b>产品编码</b>、<b>产品名称</b>、<b>数量</b>、<b>交期</b>。</p>
                  <p style={{ marginBottom: 4 }}>2. 选中多行多列数据并复制（Ctrl+C），然后在下方文本框内粘贴（Ctrl+V）。</p>
                  <p style={{ marginBottom: 0 }}>3. 交期格式应为 <b>YYYY-MM-DD</b>，例如 2026-06-01。</p>
                </div>
              }
              type="info"
              showIcon
            />
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>默认客户（如果无法根据产品编码匹配到已有客户，将使用该默认客户）：</Text>
              <Select
                showSearch
                placeholder="请选择默认客户"
                style={{ width: '100%' }}
                options={customerOptions}
                value={defaultCustomer}
                onChange={setDefaultCustomer}
                filterOption={(input, option) => normalizeText(option?.label).includes(normalizeText(input))}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>粘贴区域：</Text>
              <Input.TextArea
                rows={12}
                placeholder="在此处粘贴 Excel 数据..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <Button onClick={() => setPasteModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                disabled={!pasteText.trim()}
                onClick={() => {
                  const rows = parsePastedText(pasteText, productsArray);
                  setPreviewData(rows);
                  setEditableKeys(rows.map(r => r.key));
                  setPasteStep('preview');
                }}
              >
                解析数据
              </Button>
            </div>
          </div>
        )}

        {pasteStep === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert
              message="解析与校验结果"
              description={`共解析到 ${previewData.length} 行数据。其中有 ${previewData.filter(r => r.errors).length} 行数据存在校验错误。您可以在下方表格中直接修改错误单元格，修改后错误提示会自动更新。`}
              type={previewData.some(r => r.errors) ? "warning" : "success"}
              showIcon
            />

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
              <EditableProTable<ParsedRow>
                rowKey="key"
                value={previewData}
                onChange={(newValues) => {
                  const updated = newValues.map(row => {
                    let r = { ...row } as ParsedRow;
                    // Auto-fill productName if empty and productCode matches
                    if (r.productCode) {
                      const match = productsArray.find(p => p.code === r.productCode);
                      if (match && (!r.productName || r.productName === '')) {
                        r.productName = match.name;
                      }
                    }
                    return validateRow(r);
                  });
                  setPreviewData(updated);
                }}
                columns={[
                  {
                    title: '订单号',
                    dataIndex: 'orderNo',
                    width: '18%',
                    formItemProps: (form: any, { entity }: any) => {
                      const err = entity?.errors?.orderNo;
                      return {
                        validateStatus: err ? 'error' : undefined,
                        help: err,
                      };
                    },
                  },
                  {
                    title: '产品编码',
                    dataIndex: 'productCode',
                    width: '18%',
                    formItemProps: (form: any, { entity }: any) => {
                      const err = entity?.errors?.productCode;
                      return {
                        validateStatus: err ? 'error' : undefined,
                        help: err,
                      };
                    },
                  },
                  {
                    title: '产品名称',
                    dataIndex: 'productName',
                    width: '24%',
                  },
                  {
                    title: '数量',
                    dataIndex: 'qty',
                    width: '15%',
                    formItemProps: (form: any, { entity }: any) => {
                      const err = entity?.errors?.qty;
                      return {
                        validateStatus: err ? 'error' : undefined,
                        help: err,
                      };
                    },
                  },
                  {
                    title: '交期',
                    dataIndex: 'deliveryDate',
                    width: '25%',
                    formItemProps: (form: any, { entity }: any) => {
                      const err = entity?.errors?.deliveryDate;
                      return {
                        validateStatus: err ? 'error' : undefined,
                        help: err,
                      };
                    },
                  },
                ]}
                recordCreatorProps={false}
                editable={{
                  type: 'multiple',
                  editableKeys,
                  onChange: setEditableKeys,
                }}
                cardProps={{ bodyStyle: { padding: 0 } }}
                size="small"
                scroll={{ y: 350 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Button onClick={() => setPasteStep('paste')}>重新粘贴</Button>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button onClick={() => {
                  setPasteModalOpen(false);
                  setPasteText('');
                  setPreviewData([]);
                  setPasteStep('paste');
                }}>取消</Button>
                <Button
                  type="primary"
                  loading={submitting}
                  disabled={previewData.some(r => r.errors) || previewData.length === 0}
                  onClick={handleConfirmSubmit}
                >
                  确认提交
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </EnterprisePageLayout>
  );
}
