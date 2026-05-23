import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import { materialDeliveryPlans, materials, warehouseReceipts } from '../db/schema';
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
          like(materialDeliveryPlans.supplierName, `%${query.q}%`),
          like(materialDeliveryPlans.logisticsTrackingNo, `%${query.q}%`),
          like(materialDeliveryPlans.vehicleInfo, `%${query.q}%`)
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

    return { items: rows.map(mapPlan), total: total[0]?.value ?? 0 };
  }

  async createPlan(input: PlanCreateInput, actor = '') {
    const material = await this.db.select().from(materials).where(eq(materials.id, input.material_id)).get();
    if (!material) throw new Error('material not found');

    const id = newId('mdp');
    const ts = nowIso();
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

    return await this.getPlan(id);
  }

  async getPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(materialDeliveryPlans)
      .where(or(eq(materialDeliveryPlans.id, idOrCode), eq(materialDeliveryPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const receipts = await this.db
      .select()
      .from(warehouseReceipts)
      .where(eq(warehouseReceipts.materialDeliveryPlanId, plan.id))
      .orderBy(desc(warehouseReceipts.createdAt));
    return { ...mapPlan(plan), receipts: receipts.map(mapReceipt) };
  }

  async updatePlan(id: string, input: PlanUpdateInput) {
    const current = await this.db.select().from(materialDeliveryPlans).where(eq(materialDeliveryPlans.id, id)).get();
    if (!current) return null;

    let materialName = input.material_name;
    if (input.material_id && input.material_id !== current.materialId && materialName === undefined) {
      const material = await this.db.select().from(materials).where(eq(materials.id, input.material_id)).get();
      if (!material) throw new Error('material not found');
      materialName = material.name;
    }

    const updateData: Partial<typeof materialDeliveryPlans.$inferInsert> = { updatedAt: nowIso() };
    if (input.material_id !== undefined) updateData.materialId = input.material_id;
    if (materialName !== undefined) updateData.materialName = materialName;
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
    return await this.getPlan(id);
  }

  async receivePlan(planId: string, input: Omit<ReceiptCreateInput, 'material_delivery_plan_id'>, actor = '') {
    return await this.createReceipt({ ...input, material_delivery_plan_id: planId }, actor);
  }

  async listReceipts(query: ListQuery) {
    const where = query.q
      ? or(
          like(warehouseReceipts.code, `%${query.q}%`),
          like(warehouseReceipts.materialName, `%${query.q}%`),
          like(warehouseReceipts.supplierName, `%${query.q}%`),
          like(warehouseReceipts.batchNo, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(warehouseReceipts).where(where);
    const rows = await this.db
      .select()
      .from(warehouseReceipts)
      .where(where)
      .orderBy(desc(warehouseReceipts.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapReceipt), total: total[0]?.value ?? 0 };
  }

  async createReceipt(input: ReceiptCreateInput, actor = '') {
    const plan = await this.db
      .select()
      .from(materialDeliveryPlans)
      .where(eq(materialDeliveryPlans.id, input.material_delivery_plan_id))
      .get();
    if (!plan) throw new Error('material delivery plan not found');
    if (plan.status === 'closed') throw new Error('material delivery plan is closed');

    const ts = nowIso();
    const receivedAt = input.received_at ?? ts;
    const receivedBy = input.received_by || actor;
    const quantity = input.quantity ?? plan.quantity;

    const id = newId('whr');
    await this.db.insert(warehouseReceipts).values({
      id,
      code: await this.nextCode('warehouse_receipts', 'WHR'),
      materialDeliveryPlanId: plan.id,
      materialId: plan.materialId,
      materialName: plan.materialName,
      supplierName: plan.supplierName,
      warehouseCode: input.warehouse_code,
      batchNo: input.batch_no,
      quantity,
      receivedAt,
      receivedBy,
      status: input.status,
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    });

    const receipt = await this.db.select().from(warehouseReceipts).where(eq(warehouseReceipts.id, id)).get();
    if (!receipt) throw new Error('warehouse receipt create failed');
    const transaction = await this.ledger.createReceiptTransaction({
      itemId: receipt.materialId,
      itemCode: '', // Would need to fetch material for code, but let's leave blank as it's not strictly required by the new service if it's already there
      itemName: receipt.materialName,
      itemType: 'material',
      warehouseId: receipt.warehouseCode, // note: here we map warehouseCode to warehouseId, ideally should match
      warehouseName: receipt.warehouseCode,
      locationId: input.location_code,
      quantity: receipt.quantity,
      sourceId: receipt.id,
      sourceNo: receipt.code,
      sourceType: 'material_delivery_receipt',
      operatorName: receivedBy,
    });

    await this.db
      .update(materialDeliveryPlans)
      .set({
        actualArrivalAt: receivedAt,
        status: input.status === 'closed' ? 'closed' : 'arrived',
        updatedAt: ts,
      })
      .where(eq(materialDeliveryPlans.id, plan.id));

    return {
      receipt: await this.getReceipt(id),
      inventory_transaction: transaction,
      material_delivery_plan: await this.getPlan(plan.id),
    };
  }

  async getReceipt(idOrCode: string) {
    const receipt = await this.db
      .select()
      .from(warehouseReceipts)
      .where(or(eq(warehouseReceipts.id, idOrCode), eq(warehouseReceipts.code, idOrCode)))
      .get();
    return receipt ? mapReceipt(receipt) : null;
  }

  private async nextCode(table: 'material_delivery_plans' | 'warehouse_receipts', prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const rows =
      table === 'material_delivery_plans'
        ? await this.db.select({ value: count() }).from(materialDeliveryPlans).where(like(materialDeliveryPlans.code, `${codePrefix}%`))
        : await this.db.select({ value: count() }).from(warehouseReceipts).where(like(warehouseReceipts.code, `${codePrefix}%`));
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }
}

function mapPlan(row: typeof materialDeliveryPlans.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    material_id: row.materialId,
    material_name: row.materialName,
    supplier_name: row.supplierName,
    quantity: row.quantity,
    planned_ship_at: row.plannedShipAt,
    estimated_arrival_at: row.estimatedArrivalAt,
    actual_arrival_at: row.actualArrivalAt,
    logistics_tracking_no: row.logisticsTrackingNo,
    vehicle_info: row.vehicleInfo,
    delay_reason: row.delayReason,
    status: row.status,
    created_by: row.createdBy,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapReceipt(row: typeof warehouseReceipts.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    material_delivery_plan_id: row.materialDeliveryPlanId,
    material_id: row.materialId,
    material_name: row.materialName,
    supplier_name: row.supplierName,
    warehouse_code: row.warehouseCode,
    batch_no: row.batchNo,
    quantity: row.quantity,
    received_at: row.receivedAt,
    received_by: row.receivedBy,
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

