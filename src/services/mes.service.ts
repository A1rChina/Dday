import type { z } from 'zod';
import {
  closeFreezeSchema,
  createFreezeSchema,
  createMachineSchema,
  createMaterialSchema,
  createProcessSchema,
  createProductSchema,
  createReportSchema,
  createWorkOrderSchema,
  inventoryAdjustSchema,
  updateFreezeSchema,
  updateMachineSchema,
  updateMaterialSchema,
  updateProcessSchema,
  updateProductSchema,
  updateWorkOrderSchema,
} from '../schemas/mes';
import type {
  FreezeStatus,
  InventoryBalance,
  InventoryMovement,
  Machine,
  Material,
  MaterialFreeze,
  Process,
  Product,
  ProductionReport,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderStep,
  WorkOrderWithDetails,
} from '../types';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { getWarehouseForProduct } from '../utils/warehouse';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ProductionExecutionService } from './production-execution.service';

type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;
type CreateProcessInput = z.infer<typeof createProcessSchema>;
type UpdateProcessInput = z.infer<typeof updateProcessSchema>;
type CreateMachineInput = z.infer<typeof createMachineSchema>;
type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
type CreateReportInput = z.infer<typeof createReportSchema>;
type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;
type CreateFreezeInput = z.infer<typeof createFreezeSchema>;
type UpdateFreezeInput = z.infer<typeof updateFreezeSchema>;
type CloseFreezeInput = z.infer<typeof closeFreezeSchema>;

type InventoryTarget = {
  material_id?: string | null;
  product_id?: string | null;
  warehouse_code?: string;
  batch_no?: string;
};

export class MesService {
  constructor(private readonly db: D1Database) {}

  async listMaterials(): Promise<Material[]> {
    const res = await this.db.prepare('SELECT id, code, name, type, unit, spec, notes, status, created_at, updated_at FROM materials ORDER BY status DESC, code ASC').all<Material>();
    return res.results ?? [];
  }

  async createMaterial(input: CreateMaterialInput): Promise<Material> {
    const id = newId('mat');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO materials (id, code, name, type, unit, spec, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(id, input.code, input.name, input.type, input.unit, input.spec, input.notes, ts, ts)
      .run();
    await this.log('create', 'material', id, input.code);
    return await this.mustFindMaterial(id);
  }

  async updateMaterial(id: string, input: UpdateMaterialInput): Promise<Material | null> {
    const current = await this.findMaterial(id);
    if (!current) return null;
    await this.db
      .prepare(
        `UPDATE materials
         SET code = ?, name = ?, type = ?, unit = ?, spec = ?, notes = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        input.code ?? current.code,
        input.name ?? current.name,
        input.type ?? current.type,
        input.unit ?? current.unit,
        input.spec ?? current.spec,
        input.notes ?? current.notes,
        input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        nowIso(),
        id
      )
      .run();
    await this.log('update', 'material', id, input.code ?? current.code);
    return await this.findMaterial(id);
  }

  async listProducts(): Promise<Array<Product & { material_code: string | null; material_name: string | null }>> {
    const res = await this.db
      .prepare(
        `SELECT p.id, p.code, p.name, p.unit, p.process_route, p.notes, p.status, p.created_at, p.updated_at, p.party_id, p.project_id,
                pt.name AS customer_name, prj.name AS project_name,
                m.id AS material_id, m.code AS material_code, m.name AS material_name
         FROM products p
         LEFT JOIN parties pt ON pt.id = p.party_id
         LEFT JOIN projects prj ON prj.id = p.project_id
         LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
         LEFT JOIN materials m ON m.id = pm.material_id
         ORDER BY p.status DESC, p.code ASC`
      )
      .all<any>();
    const results = (res.results ?? []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      customer_name: row.customer_name ?? '',
      project_name: row.project_name ?? '',
      material_id: row.material_id ?? null,
      unit: row.unit,
      process_route: row.process_route,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      party_id: row.party_id,
      project_id: row.project_id,
      material_code: row.material_code,
      material_name: row.material_name,
    }));
    return results as any[];
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const id = newId('prod');
    const ts = nowIso();
    
    let party_id: string | null = null;
    if (input.customer_name) {
      const p = await this.db.prepare('SELECT id FROM parties WHERE name = ?').bind(input.customer_name).first<{ id: string }>();
      if (p) {
        party_id = p.id;
      } else {
        party_id = newId('cust');
        await this.db.prepare('INSERT INTO parties (id, code, name, type, status, created_at, updated_at) VALUES (?, ?, ?, \'customer\', \'active\', ?, ?)')
          .bind(party_id, 'CUST-' + newId('c').toUpperCase(), input.customer_name, ts, ts)
          .run();
      }
    }
    
    let project_id: string | null = null;
    if (input.project_name) {
      const proj = await this.db.prepare('SELECT id FROM projects WHERE name = ?').bind(input.project_name).first<{ id: string }>();
      if (proj) {
        project_id = proj.id;
      } else {
        project_id = newId('proj');
        await this.db.prepare('INSERT INTO projects (id, code, name, party_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, \'active\', ?, ?)')
          .bind(project_id, 'PROJ-' + newId('p').toUpperCase(), input.project_name, party_id, ts, ts)
          .run();
      }
    }

    await this.db
      .prepare(
        `INSERT INTO products (id, code, name, unit, process_route, notes, status, created_at, updated_at, party_id, project_id)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.code,
        input.name,
        input.unit,
        JSON.stringify(input.process_ids),
        input.notes,
        ts,
        ts,
        party_id,
        project_id
      )
      .run();

    if (input.material_id) {
      await this.db.prepare('INSERT INTO product_materials (id, product_id, material_id, quantity, status, created_at, updated_at) VALUES (?, ?, ?, 1.0, \'active\', ?, ?)')
        .bind(newId('pm'), id, input.material_id, ts, ts)
        .run();
    }

    await this.log('create', 'product', id, input.code);
    return await this.mustFindProduct(id);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
    const current = await this.findProduct(id);
    if (!current) return null;
    const ts = nowIso();
    
    let party_id = current.party_id;
    if (input.customer_name !== undefined) {
      if (input.customer_name === '') {
        party_id = null;
      } else {
        const p = await this.db.prepare('SELECT id FROM parties WHERE name = ?').bind(input.customer_name).first<{ id: string }>();
        if (p) {
          party_id = p.id;
        } else {
          party_id = newId('cust');
          await this.db.prepare('INSERT INTO parties (id, code, name, type, status, created_at, updated_at) VALUES (?, ?, ?, \'customer\', \'active\', ?, ?)')
            .bind(party_id, 'CUST-' + newId('c').toUpperCase(), input.customer_name, ts, ts)
            .run();
        }
      }
    }
    
    let project_id = current.project_id;
    if (input.project_name !== undefined) {
      if (input.project_name === '') {
        project_id = null;
      } else {
        const proj = await this.db.prepare('SELECT id FROM projects WHERE name = ?').bind(input.project_name).first<{ id: string }>();
        if (proj) {
          project_id = proj.id;
        } else {
          project_id = newId('proj');
          await this.db.prepare('INSERT INTO projects (id, code, name, party_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, \'active\', ?, ?)')
            .bind(project_id, 'PROJ-' + newId('p').toUpperCase(), input.project_name, party_id, ts, ts)
            .run();
        }
      }
    }

    await this.db
      .prepare(
        `UPDATE products
         SET code = ?, name = ?, unit = ?, process_route = ?, notes = ?, status = ?, updated_at = ?, party_id = ?, project_id = ?
         WHERE id = ?`
      )
      .bind(
        input.code ?? current.code,
        input.name ?? current.name,
        input.unit ?? current.unit,
        input.process_ids ? JSON.stringify(input.process_ids) : current.process_route,
        input.notes ?? current.notes,
        input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        ts,
        party_id,
        project_id,
        id
      )
      .run();

    if (input.material_id !== undefined) {
      await this.db.prepare('UPDATE product_materials SET status = \'inactive\', updated_at = ? WHERE product_id = ?').bind(ts, id).run();
      if (input.material_id) {
        await this.db.prepare('INSERT INTO product_materials (id, product_id, material_id, quantity, status, created_at, updated_at) VALUES (?, ?, ?, 1.0, \'active\', ?, ?)')
          .bind(newId('pm'), id, input.material_id, ts, ts)
          .run();
      }
    }

    await this.log('update', 'product', id, input.code ?? current.code);
    return await this.findProduct(id);
  }

  async listProcesses(): Promise<Process[]> {
    const res = await this.db.prepare('SELECT * FROM processes ORDER BY sort_order ASC, code ASC').all<Process>();
    return res.results ?? [];
  }

  async createProcess(input: CreateProcessInput): Promise<Process> {
    const id = newId('proc');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO processes (id, code, name, sort_order, notes, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, input.code, input.name, input.sort_order, input.notes, ts, ts)
      .run();
    await this.log('create', 'process', id, input.code);
    return await this.mustFindProcess(id);
  }

  async updateProcess(id: string, input: UpdateProcessInput): Promise<Process | null> {
    const current = await this.findProcess(id);
    if (!current) return null;
    await this.db
      .prepare(
        `UPDATE processes
         SET code = ?, name = ?, sort_order = ?, notes = ?, is_active = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        input.code ?? current.code,
        input.name ?? current.name,
        input.sort_order ?? current.sort_order,
        input.notes ?? current.notes,
        input.is_active ?? current.is_active,
        nowIso(),
        id
      )
      .run();
    await this.log('update', 'process', id, input.code ?? current.code);
    return await this.findProcess(id);
  }

  async listMachines(): Promise<Array<Machine & { process_name: string | null }>> {
    const res = await this.db
      .prepare(
        `SELECT m.*, p.name AS process_name
         FROM machines m
         LEFT JOIN processes p ON p.id = m.process_id
         ORDER BY m.is_active DESC, m.code ASC`
      )
      .all<Machine & { process_name: string | null }>();
    return res.results ?? [];
  }

  async createMachine(input: CreateMachineInput): Promise<Machine> {
    if (input.process_id) await this.mustFindProcess(input.process_id);
    const id = newId('mach');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO machines (id, code, name, process_id, status, notes, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, input.code, input.name, input.process_id ?? null, input.status, input.notes, ts, ts)
      .run();
    await this.log('create', 'machine', id, input.code);
    return await this.mustFindMachine(id);
  }

  async updateMachine(id: string, input: UpdateMachineInput): Promise<Machine | null> {
    const current = await this.findMachine(id);
    if (!current) return null;
    if (input.process_id) await this.mustFindProcess(input.process_id);
    await this.db
      .prepare(
        `UPDATE machines
         SET code = ?, name = ?, process_id = ?, status = ?, notes = ?, is_active = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        input.code ?? current.code,
        input.name ?? current.name,
        input.process_id ?? current.process_id,
        input.status ?? current.status,
        input.notes ?? current.notes,
        input.is_active ?? current.is_active,
        nowIso(),
        id
      )
      .run();
    await this.log('update', 'machine', id, input.code ?? current.code);
    return await this.findMachine(id);
  }

  async listWorkOrders(): Promise<Array<WorkOrder & { product_code: string; product_name: string }>> {
    const res = await this.db
      .prepare(
        `SELECT w.*, p.code AS product_code, p.name AS product_name
         FROM work_orders w
         JOIN products p ON p.id = w.product_id
         ORDER BY w.created_at DESC`
      )
      .all<WorkOrder & { product_code: string; product_name: string }>();
    return res.results ?? [];
  }

  async createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrderWithDetails> {
    const product = await this.mustFindProduct(input.product_id);
    const materialId = input.material_id ?? product.material_id;
    if (materialId) await this.mustFindMaterial(materialId);

    const code = input.code || (await this.nextWorkOrderCode(product.project_name));
    const id = newId('wo');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO work_orders
         (id, code, product_id, material_id, customer_name, project_name, planned_quantity,
          completed_quantity, defect_quantity, scrap_quantity, status, planned_start_date,
          planned_finish_date, current_step_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'created', ?, ?, NULL, ?, ?, ?)`
      )
      .bind(
        id,
        code,
        product.id,
        materialId ?? null,
        product.customer_name,
        product.project_name,
        input.planned_quantity,
        input.planned_start_date ?? '',
        input.planned_finish_date ?? '',
        input.notes,
        ts,
        ts
      )
      .run();

    const processIds = input.step_process_ids ?? parseProcessRoute(product.process_route);
    const steps = processIds.length > 0 ? processIds : [null];
    let firstStepId: string | null = null;
    for (let index = 0; index < steps.length; index += 1) {
      const processId = steps[index];
      const process = processId ? await this.findProcess(processId) : null;
      if (processId && !process) throw new Error(`process not found: ${processId}`);
      const stepId = newId('step');
      if (!firstStepId) firstStepId = stepId;
      await this.db
        .prepare(
          `INSERT INTO work_order_steps
           (id, work_order_id, process_id, step_order, name, planned_quantity, completed_quantity,
            defect_quantity, scrap_quantity, status, machine_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 'pending', NULL, ?, ?)`
        )
        .bind(stepId, id, processId ?? null, (index + 1) * 10, process?.name ?? 'Production', input.planned_quantity, ts, ts)
        .run();
    }

    if (firstStepId) {
      await this.db
        .prepare('UPDATE work_orders SET current_step_id = ? WHERE id = ?')
        .bind(firstStepId, id)
        .run();
    }

    await this.log('create', 'work_order', id, code);
    const created = await this.getWorkOrder(id);
    if (!created) throw new Error('work order create failed');
    return created;
  }

  async getWorkOrder(idOrCode: string): Promise<WorkOrderWithDetails | null> {
    const order = await this.db
      .prepare('SELECT * FROM work_orders WHERE id = ? OR code = ?')
      .bind(idOrCode, idOrCode)
      .first<WorkOrder>();
    if (!order) return null;
    const [product, material, steps] = await Promise.all([
      this.findProduct(order.product_id),
      order.material_id ? this.findMaterial(order.material_id) : Promise.resolve(null),
      this.listSteps(order.id),
    ]);
    return { ...order, product, material, steps };
  }

  async updateWorkOrder(id: string, input: UpdateWorkOrderInput): Promise<WorkOrderWithDetails | null> {
    const current = await this.findWorkOrder(id);
    if (!current) return null;
    const nextStatus = input.status ?? current.status;
    await this.db
      .prepare(
        `UPDATE work_orders
         SET status = ?, planned_quantity = ?, planned_start_date = ?, planned_finish_date = ?,
             notes = ?, updated_at = ?, completed_at = ?, closed_at = ?
         WHERE id = ?`
      )
      .bind(
        nextStatus,
        input.planned_quantity ?? current.planned_quantity,
        input.planned_start_date ?? current.planned_start_date,
        input.planned_finish_date ?? current.planned_finish_date,
        input.notes ?? current.notes,
        nowIso(),
        nextStatus === 'completed' ? current.completed_at ?? nowIso() : current.completed_at,
        nextStatus === 'closed' ? current.closed_at ?? nowIso() : current.closed_at,
        id
      )
      .run();
    await this.log('update', 'work_order', id, nextStatus);
    if (current.production_plan_id) {
      try {
        const executionService = new ProductionExecutionService(this.db);
        await executionService.syncProductionPlanStatus(current.production_plan_id);
      } catch (err) {
        console.error('Failed to sync production plan status:', err);
      }
    }
    return await this.getWorkOrder(id);
  }

  async markWorkOrderPrinted(id: string): Promise<WorkOrderWithDetails | null> {
    const current = await this.db
      .prepare('SELECT * FROM work_orders WHERE id = ? OR code = ?')
      .bind(id, id)
      .first<WorkOrder>();
    if (!current) return null;
    if (current.status === 'created') {
      await this.updateWorkOrder(current.id, { status: 'printed' });
    }
    return await this.getWorkOrder(current.id);
  }

  async scanWorkOrder(code: string): Promise<WorkOrderWithDetails | null> {
    const normalized = normalizeScanCode(code);
    return await this.getWorkOrder(normalized);
  }

  async createReport(input: CreateReportInput): Promise<{
    report: ProductionReport;
    work_order: WorkOrderWithDetails;
    inventory_transaction: unknown | null;
    scrap_transaction: unknown | null;
  }> {
    if (!input.work_order_id && !input.work_order_code) {
      throw new Error('work_order_id or work_order_code is required');
    }
    const workOrder = await this.getWorkOrder(input.work_order_id ?? input.work_order_code ?? '');
    if (!workOrder) throw new Error('work order not found');
    if (['closed', 'cancelled', 'completed'].includes(workOrder.status)) {
      throw new Error(`work order status does not allow reporting: ${workOrder.status}`);
    }

    const classifiedQty = input.good_qty + input.defect_qty + input.scrap_qty;
    const totalQty = input.report_qty ?? classifiedQty;
    if (totalQty <= 0) throw new Error('report quantity must be greater than 0');
    if (classifiedQty > totalQty) throw new Error('good + defect + scrap cannot exceed report quantity');

    const step = await this.resolveReportStep(workOrder, input);
    const reportedTotal = step.completed_quantity + step.defect_quantity + step.scrap_quantity + totalQty;
    if (reportedTotal > step.planned_quantity) {
      throw new Error(`report quantity exceeds remaining step quantity: remaining ${step.planned_quantity - step.completed_quantity - step.defect_quantity - step.scrap_quantity}`);
    }

    const id = newId('rpt');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO production_reports
         (id, work_order_id, step_id, process_id, machine_id, operator_name, good_qty,
          defect_qty, scrap_qty, report_qty, started_at, ended_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        workOrder.id,
        step.id,
        step.process_id,
        input.machine_id ?? step.machine_id ?? null,
        input.operator_name,
        input.good_qty,
        input.defect_qty,
        input.scrap_qty,
        totalQty,
        input.started_at ?? ts,
        input.ended_at ?? ts,
        input.notes,
        ts
      )
      .run();

    const nextStepGood = step.completed_quantity + input.good_qty;
    const nextStepDefect = step.defect_quantity + input.defect_qty;
    const nextStepScrap = step.scrap_quantity + input.scrap_qty;
    const nextStepReported = step.completed_quantity + step.defect_quantity + step.scrap_quantity + totalQty;
    const nextStepStatus = nextStepReported >= step.planned_quantity ? 'completed' : 'running';
    await this.db
      .prepare(
        `UPDATE work_order_steps
         SET completed_quantity = ?, defect_quantity = ?, scrap_quantity = ?, status = ?,
             machine_id = COALESCE(?, machine_id), started_at = COALESCE(started_at, ?),
             completed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        nextStepGood,
        nextStepDefect,
        nextStepScrap,
        nextStepStatus,
        input.machine_id ?? null,
        ts,
        nextStepStatus === 'completed' ? ts : null,
        ts,
        step.id
      )
      .run();

    const report = await this.mustFindReport(id);
    const refreshedSteps = await this.listSteps(workOrder.id);
    const lastStep = refreshedSteps[refreshedSteps.length - 1];
    const firstOpenStep = refreshedSteps.find((item) => item.status !== 'completed' && item.status !== 'skipped') ?? null;
    const goodQty = lastStep?.completed_quantity ?? 0;
    const defectQty = sum(refreshedSteps.map((item) => item.defect_quantity));
    const scrapQty = sum(refreshedSteps.map((item) => item.scrap_quantity));
    const currentReportedQty = workOrder.reported_quantity ?? workOrder.completed_quantity + workOrder.defect_quantity + workOrder.scrap_quantity;
    const reportedQty = currentReportedQty + totalQty;
    const nextOrderStatus: WorkOrderStatus =
      lastStep && reportedQty >= lastStep.planned_quantity ? 'completed' : 'running';
    const completedAt = nextOrderStatus === 'completed' ? ts : null;

    await this.db
      .prepare(
        `UPDATE work_orders
         SET reported_quantity = ?, good_quantity = ?, completed_quantity = ?,
             defect_quantity = ?, scrap_quantity = ?, status = ?,
             current_step_id = ?, updated_at = ?, completed_at = COALESCE(completed_at, ?)
         WHERE id = ?`
      )
      .bind(
        reportedQty,
        goodQty,
        goodQty,
        defectQty,
        scrapQty,
        nextOrderStatus,
        firstOpenStep?.id ?? lastStep?.id ?? null,
        ts,
        completedAt,
        workOrder.id
      )
      .run();

    const ledger = new InventoryLedgerService(this.db);
    let inventoryTransaction: unknown | null = null;
    let scrapTransaction: unknown | null = null;
    if (input.good_qty > 0) {
      inventoryTransaction = await ledger.receiveItem({
        itemId: workOrder.product_id,
        warehouseId: getWarehouseForProduct(workOrder.product?.name ?? ''),
        locationId: '',
        quantity: input.good_qty,
        sourceId: report.id,
        sourceNo: workOrder.code,
        sourceType: 'production_good_in',
        operatorName: input.operator_name,
        remark: `Production good in from WO ${workOrder.code}`,
      });
    }
    if (input.scrap_qty > 0) {
      scrapTransaction = await ledger.receiveItem({
        itemId: workOrder.product_id,
        warehouseId: getWarehouseForProduct(workOrder.product?.name ?? ''),
        locationId: '',
        quantity: input.scrap_qty,
        sourceId: report.id,
        sourceNo: workOrder.code,
        sourceType: 'production_scrap',
        operatorName: input.operator_name,
        remark: `Production scrap from WO ${workOrder.code}`,
      });
    }

    await this.log('report', 'work_order', workOrder.id, JSON.stringify({ report_id: report.id, good: input.good_qty, defect: input.defect_qty, scrap: input.scrap_qty }));
    if (workOrder.production_plan_id) {
      try {
        const executionService = new ProductionExecutionService(this.db);
        await executionService.syncProductionPlanStatus(workOrder.production_plan_id);
      } catch (err) {
        console.error('Failed to sync production plan status:', err);
      }
    }
    const updated = await this.getWorkOrder(workOrder.id);
    if (!updated) throw new Error('work order update failed');
    return { report, work_order: updated, inventory_transaction: inventoryTransaction, scrap_transaction: scrapTransaction };
  }

  async listReports(workOrderId?: string): Promise<ProductionReport[]> {
    const stmt = workOrderId
      ? this.db.prepare('SELECT * FROM production_reports WHERE work_order_id = ? ORDER BY created_at DESC').bind(workOrderId)
      : this.db.prepare('SELECT * FROM production_reports ORDER BY created_at DESC LIMIT 200');
    const res = await stmt.all<ProductionReport>();
    return res.results ?? [];
  }

  async listInventoryBalances(): Promise<any> {
    const ledger = new InventoryLedgerService(this.db);
    const res = await ledger.listBalances({ current: 1, pageSize: 1000 });
    return res.items;
  }

  async listInventoryMovements(): Promise<any> {
    const ledger = new InventoryLedgerService(this.db);
    const res = await ledger.listTransactions({ current: 1, pageSize: 300 });
    return res.items;
  }

  async adjustInventory(input: InventoryAdjustInput): Promise<InventoryMovement> {
    ensureInventoryTarget(input);
    return await this.applyInventoryMovement({
      material_id: input.material_id ?? null,
      product_id: input.product_id ?? null,
      warehouse_code: input.warehouse_code,
      batch_no: input.batch_no,
      movement_type: 'adjust',
      qty_delta: input.qty_delta,
      frozen_delta: 0,
      scrap_delta: 0,
      reason: input.reason,
      created_by: input.created_by,
    });
  }

  async shipProductInventory(input: {
    product_id: string;
    quantity: number;
    batch_no?: string;
    reason: string;
    created_by?: string;
  }): Promise<InventoryMovement> {
    const product = await this.mustFindProduct(input.product_id);
    const warehouseCode = getWarehouseForProduct(product.name);
    const batchNo = input.batch_no || (await this.findAvailableProductBatch(input.product_id, input.quantity));
    return await this.applyInventoryMovement({
      material_id: null,
      product_id: input.product_id,
      warehouse_code: warehouseCode,
      batch_no: batchNo,
      movement_type: 'ship',
      qty_delta: -input.quantity,
      frozen_delta: 0,
      scrap_delta: 0,
      reason: input.reason,
      created_by: input.created_by,
    });
  }

  async listFreezes(): Promise<MaterialFreeze[]> {
    const res = await this.db.prepare('SELECT * FROM material_freezes ORDER BY created_at DESC').all<MaterialFreeze>();
    return res.results ?? [];
  }

  async getFreeze(idOrCode: string): Promise<MaterialFreeze | null> {
    return await this.db
      .prepare('SELECT * FROM material_freezes WHERE id = ? OR code = ?')
      .bind(idOrCode, idOrCode)
      .first<MaterialFreeze>();
  }

  async createFreeze(input: CreateFreezeInput): Promise<{ freeze: MaterialFreeze; movement: InventoryMovement }> {
    ensureInventoryTarget(input);
    const id = newId('frz');
    const code = await this.nextFreezeCode();
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO material_freezes
         (id, code, status, source_type, project_name, product_id, material_id, warehouse_code, batch_no,
          abnormal_qty, freeze_qty, selectable_qty, rework_qty, return_qty, scrap_qty, responsibility,
          solution, eta, impact_order, impact_delivery, owner, notes, created_at, updated_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        code,
        input.source_type,
        input.project_name,
        input.product_id ?? null,
        input.material_id ?? null,
        input.warehouse_code,
        input.batch_no,
        input.abnormal_qty,
        input.freeze_qty,
        input.selectable_qty,
        input.rework_qty,
        input.return_qty,
        input.scrap_qty,
        input.responsibility,
        input.solution,
        input.eta,
        input.impact_order,
        input.impact_delivery,
        input.owner,
        input.notes,
        ts,
        ts
      )
      .run();

    await this.db
      .prepare(
        `INSERT INTO material_freeze_items
         (id, freeze_id, material_id, product_id, batch_no, freeze_qty, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(newId('fri'), id, input.material_id ?? null, input.product_id ?? null, input.batch_no, input.freeze_qty, input.notes, ts)
      .run();

    const movement = await this.applyInventoryMovement({
      material_id: input.material_id ?? null,
      product_id: input.product_id ?? null,
      warehouse_code: input.warehouse_code,
      batch_no: input.batch_no,
      movement_type: 'freeze',
      qty_delta: input.is_addition ? 0 : -input.freeze_qty,
      frozen_delta: input.freeze_qty,
      scrap_delta: 0,
      freeze_id: id,
      reason: `freeze ${code}`,
      created_by: input.owner,
    });
    await this.log('create', 'material_freeze', id, code);
    const freeze = await this.getFreeze(id);
    if (!freeze) throw new Error('freeze create failed');
    return { freeze, movement };
  }

  async updateFreeze(id: string, input: UpdateFreezeInput): Promise<MaterialFreeze | null> {
    const current = await this.getFreeze(id);
    if (!current) return null;
    const nextStatus = input.status ?? current.status;
    await this.db
      .prepare(
        `UPDATE material_freezes
         SET status = ?, source_type = ?, project_name = ?, product_id = ?, material_id = ?, warehouse_code = ?,
             batch_no = ?, abnormal_qty = ?, selectable_qty = ?, rework_qty = ?, return_qty = ?, scrap_qty = ?,
             responsibility = ?, solution = ?, eta = ?, impact_order = ?, impact_delivery = ?, owner = ?,
             notes = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        nextStatus,
        input.source_type ?? current.source_type,
        input.project_name ?? current.project_name,
        input.product_id ?? current.product_id,
        input.material_id ?? current.material_id,
        input.warehouse_code ?? current.warehouse_code,
        input.batch_no ?? current.batch_no,
        input.abnormal_qty ?? current.abnormal_qty,
        input.selectable_qty ?? current.selectable_qty,
        input.rework_qty ?? current.rework_qty,
        input.return_qty ?? current.return_qty,
        input.scrap_qty ?? current.scrap_qty,
        input.responsibility ?? current.responsibility,
        input.solution ?? current.solution,
        input.eta ?? current.eta,
        input.impact_order ?? current.impact_order,
        input.impact_delivery ?? current.impact_delivery,
        input.owner ?? current.owner,
        input.notes ?? current.notes,
        nowIso(),
        current.id
      )
      .run();
    await this.log('update', 'material_freeze', current.id, nextStatus);
    return await this.getFreeze(current.id);
  }

  async closeFreeze(id: string, input: CloseFreezeInput): Promise<{ freeze: MaterialFreeze; movement: InventoryMovement | null }> {
    const freeze = await this.getFreeze(id);
    if (!freeze) throw new Error('freeze not found');
    if (['released', 'scrapped', 'returned', 'closed'].includes(freeze.status)) {
      throw new Error(`freeze is already finished: ${freeze.status}`);
    }

    let status: FreezeStatus = 'released';
    let movement: InventoryMovement | null = null;
    if (input.action === 'release') {
      status = 'released';
      movement = await this.applyInventoryMovement({
        material_id: freeze.material_id,
        product_id: freeze.product_id,
        warehouse_code: freeze.warehouse_code,
        batch_no: freeze.batch_no,
        movement_type: 'unfreeze',
        qty_delta: freeze.freeze_qty,
        frozen_delta: -freeze.freeze_qty,
        scrap_delta: 0,
        freeze_id: freeze.id,
        reason: input.notes || `release ${freeze.code}`,
        created_by: input.actor,
      });
    } else if (input.action === 'scrap') {
      status = 'scrapped';
      movement = await this.applyInventoryMovement({
        material_id: freeze.material_id,
        product_id: freeze.product_id,
        warehouse_code: freeze.warehouse_code,
        batch_no: freeze.batch_no,
        movement_type: 'scrap',
        qty_delta: 0,
        frozen_delta: -freeze.freeze_qty,
        scrap_delta: freeze.freeze_qty,
        freeze_id: freeze.id,
        reason: input.notes || `scrap ${freeze.code}`,
        created_by: input.actor,
      });
    } else if (input.action === 'return') {
      status = 'returned';
      movement = await this.applyInventoryMovement({
        material_id: freeze.material_id,
        product_id: freeze.product_id,
        warehouse_code: freeze.warehouse_code,
        batch_no: freeze.batch_no,
        movement_type: 'return',
        qty_delta: 0,
        frozen_delta: -freeze.freeze_qty,
        scrap_delta: 0,
        freeze_id: freeze.id,
        reason: input.notes || `return ${freeze.code}`,
        created_by: input.actor,
      });
    } else {
      status = 'closed';
    }

    await this.db
      .prepare('UPDATE material_freezes SET status = ?, notes = ?, updated_at = ?, closed_at = ? WHERE id = ?')
      .bind(status, input.notes || freeze.notes, nowIso(), nowIso(), freeze.id)
      .run();
    await this.log('close', 'material_freeze', freeze.id, status);
    const updated = await this.getFreeze(freeze.id);
    if (!updated) throw new Error('freeze close failed');
    return { freeze: updated, movement };
  }

  private async applyInventoryMovement(args: InventoryTarget & {
    movement_type: 'adjust' | 'ship' | 'freeze' | 'unfreeze' | 'scrap' | 'return';
    qty_delta: number;
    frozen_delta: number;
    scrap_delta: number;
    work_order_id?: string | null;
    report_id?: string | null;
    freeze_id?: string | null;
    reason: string;
    created_by?: string;
  }): Promise<any> { // Using any to replace InventoryMovement for now
    const ledger = new InventoryLedgerService(this.db);
    const itemId = args.material_id ?? args.product_id ?? '';
    const warehouseId = args.warehouse_code ?? 'MAIN';

    if (args.movement_type === 'adjust' || args.movement_type === 'ship') {
      const delta = args.movement_type === 'ship' ? args.qty_delta : args.qty_delta; // ship passes negative qty_delta
      if (delta < 0) {
        await ledger.issueItem({
          itemId,
          warehouseId,
          quantity: Math.abs(delta),
          sourceId: args.work_order_id ?? args.report_id ?? args.freeze_id ?? '',
          sourceType: 'mes_' + args.movement_type,
          operatorName: args.created_by ?? '',
          remark: args.reason,
        });
      } else if (delta > 0) {
        await ledger.adjustInventory({
          itemId,
          warehouseId,
          qtyDelta: delta,
          sourceId: args.work_order_id ?? args.report_id ?? args.freeze_id ?? '',
          sourceType: 'mes_' + args.movement_type,
          operatorName: args.created_by ?? '',
          remark: args.reason,
        });
      }
    } else if (args.movement_type === 'freeze') {
      await ledger.changeStatus({
        itemId,
        warehouseId,
        quantity: args.frozen_delta,
        fromStatus: 'available',
        toStatus: 'frozen',
        sourceId: args.freeze_id ?? '',
        sourceType: 'mes_freeze',
        operatorName: args.created_by ?? '',
        remark: args.reason,
      });
    } else if (args.movement_type === 'unfreeze') {
      await ledger.changeStatus({
        itemId,
        warehouseId,
        quantity: Math.abs(args.frozen_delta), // frozen_delta is negative for unfreeze
        fromStatus: 'frozen',
        toStatus: 'available',
        sourceId: args.freeze_id ?? '',
        sourceType: 'mes_unfreeze',
        operatorName: args.created_by ?? '',
        remark: args.reason,
      });
    } else if (args.movement_type === 'scrap') {
      await ledger.changeStatus({
        itemId,
        warehouseId,
        quantity: args.scrap_delta,
        fromStatus: 'frozen', // scrap from frozen usually
        toStatus: 'scrap',
        sourceId: args.freeze_id ?? '',
        sourceType: 'mes_scrap',
        operatorName: args.created_by ?? '',
        remark: args.reason,
      });
    } else if (args.movement_type === 'return') {
      await ledger.changeStatus({
        itemId,
        warehouseId,
        quantity: Math.abs(args.frozen_delta),
        fromStatus: 'frozen',
        toStatus: 'available',
        sourceId: args.freeze_id ?? '',
        sourceType: 'mes_return',
        operatorName: args.created_by ?? '',
        remark: args.reason,
      });
    }

    return { id: newId('mov'), created_at: nowIso(), ...args };
  }

  private async resolveReportStep(workOrder: WorkOrderWithDetails, input: CreateReportInput): Promise<WorkOrderStep> {
    if (input.step_id) {
      const step = workOrder.steps.find((item) => item.id === input.step_id);
      if (!step) throw new Error('work order step not found');
      return step;
    }
    if (input.process_id) {
      const step = workOrder.steps.find((item) => item.process_id === input.process_id && item.status !== 'completed');
      if (!step) throw new Error('matching process step not found or already completed');
      return step;
    }
    const step = workOrder.steps.find((item) => item.id === workOrder.current_step_id) ?? workOrder.steps.find((item) => item.status !== 'completed');
    if (!step) throw new Error('no reportable step found');
    return step;
  }

  private async nextWorkOrderCode(projectName: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = projectName ? `WO-${projectName}-${date}-` : `WO-${date}-`;
    const row = await this.db
      .prepare('SELECT COUNT(*) AS count FROM work_orders WHERE code LIKE ?')
      .bind(`${prefix}%`)
      .first<{ count: number }>();
    return `${prefix}${String((row?.count ?? 0) + 1).padStart(3, '0')}`;
  }

  private async nextFreezeCode(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `FRZ-${date}-`;
    const row = await this.db
      .prepare('SELECT COUNT(*) AS count FROM material_freezes WHERE code LIKE ?')
      .bind(`${prefix}%`)
      .first<{ count: number }>();
    return `${prefix}${String((row?.count ?? 0) + 1).padStart(3, '0')}`;
  }

  private async findMaterial(id: string): Promise<Material | null> {
    return await this.db.prepare('SELECT id, code, name, type, unit, spec, notes, status, created_at, updated_at FROM materials WHERE id = ?').bind(id).first<Material>();
  }

  private async mustFindMaterial(id: string): Promise<Material> {
    const item = await this.findMaterial(id);
    if (!item) throw new Error('material not found');
    return item;
  }

  private async findProduct(id: string): Promise<(Product & { customer_name: string; project_name: string; material_id: string | null }) | null> {
    const row = await this.db
      .prepare(
        `SELECT p.id, p.code, p.name, p.unit, p.process_route, p.notes, p.status, p.created_at, p.updated_at, p.party_id, p.project_id,
                pt.name AS customer_name, prj.name AS project_name,
                pm.material_id
         FROM products p
         LEFT JOIN parties pt ON pt.id = p.party_id
         LEFT JOIN projects prj ON prj.id = p.project_id
         LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
         WHERE p.id = ?`
      )
      .bind(id)
      .first<any>();
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      customer_name: row.customer_name ?? '',
      project_name: row.project_name ?? '',
      material_id: row.material_id ?? null,
      unit: row.unit,
      process_route: row.process_route,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      party_id: row.party_id,
      project_id: row.project_id,
    };
  }

  private async mustFindProduct(id: string): Promise<Product & { customer_name: string; project_name: string; material_id: string | null }> {
    const item = await this.findProduct(id);
    if (!item) throw new Error('product not found');
    return item;
  }

  private async findProcess(id: string): Promise<Process | null> {
    return await this.db.prepare('SELECT * FROM processes WHERE id = ?').bind(id).first<Process>();
  }

  private async mustFindProcess(id: string): Promise<Process> {
    const item = await this.findProcess(id);
    if (!item) throw new Error('process not found');
    return item;
  }

  private async findMachine(id: string): Promise<Machine | null> {
    return await this.db.prepare('SELECT * FROM machines WHERE id = ?').bind(id).first<Machine>();
  }

  private async mustFindMachine(id: string): Promise<Machine> {
    const item = await this.findMachine(id);
    if (!item) throw new Error('machine not found');
    return item;
  }

  private async findWorkOrder(id: string): Promise<WorkOrder | null> {
    return await this.db.prepare('SELECT * FROM work_orders WHERE id = ?').bind(id).first<WorkOrder>();
  }

  private async findAvailableProductBatch(productId: string, quantity: number): Promise<string> {
    const row = await this.db
      .prepare(
        `SELECT batch_no
         FROM inventory_balances
         WHERE product_id = ? AND qty_available >= ?
         ORDER BY updated_at ASC
         LIMIT 1`
      )
      .bind(productId, quantity)
      .first<{ batch_no: string }>();
    if (!row) throw new Error('finished goods inventory is not enough for shipment');
    return row.batch_no;
  }

  private async listSteps(workOrderId: string): Promise<WorkOrderStep[]> {
    const res = await this.db
      .prepare('SELECT * FROM work_order_steps WHERE work_order_id = ? ORDER BY step_order ASC')
      .bind(workOrderId)
      .all<WorkOrderStep>();
    return res.results ?? [];
  }

  private async mustFindReport(id: string): Promise<ProductionReport> {
    const item = await this.db.prepare('SELECT * FROM production_reports WHERE id = ?').bind(id).first<ProductionReport>();
    if (!item) throw new Error('production report not found');
    return item;
  }

  private async log(action: string, entityType: string, entityId: string, detail = ''): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO operation_logs (id, actor, action, entity_type, entity_id, detail, created_at)
         VALUES (?, '', ?, ?, ?, ?, ?)`
      )
      .bind(newId('op'), action, entityType, entityId, detail, nowIso())
      .run();
  }
}

function parseProcessRoute(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

function normalizeScanCode(value: string): string {
  const text = value.trim();
  if (text.startsWith('WO:')) return text.slice(3).trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.type === 'work_order' && typeof parsed.code === 'string') return parsed.code.trim();
    } catch {
      return text;
    }
  }
  return text;
}

function ensureInventoryTarget(target: InventoryTarget): void {
  if (!target.material_id && !target.product_id) {
    throw new Error('material_id or product_id is required');
  }
  if (target.material_id && target.product_id) {
    throw new Error('only one of material_id or product_id can be set');
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

