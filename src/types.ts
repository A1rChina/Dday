export type Bindings = {
  DB: D1Database;
  ASSETS?: Fetcher;
  ATTACHMENTS?: R2Bucket;
  APP_TOKEN?: string;
  APP_TIMEZONE?: string;
  APP_DEFAULT_ROLE?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    actor: string;
    role: string;
  };
};


export type MaterialType = 'raw' | 'semi_finished' | 'finished' | 'abnormal';
export type WorkOrderStatus =
  | 'created'
  | 'printed'
  | 'released'
  | 'running'
  | 'paused'
  | 'completed'
  | 'closed'
  | 'cancelled';
export type WorkOrderStepStatus = 'pending' | 'running' | 'completed' | 'blocked' | 'skipped';
export type FreezeStatus = 'open' | 'confirmed' | 'processing' | 'released' | 'scrapped' | 'returned' | 'closed';

export type PartyType = 'customer' | 'supplier' | 'other';

export type Party = {
  id: string;
  code: string;
  name: string;
  type: PartyType;
  contact: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  customer_id: string | null;
  status: 'active' | 'inactive';
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  unit: string;
  spec: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  process_route: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  project_id: string | null;
};

export type ProductMaterial = {
  id: string;
  product_id: string;
  material_id: string;
  quantity: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  content_type: string;
  r2_key: string;
  size_bytes: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Process = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Machine = {
  id: string;
  code: string;
  name: string;
  process_id: string | null;
  status: 'available' | 'busy' | 'maintenance' | 'disabled';
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type WorkOrder = {
  id: string;
  code: string;
  production_plan_id?: string | null;
  productionPlanId?: string | null;
  product_id: string;
  material_id: string | null;
  customer_name: string;
  project_name: string;
  planned_quantity: number;
  reported_quantity: number;
  good_quantity: number;
  completed_quantity: number;
  defect_quantity: number;
  scrap_quantity: number;
  status: WorkOrderStatus;
  planned_start_date: string;
  planned_finish_date: string;
  current_step_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  closed_at: string | null;
};

export type WorkOrderStep = {
  id: string;
  work_order_id: string;
  process_id: string | null;
  step_order: number;
  name: string;
  planned_quantity: number;
  completed_quantity: number;
  defect_quantity: number;
  scrap_quantity: number;
  status: WorkOrderStepStatus;
  machine_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrderWithDetails = WorkOrder & {
  product?: Product | null;
  material?: Material | null;
  steps: WorkOrderStep[];
};

export type ProductionReport = {
  id: string;
  work_order_id: string;
  step_id: string;
  process_id: string | null;
  machine_id: string | null;
  operator_name: string;
  report_qty: number;
  good_qty: number;
  defect_qty: number;
  scrap_qty: number;
  started_at: string | null;
  ended_at: string | null;
  notes: string;
  created_at: string;
};

export type InventoryBalance = {
  id: string;
  material_id: string | null;
  product_id: string | null;
  warehouse_code: string;
  location_code: string;
  batch_no: string;
  qty_on_hand: number;
  qty_available: number;
  qty_frozen: number;
  qty_reserved: number;
  qty_scrap: number;
  unit: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  material_id: string | null;
  product_id: string | null;
  work_order_id: string | null;
  report_id: string | null;
  inventory_lock_id: string | null;
  movement_type: 'adjust' | 'issue' | 'finish' | 'freeze' | 'unfreeze' | 'scrap' | 'return' | 'ship';
  qty_delta: number;
  frozen_delta: number;
  scrap_delta: number;
  qty_available_after: number;
  qty_frozen_after: number;
  qty_scrap_after: number;
  reason: string;
  created_by: string;
  created_at: string;
};

export type MaterialFreeze = {
  id: string;
  code: string;
  status: FreezeStatus;
  source_type: string;
  project_name: string;
  product_id: string | null;
  material_id: string | null;
  warehouse_code: string;
  batch_no: string;
  abnormal_qty: number;
  freeze_qty: number;
  selectable_qty: number;
  rework_qty: number;
  return_qty: number;
  scrap_qty: number;
  responsibility: string;
  solution: string;
  eta: string;
  impact_order: string;
  impact_delivery: string;
  owner: string;
  notes: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type DemandLine = {
  id: string;
  code: string;
  customer_id: string;
  project_id: string | null;
  product_id: string;
  quantity: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'confirmed' | 'changed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ProductionDemandLine = {
  id: string;
  code: string;
  demand_line_id: string | null;
  customer_id: string;
  project_id: string | null;
  product_id: string;
  quantity: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'imported' | 'confirmed' | 'planned' | 'in_production' | 'ready_to_ship' | 'shipped' | 'closed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
};
