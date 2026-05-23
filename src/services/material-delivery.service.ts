import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import { materialDeliveryPlans, materials, receiptItems, receipts } from '../db/schema';
import type {
  materialDeliveryListQuerySchema,
  materialDeliveryPlanCreateSchema,
  materialDeliveryPlanUpdateSchema,
  warehouseReceiptCreateSchema,
} from '../schemas/material-delivery';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { InventoryLedgerService } from './inventory-ledger.service';

type ListQuery = z.infer<typeof materialDeliveryListQuerySchema>;
type PlanCreateInput = z.infer<typeof materialDeliveryPlanCreateSchema>;
type PlanUpdateInput = z.infer<typeof materialDeliveryPlanUpdateSchema>;
type ReceiptCreateInput = z.infer<typeof warehouseReceiptCreateSchema>;

export class MaterialDeliveryService {
  private readonly db: AppDb;
  private readonly ledger: InventoryLedgerService;

  constructor(database: D1Database) {
    this.db = createDb(database);
    this.ledger = new InventoryLedgerService(database);
  }

  async listPlans(query: ListQuery) {
    const where = query.q
      ? or(
          like(materialDeliveryPlans.code, `%${query.q}%`),
          like(materialDeliveryPlans.materialName, `%${query.q}%`),
          like(materialDeliveryPlans.supplierName, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(materialDeliveryPlans).where(where);
    const rows = await this.db
      .select()
      .from(materialDeliveryPlans)
      .where(where)
      .orderBy(desc(materialDeliveryPlans.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  async createPlan(input: PlanCreateInput, actor = '') {
    const material = await this.db.select().from(materials).where(eq(materials.id, input.material_id)).get();
    if (!material) throw new Error('material not found');
    const ts = nowIso();
    const id = newId('mdp');
    await this.db.insert(materialDeliveryPlans).values({
      id,
      code: await this.nextCode('material_delivery_plans', 'MDP'),
      materialId: input.material_id,
      materialName: input.material_name || material.name,
      supplierName: input.supplier_name,
      quantity: input.quantity,
      plannedShipAt: input.planned_ship_at,
      estimatedArrivalAt: input.estimated_arrival_at,
      actualArrivalAt: '',
      logisticsTrackingNo: input.logistics_tracking_no,
      vehicleInfo: input.vehicle_info,
      delayReason: input.delay_reason,
      status: input.status,
      createdBy: actor,
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getPlan(id);
  }

  async getPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(materialDeliveryPlans)
      .where(or(eq(materialDeliveryPlans.id, idOrCode), eq(materialDeliveryPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const planReceipts = await this.db.select().from(receipts).where(eq(receipts.sourceId, plan.id)).orderBy(desc(receipts.createdAt));
    return { ...plan, receipts: planReceipts };
  }

  async updatePlan(id: string, input: PlanUpdateInput) {
    const updateData: Partial<typeof materialDeliveryPlans.$inferInsert> = { updatedAt: nowIso() };
    if (input.material_id !== undefined) updateData.materialId = input.material_id;
    if (input.material_name !== undefined) updateData.materialName = input.material_name;
    if (input.supplier_name !== undefined) updateData.supplierName = input.supplier_name;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.planned_ship_at !== undefined) updateData.plannedShipAt = input.planned_ship_at;
    if (input.estimated_arrival_at !== undefined) updateData.estimatedArrivalAt = input.estimated_arrival_at;
    if (input.actual_arrival_at !== undefined) updateData.actualArrivalAt = input.actual_arrival_at;
    if (input.logistics_tracking_no !== undefined) updateData.logisticsTrackingNo = input.logistics_tracking_no;
    if (input.vehicle_info !== undefined) updateData.vehicleInfo = input.vehicle_info;
    if (input.delay_reason !== undefined) updateData.delayReason = input.delay_reason;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;
    await this.db.update(materialDeliveryPlans).set(updateData).where(eq(materialDeliveryPlans.id, id));
    return this.getPlan(id);
  }

  async receivePlan(planId: string, input: Omit<ReceiptCreateInput, 'material_delivery_plan_id'>, actor = '') {
    return this.createReceipt({ ...input, material_delivery_plan_id: planId }, actor);
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

  async createReceipt(input: ReceiptCreateInput, actor = '') {
    const plan = await this.db.select().from(materialDeliveryPlans).where(eq(materialDeliveryPlans.id, input.material_delivery_plan_id)).get();
    if (!plan) throw new Error('material delivery plan not found');
    const material = await this.db.select().from(materials).where(eq(materials.id, plan.materialId)).get();
    const ts = nowIso();
    const receiptId = newId('rcp');
    const code = await this.nextCode('receipts', 'RCP');
    const quantity = input.quantity ?? plan.quantity;
    await this.db.insert(receipts).values({
      id: receiptId,
      code,
      sourceType: 'material_delivery_plan',
      sourceId: plan.id,
      sourceNo: plan.code,
      status: 'confirmed',
      receivedDate: input.received_at || ts,
      confirmedAt: ts,
      confirmedBy: input.received_by || actor,
      notes: input.notes,
      createdBy: actor,
      createdAt: ts,
      updatedAt: ts,
    });
    await this.db.insert(receiptItems).values({
      id: newId('rit'),
      receiptId,
      itemId: plan.materialId,
      itemType: 'material',
      itemCode: material?.code || '',
      itemName: material?.name || plan.materialName,
      projectId: null,
      batchNo: input.batch_no,
      quantity,
      unit: material?.unit || 'pcs',
      warehouseId: input.warehouse_code,
      locationId: input.location_code || null,
      inventoryStatus: 'available',
      createdAt: ts,
      updatedAt: ts,
    });
    const transaction = await this.ledger.createReceiptTransaction({
      itemId: plan.materialId,
      itemCode: material?.code || '',
      itemName: material?.name || plan.materialName,
      itemType: 'material',
      warehouseId: input.warehouse_code,
      locationId: input.location_code,
      quantity,
      sourceId: receiptId,
      sourceNo: code,
      sourceType: 'receipt',
      operatorName: actor,
    });
    await this.db.update(materialDeliveryPlans).set({ actualArrivalAt: input.received_at || ts, status: 'arrived', updatedAt: ts }).where(eq(materialDeliveryPlans.id, plan.id));
    return { receipt: await this.getReceipt(receiptId), inventory_transaction: transaction, material_delivery_plan: await this.getPlan(plan.id) };
  }

  async getReceipt(idOrCode: string) {
    return this.db.select().from(receipts).where(or(eq(receipts.id, idOrCode), eq(receipts.code, idOrCode))).get();
  }

  private async nextCode(table: 'material_delivery_plans' | 'receipts', prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const rows =
      table === 'material_delivery_plans'
        ? await this.db.select({ value: count() }).from(materialDeliveryPlans).where(like(materialDeliveryPlans.code, `${codePrefix}%`))
        : await this.db.select({ value: count() }).from(receipts).where(like(receipts.code, `${codePrefix}%`));
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }
}
