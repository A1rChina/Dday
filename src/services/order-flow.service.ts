import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import {
  customerDemands,
  demandLines,
  deliveryPlanItems,
  deliveryPlans,
  issueActions,
  productionDemandLinks,
  productionPlans,
  products,
  qualityIssues,
  receiptItems,
  receipts,
  shipments,
  supplyChainEvents,
} from '../db/schema';
import type { orderFlowListQuerySchema } from '../schemas/order-flow';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

type ListQuery = z.infer<typeof orderFlowListQuerySchema>;

export class OrderFlowService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  async listOrders(query: ListQuery) {
    const where = query.q ? or(like(customerDemands.code, `%${query.q}%`), like(customerDemands.customerName, `%${query.q}%`)) : undefined;
    const total = await this.db.select({ value: count() }).from(customerDemands).where(where);
    const rows = await this.db
      .select()
      .from(customerDemands)
      .where(where)
      .orderBy(desc(customerDemands.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  async importOrder(input: any, actor = '') {
    const ts = nowIso();
    const demandId = newId('dem');
    await this.db.insert(customerDemands).values({
      id: demandId,
      code: input.code || input.order_code || demandId,
      customerId: input.customer_id || input.customerId || '',
      customerName: input.customer_name || input.customerName || '',
      sourceType: input.source_type || 'manual',
      sourceFileName: input.source_file_name || '',
      demandVersion: input.demand_version ?? 1,
      status: 'imported',
      requestedDate: input.requested_date || '',
      notes: input.notes || '',
      createdAt: ts,
      updatedAt: ts,
    });
    const items = input.items || input.lines || [];
    for (const [index, item] of items.entries()) {
      const product = item.product_id ? await this.db.select().from(products).where(eq(products.id, item.product_id)).get() : null;
      const quantity = item.quantity ?? item.required_quantity ?? 0;
      await this.db.insert(demandLines).values({
        id: newId('dln'),
        demandId,
        code: `${input.code || demandId}-${index + 1}`,
        customerId: input.customer_id || input.customerId || '',
        customerName: input.customer_name || input.customerName || '',
        projectId: item.project_id || input.project_id || '',
        projectCode: item.project_code || '',
        productId: item.product_id || '',
        productCode: item.product_code || product?.code || '',
        productName: item.product_name || product?.name || '',
        sourceType: input.source_type || 'manual',
        quantity,
        requiredQuantity: quantity,
        plannedQuantity: 0,
        producedQuantity: 0,
        shippedQuantity: 0,
        deliveredQuantity: 0,
        unshippedQuantity: quantity,
        cancelledQuantity: 0,
        status: 'imported',
        dueDate: item.due_date || input.requested_date || '',
        priority: item.priority || 'medium',
        sourceLineNo: String(index + 1),
        notes: item.notes || '',
        closedAt: null,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    await this.logEvent(demandId, 'demand_imported', actor);
    return this.getOrder(demandId);
  }

  async getOrder(idOrCode: string) {
    const order = await this.db
      .select()
      .from(customerDemands)
      .where(or(eq(customerDemands.id, idOrCode), eq(customerDemands.code, idOrCode)))
      .get();
    if (!order) return null;
    const items = await this.db.select().from(demandLines).where(eq(demandLines.demandId, order.id));
    return { ...order, items };
  }

  async updateOrder(id: string, input: any, actor = '') {
    await this.db.update(customerDemands).set({ ...input, updatedAt: nowIso() } as any).where(eq(customerDemands.id, id));
    await this.logEvent(id, 'demand_updated', actor);
    return this.getOrder(id);
  }

  async confirmOrder(id: string, actor = '') {
    const ts = nowIso();
    await this.db.update(customerDemands).set({ status: 'confirmed', updatedAt: ts }).where(eq(customerDemands.id, id));
    await this.db.update(demandLines).set({ status: 'confirmed', updatedAt: ts }).where(eq(demandLines.demandId, id));
    await this.logEvent(id, 'demand_confirmed', actor);
    return this.getOrder(id);
  }

  async deleteOrder(id: string, actor = '') {
    const ts = nowIso();
    await this.db.update(customerDemands).set({ status: 'cancelled', updatedAt: ts }).where(eq(customerDemands.id, id));
    await this.db.update(demandLines).set({ status: 'cancelled', updatedAt: ts }).where(eq(demandLines.demandId, id));
    await this.logEvent(id, 'demand_cancelled', actor);
    return this.getOrder(id);
  }

  async pushOrderToPlan(id: string, actor = '') {
    const order = await this.getOrder(id);
    if (!order) throw new Error('demand not found');
    const items = order.items || [];
    const created = [];
    for (const item of items) {
      const ts = nowIso();
      const planId = newId('plan');
      await this.db.insert(productionPlans).values({
        id: planId,
        code: await this.nextCode('production_plans', 'PLAN'),
        title: `${order.code}-${item.productCode || item.productId}`,
        planDate: ts.slice(0, 10),
        projectId: item.projectId,
        projectCode: item.projectCode,
        customerId: item.customerId,
        productId: item.productId,
        productCode: item.productCode,
        materialId: null,
        materialCode: '',
        factoryId: '',
        planType: 'normal',
        planQty: item.quantity,
        plannedQuantity: item.quantity,
        dueDate: item.dueDate,
        priority: item.priority,
        plannedStartAt: '',
        plannedFinishAt: '',
        materialReadyStatus: 'unknown',
        riskLevel: 'medium',
        status: 'draft',
        createdBy: actor,
        releasedAt: null,
        lockedAt: null,
        cancelledAt: null,
        createdAt: ts,
        updatedAt: ts,
      });
      await this.db.insert(productionDemandLinks).values({
        id: newId('pdl'),
        productionPlanId: planId,
        demandLineId: item.id,
        quantity: item.quantity,
        createdAt: ts,
      });
      await this.db.update(demandLines).set({ status: 'planned', plannedQuantity: item.quantity, updatedAt: ts }).where(eq(demandLines.id, item.id));
      created.push(await this.db.select().from(productionPlans).where(eq(productionPlans.id, planId)).get());
    }
    await this.db.update(customerDemands).set({ status: 'planned', updatedAt: nowIso() }).where(eq(customerDemands.id, id));
    await this.logEvent(id, 'pushed_to_plan', actor);
    return { plans: created };
  }

  async listDeliveryPlans(query: ListQuery) {
    const where = query.q ? like(deliveryPlans.code, `%${query.q}%`) : undefined;
    const total = await this.db.select({ value: count() }).from(deliveryPlans).where(where);
    const rows = await this.db
      .select()
      .from(deliveryPlans)
      .where(where)
      .orderBy(desc(deliveryPlans.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  async createDeliveryPlan(input: any, actor = '') {
    const ts = nowIso();
    const id = newId('dlv');
    await this.db.insert(deliveryPlans).values({
      id,
      code: await this.nextCode('delivery_plans', 'DLP'),
      demandId: input.demand_id || input.order_id || null,
      plannedShipDate: input.planned_ship_date,
      status: input.status || 'draft',
      riskLevel: input.risk_level || 'low',
      riskReason: input.risk_reason || '',
      createdBy: actor,
      createdAt: ts,
      updatedAt: ts,
    });
    for (const item of input.items || []) {
      await this.db.insert(deliveryPlanItems).values({
        id: newId('dpi'),
        deliveryPlanId: id,
        demandLineId: item.demand_line_id || null,
        productId: item.product_id,
        quantity: item.quantity,
        batchNo: item.batch_no || '',
        riskReason: item.risk_reason || '',
        createdAt: ts,
      });
    }
    return this.getDeliveryPlan(id);
  }

  async getDeliveryPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(deliveryPlans)
      .where(or(eq(deliveryPlans.id, idOrCode), eq(deliveryPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const items = await this.db.select().from(deliveryPlanItems).where(eq(deliveryPlanItems.deliveryPlanId, plan.id));
    return { ...plan, items };
  }

  async confirmShipment(id: string, actor = '') {
    const plan = await this.getDeliveryPlan(id);
    if (!plan) throw new Error('delivery plan not found');
    const ts = nowIso();
    const shipmentId = newId('shp');
    await this.db.insert(shipments).values({
      id: shipmentId,
      code: await this.nextCode('shipments', 'SHP'),
      deliveryPlanId: plan.id,
      demandId: plan.demandId,
      demandLineId: plan.items?.[0]?.demandLineId || null,
      productId: plan.items?.[0]?.productId || null,
      warehouseCode: '',
      locationCode: '',
      batchNo: '',
      quantity: plan.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
      status: 'confirmed',
      shippedAt: ts,
      confirmedBy: actor,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
    });
    await this.db.update(deliveryPlans).set({ status: 'shipped', updatedAt: ts }).where(eq(deliveryPlans.id, plan.id));
    return this.db.select().from(shipments).where(eq(shipments.id, shipmentId)).get();
  }

  async getOrderTrace(id: string) {
    const order = await this.getOrder(id);
    if (!order) return null;
    const events = await this.db.select().from(supplyChainEvents).where(eq(supplyChainEvents.orderId, order.id)).orderBy(desc(supplyChainEvents.createdAt));
    return { order, events };
  }

  async confirmMaterialReceipt(id: string, actor = '') {
    await this.logEvent(id, 'receipt_confirmed', actor);
    return { id, status: 'confirmed' };
  }

  async listReceipts(query: ListQuery) {
    const where = query.q ? like(receipts.code, `%${query.q}%`) : undefined;
    const total = await this.db.select({ value: count() }).from(receipts).where(where);
    const rows = await this.db
      .select()
      .from(receipts)
      .where(where)
      .orderBy(desc(receipts.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  async receiveMaterial(input: any, actor = '') {
    const ts = nowIso();
    const receiptId = newId('rcp');
    await this.db.insert(receipts).values({
      id: receiptId,
      code: await this.nextCode('receipts' as any, 'RCP'),
      sourceType: input.source_type || 'manual',
      sourceId: input.source_id || null,
      sourceNo: input.source_no || null,
      status: 'confirmed',
      receivedDate: input.received_date || ts,
      confirmedAt: ts,
      confirmedBy: actor,
      notes: input.notes || '',
      createdBy: actor,
      createdAt: ts,
      updatedAt: ts,
    });
    await this.db.insert(receiptItems).values({
      id: newId('rit'),
      receiptId,
      itemId: input.material_id || input.item_id,
      itemType: input.item_type || 'material',
      itemCode: input.item_code || '',
      itemName: input.item_name || '',
      projectId: input.project_id || null,
      batchNo: input.batch_no || '',
      quantity: input.quantity,
      unit: input.unit || 'pcs',
      warehouseId: input.warehouse_id || input.warehouse_code || '',
      locationId: input.location_id || input.location_code || null,
      inventoryStatus: input.inventory_status || 'available',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.db.select().from(receipts).where(eq(receipts.id, receiptId)).get();
  }

  async listQualityIssues(query: ListQuery) {
    const where = query.q ? or(like(qualityIssues.code, `%${query.q}%`), like(qualityIssues.title, `%${query.q}%`)) : undefined;
    return this.list(qualityIssues, where, qualityIssues.createdAt, query);
  }

  async createQualityIssue(input: any, actor = '') {
    const ts = nowIso();
    const id = newId('qi');
    await this.db.insert(qualityIssues).values({
      id,
      code: input.code || id,
      sourceType: input.source_type || 'manual',
      sourceId: input.source_id || '',
      workOrderId: input.work_order_id || null,
      materialId: input.material_id || null,
      productId: input.product_id || null,
      severity: input.severity || 'medium',
      status: 'open',
      title: input.title,
      description: input.description || '',
      quantity: input.quantity || 0,
      inventoryLockId: input.inventory_lock_id || null,
      handlingMethod: input.handling_method || '',
      warehouseCode: input.warehouse_code || '',
      warehouseId: input.warehouse_id || null,
      locationCode: input.location_code || '',
      locationId: input.location_id || null,
      batchNo: input.batch_no || '',
      owner: input.owner || actor,
      createdAt: ts,
      updatedAt: ts,
      closedAt: null,
    });
    return this.getQualityIssue(id);
  }

  async getQualityIssue(idOrCode: string) {
    return this.db.select().from(qualityIssues).where(or(eq(qualityIssues.id, idOrCode), eq(qualityIssues.code, idOrCode))).get();
  }

  async updateQualityIssue(id: string, input: any, actor = '') {
    await this.db.update(qualityIssues).set({ ...input, updatedAt: nowIso() } as any).where(eq(qualityIssues.id, id));
    await this.addIssueAction(id, { action: 'update', message: 'updated', actor }, actor);
    return this.getQualityIssue(id);
  }

  async unfreezeQualityIssue(id: string, input: any, actor = '') {
    return this.addIssueAction(id, { ...input, action: 'unfreeze', action_type: 'release' }, actor);
  }

  async scrapQualityIssue(id: string, input: any, actor = '') {
    return this.addIssueAction(id, { ...input, action: 'scrap', action_type: 'scrap' }, actor);
  }

  async closeQualityIssue(id: string, input: any, actor = '') {
    await this.db.update(qualityIssues).set({ status: 'closed', closedAt: nowIso(), updatedAt: nowIso() }).where(eq(qualityIssues.id, id));
    return this.addIssueAction(id, { ...input, action: 'close', action_type: 'close' }, actor);
  }

  private async addIssueAction(issueId: string, input: any, actor = '') {
    const ts = nowIso();
    await this.db.insert(issueActions).values({
      id: newId('qia'),
      issueId,
      action: input.action || 'note',
      message: input.message || input.notes || '',
      actor: input.actor || actor,
      actionType: input.action_type || '',
      quantity: input.quantity || 0,
      relatedTransactionId: input.related_transaction_id || null,
      relatedHoldId: input.related_hold_id || null,
      createdAt: ts,
    });
    return this.getQualityIssue(issueId);
  }

  private async nextCode(table: 'production_plans' | 'delivery_plans' | 'shipments' | 'receipts', prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const source =
      table === 'production_plans'
        ? productionPlans
        : table === 'delivery_plans'
          ? deliveryPlans
          : table === 'shipments'
            ? shipments
            : receipts;
    const rows = await this.db.select({ value: count() }).from(source).where(like(source.code, `${codePrefix}%`));
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }

  private async list(table: any, where: any, orderColumn: any, query: ListQuery) {
    const total = await this.db.select({ value: count() }).from(table).where(where);
    const rows = await this.db
      .select()
      .from(table)
      .where(where)
      .orderBy(desc(orderColumn))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  private async logEvent(orderId: string, eventType: string, actor: string) {
    await this.db.insert(supplyChainEvents).values({
      id: newId('evt'),
      orderId,
      entityType: 'customer_demand',
      entityId: orderId,
      eventType,
      message: eventType,
      actor,
      createdAt: nowIso(),
    });
  }
}
