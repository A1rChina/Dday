import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import { issues, issueItems, locations, receipts, receiptItems, stocktakes, stocktakeItems, warehouses } from '../db/schema';
import { InventoryLedgerService } from './inventory-ledger.service';
import type { createIssueSchema, createReceiptSchema, createStocktakeSchema, locationSchema, warehouseListQuerySchema, warehouseSchema } from '../schemas/warehouse';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>;

export class WarehouseService {
  private readonly db: AppDb;
  private readonly ledger: InventoryLedgerService;

  constructor(database: D1Database) {
    this.db = createDb(database);
    this.ledger = new InventoryLedgerService(database);
  }

  async listWarehouses() {
    return await this.db.select().from(warehouses).orderBy(desc(warehouses.createdAt));
  }

  async createWarehouse(input: z.infer<typeof warehouseSchema>) {
    const id = newId('wh');
    await this.db.insert(warehouses).values({
      id,
      code: input.code,
      name: input.name,
      type: input.type,
      status: input.status,
      remark: input.remark,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    return await this.db.select().from(warehouses).where(eq(warehouses.id, id)).get();
  }

  async listLocations(warehouseCode?: string) {
    let q = this.db.select().from(locations);
    if (warehouseCode) {
      q = q.where(eq(locations.warehouseCode, warehouseCode)) as any;
    }
    return await q.orderBy(desc(locations.createdAt));
  }

  async createLocation(input: z.infer<typeof locationSchema>) {
    const id = newId('loc');
    await this.db.insert(locations).values({
      id,
      warehouseCode: input.warehouseCode,
      code: input.code,
      name: input.name,
      status: input.status,
      remark: input.remark,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    return await this.db.select().from(locations).where(eq(locations.id, id)).get();
  }

  async listReceipts(query: WarehouseListQuery) {
    const where = query.q
      ? or(
          like(receipts.code, `%${query.q}%`),
          like(receipts.sourceType, `%${query.q}%`),
          like(receipts.status, `%${query.q}%`),
          like(receipts.createdBy, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(receipts).where(where);
    const items = await this.db.select().from(receipts).where(where)
      .orderBy(desc(receipts.createdAt)).limit(query.pageSize).offset((query.current - 1) * query.pageSize);
    return { items, total: total[0]?.value ?? 0 };
  }

  async createReceipt(input: z.infer<typeof createReceiptSchema>) {
    const ts = nowIso();
    const id = newId('rcpt');
    const code = `RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await this.db.insert(receipts).values({
      id,
      code,
      sourceType: input.sourceType,
      status: 'confirmed',
      receivedDate: input.receivedDate,
      notes: input.notes,
      createdBy: input.actor,
      createdAt: ts,
      updatedAt: ts,
    });

    for (const item of input.items) {
      const itemId = newId('rci');
      await this.db.insert(receiptItems).values({
        id: itemId,
        receiptId: id,
        itemId: item.itemId,
        projectId: item.projectId ?? null,
        batchNo: item.batchNo,
        quantity: item.quantity,
        warehouseId: item.warehouseId,
        locationId: item.locationId ?? null,
        createdAt: ts,
        updatedAt: ts,
      });

      await this.ledger.createReceiptTransaction({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        itemType: item.itemType,
        projectId: item.projectId,
        projectCode: item.projectCode,
        customerId: item.customerId,
        customerName: item.customerName,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        locationId: item.locationId,
        locationCode: item.locationCode,
        quantity: item.quantity,
        sourceId: id,
        sourceNo: code,
        sourceType: 'warehouse_receipt',
        operatorName: input.actor,
      });
    }

    return await this.db.select().from(receipts).where(eq(receipts.id, id)).get();
  }

  async listIssues(query: WarehouseListQuery) {
    const where = query.q
      ? or(
          like(issues.code, `%${query.q}%`),
          like(issues.sourceType, `%${query.q}%`),
          like(issues.status, `%${query.q}%`),
          like(issues.createdBy, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(issues).where(where);
    const items = await this.db.select().from(issues).where(where)
      .orderBy(desc(issues.createdAt)).limit(query.pageSize).offset((query.current - 1) * query.pageSize);
    return { items, total: total[0]?.value ?? 0 };
  }

  async createIssue(input: z.infer<typeof createIssueSchema>) {
    const ts = nowIso();
    const id = newId('iss');
    const code = `ISS-${ts.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await this.db.insert(issues).values({
      id,
      code,
      sourceType: input.sourceType,
      status: 'confirmed',
      issuedDate: input.issuedDate,
      notes: input.notes,
      createdBy: input.actor,
      createdAt: ts,
      updatedAt: ts,
    });

    for (const item of input.items) {
      const itemId = newId('isi');
      await this.db.insert(issueItems).values({
        id: itemId,
        issueId: id,
        itemId: item.itemId,
        projectId: item.projectId ?? null,
        batchNo: item.batchNo,
        quantity: item.quantity,
        warehouseId: item.warehouseId,
        locationId: item.locationId ?? null,
        createdAt: ts,
        updatedAt: ts,
      });

      await this.ledger.createIssueTransaction({
        itemId: item.itemId,
        projectId: item.projectId,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        quantity: item.quantity,
        sourceId: id,
        sourceNo: code,
        sourceType: 'warehouse_issue',
        operatorName: input.actor,
      });
    }

    return await this.db.select().from(issues).where(eq(issues.id, id)).get();
  }

  async listStocktakes(query: WarehouseListQuery) {
    const where = query.q
      ? or(
          like(stocktakes.code, `%${query.q}%`),
          like(stocktakes.warehouseCode, `%${query.q}%`),
          like(stocktakes.status, `%${query.q}%`),
          like(stocktakes.createdBy, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(stocktakes).where(where);
    const rows = await this.db.select().from(stocktakes).where(where)
      .orderBy(desc(stocktakes.createdAt)).limit(query.pageSize).offset((query.current - 1) * query.pageSize);
    const items = rows.map((row) => ({
      ...row,
      warehouseId: row.warehouseCode,
    }));
    return { items, total: total[0]?.value ?? 0 };
  }

  async createStocktake(input: z.infer<typeof createStocktakeSchema>) {
    const ts = nowIso();
    const id = newId('stk');
    const code = `STK-${ts.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await this.db.insert(stocktakes).values({
      id,
      code,
      warehouseCode: input.warehouseId,
      status: 'confirmed',
      stocktakeDate: input.stocktakeDate,
      notes: input.notes,
      createdBy: input.actor,
      createdAt: ts,
      updatedAt: ts,
    });

    for (const item of input.items) {
      const itemId = newId('ski');
      const diffQty = item.actualQty - item.systemQty;
      await this.db.insert(stocktakeItems).values({
        id: itemId,
        stocktakeId: id,
        itemId: item.itemId,
        projectId: item.projectId ?? null,
        batchNo: item.batchNo,
        systemQty: item.systemQty,
        actualQty: item.actualQty,
        diffQty,
        locationId: item.locationId ?? null,
        createdAt: ts,
        updatedAt: ts,
      });

      if (diffQty !== 0) {
        await this.ledger.createAdjustmentTransaction({
          itemId: item.itemId,
          projectId: item.projectId,
          warehouseId: input.warehouseId,
          locationId: item.locationId,
          qtyDelta: diffQty,
          quantity: Math.abs(diffQty),
          sourceId: id,
          sourceNo: code,
          sourceType: 'stocktake',
          operatorName: input.actor,
        });
      }
    }

    return await this.db.select().from(stocktakes).where(eq(stocktakes.id, id)).get();
  }
}


