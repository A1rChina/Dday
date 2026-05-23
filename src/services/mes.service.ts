import { InventoryLedgerService } from './inventory-ledger.service';
import { ProductionExecutionService } from './production-execution.service';
import { ResourceApiService } from './resource-api.service';
import { createDb, type AppDb } from '../db/client';
import { inventoryHolds } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

export class MesService {
  private readonly resources: ResourceApiService;
  private readonly production: ProductionExecutionService;
  private readonly inventory: InventoryLedgerService;
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.resources = new ResourceApiService(database);
    this.production = new ProductionExecutionService(database);
    this.inventory = new InventoryLedgerService(database);
    this.db = createDb(database);
  }

  listMaterials() {
    return this.resources.listMaterials();
  }

  createMaterial(input: any) {
    return this.resources.createMaterial(input);
  }

  updateMaterial(id: string, input: any) {
    return this.resources.updateMaterial(id, input);
  }

  listProcesses() {
    return this.resources.listProcesses();
  }

  createProcess(input: any) {
    return this.resources.createProcess(input);
  }

  updateProcess(id: string, input: any) {
    return this.resources.updateProcess(id, input);
  }

  listMachines() {
    return this.resources.listMachines();
  }

  createMachine(input: any) {
    return this.resources.createMachine(input);
  }

  updateMachine(id: string, input: any) {
    return this.resources.updateMachine(id, input);
  }

  listReports(workOrderId?: string) {
    return this.production.listReports(workOrderId);
  }

  createReport(input: any) {
    return this.production.createReport(input);
  }

  createWorkOrder(input: any) {
    return this.resources.createWorkOrder(input);
  }

  updateWorkOrder(id: string, input: any) {
    return this.production.updateWorkOrder(id, input);
  }

  adjustInventory(input: any) {
    return this.inventory.createAdjustmentTransaction({
      itemId: input.item_id,
      itemCode: input.item_code || '',
      itemName: input.item_name || '',
      itemType: input.item_type || 'material',
      warehouseId: input.warehouse_id || input.warehouse_code,
      locationId: input.location_id || input.location_code,
      quantity: Math.abs(input.qty_delta || input.quantity || 0),
      qtyDelta: input.qty_delta || input.quantity || 0,
      sourceId: input.source_id || 'manual',
      sourceNo: input.source_no || '',
      sourceType: input.source_type || 'adjustment',
      operatorName: input.operator || '',
    });
  }

  shipProductInventory(input: any) {
    return this.inventory.createIssueTransaction({
      itemId: input.product_id || input.item_id,
      itemCode: input.product_code || input.item_code || '',
      itemName: input.product_name || input.item_name || '',
      itemType: 'product',
      warehouseId: input.warehouse_id || input.warehouse_code,
      locationId: input.location_id || input.location_code,
      quantity: input.quantity,
      sourceId: input.source_id || 'shipment',
      sourceNo: input.source_no || '',
      sourceType: 'shipment',
      operatorName: input.operator || '',
    });
  }

  listInventoryBalances() {
    return this.inventory.listBalances({ current: 1, pageSize: 100, q: '' });
  }

  listInventoryMovements() {
    return this.inventory.listTransactions({ current: 1, pageSize: 100, q: '' });
  }

  listFreezes() {
    return this.db.select().from(inventoryHolds).orderBy(desc(inventoryHolds.createdAt));
  }

  async createFreeze(input: any) {
    const ts = nowIso();
    const id = newId('hold');
    await this.db.insert(inventoryHolds).values({
      id,
      holdNo: input.hold_no || id,
      itemId: input.item_id,
      itemCode: input.item_code || '',
      itemName: input.item_name || '',
      projectId: input.project_id || null,
      projectCode: input.project_code || '',
      customerId: input.customer_id || null,
      customerName: input.customer_name || '',
      warehouseId: input.warehouse_id,
      warehouseName: input.warehouse_name || '',
      locationId: input.location_id || null,
      locationCode: input.location_code || '',
      holdQuantity: input.hold_quantity || input.quantity,
      processedQuantity: 0,
      remainingQuantity: input.hold_quantity || input.quantity,
      abnormalType: input.abnormal_type || '',
      discoveryStage: input.discovery_stage || '',
      responsibleParty: input.responsible_party || '',
      handlingPlan: input.handling_plan || '',
      status: 'pending',
      initiatorId: input.initiator_id || '',
      handlerId: input.handler_id || '',
      foundAt: input.found_at || ts,
      expectedCloseAt: input.expected_close_at || null,
      isDeliveryAffected: Boolean(input.is_delivery_affected),
      remark: input.remark || input.notes || '',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getFreeze(id);
  }

  getFreeze(id: string) {
    return this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, id)).get();
  }

  async updateFreeze(id: string, input: any) {
    await this.db.update(inventoryHolds).set({ ...input, updatedAt: nowIso() } as any).where(eq(inventoryHolds.id, id));
    return this.getFreeze(id);
  }

  async closeFreeze(id: string, input: any) {
    await this.db
      .update(inventoryHolds)
      .set({ status: input.action === 'scrap' ? 'scrapped' : 'released', remainingQuantity: 0, updatedAt: nowIso() })
      .where(eq(inventoryHolds.id, id));
    return this.getFreeze(id);
  }
}
