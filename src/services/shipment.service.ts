import { and, count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import { customerDemands, demandLines, products, shipmentItems, shipments } from '../db/schema';
import type { shipmentCreateSchema, shipmentListQuerySchema } from '../schemas/shipments';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { InventoryLedgerService } from './inventory-ledger.service';

type ShipmentListQuery = z.infer<typeof shipmentListQuerySchema>;
type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;

export class ShipmentService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  async listShipments(query: ShipmentListQuery) {
    const where = query.q
      ? or(
          like(shipments.code, `%${query.q}%`),
          like(customerDemands.code, `%${query.q}%`),
          like(demandLines.productCode, `%${query.q}%`),
          like(demandLines.productName, `%${query.q}%`),
          like(shipments.batchNo, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db
      .select({ value: count() })
      .from(shipments)
      .leftJoin(demandLines, eq(demandLines.id, shipments.demandLineId))
      .leftJoin(customerDemands, eq(customerDemands.id, shipments.demandId))
      .where(where);
    const rows = await this.shipmentSelect().where(where).orderBy(desc(shipments.createdAt)).limit(query.pageSize).offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapShipment), total: total[0]?.value ?? 0 };
  }

  async createShipment(input: ShipmentCreateInput, actor = '') {
    const demandLineId = input.demand_line_id;
    const item = await this.db.select().from(demandLines).where(eq(demandLines.id, demandLineId)).get();
    if (!item) throw new Error('demand line not found');
    if (!item.productId) throw new Error('demand line has no linked product');
    if (['closed', 'cancelled'].includes(item.status)) throw new Error('closed or cancelled demand line cannot be shipped');

    const shippedQuantity = item.shippedQuantity || item.deliveredQuantity || 0;
    const remainingQty = item.quantity - shippedQuantity;
    if (remainingQty <= 0) throw new Error('demand line is already fully delivered');
    if (input.quantity > remainingQty) throw new Error('shipment quantity exceeds remaining quantity');

    const ts = nowIso();
    const shipmentId = newId('shp');
    const shipmentCode = await this.nextShipmentCode();

    await this.db.insert(shipments).values({
      id: shipmentId,
      code: shipmentCode,
      deliveryPlanId: null,
      demandId: item.demandId,
      demandLineId: item.id,
      productId: item.productId,
      warehouseCode: input.warehouse_code,
      locationCode: input.location_code,
      batchNo: input.batch_no ?? '',
      quantity: input.quantity,
      status: 'confirmed',
      shippedAt: input.shipped_at || ts,
      confirmedBy: input.confirmed_by || actor,
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    });
    await this.db.insert(shipmentItems).values({
      id: newId('shi'),
      shipmentId,
      demandLineId: item.id,
      productId: item.productId,
      quantity: input.quantity,
      batchNo: input.batch_no ?? '',
      warehouseId: input.warehouse_code,
      locationId: input.location_code,
      unit: 'pcs',
      productCode: item.productCode,
      productName: item.productName,
      createdAt: ts,
    });

    const ledger = new InventoryLedgerService(this.db as any);
    await ledger.createIssueTransaction({
      itemId: item.productId,
      warehouseId: input.warehouse_code,
      locationId: input.location_code,
      quantity: input.quantity,
      sourceId: shipmentId,
      sourceNo: shipmentCode,
      sourceType: 'shipment',
      operatorName: actor,
    });

    const nextDelivered = shippedQuantity + input.quantity;
    const lineStatus = nextDelivered >= item.quantity ? 'delivered' : 'partially_delivered';

    await this.db
      .update(demandLines)
      .set({
        deliveredQuantity: nextDelivered,
        shippedQuantity: nextDelivered,
        unshippedQuantity: item.quantity - nextDelivered,
        status: lineStatus,
        updatedAt: ts,
      })
      .where(eq(demandLines.id, item.id));

    await this.refreshOrderStatusAfterShipment(item.demandId);
    return await this.getShipment(shipmentId);
  }

  async getShipment(idOrCode: string) {
    const row = await this.shipmentSelect().where(or(eq(shipments.id, idOrCode), eq(shipments.code, idOrCode))).get();
    return row ? mapShipment(row) : null;
  }

  async closeOrder(orderId: string) {
    const order = await this.db.select().from(customerDemands).where(eq(customerDemands.id, orderId)).get();
    if (!order) throw new Error('demand not found');
    const items = await this.db
      .select()
      .from(demandLines)
      .where(eq(demandLines.demandId, order.id));
    if (items.length === 0) throw new Error('demand has no items');
    if (items.some((item) => item.deliveredQuantity < item.quantity)) throw new Error('demand cannot be closed before full delivery');
    const ts = nowIso();
    await this.db.update(demandLines).set({ status: 'closed', updatedAt: ts }).where(eq(demandLines.demandId, order.id));
    await this.db.update(customerDemands).set({ status: 'closed', updatedAt: ts }).where(eq(customerDemands.id, order.id));
    return await this.db.select().from(customerDemands).where(eq(customerDemands.id, order.id)).get();
  }

  private shipmentSelect() {
    return this.db
      .select({
        id: shipments.id,
        code: shipments.code,
        orderId: shipments.demandId,
        orderCode: customerDemands.code,
        demandLineId: shipments.demandLineId,
        productId: shipments.productId,
        productCode: demandLines.productCode,
        productName: demandLines.productName,
        warehouseCode: shipments.warehouseCode,
        locationCode: shipments.locationCode,
        batchNo: shipments.batchNo,
        quantity: shipments.quantity,
        status: shipments.status,
        shippedAt: shipments.shippedAt,
        confirmedBy: shipments.confirmedBy,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
      })
      .from(shipments)
      .leftJoin(demandLines, eq(demandLines.id, shipments.demandLineId))
      .leftJoin(customerDemands, eq(customerDemands.id, shipments.demandId))
      .leftJoin(products, eq(products.id, shipments.productId));
  }

  private async findSpecificBalance(productId: string, warehouseCode: string, locationCode: string, batchNo: string) {
    return null; // Not used anymore
  }

  private async findAvailableBalance(productId: string, warehouseCode: string, locationCode: string, quantity: number) {
    return null; // Not used anymore
  }

  private async refreshOrderStatusAfterShipment(orderId: string) {
    const order = await this.db.select().from(customerDemands).where(eq(customerDemands.id, orderId)).get();
    if (!order) return;
    const items = await this.db
      .select()
      .from(demandLines)
      .where(eq(demandLines.demandId, order.id));
    const status = items.every((item) => item.deliveredQuantity >= item.quantity) ? 'delivered' : 'partially_delivered';
    await this.db.update(customerDemands).set({ status, updatedAt: nowIso() }).where(eq(customerDemands.id, order.id));
  }

  private async nextShipmentCode() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `SHP-${date}-`;
    const rows = await this.db.select({ value: count() }).from(shipments).where(like(shipments.code, `${codePrefix}%`));
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }

}

function mapShipment(row: any) {
  return {
    id: row.id,
    code: row.code,
    order_id: row.orderId,
    order_code: row.orderCode,
    demand_line_id: row.demandLineId,
    product_id: row.productId,
    product_code: row.productCode,
    product_name: row.productName,
    warehouse_code: row.warehouseCode,
    location_code: row.locationCode,
    batch_no: row.batchNo,
    quantity: row.quantity,
    status: row.status,
    shipped_at: row.shippedAt,
    confirmed_by: row.confirmedBy,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

