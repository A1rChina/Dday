import type { z } from 'zod';
import {
  confirmShipmentSchema,
  createDeliveryPlanSchema,
  createProductionPlanSchema,
  createQualityIssueSchema,
  importOrderSchema,
  issueActionSchema,
  receiveMaterialSchema,
  updateOrderStatusSchema,
} from '../schemas/supply-chain';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { MesService } from './mes.service';

type ImportOrderInput = z.infer<typeof importOrderSchema>;
type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
type ReceiveMaterialInput = z.infer<typeof receiveMaterialSchema>;
type CreateProductionPlanInput = z.infer<typeof createProductionPlanSchema>;
type CreateDeliveryPlanInput = z.infer<typeof createDeliveryPlanSchema>;
type ConfirmShipmentInput = z.infer<typeof confirmShipmentSchema>;
type CreateQualityIssueInput = z.infer<typeof createQualityIssueSchema>;
type IssueActionInput = z.infer<typeof issueActionSchema>;

type CustomerOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  source_type: string;
  source_file_name: string;
  demand_version: number;
  status: string;
  requested_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type CustomerOrderItem = {
  id: string;
  order_id: string;
  demand_version: number;
  product_id: string | null;
  product_code: string;
  product_name: string;
  material_id: string | null;
  quantity: number;
  delivered_quantity: number;
  due_date: string;
  status: string;
  notes: string;
};

type ProductionPlan = {
  id: string;
  code: string;
  title: string;
  plan_date: string;
  status: string;
  created_by: string;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProductionPlanItem = {
  id: string;
  plan_id: string;
  order_item_id: string | null;
  product_id: string;
  material_id: string | null;
  planned_quantity: number;
  machine_id: string | null;
  planned_start_date: string;
  planned_finish_date: string;
  status: string;
  work_order_id: string | null;
  notes: string;
};

type DeliveryPlan = {
  id: string;
  code: string;
  order_id: string | null;
  planned_ship_date: string;
  status: string;
  risk_level: string;
  risk_reason: string;
  created_by: string;
};

export class SupplyChainService {
  private readonly mes: MesService;

  constructor(private readonly db: D1Database) {
    this.mes = new MesService(db);
  }

  async getOverview(orderId?: string) {
    const orders = await this.listOrders(orderId);
    const orderIds = orders.map((item) => item.id);
    return {
      orders,
      items: await this.listOrderItems(orderIds),
      receipts: await this.listReceipts(orderIds),
      production_plans: await this.listProductionPlans(orderIds),
      work_orders: await this.listLinkedWorkOrders(orderIds),
      delivery_plans: await this.listDeliveryPlans(orderIds),
      quality_issues: await this.listQualityIssues(orderIds),
      events: await this.listEvents(orderIds),
    };
  }

  async importOrder(input: ImportOrderInput) {
    const orderCode = input.order_code || (await this.nextCode('customer_orders', 'CO'));
    const customerId = await this.ensureCustomer(input.customer_code, input.customer_name);
    const existing = await this.findOrderByCode(orderCode);
    const version = existing ? existing.demand_version + 1 : 1;
    const ts = nowIso();
    let orderId = existing?.id ?? newId('co');

    if (existing) {
      await this.db
        .prepare(
          `UPDATE customer_orders
           SET customer_id = ?, customer_name = ?, source_type = ?, source_file_name = ?,
               demand_version = ?, status = 'imported', requested_date = ?, notes = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(
          customerId,
          input.customer_name,
          input.source_type,
          input.source_file_name,
          version,
          input.requested_date ?? existing.requested_date,
          input.notes,
          ts,
          orderId
        )
        .run();
    } else {
      await this.db
        .prepare(
          `INSERT INTO customer_orders
           (id, code, customer_id, customer_name, source_type, source_file_name, demand_version,
            status, requested_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'imported', ?, ?, ?, ?)`
        )
        .bind(
          orderId,
          orderCode,
          customerId,
          input.customer_name,
          input.source_type,
          input.source_file_name,
          version,
          input.requested_date ?? '',
          input.notes,
          ts,
          ts
        )
        .run();
    }

    await this.db
      .prepare(
        `INSERT INTO demand_plan_versions
         (id, order_id, version, imported_by, change_summary, raw_payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(newId('dpv'), orderId, version, input.imported_by, input.change_summary, JSON.stringify(input), ts)
      .run();

    const createdItems: CustomerOrderItem[] = [];
    for (const item of input.items) {
      const product = await this.resolveProduct(item.product_id, item.product_code);
      const materialId = item.material_id ?? product?.material_id ?? null;
      const itemId = newId('coi');
      await this.db
        .prepare(
          `INSERT INTO customer_order_items
           (id, order_id, demand_version, product_id, product_code, product_name, material_id,
            quantity, delivered_quantity, due_date, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'open', ?, ?, ?)`
        )
        .bind(
          itemId,
          orderId,
          version,
          product?.id ?? item.product_id ?? null,
          product?.code ?? item.product_code,
          product?.name ?? item.product_name,
          materialId,
          item.quantity,
          item.due_date ?? input.requested_date ?? '',
          item.notes,
          ts,
          ts
        )
        .run();
      const created = await this.findOrderItem(itemId);
      if (created) createdItems.push(created);
    }

    await this.event(orderId, 'customer_order', orderId, 'order_imported', `version ${version}`, input.imported_by);
    return { order: await this.findOrder(orderId), items: createdItems, version };
  }

  async updateOrderStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await this.findOrder(orderId);
    if (!order) return null;
    await this.db
      .prepare('UPDATE customer_orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?')
      .bind(input.status, input.notes ?? order.notes, nowIso(), order.id)
      .run();
    await this.event(order.id, 'customer_order', order.id, `order_${input.status}`, input.notes ?? '', '');
    return await this.findOrder(order.id);
  }

  async receiveMaterial(input: ReceiveMaterialInput) {
    const material = await this.findById<{ id: string; code: string }>('materials', input.material_id);
    if (!material) throw new Error('material not found');
    const code = await this.nextCode('material_receipts', 'RCV');
    const id = newId('rcv');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO material_receipts
         (id, code, material_id, order_item_id, supplier_name, warehouse_code, batch_no, quantity,
          status, received_by, received_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        code,
        input.material_id,
        input.order_item_id ?? null,
        input.supplier_name,
        input.warehouse_code,
        input.batch_no,
        input.quantity,
        input.received_by,
        ts,
        input.notes,
        ts,
        ts
      )
      .run();

    const movement = await this.mes.adjustInventory({
      material_id: input.material_id,
      warehouse_code: input.warehouse_code,
      batch_no: input.batch_no,
      qty_delta: input.quantity,
      reason: `material receipt ${code}`,
      created_by: input.received_by,
    });

    const orderId = input.order_item_id ? await this.orderIdForItem(input.order_item_id) : null;
    await this.event(orderId, 'material_receipt', id, 'material_received', `${material.code} +${input.quantity}`, input.received_by);
    return { receipt: await this.findById('material_receipts', id), movement };
  }

  async createProductionPlan(input: CreateProductionPlanInput) {
    const id = newId('pp');
    const code = await this.nextCode('production_plans', 'PP');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO production_plans (id, code, title, plan_date, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`
      )
      .bind(id, code, input.title, input.plan_date, input.created_by, ts, ts)
      .run();

    for (const item of input.items) {
      const product = await this.findById<{ id: string; material_id: string | null }>('products', item.product_id);
      if (!product) throw new Error('product not found');
      const itemId = newId('ppi');
      await this.db
        .prepare(
          `INSERT INTO production_plan_items
           (id, plan_id, order_item_id, product_id, material_id, planned_quantity, machine_id,
            planned_start_date, planned_finish_date, status, work_order_id, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, ?, ?, ?)`
        )
        .bind(
          itemId,
          id,
          item.order_item_id ?? null,
          item.product_id,
          item.material_id ?? product.material_id,
          item.planned_quantity,
          item.machine_id ?? null,
          item.planned_start_date ?? input.plan_date,
          item.planned_finish_date ?? input.plan_date,
          item.notes,
          ts,
          ts
        )
        .run();
      if (item.order_item_id) {
        await this.updateOrderItemStatus(item.order_item_id, 'planned');
      }
    }

    const orderIds = await this.orderIdsForPlan(id);
    for (const orderId of orderIds) {
      await this.db.prepare("UPDATE customer_orders SET status = 'planned', updated_at = ? WHERE id = ?").bind(ts, orderId).run();
      await this.event(orderId, 'production_plan', id, 'plan_created', code, input.created_by);
    }
    return await this.getProductionPlan(id);
  }

  async releaseProductionPlan(planId: string, actor = '') {
    const plan = await this.findById<ProductionPlan>('production_plans', planId);
    if (!plan) throw new Error('production plan not found');
    const items = await this.listProductionPlanItems(plan.id);
    if (items.length === 0) throw new Error('production plan has no items');
    const workOrders = [];
    const ts = nowIso();

    for (const item of items) {
      if (item.work_order_id) continue;
      const workOrder = await this.mes.createWorkOrder({
        product_id: item.product_id,
        material_id: item.material_id ?? undefined,
        planned_quantity: item.planned_quantity,
        planned_start_date: item.planned_start_date || plan.plan_date,
        planned_finish_date: item.planned_finish_date || plan.plan_date,
        notes: `From production plan ${plan.code}`,
      });
      const released = await this.mes.updateWorkOrder(workOrder.id, { status: 'released' });
      await this.db
        .prepare("UPDATE production_plan_items SET status = 'work_order_created', work_order_id = ?, updated_at = ? WHERE id = ?")
        .bind(workOrder.id, ts, item.id)
        .run();
      if (item.order_item_id) await this.updateOrderItemStatus(item.order_item_id, 'in_production');
      workOrders.push(released ?? workOrder);
    }

    await this.db
      .prepare("UPDATE production_plans SET status = 'released', released_at = ?, updated_at = ? WHERE id = ?")
      .bind(ts, ts, plan.id)
      .run();

    const orderIds = await this.orderIdsForPlan(plan.id);
    for (const orderId of orderIds) {
      await this.db.prepare("UPDATE customer_orders SET status = 'in_production', updated_at = ? WHERE id = ?").bind(ts, orderId).run();
      await this.event(orderId, 'production_plan', plan.id, 'plan_released', `${workOrders.length} work orders`, actor);
    }
    return { plan: await this.getProductionPlan(plan.id), work_orders: workOrders };
  }

  async createDeliveryPlan(input: CreateDeliveryPlanInput) {
    const id = newId('dp');
    const code = await this.nextCode('delivery_plans', 'DLY');
    const risks = await Promise.all(input.items.map((item) => this.evaluateDeliveryRisk(item.product_id, item.quantity)));
    const riskLevel = risks.some((risk) => risk.level === 'high') ? 'high' : risks.some((risk) => risk.level === 'medium') ? 'medium' : 'low';
    const riskReason = risks.map((risk) => risk.reason).filter(Boolean).join('; ');
    const status = riskLevel === 'high' ? 'blocked' : 'ready';
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO delivery_plans
         (id, code, order_id, planned_ship_date, status, risk_level, risk_reason, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, code, input.order_id ?? null, input.planned_ship_date, status, riskLevel, riskReason, input.created_by, ts, ts)
      .run();

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      await this.db
        .prepare(
          `INSERT INTO delivery_plan_items
           (id, delivery_plan_id, order_item_id, product_id, quantity, batch_no, risk_reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(newId('dpi'), id, item.order_item_id ?? null, item.product_id, item.quantity, item.batch_no, risks[index].reason, ts)
        .run();
    }

    if (input.order_id) await this.event(input.order_id, 'delivery_plan', id, 'delivery_planned', `${code} ${riskLevel}`, input.created_by);
    return await this.getDeliveryPlan(id);
  }

  async confirmShipment(deliveryPlanId: string, input: ConfirmShipmentInput) {
    const plan = await this.findById<DeliveryPlan>('delivery_plans', deliveryPlanId);
    if (!plan) throw new Error('delivery plan not found');
    const items = await this.listDeliveryPlanItems(plan.id);
    if (items.length === 0) throw new Error('delivery plan has no items');

    const shipmentId = newId('shp');
    const code = await this.nextCode('shipments', 'SHP');
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO shipments
         (id, code, delivery_plan_id, order_id, status, shipped_at, confirmed_by, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`
      )
      .bind(shipmentId, code, plan.id, plan.order_id, ts, input.confirmed_by, input.notes, ts, ts)
      .run();

    for (const item of items) {
      await this.db
        .prepare(
          `INSERT INTO shipment_items (id, shipment_id, order_item_id, product_id, quantity, batch_no, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(newId('shi'), shipmentId, item.order_item_id, item.product_id, item.quantity, item.batch_no, ts)
        .run();
      await this.mes.shipProductInventory({
        product_id: item.product_id,
        quantity: item.quantity,
        batch_no: item.batch_no || undefined,
        reason: `shipment ${code}`,
        created_by: input.confirmed_by,
      });
      if (item.order_item_id) await this.addDeliveredQuantity(item.order_item_id, item.quantity);
    }

    await this.db.prepare("UPDATE delivery_plans SET status = 'shipped', updated_at = ? WHERE id = ?").bind(ts, plan.id).run();
    if (plan.order_id) await this.refreshOrderShipmentStatus(plan.order_id);
    if (plan.order_id) await this.event(plan.order_id, 'shipment', shipmentId, 'shipment_confirmed', code, input.confirmed_by);
    return { shipment: await this.findById('shipments', shipmentId), delivery_plan: await this.getDeliveryPlan(plan.id) };
  }

  async createQualityIssue(input: CreateQualityIssueInput) {
    const id = newId('qi');
    const code = await this.nextCode('quality_issues', 'QI');
    let freezeId: string | null = null;
    let status = 'open';
    if (input.freeze) {
      const freezeMaterialId = input.material_id ?? null;
      const freezeProductId = freezeMaterialId ? undefined : input.product_id;
      const freeze = await this.mes.createFreeze({
        source_type: 'quality_issue',
        project_name: '',
        product_id: freezeProductId,
        material_id: freezeMaterialId ?? undefined,
        warehouse_code: input.freeze.warehouse_code,
        batch_no: input.freeze.batch_no,
        abnormal_qty: input.quantity,
        freeze_qty: input.freeze.freeze_qty,
        selectable_qty: 0,
        rework_qty: 0,
        return_qty: 0,
        scrap_qty: 0,
        responsibility: '',
        solution: '',
        eta: '',
        impact_order: '',
        impact_delivery: '',
        owner: input.owner,
        notes: input.freeze.notes || input.description,
      });
      freezeId = freeze.freeze.id;
      status = 'frozen';
    }

    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO quality_issues
         (id, code, source_type, source_id, order_id, order_item_id, work_order_id, material_id,
          product_id, severity, status, title, description, quantity, freeze_id, owner, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        code,
        input.source_type,
        input.source_id,
        input.order_id ?? null,
        input.order_item_id ?? null,
        input.work_order_id ?? null,
        input.material_id ?? null,
        input.product_id ?? null,
        input.severity,
        status,
        input.title,
        input.description,
        input.quantity,
        freezeId,
        input.owner,
        ts,
        ts
      )
      .run();
    await this.addIssueAction(id, { action: status === 'frozen' ? 'process' : 'note', message: input.description, actor: input.owner });
    await this.event(input.order_id ?? null, 'quality_issue', id, 'quality_issue_created', code, input.owner);
    return await this.getQualityIssue(id);
  }

  async addIssueAction(issueId: string, input: IssueActionInput) {
    const issue = await this.db.prepare('SELECT * FROM quality_issues WHERE id = ?').bind(issueId).first<{
      id: string;
      status: string;
      freeze_id: string | null;
      product_id: string | null;
      material_id: string | null;
      quantity: number;
    }>();
    if (!issue) throw new Error('quality issue not found');
    const nextStatus = {
      confirm: 'confirmed',
      process: 'processing',
      resolve: 'resolved',
      close: 'closed',
      note: issue.status,
    }[input.action];
    const ts = nowIso();
    await this.db
      .prepare('INSERT INTO issue_actions (id, issue_id, action, message, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(newId('act'), issue.id, input.action, input.message, input.actor, ts)
      .run();
    await this.db
      .prepare('UPDATE quality_issues SET status = ?, updated_at = ?, closed_at = ? WHERE id = ?')
      .bind(nextStatus, ts, nextStatus === 'closed' || nextStatus === 'resolved' ? ts : null, issue.id)
      .run();

    // ── 质量单处理完成时，自动反写库存：解冻 / 报废 / 退回 ──────────────
    if (issue.freeze_id && (nextStatus === 'resolved' || nextStatus === 'closed')) {
      const freezeActionMap: Record<string, 'release' | 'scrap' | 'return' | undefined> = {
        resolve: 'release',   // 判定合格 → 解冻转可用
        close: 'scrap',       // 关闭 → 默认转报废
        confirm: undefined,
        process: undefined,
        note: undefined,
      };
      const freezeAction = freezeActionMap[input.action];

      if (freezeAction) {
        try {
          await this.mes.closeFreeze(issue.freeze_id, {
            action: freezeAction,
            notes: input.message || `质量单 ${issueId} ${input.action} 自动触发`,
            actor: input.actor,
          });
        } catch (_err) {
          // 冻结单可能已经处理，不阻断主流程
        }
      }
    }

    return await this.getQualityIssue(issue.id);
  }

  async listRolesAndPermissions() {
    const roles = await this.db.prepare('SELECT * FROM roles ORDER BY code ASC').all();
    const permissions = await this.db.prepare('SELECT * FROM permissions ORDER BY module ASC, action ASC').all();
    const matrix = await this.db.prepare('SELECT * FROM role_permissions ORDER BY role_code ASC, permission_code ASC').all();
    return { roles: roles.results ?? [], permissions: permissions.results ?? [], role_permissions: matrix.results ?? [] };
  }

  private async listOrders(orderId?: string): Promise<CustomerOrder[]> {
    const stmt = orderId
      ? this.db.prepare('SELECT * FROM customer_orders WHERE id = ? OR code = ? ORDER BY created_at DESC').bind(orderId, orderId)
      : this.db.prepare('SELECT * FROM customer_orders ORDER BY created_at DESC LIMIT 50');
    const res = await stmt.all<CustomerOrder>();
    return res.results ?? [];
  }

  private async listOrderItems(orderIds: string[]): Promise<CustomerOrderItem[]> {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(
        `SELECT i.*
         FROM customer_order_items i
         JOIN customer_orders o ON o.id = i.order_id AND o.demand_version = i.demand_version
         WHERE i.order_id IN (${placeholders})
         ORDER BY i.created_at ASC`
      )
      .bind(...orderIds)
      .all<CustomerOrderItem>();
    return res.results ?? [];
  }

  private async listReceipts(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(
        `SELECT r.*
         FROM material_receipts r
         LEFT JOIN customer_order_items i ON i.id = r.order_item_id
         WHERE i.order_id IN (${placeholders})
         ORDER BY r.created_at DESC`
      )
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async listProductionPlans(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(
        `SELECT DISTINCT p.*
         FROM production_plans p
         JOIN production_plan_items i ON i.plan_id = p.id
         JOIN customer_order_items oi ON oi.id = i.order_item_id
         WHERE oi.order_id IN (${placeholders})
         ORDER BY p.created_at DESC`
      )
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async listLinkedWorkOrders(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(
        `SELECT DISTINCT w.*
         FROM work_orders w
         JOIN production_plan_items ppi ON ppi.work_order_id = w.id
         JOIN customer_order_items oi ON oi.id = ppi.order_item_id
         WHERE oi.order_id IN (${placeholders})
         ORDER BY w.created_at DESC`
      )
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async listDeliveryPlans(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT * FROM delivery_plans WHERE order_id IN (${placeholders}) ORDER BY created_at DESC`)
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async listQualityIssues(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT * FROM quality_issues WHERE order_id IN (${placeholders}) ORDER BY created_at DESC`)
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async listEvents(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT * FROM supply_chain_events WHERE order_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 200`)
      .bind(...orderIds)
      .all();
    return res.results ?? [];
  }

  private async findOrder(id: string): Promise<CustomerOrder | null> {
    return await this.db.prepare('SELECT * FROM customer_orders WHERE id = ?').bind(id).first<CustomerOrder>();
  }

  private async findOrderByCode(code: string): Promise<CustomerOrder | null> {
    return await this.db.prepare('SELECT * FROM customer_orders WHERE code = ?').bind(code).first<CustomerOrder>();
  }

  private async findOrderItem(id: string): Promise<CustomerOrderItem | null> {
    return await this.db.prepare('SELECT * FROM customer_order_items WHERE id = ?').bind(id).first<CustomerOrderItem>();
  }

  private async getProductionPlan(id: string) {
    const plan = await this.findById('production_plans', id);
    const items = await this.listProductionPlanItems(id);
    return { plan, items };
  }

  private async getDeliveryPlan(id: string) {
    const plan = await this.findById('delivery_plans', id);
    const items = await this.listDeliveryPlanItems(id);
    return { plan, items };
  }

  private async getQualityIssue(id: string) {
    const issue = await this.findById('quality_issues', id);
    const actions = await this.db.prepare('SELECT * FROM issue_actions WHERE issue_id = ? ORDER BY created_at ASC').bind(id).all();
    return { issue, actions: actions.results ?? [] };
  }

  private async listProductionPlanItems(planId: string): Promise<ProductionPlanItem[]> {
    const res = await this.db.prepare('SELECT * FROM production_plan_items WHERE plan_id = ? ORDER BY created_at ASC').bind(planId).all<ProductionPlanItem>();
    return res.results ?? [];
  }

  private async listDeliveryPlanItems(planId: string): Promise<Array<{ id: string; order_item_id: string | null; product_id: string; quantity: number; batch_no: string }>> {
    const res = await this.db.prepare('SELECT * FROM delivery_plan_items WHERE delivery_plan_id = ? ORDER BY created_at ASC').bind(planId).all<{ id: string; order_item_id: string | null; product_id: string; quantity: number; batch_no: string }>();
    return res.results ?? [];
  }

  private async ensureCustomer(code: string, name: string): Promise<string | null> {
    if (!code && !name) return null;

    if (name) {
      const existingByName = await this.db.prepare("SELECT id FROM parties WHERE name = ? AND type = 'customer'").bind(name).first<{ id: string }>();
      if (existingByName) return existingByName.id;
    }

    if (code) {
      const existingByCode = await this.db.prepare("SELECT id FROM parties WHERE code = ? AND type = 'customer'").bind(code).first<{ id: string }>();
      if (existingByCode) return existingByCode.id;
    }

    const customerCode = code || `CUST-${newId('c').slice(-6).toUpperCase()}`;
    const id = newId('cust');
    const ts = nowIso();
    await this.db
      .prepare("INSERT INTO parties (id, code, name, type, contact, notes, status, created_at, updated_at) VALUES (?, ?, ?, 'customer', '', '', 'active', ?, ?)")
      .bind(id, customerCode, name || customerCode, ts, ts)
      .run();
    return id;
  }

  private async resolveProduct(productId?: string, productCode?: string) {
    if (productId) {
      return await this.db
        .prepare(`
          SELECT p.id, p.code, p.name, pm.material_id
          FROM products p
          LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
          WHERE p.id = ?
        `)
        .bind(productId)
        .first<{ id: string; code: string; name: string; material_id: string | null }>();
    }
    if (productCode) {
      return await this.db
        .prepare(`
          SELECT p.id, p.code, p.name, pm.material_id
          FROM products p
          LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
          WHERE p.code = ?
        `)
        .bind(productCode)
        .first<{ id: string; code: string; name: string; material_id: string | null }>();
    }
    return null;
  }

  private async evaluateDeliveryRisk(productId: string, quantity: number): Promise<{ level: 'low' | 'medium' | 'high'; reason: string }> {
    const stock = await this.db
      .prepare('SELECT COALESCE(SUM(qty_available), 0) AS available, COALESCE(SUM(qty_frozen), 0) AS frozen FROM inventory_balances WHERE product_id = ?')
      .bind(productId)
      .first<{ available: number; frozen: number }>();
    const openIssues = await this.db
      .prepare("SELECT COUNT(*) AS count FROM quality_issues WHERE product_id = ? AND status NOT IN ('resolved', 'closed')")
      .bind(productId)
      .first<{ count: number }>();
    const available = stock?.available ?? 0;
    const frozen = stock?.frozen ?? 0;
    const openCount = openIssues?.count ?? 0;

    // 存在未处理质量异常单 → 硬性高风险直接需拦截
    if (openCount > 0) {
      return {
        level: 'high',
        reason: `产品 ${productId} 存在 ${openCount} 个未处理质量异常单，禁止下推发货`,
      };
    }
    // 可用库存不足 → 高风险
    if (available < quantity) {
      return { level: 'high', reason: `产品 ${productId} 可用库存 ${available} < 发货数量 ${quantity}` };
    }
    // 有冻结库存但无质量异常 → 中风险提示
    if (frozen > 0) {
      return { level: 'medium', reason: `产品 ${productId} 存在冻结库存 ${frozen}，建议确认后再发货` };
    }
    return { level: 'low', reason: '' };
  }

  private async addDeliveredQuantity(orderItemId: string, quantity: number) {
    const item = await this.findOrderItem(orderItemId);
    if (!item) return;
    const delivered = item.delivered_quantity + quantity;
    const status = delivered >= item.quantity ? 'shipped' : 'ready_to_ship';
    await this.db
      .prepare('UPDATE customer_order_items SET delivered_quantity = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(delivered, status, nowIso(), orderItemId)
      .run();
  }

  private async refreshOrderShipmentStatus(orderId: string) {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS open_count FROM customer_order_items WHERE order_id = ? AND status NOT IN ('shipped', 'closed', 'cancelled')")
      .bind(orderId)
      .first<{ open_count: number }>();
    const status = (row?.open_count ?? 0) === 0 ? 'shipped' : 'ready_to_ship';
    await this.db.prepare('UPDATE customer_orders SET status = ?, updated_at = ? WHERE id = ?').bind(status, nowIso(), orderId).run();
  }

  private async orderIdForItem(orderItemId: string): Promise<string | null> {
    const row = await this.db.prepare('SELECT order_id FROM customer_order_items WHERE id = ?').bind(orderItemId).first<{ order_id: string }>();
    return row?.order_id ?? null;
  }

  private async orderIdsForPlan(planId: string): Promise<string[]> {
    const res = await this.db
      .prepare(
        `SELECT DISTINCT oi.order_id
         FROM production_plan_items ppi
         JOIN customer_order_items oi ON oi.id = ppi.order_item_id
         WHERE ppi.plan_id = ?`
      )
      .bind(planId)
      .all<{ order_id: string }>();
    return (res.results ?? []).map((row) => row.order_id);
  }

  private async updateOrderItemStatus(orderItemId: string, status: string) {
    await this.db.prepare('UPDATE customer_order_items SET status = ?, updated_at = ? WHERE id = ?').bind(status, nowIso(), orderItemId).run();
  }

  private async materialIdForProduct(productId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT material_id FROM product_materials WHERE product_id = ? AND status = 'active'").bind(productId).first<{ material_id: string | null }>();
    return row?.material_id ?? null;
  }

  private async findById<T = unknown>(table: string, id: string): Promise<T | null> {
    if (table === 'products') {
      return await this.db.prepare(`
        SELECT p.*, pm.material_id
        FROM products p
        LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
        WHERE p.id = ?
      `).bind(id).first<T>();
    }
    if (table === 'customers') {
      return await this.db.prepare(`
        SELECT id, code, name, contact, notes, status, created_at, updated_at
        FROM parties
        WHERE id = ? AND type = 'customer'
      `).bind(id).first<T>();
    }
    return await this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<T>();
  }

  private async nextCode(table: string, prefix: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const row = await this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE code LIKE ?`).bind(`${codePrefix}%`).first<{ count: number }>();
    return `${codePrefix}${String((row?.count ?? 0) + 1).padStart(3, '0')}`;
  }

  private async event(orderId: string | null, entityType: string, entityId: string, eventType: string, message: string, actor: string) {
    await this.db
      .prepare(
        `INSERT INTO supply_chain_events (id, order_id, entity_type, entity_id, event_type, message, actor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(newId('sce'), orderId, entityType, entityId, eventType, message, actor, nowIso())
      .run();
  }
}

function normalizeCode(input: string): string {
  const value = input.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return value || 'CUSTOMER';
}
