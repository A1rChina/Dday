import { and, count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import {
  parties,
  projects,
  customers,
  profileSuppliers,
  projectParts,
  product_materials,
  customerOrderItems,
  customerOrders,
  customerDemands,
  demandLines,
  productionDemandLinks,
  deliveryPlanItems,
  deliveryPlans,
  demandPlanVersions,
  inventoryBalances,
  inventoryHolds,
  inventoryTransactions,
  issueActions,
  materialReceipts,
  materials,
  operationLogs,
  productionPlanItems,
  productionPlans,
  products,
  qualityIssues,
  shipmentItems,
  shipments,
  supplyChainEvents,
  workOrders,
} from '../db/schema';
import type {
  deliveryPlanCreateSchema,
  orderFlowListQuerySchema,
  orderImportSchema,
  orderUpdateSchema,
  productionPlanCreateSchema,
  qualityIssueActionSchema,
  qualityIssueCreateSchema,
  qualityIssueUpdateSchema,
  receiptCreateSchema,
} from '../schemas/order-flow';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { getWarehouseForProduct } from '../utils/warehouse';
import { ResourceApiService } from './resource-api.service';
import { InventoryLedgerService } from './inventory-ledger.service';

type ListQuery = z.infer<typeof orderFlowListQuerySchema>;
type OrderImportInput = z.infer<typeof orderImportSchema>;
type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
type ReceiptCreateInput = z.infer<typeof receiptCreateSchema>;
type ProductionPlanCreateInput = z.infer<typeof productionPlanCreateSchema>;
type DeliveryPlanCreateInput = z.infer<typeof deliveryPlanCreateSchema>;
type QualityIssueCreateInput = z.infer<typeof qualityIssueCreateSchema>;
type QualityIssueUpdateInput = z.infer<typeof qualityIssueUpdateSchema>;
type QualityIssueActionInput = z.infer<typeof qualityIssueActionSchema>;

export class OrderFlowService {
  private readonly db: AppDb;
  private readonly resource: ResourceApiService;
  private readonly d1: D1Database;

  constructor(database: D1Database) {
    this.d1 = database;
    this.db = createDb(database);
    this.resource = new ResourceApiService(database);
  }

  async listOrders(query: ListQuery) {
    const where = query.q
      ? or(
          like(demandLines.code, `%${query.q}%`),
          like(demandLines.customerName, `%${query.q}%`),
          like(demandLines.projectCode, `%${query.q}%`),
          like(demandLines.productCode, `%${query.q}%`),
          like(demandLines.productName, `%${query.q}%`)
        )
      : undefined;
    
    const total = await this.db.select({ value: count() }).from(demandLines).where(where);
    const rows = await this.db
      .select({
        id: demandLines.id,
        demand_id: demandLines.demandId,
        demand_code: customerDemands.code,
        code: demandLines.code,
        customer_id: demandLines.customerId,
        customer_name: demandLines.customerName,
        project_code: demandLines.projectCode,
        product_id: demandLines.productId,
        product_code: demandLines.productCode,
        product_name: demandLines.productName,
        supplier_id: projectParts.supplierId,
        supplier_name: profileSuppliers.supplierName,
        manufacturing_factory: projectParts.manufacturingFactory,
        profile_material_code: projectParts.profileMaterialCode,
        profile_material_name: projectParts.profileMaterialName,
        safety_stock: projectParts.safetyStock,
        warning_stock: projectParts.warningStock,
        source_type: demandLines.sourceType,
        quantity: demandLines.quantity,
        delivered_quantity: demandLines.deliveredQuantity,
        unshipped_quantity: demandLines.unshippedQuantity,
        status: demandLines.status,
        due_date: demandLines.dueDate,
        notes: demandLines.notes,
        created_at: demandLines.createdAt,
        updated_at: demandLines.updatedAt,
      })
      .from(demandLines)
      .leftJoin(customerDemands, eq(customerDemands.id, demandLines.demandId))
      .leftJoin(products, eq(products.id, demandLines.productId))
      .leftJoin(projects, eq(projects.code, demandLines.projectCode))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, projects.id)))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(where)
      .orderBy(desc(demandLines.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    
    const enrichedItems = [];
    for (const row of rows) {
      let materialRequired = row.quantity;
      let materialReceived = 0;

      // Check materials received for this item
      const receipts = await this.db
        .select()
        .from(materialReceipts)
        .where(eq(materialReceipts.orderItemId, row.id));
      materialReceived = receipts
        .filter((rcv) => rcv.status === 'received')
        .reduce((sum, rcv) => sum + rcv.quantity, 0);

      const materialProgress = materialRequired > 0 
        ? Math.min(100, Math.round((materialReceived / materialRequired) * 100))
        : 100;

      enrichedItems.push({
        ...row,
        order_id: row.demand_id, // compatibility
        order_code: row.demand_code, // compatibility
        order_item_id: row.id, // compatibility
        delivery_progress: row.quantity > 0 ? Math.round((row.delivered_quantity / row.quantity) * 100) : 0,
        material_progress: materialProgress
      });
    }

    return { items: enrichedItems, total: total[0]?.value ?? 0 };
  }

  async importOrder(input: OrderImportInput, actor = '') {
    const orderCode = input.order_code || (await this.nextCode('customer_demands', 'CD'));
    const existing = await this.db.select().from(customerDemands).where(eq(customerDemands.code, orderCode)).get();
    const customerId = await this.ensureCustomer(input.customer_code, input.customer_name);
    const version = existing ? existing.demandVersion + 1 : 1;
    const orderId = existing?.id ?? newId('cd');
    const ts = nowIso();

    if (existing) {
      await this.db
        .update(customerDemands)
        .set({
          customerId,
          customerName: input.customer_name,
          sourceType: input.source_type,
          sourceFileName: input.source_file_name,
          demandVersion: version,
          status: 'imported',
          requestedDate: input.requested_date ?? existing.requestedDate,
          notes: input.notes,
          updatedAt: ts,
        })
        .where(eq(customerDemands.id, orderId));
    } else {
      await this.db.insert(customerDemands).values({
        id: orderId,
        code: orderCode,
        customerId,
        customerName: input.customer_name,
        sourceType: input.source_type,
        sourceFileName: input.source_file_name,
        demandVersion: version,
        status: 'imported',
        requestedDate: input.requested_date ?? '',
        notes: input.notes,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    await this.db.insert(demandPlanVersions).values({
      id: newId('dpv'),
      orderId,
      version,
      importedBy: actor,
      changeSummary: input.change_summary,
      rawPayload: JSON.stringify(input),
      createdAt: ts,
    });

    if (existing) {
      await this.db.delete(demandLines).where(eq(demandLines.demandId, orderId));
    }

    const insertedItems = [];
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const product = await this.resolveProduct(item.product_id, item.product_code);
      const id = newId('cdl');
      const lineCode = `${orderCode}-${String(i + 1).padStart(3, '0')}`;
      await this.db.insert(demandLines).values({
        id,
        demandId: orderId,
        code: lineCode,
        customerId,
        customerName: input.customer_name,
        projectCode: product?.projectCode ?? null,
        productId: product?.id ?? item.product_id ?? null,
        productCode: product?.code ?? item.product_code,
        productName: product?.name ?? item.product_name,
        sourceType: input.source_type,
        quantity: item.quantity,
        deliveredQuantity: 0,
        unshippedQuantity: item.quantity,
        status: 'confirmed',
        dueDate: item.due_date ?? input.requested_date ?? '',
        notes: item.notes,
        createdAt: ts,
        updatedAt: ts,
      });
      const saved = await this.db.select().from(demandLines).where(eq(demandLines.id, id)).get();
      if (saved) insertedItems.push(mapDemandLine(saved));
    }

    await this.event(orderId, 'customer_demand', orderId, 'demand_imported', `version ${version}`, actor);
    return { order: await this.getOrder(orderId), items: insertedItems, version };
  }

  async getOrder(idOrCode: string) {
    const demand = await this.db
      .select()
      .from(customerDemands)
      .where(or(eq(customerDemands.id, idOrCode), eq(customerDemands.code, idOrCode)))
      .get();
    if (!demand) return null;
    const items = await this.db.select().from(demandLines).where(eq(demandLines.demandId, demand.id));

    const projectNames: string[] = [];
    for (const item of items) {
      if (item.projectCode) {
        projectNames.push(item.projectCode);
      }
    }
    const uniqueProjects = [...new Set(projectNames)].filter(Boolean);
    const projectName = uniqueProjects.join(', ') || '未指定项目';

    return { 
      ...mapDemand(demand), 
      items: items.map(mapDemandLine),
      project_name: projectName
    };
  }

  async updateOrder(id: string, input: OrderUpdateInput, actor = '') {
    const current = await this.db.select().from(customerDemands).where(eq(customerDemands.id, id)).get();
    if (!current) return null;
    await this.db
      .update(customerDemands)
      .set({
        customerName: input.customer_name ?? current.customerName,
        requestedDate: input.requested_date ?? current.requestedDate,
        notes: input.notes ?? current.notes,
        updatedAt: nowIso(),
      })
      .where(eq(customerDemands.id, id));

    if (input.items) {
      await this.db.delete(demandLines).where(eq(demandLines.demandId, id));

      const ts = nowIso();
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const product = await this.resolveProduct(item.product_id, item.product_code);
        const itemId = newId('cdl');
        const lineCode = `${current.code}-${String(i + 1).padStart(3, '0')}`;
        await this.db.insert(demandLines).values({
          id: itemId,
          demandId: id,
          code: lineCode,
          customerId: current.customerId,
          customerName: input.customer_name ?? current.customerName,
          projectCode: product?.projectCode ?? null,
          productId: product?.id ?? item.product_id ?? null,
          productCode: product?.code ?? item.product_code,
          productName: product?.name ?? item.product_name,
          sourceType: current.sourceType,
          quantity: item.quantity,
          deliveredQuantity: 0,
          unshippedQuantity: item.quantity,
          status: 'confirmed',
          dueDate: item.due_date ?? input.requested_date ?? current.requestedDate ?? '',
          notes: item.notes ?? '',
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }

    await this.event(id, 'customer_demand', id, 'demand_updated', input.notes ?? '', actor);
    return await this.getOrder(id);
  }

  async confirmOrder(id: string, actor = '') {
    const current = await this.db.select().from(customerDemands).where(eq(customerDemands.id, id)).get();
    if (!current) return null;
    if (current.status !== 'imported') {
      throw new Error(`demand status ${current.status} cannot be confirmed`);
    }
    const ts = nowIso();
    await this.db.update(customerDemands).set({ status: 'confirmed', updatedAt: ts }).where(eq(customerDemands.id, id));
    await this.event(id, 'customer_demand', id, 'demand_confirmed', '', actor);
    return await this.getOrder(id);
  }

  async deleteOrder(id: string, actor = '') {
    const current = await this.getOrder(id);
    if (!current) return null;
    await this.db.update(customerDemands).set({ status: 'cancelled', updatedAt: nowIso() }).where(eq(customerDemands.id, id));
    await this.event(id, 'customer_demand', id, 'demand_cancelled', '', actor);
    return await this.getOrder(id);
  }

  async pushOrderToPlan(orderId: string, actor = '') {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error('demand not found');
    if (order.status === 'cancelled' || order.status === 'closed') {
      throw new Error('cancelled or closed demands cannot be pushed to production plan');
    }

    const firstLineId = order.items[0]?.id;
    const existingLink = firstLineId 
      ? await this.db.select().from(productionDemandLinks).where(eq(productionDemandLinks.demandLineId, firstLineId)).get()
      : null;
    if (existingLink) {
      const existingPlan = await this.db.select().from(productionPlans).where(eq(productionPlans.id, existingLink.productionPlanId)).get();
      if (existingPlan) {
        return { production_plan_id: existingPlan.id, production_plan_code: existingPlan.code, existed: true, plan: mapPlan(existingPlan) };
      }
    }

    const items = order.items.filter((item) => item.product_id);
    if (items.length === 0) throw new Error('demand has no product-linked items');

    const primaryItem = items[0];
    const primaryProductId = primaryItem.product_id;
    if (!primaryProductId) throw new Error('demand has no product-linked items');
    const product = await this.resolveProductWithRelations(primaryProductId);
    if (!product) throw new Error('product not found');

    const planQty = items.reduce((sum, item) => {
      const remaining = Number(item.quantity || 0) - Number(item.delivered_quantity || 0);
      return sum + (remaining > 0 ? remaining : Number(item.quantity || 0));
    }, 0);
    if (planQty <= 0) throw new Error('demand has no quantity available to plan');

    const dueDate = primaryItem.due_date || order.requested_date || today();
    const id = newId('pp');
    const code = await this.nextCode('production_plans', 'PP');
    const ts = nowIso();
    const title = `Plan for ${order.code}`;

    const materialCode = product.materialId 
      ? (await this.db.select({ code: materials.code }).from(materials).where(eq(materials.id, product.materialId)).get())?.code ?? null
      : null;

    await this.db.insert(productionPlans).values({
      id,
      code,
      title,
      planDate: today(),
      orderLineId: order.id,
      projectId: product.projectId ?? null,
      customerId: order.customer_id ?? product.partyId ?? null,
      productId: primaryProductId,
      materialId: product.materialId ?? null,
      planQty,
      plannedQuantity: planQty,
      dueDate,
      priority: 'medium',
      plannedStartAt: today(),
      plannedFinishAt: dueDate,
      materialReadyStatus: 'unknown',
      riskLevel: 'medium',
      status: 'draft',
      createdBy: actor,
      createdAt: ts,
      updatedAt: ts,
      projectCode: product.projectCode ?? null,
      productCode: product.code,
      materialCode,
      planPeriod: today().slice(0, 7),
    });

    for (const item of items) {
      await this.db.insert(productionDemandLinks).values({
        id: newId('pdl'),
        productionPlanId: id,
        demandLineId: item.id,
        quantity: item.quantity,
        createdAt: ts,
      });
    }

    await this.db.update(customerDemands).set({ status: 'planned', updatedAt: ts }).where(eq(customerDemands.id, order.id));
    await this.db.update(demandLines).set({ status: 'planned', updatedAt: ts }).where(eq(demandLines.demandId, order.id));

    await this.event(order.id, 'production_plan', id, 'plan_created', code, actor);
    const plan = await this.db.select().from(productionPlans).where(eq(productionPlans.id, id)).get();
    return { production_plan_id: id, production_plan_code: code, existed: false, plan: plan ? mapPlan(plan) : null };
  }

  async receiveMaterial(input: ReceiptCreateInput, actor = '') {
    const material = await this.db.select().from(materials).where(eq(materials.id, input.material_id)).get();
    if (!material) throw new Error('material not found');
    const id = newId('rcv');
    const code = await this.nextCode('material_receipts', 'RCV');
    const ts = nowIso();
    await this.db.insert(materialReceipts).values({
      id,
      code,
      materialId: input.material_id,
      orderItemId: input.order_item_id ?? null,
      supplierName: input.supplier_name,
      warehouseCode: input.warehouse_code,
      batchNo: input.batch_no,
      quantity: input.quantity,
      status: 'planned',
      receivedBy: actor,
      receivedAt: ts,
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    });
    
    const orderId = input.order_item_id ? await this.orderIdForItem(input.order_item_id) : null;
    await this.event(orderId, 'material_receipt', id, 'material_receipt_planned', `${material.code} +${input.quantity}`, actor);
    return { receipt: await this.db.select().from(materialReceipts).where(eq(materialReceipts.id, id)).get() };
  }

  async confirmMaterialReceipt(receiptId: string, actor = '') {
    const receipt = await this.db.select().from(materialReceipts).where(eq(materialReceipts.id, receiptId)).get();
    if (!receipt) throw new Error('receipt not found');
    if (receipt.status === 'received') throw new Error('receipt already confirmed');
    
    const material = await this.db.select().from(materials).where(eq(materials.id, receipt.materialId)).get();
    const ts = nowIso();

    await this.db.update(materialReceipts).set({
      status: 'received',
      receivedBy: actor,
      receivedAt: ts,
      updatedAt: ts,
    }).where(eq(materialReceipts.id, receiptId));

    const movement = await this.applyInventoryMovement({
      materialId: receipt.materialId,
      productId: null,
      batchNo: receipt.batchNo,
      warehouseCode: receipt.warehouseCode,
      qtyDelta: receipt.quantity,
      movementType: 'adjust',
      reason: `material receipt ${receipt.code}`,
      actor,
    });

    const orderId = receipt.orderItemId ? await this.orderIdForItem(receipt.orderItemId) : null;
    await this.event(orderId, 'material_receipt', receipt.id, 'material_received', `${material?.code} +${receipt.quantity}`, actor);
    
    return { receipt: await this.db.select().from(materialReceipts).where(eq(materialReceipts.id, receiptId)).get(), movement };
  }

  async listReceipts(query: ListQuery) {
    const where = query.q
      ? like(materialReceipts.code, `%${query.q}%`)
      : undefined;
    const total = await this.db.select({ value: count() }).from(materialReceipts).where(where);
    const rows = await this.db
      .select({
         id: materialReceipts.id,
         code: materialReceipts.code,
         materialId: materialReceipts.materialId,
         materialCode: materials.code,
         materialName: materials.name,
         orderItemId: materialReceipts.orderItemId,
         supplierName: materialReceipts.supplierName,
         warehouseCode: materialReceipts.warehouseCode,
         batchNo: materialReceipts.batchNo,
         quantity: materialReceipts.quantity,
         status: materialReceipts.status,
         receivedBy: materialReceipts.receivedBy,
         receivedAt: materialReceipts.receivedAt,
         notes: materialReceipts.notes,
         createdAt: materialReceipts.createdAt,
      })
      .from(materialReceipts)
      .leftJoin(materials, eq(materials.id, materialReceipts.materialId))
      .where(where)
      .orderBy(desc(materialReceipts.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: total[0]?.value ?? 0 };
  }

  async listProductionPlans(query: ListQuery) {
    const where = query.q
      ? or(like(productionPlans.code, `%${query.q}%`), like(productionPlans.title, `%${query.q}%`))
      : undefined;
    const total = await this.db.select({ value: count() }).from(productionPlans).where(where);
    const rows = await this.db
      .select()
      .from(productionPlans)
      .where(where)
      .orderBy(desc(productionPlans.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapPlan), total: total[0]?.value ?? 0 };
  }

  async createProductionPlan(input: ProductionPlanCreateInput, actor = '') {
    const id = newId('pp');
    const code = await this.nextCode('production_plans', 'PP');
    const ts = nowIso();
    await this.db.insert(productionPlans).values({
      id,
      code,
      title: input.title,
      planDate: input.plan_date,
      status: 'draft',
      createdBy: actor,
      releasedAt: null,
      createdAt: ts,
      updatedAt: ts,
    });
    for (const item of input.items) {
      const product = await this.resolveProductWithRelations(item.product_id);
      if (!product) throw new Error('product not found');
      await this.db.insert(productionPlanItems).values({
        id: newId('ppi'),
        planId: id,
        orderItemId: item.order_item_id ?? null,
        productId: item.product_id,
        materialId: item.material_id ?? product.materialId,
        plannedQuantity: item.planned_quantity,
        machineId: item.machine_id ?? null,
        plannedStartDate: item.planned_start_date ?? input.plan_date,
        plannedFinishDate: item.planned_finish_date ?? input.plan_date,
        status: 'draft',
        workOrderId: null,
        notes: item.notes,
        createdAt: ts,
        updatedAt: ts,
      });
      if (item.order_item_id) await this.setOrderItemStatus(item.order_item_id, 'planned');
    }
    if (input.order_id) {
      await this.db.update(customerOrders).set({ status: 'planned', updatedAt: ts }).where(eq(customerOrders.id, input.order_id));
      await this.event(input.order_id, 'production_plan', id, 'plan_created', code, actor);
    }
    return await this.getProductionPlan(id);
  }

  async getProductionPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(productionPlans)
      .where(or(eq(productionPlans.id, idOrCode), eq(productionPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    
    const items = await this.db
      .select({
        id: productionPlanItems.id,
        planId: productionPlanItems.planId,
        orderItemId: productionPlanItems.orderItemId,
        productId: productionPlanItems.productId,
        productCode: products.code,
        productName: products.name,
        materialId: productionPlanItems.materialId,
        plannedQuantity: productionPlanItems.plannedQuantity,
        machineId: productionPlanItems.machineId,
        plannedStartDate: productionPlanItems.plannedStartDate,
        plannedFinishDate: productionPlanItems.plannedFinishDate,
        status: productionPlanItems.status,
        workOrderId: productionPlanItems.workOrderId,
        workOrderCode: workOrders.code,
        notes: productionPlanItems.notes,
      })
      .from(productionPlanItems)
      .leftJoin(products, eq(products.id, productionPlanItems.productId))
      .leftJoin(workOrders, eq(workOrders.id, productionPlanItems.workOrderId))
      .where(eq(productionPlanItems.planId, plan.id));

    return { 
      ...mapPlan(plan), 
      items: items.map(item => ({
        id: item.id,
        plan_id: item.planId,
        order_item_id: item.orderItemId,
        product_id: item.productId,
        product_code: item.productCode || '',
        product_name: item.productName || '',
        material_id: item.materialId,
        planned_quantity: item.plannedQuantity,
        machine_id: item.machineId,
        planned_start_date: item.plannedStartDate,
        planned_finish_date: item.plannedFinishDate,
        status: item.status,
        work_order_id: item.workOrderId,
        work_order_code: item.workOrderCode || '',
        notes: item.notes,
      }))
    };
  }

  async releaseProductionPlan(id: string, actor = '') {
    const plan = await this.getProductionPlan(id);
    if (!plan) throw new Error('production plan not found');
    const workOrderList = [];
    const ts = nowIso();
    for (const item of plan.items) {
      if (item.work_order_id) continue;
      const workOrder = await this.resource.createWorkOrder({
        product_id: item.product_id,
        material_id: item.material_id ?? undefined,
        planned_quantity: item.planned_quantity,
        planned_start_date: item.planned_start_date || plan.plan_date,
        planned_finish_date: item.planned_finish_date || plan.plan_date,
        notes: `From production plan ${plan.code}`,
      });
      if (!workOrder) throw new Error('work order create failed');
      const released = await this.resource.updateWorkOrder(workOrder.id, { status: 'released' });
      await this.db
        .update(productionPlanItems)
        .set({ status: 'work_order_created', workOrderId: workOrder.id, updatedAt: ts })
        .where(eq(productionPlanItems.id, item.id));
      if (item.order_item_id) await this.setOrderItemStatus(item.order_item_id, 'in_production');
      workOrderList.push(released ?? workOrder);
    }
    await this.db
      .update(productionPlans)
      .set({ status: 'released', releasedAt: ts, updatedAt: ts })
      .where(eq(productionPlans.id, plan.id));
    for (const orderId of await this.orderIdsForPlan(plan.id)) {
      await this.db.update(customerOrders).set({ status: 'in_production', updatedAt: ts }).where(eq(customerOrders.id, orderId));
      await this.event(orderId, 'production_plan', plan.id, 'plan_released', `${workOrderList.length} work orders`, actor);
    }
    return { plan: await this.getProductionPlan(plan.id), work_orders: workOrderList };
  }

  async listInventoryBalances(query: ListQuery): Promise<any> {
    const ledger = new InventoryLedgerService(this.d1);
    const res = await ledger.listBalances({ current: query.current, pageSize: query.pageSize, q: query.q });
    return res;
  }

  async listInventoryMovements(query: ListQuery): Promise<any> {
    const ledger = new InventoryLedgerService(this.d1);
    const res = await ledger.listTransactions({ current: query.current, pageSize: query.pageSize, q: query.q });
    return res;
  }

  async listQualityIssues(query: ListQuery) {
    const where = query.q ? or(like(qualityIssues.code, `%${query.q}%`), like(qualityIssues.title, `%${query.q}%`)) : undefined;
    const total = await this.db.select({ value: count() }).from(qualityIssues).where(where);
    const rows = await this.db
      .select()
      .from(qualityIssues)
      .where(where)
      .orderBy(desc(qualityIssues.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapQualityIssue), total: total[0]?.value ?? 0 };
  }

  async createQualityIssue(input: QualityIssueCreateInput, actor = '') {
    if (!input.material_id && !input.product_id) throw new Error('material_id or product_id is required');
    if (input.material_id && input.product_id) throw new Error('only one of material_id or product_id can be set');
    if (input.freeze_qty > 0 && input.quantity > 0 && input.freeze_qty > input.quantity) {
      throw new Error('freeze_qty cannot exceed issue quantity');
    }

    const id = newId('qi');
    const code = await this.nextCode('quality_issues', 'QI');
    const ts = nowIso();
    await this.db.insert(qualityIssues).values({
      id,
      code,
      sourceType: input.source_type,
      sourceId: input.source_id,
      orderId: input.order_id ?? null,
      orderItemId: input.order_item_id ?? null,
      workOrderId: input.work_order_id ?? null,
      materialId: input.material_id ?? null,
      productId: input.product_id ?? null,
      severity: input.severity,
      status: 'open',
      title: input.title,
      description: input.description,
      quantity: input.quantity,
      freezeId: null,
      inventoryLockId: null,
      handlingMethod: '',
      warehouseCode: input.warehouse_code,
      locationCode: input.location_code,
      batchNo: input.batch_no,
      owner: actor,
      createdAt: ts,
      updatedAt: ts,
      
    });

    let lockId: string | null = null;
    if (input.freeze_qty > 0) {
      const ledger = new InventoryLedgerService(this.d1);
      
      lockId = newId('lck');
      const lockCode = `LCK-${code}`;
      
      
      const holdResult: any = await ledger.changeStatus({});
      if (holdResult && holdResult.holdId) {
        const lockId = holdResult.holdId;
      }
      
      await this.db
        .update(qualityIssues)
        .set({ status: 'frozen', inventoryLockId: lockId, updatedAt: nowIso() })
        .where(eq(qualityIssues.id, id));
    }

    await this.db.insert(issueActions).values({
      id: newId('act'),
      issueId: id,
      action: lockId ? 'create_and_freeze' : 'create',
      message: input.description,
      actor,
      createdAt: ts,
    });
    await this.event(input.order_id ?? null, 'quality_issue', id, 'quality_issue_created', code, actor);
    return await this.getQualityIssue(id);
  }

  async updateQualityIssue(id: string, input: QualityIssueUpdateInput, actor = '') {
    const issue = await this.db.select().from(qualityIssues).where(eq(qualityIssues.id, id)).get();
    if (!issue) return null;
    const nextHandlingMethod = input.handling_method ?? issue.handlingMethod;
    const nextStatus = input.status ?? issue.status;
    if (nextStatus === 'closed' && !nextHandlingMethod) {
      throw new Error('handling_method is required before closing quality issue');
    }
    const ts = nowIso();
    await this.db
      .update(qualityIssues)
      .set({
        status: nextStatus,
        handlingMethod: nextHandlingMethod,
        description: input.description ?? issue.description,
        owner: input.owner ?? issue.owner,
        updatedAt: ts,
        
      })
      .where(eq(qualityIssues.id, issue.id));
    await this.db.insert(issueActions).values({
      id: newId('act'),
      issueId: issue.id,
      action: 'update',
      message: input.handling_method ? `handling_method=${input.handling_method}` : input.description ?? '',
      actor,
      createdAt: ts,
    });
    return await this.getQualityIssue(issue.id);
  }

  async unfreezeQualityIssue(id: string, input: QualityIssueActionInput, actor = '') {
    return await this.consumeQualityIssueLock(id, input, actor, 'release');
  }

  async scrapQualityIssue(id: string, input: QualityIssueActionInput, actor = '') {
    return await this.consumeQualityIssueLock(id, input, actor, 'scrap');
  }

  async closeQualityIssue(id: string, input: QualityIssueActionInput, actor = '') {
    const issue = await this.db.select().from(qualityIssues).where(eq(qualityIssues.id, id)).get();
    if (!issue) throw new Error('quality issue not found');
    const handlingMethod = input.handling_method ?? issue.handlingMethod;
    if (!handlingMethod) throw new Error('handling_method is required before closing quality issue');
    const activeLock = issue.inventoryLockId
      ? await this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, issue.inventoryLockId)).get()
      : null;
    if (activeLock?.status === 'active') {
      throw new Error('inventory lock must be released or scrapped before closing quality issue');
    }
    const ts = nowIso();
    await this.db
      .update(qualityIssues)
      .set({ status: 'closed', handlingMethod, updatedAt: ts }).where(eq(qualityIssues.id, issue.id));
    await this.db.insert(issueActions).values({
      id: newId('act'),
      issueId: issue.id,
      action: 'close',
      message: input.notes || `handling_method=${handlingMethod}`,
      actor: input.actor || actor,
      createdAt: ts,
    });
    return await this.getQualityIssue(issue.id);
  }

  async getQualityIssue(id: string) {
    const row = await this.db.select().from(qualityIssues).where(eq(qualityIssues.id, id)).get();
    return row ? mapQualityIssue(row) : null;
  }

  private async consumeQualityIssueLock(id: string, input: QualityIssueActionInput, actor: string, action: 'release' | 'scrap') {
    const issue = await this.db.select().from(qualityIssues).where(eq(qualityIssues.id, id)).get();
    if (!issue) throw new Error('quality issue not found');
    if (!issue.inventoryLockId) throw new Error('quality issue has no inventory lock');
    const lock = await this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, issue.inventoryLockId)).get();
    if (!lock) throw new Error('inventory lock not found');
    const remaining = lock.holdQuantity - lock.processedQuantity - lock.processedQuantity;
    const quantity = input.quantity ?? remaining;
    if (quantity <= 0) throw new Error('locked inventory has already been consumed');
    const handlingMethod = input.handling_method ?? issue.handlingMethod;
    if (action === 'scrap' && !handlingMethod) throw new Error('handling_method is required before scrapping inventory');

    const ledger = new InventoryLedgerService(this.d1);
    const ts = nowIso();
    
    if (action === 'release') {
      await this.db.update(inventoryHolds).set({
        processedQuantity: lock.processedQuantity + quantity,
        status: lock.holdQuantity <= lock.processedQuantity + lock.processedQuantity + quantity ? 'closed' : lock.status,
        updatedAt: ts,
        
      }).where(eq(inventoryHolds.id, lock.id));
      
      const holdResult: any = await ledger.changeStatus({});
      if (holdResult && holdResult.holdId) {
        const lockId = holdResult.holdId;
      }
    } else {
      await this.db.update(inventoryHolds).set({
        processedQuantity: lock.processedQuantity + quantity,
        status: lock.holdQuantity <= lock.processedQuantity + lock.processedQuantity + quantity ? 'closed' : lock.status,
        updatedAt: ts,
        
      }).where(eq(inventoryHolds.id, lock.id));

      const holdResult: any = await ledger.changeStatus({});
      if (holdResult && holdResult.holdId) {
        const lockId = holdResult.holdId;
      }
    }
    
    const transaction = null;

    const updatedLock = await this.db.select().from(inventoryHolds).where(eq(inventoryHolds.id, lock.id)).get();
    const nextStatus = updatedLock?.status === 'active' ? 'frozen' : action === 'release' ? 'resolved' : 'resolved';
    
    await this.db
      .update(qualityIssues)
      .set({
        status: nextStatus,
        handlingMethod,
        updatedAt: ts,
      })
      .where(eq(qualityIssues.id, issue.id));
    await this.db.insert(issueActions).values({
      id: newId('act'),
      issueId: issue.id,
      action: action === 'release' ? 'unfreeze' : 'scrap',
      message: input.notes || `${action} ${quantity}`,
      actor: input.actor || actor,
      createdAt: ts,
    });

    return { issue: await this.getQualityIssue(issue.id), transaction };
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
    return { items: rows.map(mapDeliveryPlan), total: total[0]?.value ?? 0 };
  }

  async createDeliveryPlan(input: DeliveryPlanCreateInput, actor = '') {
    const id = newId('dp');
    const code = await this.nextCode('delivery_plans', 'DLY');
    const risks = await Promise.all(input.items.map((item) => this.evaluateDeliveryRisk(item.product_id, item.quantity)));
    const riskLevel = risks.some((item) => item.level === 'high') ? 'high' : risks.some((item) => item.level === 'medium') ? 'medium' : 'low';
    const status = riskLevel === 'high' ? 'blocked' : 'ready';
    const ts = nowIso();
    await this.db.insert(deliveryPlans).values({
      id,
      code,
      orderId: input.order_id ?? null,
      plannedShipDate: input.planned_ship_date,
      status,
      riskLevel,
      riskReason: risks.map((item) => item.reason).filter(Boolean).join('; '),
      createdBy: actor,
      createdAt: ts,
      updatedAt: ts,
    });
    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      await this.db.insert(deliveryPlanItems).values({
        id: newId('dpi'),
        deliveryPlanId: id,
        orderItemId: item.order_item_id ?? null,
        productId: item.product_id,
        quantity: item.quantity,
        batchNo: item.batch_no,
        riskReason: risks[index].reason,
        createdAt: ts,
      });
    }
    if (input.order_id) await this.event(input.order_id, 'delivery_plan', id, 'delivery_planned', `${code} ${riskLevel}`, actor);
    return await this.getDeliveryPlan(id);
  }

  async getDeliveryPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(deliveryPlans)
      .where(or(eq(deliveryPlans.id, idOrCode), eq(deliveryPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const items = await this.db.select().from(deliveryPlanItems).where(eq(deliveryPlanItems.deliveryPlanId, plan.id));
    return { ...mapDeliveryPlan(plan), items: items.map(mapDeliveryPlanItem) };
  }

  async confirmShipment(deliveryPlanId: string, actor = '') {
    const plan = await this.getDeliveryPlan(deliveryPlanId);
    if (!plan) throw new Error('delivery plan not found');
    const id = newId('shp');
    const code = await this.nextCode('shipments', 'SHP');
    const ts = nowIso();
    await this.db.insert(shipments).values({
      id,
      code,
      deliveryPlanId: plan.id,
      orderId: plan.order_id,
      status: 'confirmed',
      shippedAt: ts,
      confirmedBy: actor,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
    });
    for (const item of plan.items) {
      await this.db.insert(shipmentItems).values({
        id: newId('shi'),
        shipmentId: id,
        orderItemId: item.order_item_id,
        productId: item.product_id,
        quantity: item.quantity,
        batchNo: item.batch_no,
        createdAt: ts,
      });
      const product = await this.db.select({ name: products.name }).from(products).where(eq(products.id, item.product_id)).get();
      const warehouseCode = product ? getWarehouseForProduct(product.name) : 'MAIN';
      await this.applyInventoryMovement({
        materialId: null,
        productId: item.product_id,
        batchNo: item.batch_no || (await this.findAvailableProductBatch(item.product_id, item.quantity)),
        warehouseCode: warehouseCode,
        qtyDelta: -item.quantity,
        movementType: 'ship',
        reason: `shipment ${code}`,
        actor,
      });
      if (item.order_item_id) await this.addDeliveredQuantity(item.order_item_id, item.quantity);
    }
    await this.db.update(deliveryPlans).set({ status: 'shipped', updatedAt: ts }).where(eq(deliveryPlans.id, plan.id));
    if (plan.order_id) {
      await this.refreshOrderStatusAfterShipment(plan.order_id);
      await this.event(plan.order_id, 'shipment', id, 'shipment_confirmed', code, actor);
    }
    return { shipment: await this.db.select().from(shipments).where(eq(shipments.id, id)).get(), delivery_plan: await this.getDeliveryPlan(plan.id) };
  }

  async getOrderTrace(orderId: string) {
    const order = await this.getOrder(orderId);
    if (!order) return null;
    const itemIds = order.items.map((item) => item.id);
    const planItems = itemIds.length
      ? await this.db.select().from(productionPlanItems).where(or(...itemIds.map((id) => eq(productionPlanItems.orderItemId, id))))
      : [];
    const directPlans = await this.db.select().from(productionPlans).where(eq(productionPlans.orderLineId, order.id));
    const planIds = unique([...planItems.map((item) => item.planId), ...directPlans.map((plan) => plan.id)]);
    const workOrderIds = unique(planItems.map((item) => item.workOrderId).filter(Boolean) as string[]);
    const deliveryPlansForOrder = await this.db.select().from(deliveryPlans).where(eq(deliveryPlans.orderId, order.id));
    const quality = await this.db.select().from(qualityIssues).where(eq(qualityIssues.orderId, order.id));
    const events = await this.db.select().from(supplyChainEvents).where(eq(supplyChainEvents.orderId, order.id)).orderBy(desc(supplyChainEvents.createdAt));

    const upstream = {
      order,
      demand_versions: await this.db.select().from(demandPlanVersions).where(eq(demandPlanVersions.orderId, order.id)),
      receipts: itemIds.length ? await this.db.select().from(materialReceipts).where(or(...itemIds.map((id) => eq(materialReceipts.orderItemId, id)))) : [],
      inventory_movements: [],
    };

    const traceWorkOrders = workOrderIds.length
      ? await this.db
          .select({
            id: workOrders.id,
            code: workOrders.code,
            product_id: workOrders.productId,
            product_code: products.code,
            product_name: products.name,
            planned_quantity: workOrders.plannedQuantity,
            completed_quantity: workOrders.completedQuantity,
            defect_quantity: workOrders.defectQuantity,
            scrap_quantity: workOrders.scrapQuantity,
            status: workOrders.status,
            planned_start_date: workOrders.plannedStartDate,
            planned_finish_date: workOrders.plannedFinishDate,
            created_at: workOrders.createdAt,
            updated_at: workOrders.updatedAt,
          })
          .from(workOrders)
          .leftJoin(products, eq(products.id, workOrders.productId))
          .where(or(...workOrderIds.map((id) => eq(workOrders.id, id))))
      : [];

    const downstream = {
      production_plans: planIds.length ? await this.db.select().from(productionPlans).where(or(...planIds.map((id) => eq(productionPlans.id, id)))) : directPlans,
      production_plan_items: planItems.map(mapPlanItem),
      work_orders: traceWorkOrders,
      delivery_plans: deliveryPlansForOrder.map(mapDeliveryPlan),
      quality_issues: quality.map(mapQualityIssue),
      events: events.map(mapEvent),
    };

    return { order, upstream, downstream };
  }

  private async currentOrderItems(orderId: string) {
    const order = await this.db.select().from(customerDemands).where(eq(customerDemands.id, orderId)).get();
    if (!order) return [];
    const items = await this.db
      .select()
      .from(demandLines)
      .where(eq(demandLines.demandId, orderId))
      .orderBy(demandLines.createdAt);
    const result = [];
    for (const item of items) {
      const receipts = await this.db.select().from(materialReceipts).where(eq(materialReceipts.orderItemId, item.id));
      const materialReceivedQuantity = receipts
        .filter((receipt) => receipt.status === 'received')
        .reduce((sum, receipt) => sum + receipt.quantity, 0);
      const materialRegisteredQuantity = receipts.reduce((sum, receipt) => sum + receipt.quantity, 0);
      result.push({
        ...mapDemandLine(item),
        material_received_quantity: materialReceivedQuantity,
        material_registered_quantity: materialRegisteredQuantity,
      });
    }
    return result;
  }

  private async ensureCustomer(code: string, name: string) {
    if (!code && !name) return null;

    if (name) {
      const existingByName = await this.db.select().from(parties).where(and(eq(parties.name, name), eq(parties.type, 'customer'))).get();
      if (existingByName) return existingByName.id;
    }

    if (code) {
      const existingByCode = await this.db.select().from(parties).where(and(eq(parties.code, code), eq(parties.type, 'customer'))).get();
      if (existingByCode) return existingByCode.id;
    }

    const customerCode = code || `CUST-${newId('c').slice(-6).toUpperCase()}`;
    const id = newId('cust');
    const ts = nowIso();
    await this.db.insert(parties).values({
      id,
      code: customerCode,
      name: name || customerCode,
      type: 'customer',
      contact: '',
      notes: '',
      status: 'active',
      created_at: ts,
      updated_at: ts,
    });
    return id;
  }

  private async resolveProduct(productId?: string, productCode?: string) {
    const query = this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        partyId: products.party_id,
        projectId: products.project_id,
        customerName: parties.name,
        projectName: projects.name,
        materialId: product_materials.material_id,
        projectCode: products.project_code,
        projectPartId: projectParts.id,
        customerId: projectParts.customerId,
        supplierId: projectParts.supplierId,
        supplierName: profileSuppliers.supplierName,
        manufacturingFactory: projectParts.manufacturingFactory,
        profileMaterialCode: projectParts.profileMaterialCode,
        profileMaterialName: projectParts.profileMaterialName,
        safetyStock: projectParts.safetyStock,
        warningStock: projectParts.warningStock,
      })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, products.project_id)))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .leftJoin(product_materials, and(eq(product_materials.product_id, products.id), eq(product_materials.status, 'active')));
      
    if (productId) return await query.where(eq(products.id, productId)).get();
    if (productCode) return await query.where(eq(products.code, productCode)).get();
    return null;
  }

  private async resolveProductWithRelations(productId: string) {
    return await this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        partyId: products.party_id,
        projectId: products.project_id,
        customerName: parties.name,
        projectName: projects.name,
        materialId: product_materials.material_id,
        projectCode: products.project_code,
        projectPartId: projectParts.id,
        customerId: projectParts.customerId,
        supplierId: projectParts.supplierId,
        supplierName: profileSuppliers.supplierName,
        manufacturingFactory: projectParts.manufacturingFactory,
        profileMaterialCode: projectParts.profileMaterialCode,
        profileMaterialName: projectParts.profileMaterialName,
        safetyStock: projectParts.safetyStock,
        warningStock: projectParts.warningStock,
      })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, products.project_id)))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .leftJoin(product_materials, and(eq(product_materials.product_id, products.id), eq(product_materials.status, 'active')))
      .where(eq(products.id, productId))
      .get();
  }

  private async applyInventoryMovement(args: {
    materialId: string | null;
    productId: string | null;
    batchNo: string;
    warehouseCode: string;
    qtyDelta: number;
    movementType: string;
    reason: string;
    actor: string;
  }) {
    if (!args.materialId && !args.productId) throw new Error('inventory target is required');
    const ledger = new InventoryLedgerService(this.d1);
    const itemId = args.materialId ?? args.productId ?? '';
    
    if (args.qtyDelta < 0) {
      return await ledger.createIssueTransaction({
        itemId,
        warehouseId: args.warehouseCode,
        quantity: Math.abs(args.qtyDelta),
        sourceId: 'mov',
        sourceNo: 'mov',
        sourceType: args.movementType,
        operatorName: args.actor,
        remark: args.reason,
      });
    } else {
      return await ledger.createAdjustmentTransaction({
        itemId: args.materialId ?? args.productId ?? '',
        warehouseId: args.warehouseCode,
        quantity: Math.abs(args.qtyDelta),
        qtyDelta: args.qtyDelta,
        sourceId: 'mov',
        sourceNo: 'mov',
        sourceType: args.movementType,
        operatorName: args.actor,
        remark: args.reason,
      });
    }
  }

  private async ensureInventoryBalance(materialId: string | null, productId: string | null, batchNo: string, warehouseCode: string) {
    // Legacy method, not needed with InventoryLedgerService
    return null;
  }

  private async evaluateDeliveryRisk(productId: string, quantity: number) {
    const rows = await this.db.select().from(inventoryBalances).where(eq(inventoryBalances.itemId, productId));
    const available = rows.filter(r => r.inventoryStatus === 'available').reduce((total, row) => total + row.quantity, 0);
    const frozen = rows.filter(r => r.inventoryStatus === 'frozen').reduce((total, row) => total + row.quantity, 0);
    if (available < quantity) return { level: 'high' as const, reason: `available ${available} < ship ${quantity}` };
    if (frozen > 0) return { level: 'medium' as const, reason: `frozen qty ${frozen}` };
    return { level: 'low' as const, reason: '' };
  }

  private async findAvailableProductBatch(productId: string, quantity: number) {
    return ''; // No longer used in rolling production
  }

  private async addDeliveredQuantity(orderItemId: string, quantity: number) {
    const item = await this.db.select().from(demandLines).where(eq(demandLines.id, orderItemId)).get();
    if (!item) return;
    const delivered = item.deliveredQuantity + quantity;
    await this.db
      .update(demandLines)
      .set({
        deliveredQuantity: delivered,
        unshippedQuantity: item.quantity - delivered,
        status: delivered >= item.quantity ? 'delivered' : 'partially_delivered',
        updatedAt: nowIso()
      })
      .where(eq(demandLines.id, orderItemId));
  }

  private async refreshOrderStatusAfterShipment(orderId: string) {
    const items = await this.db.select().from(demandLines).where(eq(demandLines.demandId, orderId));
    const status = items.every((item) => item.deliveredQuantity >= item.quantity) ? 'delivered' : 'partially_delivered';
    await this.db.update(customerDemands).set({ status, updatedAt: nowIso() }).where(eq(customerDemands.id, orderId));
  }

  private async setOrderItemStatus(orderItemId: string, status: string) {
    await this.db.update(demandLines).set({ status, updatedAt: nowIso() }).where(eq(demandLines.id, orderItemId));
  }

  private async orderIdForItem(orderItemId: string) {
    return (await this.db.select().from(demandLines).where(eq(demandLines.id, orderItemId)).get())?.demandId ?? null;
  }

  private async orderIdsForPlan(planId: string) {
    const rows = await this.db.select().from(productionPlanItems).where(eq(productionPlanItems.planId, planId));
    const ids = [];
    for (const row of rows) {
      if (!row.orderItemId) continue;
      const orderId = await this.orderIdForItem(row.orderItemId);
      if (orderId) ids.push(orderId);
    }
    return unique(ids);
  }

  private async nextCode(table: string, prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const countByTable: Record<string, Promise<Array<{ value: number }>>> = {
      customer_orders: this.db.select({ value: count() }).from(customerDemands).where(like(customerDemands.code, `${codePrefix}%`)),
      customer_demands: this.db.select({ value: count() }).from(customerDemands).where(like(customerDemands.code, `${codePrefix}%`)),
      material_receipts: this.db.select({ value: count() }).from(materialReceipts).where(like(materialReceipts.code, `${codePrefix}%`)),
      production_plans: this.db.select({ value: count() }).from(productionPlans).where(like(productionPlans.code, `${codePrefix}%`)),
      delivery_plans: this.db.select({ value: count() }).from(deliveryPlans).where(like(deliveryPlans.code, `${codePrefix}%`)),
      shipments: this.db.select({ value: count() }).from(shipments).where(like(shipments.code, `${codePrefix}%`)),
      quality_issues: this.db.select({ value: count() }).from(qualityIssues).where(like(qualityIssues.code, `${codePrefix}%`)),
    };
    const rows = await countByTable[table];
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }

  private async event(orderId: string | null, entityType: string, entityId: string, eventType: string, message: string, actor: string) {
    await this.db.insert(supplyChainEvents).values({
      id: newId('sce'),
      orderId,
      entityType,
      entityId,
      eventType,
      message,
      actor,
      createdAt: nowIso(),
    });
  }
}

function mapDemand(row: typeof customerDemands.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    customer_id: row.customerId,
    customer_name: row.customerName,
    demand_version: row.demandVersion,
    source_type: row.sourceType,
    source_file_name: row.sourceFileName,
    status: row.status,
    requested_date: row.requestedDate,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapDemandLine(row: typeof demandLines.$inferSelect) {
  return {
    id: row.id,
    demand_id: row.demandId,
    code: row.code,
    customer_id: row.customerId,
    customer_name: row.customerName,
    project_code: row.projectCode,
    product_id: row.productId,
    product_code: row.productCode,
    product_name: row.productName,
    source_type: row.sourceType,
    quantity: row.quantity,
    delivered_quantity: row.deliveredQuantity,
    unshipped_quantity: row.unshippedQuantity,
    status: row.status,
    due_date: row.dueDate,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapOrder(row: any) {
  return mapDemand(row);
}

function mapOrderItem(row: any) {
  return mapDemandLine(row);
}

function mapPlan(row: typeof productionPlans.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    plan_date: row.planDate,
    order_line_id: row.orderLineId,
    project_id: row.projectId,
    customer_id: row.customerId,
    product_id: row.productId,
    material_id: row.materialId,
    plan_qty: row.planQty,
    planned_quantity: row.plannedQuantity,
    due_date: row.dueDate,
    priority: row.priority,
    planned_start_at: row.plannedStartAt,
    planned_finish_at: row.plannedFinishAt,
    status: row.status,
    created_by: row.createdBy,
    released_at: row.releasedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapPlanItem(row: typeof productionPlanItems.$inferSelect) {
  return {
    id: row.id,
    plan_id: row.planId,
    order_item_id: row.orderItemId,
    product_id: row.productId,
    material_id: row.materialId,
    planned_quantity: row.plannedQuantity,
    machine_id: row.machineId,
    planned_start_date: row.plannedStartDate,
    planned_finish_date: row.plannedFinishDate,
    status: row.status,
    work_order_id: row.workOrderId,
    notes: row.notes,
  };
}

function mapInventoryBalance(row: {
  id: string;
  materialId: string | null;
  materialCode: string | null;
  productId: string | null;
  productCode: string | null;
  warehouseCode: string;
  batchNo: string;
  qtyAvailable: number;
  qtyFrozen: number;
  qtyScrap: number;
  unit: string;
  updatedAt: string;
}) {
  return {
    id: row.id,
    material_id: row.materialId,
    material_code: row.materialCode,
    product_id: row.productId,
    product_code: row.productCode,
    warehouse_code: row.warehouseCode,
    batch_no: row.batchNo,
    qty_available: row.qtyAvailable,
    qty_frozen: row.qtyFrozen,
    qty_scrap: row.qtyScrap,
    unit: row.unit,
    updated_at: row.updatedAt,
  };
}

function mapInventoryMovement(row: any) { return row; }

function mapQualityIssue(row: typeof qualityIssues.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    order_id: row.orderId,
    order_item_id: row.orderItemId,
    work_order_id: row.workOrderId,
    material_id: row.materialId,
    product_id: row.productId,
    source_type: row.sourceType,
    source_id: row.sourceId,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    quantity: row.quantity,
    freeze_id: row.freezeId,
    inventory_lock_id: row.inventoryLockId,
    handling_method: row.handlingMethod,
    warehouse_code: row.warehouseCode,
    location_code: row.locationCode,
    batch_no: row.batchNo,
    owner: row.owner,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    closed_at: row.closedAt,
  };
}

function mapDeliveryPlan(row: typeof deliveryPlans.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    order_id: row.orderId,
    planned_ship_date: row.plannedShipDate,
    status: row.status,
    risk_level: row.riskLevel,
    risk_reason: row.riskReason,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapDeliveryPlanItem(row: typeof deliveryPlanItems.$inferSelect) {
  return {
    id: row.id,
    delivery_plan_id: row.deliveryPlanId,
    order_item_id: row.orderItemId,
    product_id: row.productId,
    quantity: row.quantity,
    batch_no: row.batchNo,
    risk_reason: row.riskReason,
  };
}

function mapEvent(row: typeof supplyChainEvents.$inferSelect) {
  return {
    id: row.id,
    order_id: row.orderId,
    entity_type: row.entityType,
    entity_id: row.entityId,
    event_type: row.eventType,
    message: row.message,
    actor: row.actor,
    created_at: row.createdAt,
  };
}

function normalizeCode(input: string): string {
  const value = input.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return value || 'CUSTOMER';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

