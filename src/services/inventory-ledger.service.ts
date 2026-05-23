import { and, asc, count, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import { createDb, type AppDb } from '../db/client';
import { inventoryBalances, inventoryTransactions, inventoryHolds } from '../db/schema';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

export type LedgerListQuery = {
  current?: number;
  pageSize?: number;
  q?: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  project_id?: string;
  project_code?: string;
  customer_id?: string;
  customer_name?: string;
  warehouse_id?: string;
  warehouse_ids?: string;
  location_id?: string;
  location_code?: string;
  inventory_status?: string;
  inventory_statuses?: string;
  transaction_type?: string;
  transaction_types?: string;
  source_no?: string;
  source_type?: string;
  operator_name?: string;
  quantity_min?: number;
  quantity_max?: number;
  updated_from?: string;
  updated_to?: string;
  occurred_from?: string;
  occurred_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  abnormal_only?: boolean;
  overdue_only?: boolean;
  low_stock_only?: boolean;
};

export type BaseLedgerInput = {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  itemType?: string;
  projectId?: string | null;
  projectCode?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  warehouseId: string;
  warehouseName?: string;
  locationId?: string | null;
  locationCode?: string | null;
  quantity: number;
  sourceNo?: string;
  sourceId: string;
  sourceType: string;
  operatorId?: string;
  operatorName: string;
  remark?: string;
  status?: string;
};

export type HoldLedgerInput = BaseLedgerInput & {
  abnormalType?: string;
  discoveryStage?: string;
  responsibleParty?: string;
  handlingPlan?: string;
};

export class InventoryLedgerService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  private balanceFilters(query: LedgerListQuery) {
    const filters = [];
    if (query.q) {
      filters.push(or(
        like(inventoryBalances.itemCode, `%${query.q}%`),
        like(inventoryBalances.itemName, `%${query.q}%`),
        like(inventoryBalances.projectCode, `%${query.q}%`),
        like(inventoryBalances.customerName, `%${query.q}%`)
      )!);
    }
    if (query.item_id) filters.push(eq(inventoryBalances.itemId, query.item_id));
    if (query.item_code) filters.push(eq(inventoryBalances.itemCode, query.item_code));
    if (query.item_name) filters.push(like(inventoryBalances.itemName, `%${query.item_name}%`));
    if (query.project_id) filters.push(eq(inventoryBalances.projectId, query.project_id));
    if (query.project_code) filters.push(eq(inventoryBalances.projectCode, query.project_code));
    if (query.customer_id) filters.push(eq(inventoryBalances.customerId, query.customer_id));
    if (query.customer_name) filters.push(like(inventoryBalances.customerName, `%${query.customer_name}%`));
    if (query.warehouse_id) filters.push(eq(inventoryBalances.warehouseId, query.warehouse_id));
    const warehouseIds = splitCsv(query.warehouse_ids);
    if (warehouseIds.length) filters.push(inArray(inventoryBalances.warehouseId, warehouseIds));
    if (query.location_id) filters.push(eq(inventoryBalances.locationId, query.location_id));
    if (query.location_code) filters.push(eq(inventoryBalances.locationCode, query.location_code));
    if (query.inventory_status) filters.push(eq(inventoryBalances.inventoryStatus, query.inventory_status));
    const statuses = splitCsv(query.inventory_statuses);
    if (statuses.length) filters.push(inArray(inventoryBalances.inventoryStatus, statuses));
    if (query.source_no) filters.push(like(inventoryBalances.sourceNo, `%${query.source_no}%`));
    if (query.quantity_min !== undefined) filters.push(gte(inventoryBalances.quantity, query.quantity_min));
    if (query.quantity_max !== undefined) filters.push(lte(inventoryBalances.quantity, query.quantity_max));
    if (query.updated_from) filters.push(gte(inventoryBalances.updatedAt, query.updated_from));
    if (query.updated_to) filters.push(lte(inventoryBalances.updatedAt, endOfDay(query.updated_to)));
    if (query.abnormal_only) filters.push(or(eq(inventoryBalances.inventoryStatus, 'frozen'), eq(inventoryBalances.inventoryStatus, 'held'), eq(inventoryBalances.inventoryStatus, 'scrap'), eq(inventoryBalances.inventoryStatus, 'scrapped'))!);
    return filters;
  }

  async listBalances(query: LedgerListQuery) {
    const filters = this.balanceFilters(query);
    const where = filters.length ? and(...filters) : undefined;
    const current = query.current || 1;
    const pageSize = query.pageSize || 10;
    
    const total = await this.db.select({ value: count() }).from(inventoryBalances).where(where);
    const summary = await this.db.select({
      totalQuantity: sql<number>`COALESCE(SUM(${inventoryBalances.quantity}), 0)`,
      availableQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryBalances.inventoryStatus} = 'available' THEN ${inventoryBalances.quantity} ELSE 0 END), 0)`,
      frozenQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryBalances.inventoryStatus} IN ('frozen', 'held') THEN ${inventoryBalances.quantity} ELSE 0 END), 0)`,
      abnormalQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryBalances.inventoryStatus} NOT IN ('available') THEN ${inventoryBalances.quantity} ELSE 0 END), 0)`,
      skuCount: count(),
    }).from(inventoryBalances).where(where);
    const rows = await this.db.select().from(inventoryBalances).where(where)
      .orderBy(orderBalanceBy(query)).limit(pageSize).offset((current - 1) * pageSize);

    return { items: rows, total: total[0]?.value ?? 0, summary: summary[0] ?? null };
  }

  private transactionFilters(query: LedgerListQuery) {
    const filters = [];
    if (query.q) {
      filters.push(or(
        like(inventoryTransactions.itemCode, `%${query.q}%`),
        like(inventoryTransactions.itemName, `%${query.q}%`),
        like(inventoryTransactions.transactionNo, `%${query.q}%`)
      )!);
    }
    if (query.item_id) filters.push(eq(inventoryTransactions.itemId, query.item_id));
    if (query.item_code) filters.push(eq(inventoryTransactions.itemCode, query.item_code));
    if (query.item_name) filters.push(like(inventoryTransactions.itemName, `%${query.item_name}%`));
    if (query.project_id) filters.push(eq(inventoryTransactions.projectId, query.project_id));
    if (query.project_code) filters.push(eq(inventoryTransactions.projectCode, query.project_code));
    if (query.customer_id) filters.push(eq(inventoryTransactions.customerId, query.customer_id));
    if (query.customer_name) filters.push(like(inventoryTransactions.customerName, `%${query.customer_name}%`));
    if (query.warehouse_id) filters.push(eq(inventoryTransactions.warehouseId, query.warehouse_id));
    const warehouseIds = splitCsv(query.warehouse_ids);
    if (warehouseIds.length) filters.push(inArray(inventoryTransactions.warehouseId, warehouseIds));
    if (query.location_id) filters.push(eq(inventoryTransactions.locationId, query.location_id));
    if (query.location_code) filters.push(eq(inventoryTransactions.locationCode, query.location_code));
    if (query.transaction_type) filters.push(eq(inventoryTransactions.transactionType, query.transaction_type));
    const transactionTypes = splitCsv(query.transaction_types);
    if (transactionTypes.length) filters.push(inArray(inventoryTransactions.transactionType, transactionTypes));
    if (query.source_no) filters.push(like(inventoryTransactions.sourceNo, `%${query.source_no}%`));
    if (query.source_type) filters.push(eq(inventoryTransactions.sourceType, query.source_type));
    if (query.operator_name) filters.push(like(inventoryTransactions.operatorName, `%${query.operator_name}%`));
    if (query.quantity_min !== undefined) filters.push(gte(inventoryTransactions.quantityChange, query.quantity_min));
    if (query.quantity_max !== undefined) filters.push(lte(inventoryTransactions.quantityChange, query.quantity_max));
    if (query.occurred_from) filters.push(gte(inventoryTransactions.occurredAt, query.occurred_from));
    if (query.occurred_to) filters.push(lte(inventoryTransactions.occurredAt, endOfDay(query.occurred_to)));
    return filters;
  }

  async listTransactions(query: LedgerListQuery) {
    const filters = this.transactionFilters(query);
    const where = filters.length ? and(...filters) : undefined;
    const current = query.current || 1;
    const pageSize = query.pageSize || 10;

    const total = await this.db.select({ value: count() }).from(inventoryTransactions).where(where);
    const summary = await this.db.select({
      inQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactions.quantityChange} > 0 THEN ${inventoryTransactions.quantityChange} ELSE 0 END), 0)`,
      outQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactions.quantityChange} < 0 THEN ABS(${inventoryTransactions.quantityChange}) ELSE 0 END), 0)`,
      netQuantity: sql<number>`COALESCE(SUM(${inventoryTransactions.quantityChange}), 0)`,
      movementCount: count(),
    }).from(inventoryTransactions).where(where);
    const rows = await this.db.select().from(inventoryTransactions).where(where)
      .orderBy(orderTransactionBy(query)).limit(pageSize).offset((current - 1) * pageSize);

    return { items: rows, total: total[0]?.value ?? 0, summary: summary[0] ?? null };
  }

  private async nextTransactionCode() {
    return 'ITX' + Math.floor(Date.now() / 1000).toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  private async ensureBalance(
    itemId: string, 
    projectId: string | null | undefined, 
    warehouseId: string, 
    locationId: string | null | undefined, 
    inventoryStatus: string
  ) {
    const filters = [
      eq(inventoryBalances.itemId, itemId),
      eq(inventoryBalances.warehouseId, warehouseId),
      eq(inventoryBalances.inventoryStatus, inventoryStatus),
    ];
    if (projectId) filters.push(eq(inventoryBalances.projectId, projectId));
    if (locationId) filters.push(eq(inventoryBalances.locationId, locationId));

    const existing = await this.db.select().from(inventoryBalances).where(and(...filters)).get();
    if (existing) return existing;

    const ts = nowIso();
    const newIdStr = newId('ibl');
    await this.db.insert(inventoryBalances).values({
      id: newIdStr,
      itemId,
      projectId,
      warehouseId,
      locationId,
      inventoryStatus,
      quantity: 0,
      createdAt: ts,
      updatedAt: ts,
    });

    const created = await this.db.select().from(inventoryBalances).where(eq(inventoryBalances.id, newIdStr)).get();
    return created!;
  }

  private async updateBalanceRecord(balanceId: string, input: BaseLedgerInput, newQuantity: number) {
    const ts = nowIso();
    await this.db.update(inventoryBalances).set({
      quantity: newQuantity,
      itemCode: input.itemCode ?? '',
      itemName: input.itemName ?? '',
      itemType: input.itemType ?? '',
      projectCode: input.projectCode ?? '',
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? '',
      warehouseName: input.warehouseName ?? '',
      locationCode: input.locationCode ?? '',
      sourceNo: input.sourceNo ?? '',
      lastTransactionAt: ts,
      updatedAt: ts,
    }).where(eq(inventoryBalances.id, balanceId));
  }

  private async insertTransaction(input: BaseLedgerInput, txType: string, qtyChange: number, beforeQty: number, afterQty: number, fromStatus: string, toStatus: string) {
    const ts = nowIso();
    const transactionId = newId('itx');
    await this.db.insert(inventoryTransactions).values({
      id: transactionId,
      transactionNo: await this.nextTransactionCode(),
      itemId: input.itemId,
      itemCode: input.itemCode ?? '',
      itemName: input.itemName ?? '',
      itemType: input.itemType ?? '',
      projectId: input.projectId,
      projectCode: input.projectCode ?? '',
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? '',
      warehouseId: input.warehouseId,
      warehouseName: input.warehouseName ?? '',
      locationId: input.locationId,
      locationCode: input.locationCode ?? '',
      transactionType: txType,
      quantityChange: qtyChange,
      beforeQuantity: beforeQty,
      afterQuantity: afterQty,
      fromStatus,
      toStatus,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNo: input.sourceNo ?? '',
      operatorId: input.operatorId ?? '',
      operatorName: input.operatorName,
      occurredAt: ts,
      remark: input.remark ?? '',
      createdAt: ts,
    });
  }

  async createReceiptTransaction(input: BaseLedgerInput) {
    if (input.quantity <= 0) throw new Error('Receipt quantity must be positive');
    const status = input.status || 'available';
    const balance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, status);
    
    const beforeQuantity = balance.quantity;
    const afterQuantity = beforeQuantity + input.quantity;
    
    await this.updateBalanceRecord(balance.id, input, afterQuantity);
    await this.insertTransaction(input, 'receipt', input.quantity, beforeQuantity, afterQuantity, '', status);
    return { beforeQuantity, afterQuantity, status };
  }

  async createIssueTransaction(input: BaseLedgerInput) {
    if (input.quantity <= 0) throw new Error('Issue quantity must be positive');
    const status = input.status || 'available';
    const balance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, status);
    
    if (balance.quantity < input.quantity) {
      throw new Error(`Insufficient inventory: required ${input.quantity}, available ${balance.quantity}`);
    }

    const beforeQuantity = balance.quantity;
    const afterQuantity = beforeQuantity - input.quantity;
    
    await this.updateBalanceRecord(balance.id, input, afterQuantity);
    await this.insertTransaction(input, 'issue', -input.quantity, beforeQuantity, afterQuantity, status, '');
    return { beforeQuantity, afterQuantity, status };
  }

  async createHoldTransaction(input: HoldLedgerInput) {
    if (input.quantity <= 0) throw new Error('Hold quantity must be positive');
    const fromStatus = 'available';
    const toStatus = 'held';
    
    const fromBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, fromStatus);
    if (fromBalance.quantity < input.quantity) {
      throw new Error(`Insufficient available inventory to hold: required ${input.quantity}, available ${fromBalance.quantity}`);
    }
    
    const toBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, toStatus);
    
    // Deduct from available
    await this.updateBalanceRecord(fromBalance.id, input, fromBalance.quantity - input.quantity);
    // Add to held
    await this.updateBalanceRecord(toBalance.id, input, toBalance.quantity + input.quantity);
    
    await this.insertTransaction(input, 'inventory_freeze', input.quantity, fromBalance.quantity, fromBalance.quantity - input.quantity, fromStatus, toStatus);
    
    // Create inventory hold record
    const ts = nowIso();
    const holdId = newId('ih');
    await this.db.insert(inventoryHolds).values({
      id: holdId,
      holdNo: `HLD-${ts.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      itemId: input.itemId,
      itemCode: input.itemCode ?? '',
      itemName: input.itemName ?? '',
      projectId: input.projectId,
      projectCode: input.projectCode ?? '',
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? '',
      warehouseId: input.warehouseId,
      warehouseName: input.warehouseName ?? '',
      locationId: input.locationId,
      locationCode: input.locationCode ?? '',
      holdQuantity: input.quantity,
      processedQuantity: 0,
      remainingQuantity: input.quantity,
      abnormalType: input.abnormalType ?? '',
      discoveryStage: input.discoveryStage ?? '',
      responsibleParty: input.responsibleParty ?? '',
      handlingPlan: input.handlingPlan ?? '',
      status: 'held',
      initiatorId: input.operatorId ?? '',
      handlerId: '',
      foundAt: ts,
      remark: input.remark ?? '',
      createdAt: ts,
      updatedAt: ts,
    });
    
    return { holdId, quantity: input.quantity };
  }

  async createReleaseTransaction(input: BaseLedgerInput & { holdId: string }) {
    if (input.quantity <= 0) throw new Error('Release quantity must be positive');
    
    const hold = await this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, input.holdId)).get();
    if (!hold) throw new Error('Inventory hold not found');
    if (hold.remainingQuantity < input.quantity) throw new Error('Cannot release more than remaining hold quantity');

    const fromStatus = 'held';
    const toStatus = 'available';
    
    const fromBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, fromStatus);
    const toBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, toStatus);
    
    // Deduct from held
    await this.updateBalanceRecord(fromBalance.id, input, fromBalance.quantity - input.quantity);
    // Add to available
    await this.updateBalanceRecord(toBalance.id, input, toBalance.quantity + input.quantity);
    
    await this.insertTransaction(input, 'inventory_unfreeze', input.quantity, fromBalance.quantity, fromBalance.quantity - input.quantity, fromStatus, toStatus);
    
    // Update hold record
    const newProcessed = hold.processedQuantity + input.quantity;
    const newRemaining = hold.remainingQuantity - input.quantity;
    const newStatus = newRemaining === 0 ? 'released' : hold.status;
    const ts = nowIso();
    
    await this.db.update(inventoryHolds).set({
      processedQuantity: newProcessed,
      remainingQuantity: newRemaining,
      status: newStatus,
      updatedAt: ts,
    }).where(eq(inventoryHolds.id, hold.id));

    return { holdId: hold.id, released: input.quantity };
  }

  async createScrapTransaction(input: BaseLedgerInput & { holdId: string }) {
    if (input.quantity <= 0) throw new Error('Scrap quantity must be positive');
    
    const hold = await this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, input.holdId)).get();
    if (!hold) throw new Error('Inventory hold not found');
    if (hold.remainingQuantity < input.quantity) throw new Error('Cannot scrap more than remaining hold quantity');

    const fromStatus = 'held';
    const toStatus = 'scrapped';
    
    const fromBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, fromStatus);
    const toBalance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, toStatus);
    
    await this.updateBalanceRecord(fromBalance.id, input, fromBalance.quantity - input.quantity);
    await this.updateBalanceRecord(toBalance.id, input, toBalance.quantity + input.quantity);
    
    await this.insertTransaction(input, 'scrap', input.quantity, fromBalance.quantity, fromBalance.quantity - input.quantity, fromStatus, toStatus);
    
    const newProcessed = hold.processedQuantity + input.quantity;
    const newRemaining = hold.remainingQuantity - input.quantity;
    const newStatus = newRemaining === 0 ? 'scrapped' : hold.status;
    const ts = nowIso();
    
    await this.db.update(inventoryHolds).set({
      processedQuantity: newProcessed,
      remainingQuantity: newRemaining,
      status: newStatus,
      updatedAt: ts,
    }).where(eq(inventoryHolds.id, hold.id));

    return { holdId: hold.id, scrapped: input.quantity };
  }

  async createAdjustmentTransaction(input: BaseLedgerInput & { qtyDelta: number }) {
    if (input.qtyDelta === 0) throw new Error('Adjustment quantity cannot be zero');
    if (!input.remark) throw new Error('Adjustment requires a reason (remark)');
    
    const status = input.status || 'available';
    const balance = await this.ensureBalance(input.itemId, input.projectId, input.warehouseId, input.locationId, status);
    
    const beforeQuantity = balance.quantity;
    const afterQuantity = beforeQuantity + input.qtyDelta;
    if (afterQuantity < 0) throw new Error('Adjustment would result in negative inventory');

    await this.updateBalanceRecord(balance.id, input, afterQuantity);
    await this.insertTransaction(input, 'adjustment', input.qtyDelta, beforeQuantity, afterQuantity, status, status);
    
    return { beforeQuantity, afterQuantity, status };
  }

  async createStocktakeTransaction(input: BaseLedgerInput & { systemQty: number; actualQty: number }) {
    const qtyDelta = input.actualQty - input.systemQty;
    if (qtyDelta === 0) return { qtyDelta: 0, status: 'unchanged' }; // No adjustment needed
    
    return this.createAdjustmentTransaction({
      ...input,
      qtyDelta,
      sourceType: 'stocktake',
    });
  }


  // Backward compatibility wrappers for legacy code
  async receiveItem(input: any) {
    return this.createReceiptTransaction({
      ...input,
      operatorName: input.operatorName || input.actorName || 'system',
      status: 'available'
    });
  }

  async issueItem(input: any) {
    return this.createIssueTransaction({
      ...input,
      operatorName: input.operatorName || input.actorName || 'system',
      status: 'available'
    });
  }

  async adjustInventory(input: any) {
    return this.createAdjustmentTransaction({
      ...input,
      operatorName: input.operatorName || input.actorName || 'system',
      status: 'available'
    });
  }

  async changeStatus(input: any) {
    if (input.fromStatus === 'available' && input.toStatus === 'frozen') {
      return this.createHoldTransaction({
        ...input,
        operatorName: input.operatorName || input.actorName || 'system'
      });
    }
    await this.createAdjustmentTransaction({
      ...input,
      qtyDelta: -input.quantity, quantity: input.quantity,
      status: input.fromStatus,
      operatorName: input.operatorName || input.actorName || 'system'
    });
    await this.createAdjustmentTransaction({
      ...input,
      qtyDelta: input.quantity, quantity: input.quantity,
      status: input.toStatus,
      operatorName: input.operatorName || input.actorName || 'system'
    });
  }
}

function splitCsv(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function endOfDay(value: string) {
  return value.length === 10 ? `${value}T23:59:59.999Z` : value;
}

function orderBalanceBy(query: LedgerListQuery) {
  const columns = {
    quantity: inventoryBalances.quantity,
    updatedAt: inventoryBalances.updatedAt,
    itemCode: inventoryBalances.itemCode,
    warehouseId: inventoryBalances.warehouseId,
    inventoryStatus: inventoryBalances.inventoryStatus,
  } as const;
  const column = columns[(query.sort_by ?? 'updatedAt') as keyof typeof columns] ?? inventoryBalances.updatedAt;
  return query.sort_order === 'asc' ? asc(column) : desc(column);
}

function orderTransactionBy(query: LedgerListQuery) {
  const columns = {
    quantityChange: inventoryTransactions.quantityChange,
    occurredAt: inventoryTransactions.occurredAt,
    transactionNo: inventoryTransactions.transactionNo,
    itemCode: inventoryTransactions.itemCode,
    warehouseId: inventoryTransactions.warehouseId,
    transactionType: inventoryTransactions.transactionType,
  } as const;
  const column = columns[(query.sort_by ?? 'occurredAt') as keyof typeof columns] ?? inventoryTransactions.occurredAt;
  return query.sort_order === 'asc' ? asc(column) : desc(column);
}
