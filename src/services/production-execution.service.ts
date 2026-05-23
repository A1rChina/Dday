import { and, count, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import {
  customerOrders,
  inventoryBalances,
  machines,
  materials,
  orderLines,
  parties,
  processes,
  product_materials,
  products,
  productionPlans,
  projects,
  workOrders,
  workResources,
  customerDemands,
  demandLines,
  productionDemandLinks,
  productionReports,
  operationReports,
} from '../db/schema';
import type {
  productionExecutionListQuerySchema,
  productionPlanCreateSchema,
  productionPlanUpdateSchema,
  workOrderUpdateForPlanSchema,
} from '../schemas/production-execution';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

type ListQuery = z.infer<typeof productionExecutionListQuerySchema>;
type PlanCreateInput = z.infer<typeof productionPlanCreateSchema>;
type PlanUpdateInput = z.infer<typeof productionPlanUpdateSchema>;
type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateForPlanSchema>;

export class ProductionExecutionService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  async listPlans(query: ListQuery) {
    const where = query.q
      ? or(
          like(productionPlans.code, `%${query.q}%`),
          like(productionPlans.title, `%${query.q}%`),
          like(products.code, `%${query.q}%`),
          like(products.name, `%${query.q}%`),
          like(productionPlans.projectCode, `%${query.q}%`),
          like(productionPlans.planPeriod, `%${query.q}%`)
        )
      : undefined;
    const total = await this.db.select({ value: count() }).from(productionPlans).leftJoin(products, eq(products.id, productionPlans.productId)).where(where);
    const rows = await this.db
      .select({
        id: productionPlans.id,
        code: productionPlans.code,
        title: productionPlans.title,
        planDate: productionPlans.planDate,
        orderLineId: productionPlans.orderLineId,
        orderLineCode: orderLines.code,
        sourceOrderCode: customerOrders.code,
        sourceCustomerName: customerOrders.customerName,
        sourceOrderQuantity: productionPlans.planQty,
        sourceDeliveryDate: productionPlans.dueDate,
        projectId: productionPlans.projectId,
        projectName: projects.name,
        customerId: productionPlans.customerId,
        customerName: parties.name,
        productId: productionPlans.productId,
        productCodeDb: products.code,
        productName: products.name,
        materialId: productionPlans.materialId,
        materialCodeDb: materials.code,
        materialName: materials.name,
        plannedQuantity: productionPlans.plannedQuantity,
        plannedStartAt: productionPlans.plannedStartAt,
        plannedFinishAt: productionPlans.plannedFinishAt,
        materialReadyStatus: productionPlans.materialReadyStatus,
        riskLevel: productionPlans.riskLevel,
        dueDate: productionPlans.dueDate,
        priority: productionPlans.priority,
        planQty: productionPlans.planQty,
        status: productionPlans.status,
        createdBy: productionPlans.createdBy,
        releasedAt: productionPlans.releasedAt,
        createdAt: productionPlans.createdAt,
        updatedAt: productionPlans.updatedAt,
        projectCode: productionPlans.projectCode,
        productCode: productionPlans.productCode,
        materialCode: productionPlans.materialCode,
        planPeriod: productionPlans.planPeriod,
      })
      .from(productionPlans)
      .leftJoin(orderLines, eq(orderLines.id, productionPlans.orderLineId))
      .leftJoin(customerOrders, eq(customerOrders.id, productionPlans.orderLineId))
      .leftJoin(projects, eq(projects.id, productionPlans.projectId))
      .leftJoin(parties, eq(parties.id, productionPlans.customerId))
      .leftJoin(products, eq(products.id, productionPlans.productId))
      .leftJoin(materials, eq(materials.id, productionPlans.materialId))
      .where(where)
      .orderBy(desc(productionPlans.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);

    const planIds = rows.map((r) => r.id);
    const linksMap = new Map<string, any[]>();
    if (planIds.length > 0) {
      const demandLinks = await this.db
        .select({
          productionPlanId: productionDemandLinks.productionPlanId,
          demandLineId: productionDemandLinks.demandLineId,
          demandLineCode: demandLines.code,
          customerName: demandLines.customerName,
          projectCode: demandLines.projectCode,
          quantity: productionDemandLinks.quantity,
        })
        .from(productionDemandLinks)
        .leftJoin(demandLines, eq(demandLines.id, productionDemandLinks.demandLineId))
        .where(inArray(productionDemandLinks.productionPlanId, planIds));

      for (const link of demandLinks) {
        const list = linksMap.get(link.productionPlanId) || [];
        list.push(link);
        linksMap.set(link.productionPlanId, list);
      }
    }

    const enrichedRows = rows.map((row) => {
      const links = linksMap.get(row.id) || [];
      const demandLineCodes = [...new Set(links.map((l) => l.demandLineCode).filter(Boolean))].join(', ');
      const customerNames = [...new Set(links.map((l) => l.customerName).filter(Boolean))].join(', ');
      const projectCodes = [...new Set(links.map((l) => l.projectCode).filter(Boolean))].join(', ');

      return {
        ...row,
        orderLineCode: demandLineCodes || row.orderLineCode,
        sourceOrderCode: demandLineCodes || row.sourceOrderCode || '',
        sourceCustomerName: customerNames || row.sourceCustomerName || '',
        sourceProjectName: projectCodes || row.projectName || '',
        projectCode: row.projectCode || projectCodes || '',
        productCode: row.productCode || row.productCodeDb,
        materialCode: row.materialCode || row.materialCodeDb,
        planPeriod: row.planPeriod || '',
      };
    });

    return { items: enrichedRows.map(mapPlanListItem), total: total[0]?.value ?? 0 };
  }

  async getPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(productionPlans)
      .where(or(eq(productionPlans.id, idOrCode), eq(productionPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const [product, material, orderLine, sourceOrder, project, customer, resources, generatedOrders] = await Promise.all([
      plan.productId ? this.db.select().from(products).where(eq(products.id, plan.productId)).get() : null,
      plan.materialId ? this.db.select().from(materials).where(eq(materials.id, plan.materialId)).get() : null,
      plan.orderLineId ? this.db.select().from(orderLines).where(eq(orderLines.id, plan.orderLineId)).get() : null,
      plan.orderLineId ? this.db.select().from(customerOrders).where(eq(customerOrders.id, plan.orderLineId)).get() : null,
      plan.projectId ? this.db.select().from(projects).where(eq(projects.id, plan.projectId)).get() : null,
      plan.customerId ? this.db.select().from(parties).where(eq(parties.id, plan.customerId)).get() : null,
      this.listResourcesForPlan(plan.id),
      this.db.select().from(workOrders).where(eq(workOrders.productionPlanId, plan.id)).orderBy(desc(workOrders.createdAt)),
    ]);

    const demandLinks = await this.db
      .select({
        demandLineId: productionDemandLinks.demandLineId,
        demandLineCode: demandLines.code,
        customerName: demandLines.customerName,
        projectCode: demandLines.projectCode,
        quantity: productionDemandLinks.quantity,
      })
      .from(productionDemandLinks)
      .leftJoin(demandLines, eq(demandLines.id, productionDemandLinks.demandLineId))
      .where(eq(productionDemandLinks.productionPlanId, plan.id));

    const demandLineIds = demandLinks.map((l) => l.demandLineId).filter(Boolean);
    const demandLineCodes = demandLinks.map((l) => l.demandLineCode).filter(Boolean).join(', ');
    const customerNames = [...new Set(demandLinks.map((l) => l.customerName).filter(Boolean))].join(', ');
    const projectCodes = [...new Set(demandLinks.map((l) => l.projectCode).filter(Boolean))].join(', ');

    return {
      ...mapPlan(plan),
      product_code: plan.productCode || product?.code || '',
      product_name: product?.name ?? '',
      material_code: plan.materialCode || material?.code || '',
      material_name: material?.name ?? '',
      order_line_code: demandLineCodes || sourceOrder?.code || orderLine?.code || '',
      source_order_code: demandLineCodes || sourceOrder?.code || orderLine?.code || '',
      source_customer_name: customerNames || sourceOrder?.customerName || customer?.name || '',
      source_project_name: projectCodes || project?.name || '',
      source_order_quantity: plan.planQty || plan.plannedQuantity,
      source_delivery_date: plan.dueDate || sourceOrder?.requestedDate || '',
      project_code: plan.projectCode || projectCodes || '',
      plan_period: plan.planPeriod || '',
      demand_line_ids: demandLineIds,
      resources,
      work_orders: generatedOrders.map(mapWorkOrder),
    };
  }

  async createPlan(input: PlanCreateInput, actor = '') {
    const product = await this.db.select().from(products).where(eq(products.id, input.product_id)).get();
    if (!product) throw new Error('product not found');
    const orderLine = input.order_line_id ? await this.db.select().from(orderLines).where(eq(orderLines.id, input.order_line_id)).get() : null;
    if (input.order_line_id && !orderLine) throw new Error('order line not found');
    const materialId = input.material_id ?? (await this.defaultMaterialId(input.product_id));
    const materialStatus = await this.evaluateMaterial(input.product_id, materialId, input.planned_quantity);
    const material = materialId ? await this.db.select().from(materials).where(eq(materials.id, materialId)).get() : null;

    let demandLinesInfo: any[] = [];
    if (input.demand_line_ids && input.demand_line_ids.length > 0) {
      demandLinesInfo = await this.db
        .select()
        .from(demandLines)
        .where(inArray(demandLines.id, input.demand_line_ids));
    }

    const resolvedProjectCode = input.project_code 
      || demandLinesInfo.find(d => d.projectCode)?.projectCode 
      || product.project_code 
      || null;

    const id = newId('pp');
    const ts = nowIso();
    const code = await this.nextCode('production_plans', 'PP');
    await this.db.insert(productionPlans).values({
      id,
      code,
      title: input.title || `${product.name} 生产计划`,
      planDate: input.planned_start_at.slice(0, 10),
      orderLineId: input.order_line_id || (input.demand_line_ids?.[0] ?? null),
      projectCode: resolvedProjectCode,
      productCode: input.product_code || product.code,
      materialCode: input.material_code || (material?.code ?? null),
      planPeriod: input.plan_period || input.planned_start_at.slice(0, 7),
      projectId: product.project_id ?? null,
      customerId: product.party_id ?? null,
      productId: input.product_id,
      materialId,
      planQty: input.planned_quantity,
      plannedQuantity: input.planned_quantity,
      dueDate: input.planned_finish_at.slice(0, 10),
      priority: 'medium',
      plannedStartAt: input.planned_start_at,
      plannedFinishAt: input.planned_finish_at,
      materialReadyStatus: materialStatus.materialReadyStatus,
      riskLevel: materialStatus.riskLevel,
      status: 'draft',
      createdBy: actor,
      releasedAt: null,
      createdAt: ts,
      updatedAt: ts,
    });

    if (input.demand_line_ids && input.demand_line_ids.length > 0) {
      for (const demandLineId of input.demand_line_ids) {
        const dLine = demandLinesInfo.find(d => d.id === demandLineId);
        await this.db.insert(productionDemandLinks).values({
          id: newId('pdl'),
          productionPlanId: id,
          demandLineId,
          quantity: dLine ? dLine.quantity : input.planned_quantity,
          createdAt: ts,
        });
      }
    }

    await this.createOrReplacePlanResource({
      productionPlanId: id,
      processId: input.process_id ?? null,
      machineId: input.machine_id ?? null,
      plannedStartAt: input.planned_start_at,
      plannedFinishAt: input.planned_finish_at,
      ts,
    });
    return await this.getPlan(id);
  }

  async updatePlan(id: string, input: PlanUpdateInput) {
    const current = await this.db.select().from(productionPlans).where(eq(productionPlans.id, id)).get();
    if (!current) return null;
    if (current.status === 'released' && (input.process_id || input.machine_id)) {
      throw new Error('released plan resources cannot be changed here');
    }
    const ts = nowIso();
    const updateData: Partial<typeof productionPlans.$inferInsert> = { updatedAt: ts };
    if (input.status) updateData.status = input.status;
    if (input.planned_start_at) {
      updateData.plannedStartAt = input.planned_start_at;
      updateData.planDate = input.planned_start_at.slice(0, 10);
    }
    if (input.planned_finish_at) updateData.plannedFinishAt = input.planned_finish_at;
    if (input.notes !== undefined) updateData.title = input.notes ? `${current.title}` : current.title;
    await this.db.update(productionPlans).set(updateData).where(eq(productionPlans.id, id));
    if (current.status === 'draft' && (input.process_id !== undefined || input.machine_id !== undefined || input.planned_start_at || input.planned_finish_at)) {
      await this.createOrReplacePlanResource({
        productionPlanId: id,
        processId: input.process_id ?? null,
        machineId: input.machine_id ?? null,
        plannedStartAt: input.planned_start_at ?? current.plannedStartAt,
        plannedFinishAt: input.planned_finish_at ?? current.plannedFinishAt,
        ts,
      });
    }
    return await this.getPlan(id);
  }

  async releasePlan(id: string, actor = '') {
    const plan = await this.getPlan(id);
    if (!plan) throw new Error('production plan not found');
    if (plan.status !== 'draft') throw new Error(`only draft plans can be released, current status: ${plan.status}`);
    if (!plan.product_id) throw new Error('plan product is required');

    const existing = await this.db.select().from(workOrders).where(eq(workOrders.productionPlanId, plan.id)).get();
    if (existing) throw new Error('work order already exists for this plan');

    const product = await this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        partyName: parties.name,
        projectName: projects.name,
      })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .where(eq(products.id, plan.product_id))
      .get();
    if (!product) throw new Error('product not found');

    const ts = nowIso();
    const workOrderId = newId('wo');
    const workOrderCode = await this.nextCode('work_orders', 'WO');
    await this.db.insert(workOrders).values({
      id: workOrderId,
      code: workOrderCode,
      productionPlanId: plan.id,
      orderLineId: plan.order_line_id || null,
      productId: plan.product_id,
      materialId: plan.material_id || null,
      customerName: product.partyName ?? '',
      projectName: product.projectName ?? '',
      plannedQuantity: plan.planned_quantity,
      completedQuantity: 0,
      defectQuantity: 0,
      scrapQuantity: 0,
      status: 'created',
      plannedStartDate: plan.planned_start_at,
      plannedFinishDate: plan.planned_finish_at,
      currentStepId: null,
      notes: `Generated from ${plan.code}`,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      closedAt: null,
    });
    await this.db.update(workResources).set({ workOrderId, status: 'allocated', updatedAt: ts }).where(eq(workResources.productionPlanId, plan.id));
    await this.db.update(productionPlans).set({ status: 'released', releasedAt: ts, updatedAt: ts }).where(eq(productionPlans.id, plan.id));
    if (plan.order_line_id) {
      await this.db.update(orderLines).set({ status: 'planned', updatedAt: ts }).where(eq(orderLines.id, plan.order_line_id));
      await this.db.update(customerOrders).set({ status: 'in_production', updatedAt: ts }).where(eq(customerOrders.id, plan.order_line_id));
    }

    const linkedDemands = await this.db
      .select()
      .from(productionDemandLinks)
      .where(eq(productionDemandLinks.productionPlanId, plan.id));
    if (linkedDemands.length > 0) {
      const demandLineIds = linkedDemands.map(l => l.demandLineId);
      await this.db
        .update(demandLines)
        .set({ status: 'in_production', updatedAt: ts })
        .where(inArray(demandLines.id, demandLineIds));
      
      const dLines = await this.db
        .select({ demandId: demandLines.demandId })
        .from(demandLines)
        .where(inArray(demandLines.id, demandLineIds));
      const demandIds = [...new Set(dLines.map(dl => dl.demandId))].filter(Boolean);
      if (demandIds.length > 0) {
        await this.db
          .update(customerDemands)
          .set({ status: 'in_production', updatedAt: ts })
          .where(inArray(customerDemands.id, demandIds));
      }
    }
    return { plan: await this.getPlan(plan.id), work_order: await this.getWorkOrder(workOrderId) };
  }

  async listWorkOrders(query: ListQuery) {
    const where = query.q
      ? or(like(workOrders.code, `%${query.q}%`), like(products.code, `%${query.q}%`), like(products.name, `%${query.q}%`), like(productionPlans.code, `%${query.q}%`))
      : undefined;
    const total = await this.db.select({ value: count() }).from(workOrders).leftJoin(products, eq(products.id, workOrders.productId)).leftJoin(productionPlans, eq(productionPlans.id, workOrders.productionPlanId)).where(where);
    const rows = await this.db
      .select({
        id: workOrders.id,
        code: workOrders.code,
        productionPlanId: workOrders.productionPlanId,
        productionPlanCode: productionPlans.code,
        orderLineId: workOrders.orderLineId,
        orderLineCode: orderLines.code,
        productId: workOrders.productId,
        productCode: products.code,
        productName: products.name,
        materialId: workOrders.materialId,
        materialCode: materials.code,
        materialName: materials.name,
        plannedQuantity: workOrders.plannedQuantity,
        completedQuantity: workOrders.completedQuantity,
        defectQuantity: workOrders.defectQuantity,
        scrapQuantity: workOrders.scrapQuantity,
        status: workOrders.status,
        plannedStartDate: workOrders.plannedStartDate,
        plannedFinishDate: workOrders.plannedFinishDate,
        notes: workOrders.notes,
        createdAt: workOrders.createdAt,
        updatedAt: workOrders.updatedAt,
      })
      .from(workOrders)
      .leftJoin(productionPlans, eq(productionPlans.id, workOrders.productionPlanId))
      .leftJoin(orderLines, eq(orderLines.id, workOrders.orderLineId))
      .leftJoin(products, eq(products.id, workOrders.productId))
      .leftJoin(materials, eq(materials.id, workOrders.materialId))
      .where(where)
      .orderBy(desc(workOrders.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapWorkOrderListItem), total: total[0]?.value ?? 0 };
  }

  async getWorkOrder(idOrCode: string) {
    const order = await this.db.select().from(workOrders).where(or(eq(workOrders.id, idOrCode), eq(workOrders.code, idOrCode))).get();
    if (!order) return null;
    const resources = await this.listResourcesForWorkOrder(order.id);
    return { ...mapWorkOrder(order), resources };
  }

  async updateWorkOrder(id: string, input: WorkOrderUpdateInput) {
    const current = await this.db.select().from(workOrders).where(eq(workOrders.id, id)).get();
    if (!current) return null;
    const status = input.status ?? current.status;
    const ts = nowIso();
    await this.db.update(workOrders).set({
      status,
      plannedStartDate: input.planned_start_date ?? current.plannedStartDate,
      plannedFinishDate: input.planned_finish_date ?? current.plannedFinishDate,
      notes: input.notes ?? current.notes,
      completedAt: status === 'completed' ? current.completedAt ?? ts : current.completedAt,
      closedAt: current.closedAt,
      updatedAt: ts,
    }).where(eq(workOrders.id, id));
    if (current.productionPlanId) {
      await this.syncPlanStatusFromWorkOrders(current.productionPlanId);
    }
    return await this.getWorkOrder(id);
  }

  async listWorkResources(query: ListQuery) {
    const where = query.q
      ? or(like(productionPlans.code, `%${query.q}%`), like(workOrders.code, `%${query.q}%`), like(processes.name, `%${query.q}%`), like(machines.name, `%${query.q}%`))
      : undefined;
    const total = await this.db.select({ value: count() }).from(workResources).leftJoin(productionPlans, eq(productionPlans.id, workResources.productionPlanId)).leftJoin(workOrders, eq(workOrders.id, workResources.workOrderId)).leftJoin(processes, eq(processes.id, workResources.processId)).leftJoin(machines, eq(machines.id, workResources.machineId)).where(where);
    const rows = await this.db
      .select({
        id: workResources.id,
        productionPlanId: workResources.productionPlanId,
        productionPlanCode: productionPlans.code,
        workOrderId: workResources.workOrderId,
        workOrderCode: workOrders.code,
        processId: workResources.processId,
        processName: processes.name,
        machineId: workResources.machineId,
        machineName: machines.name,
        plannedStartAt: workResources.plannedStartAt,
        plannedFinishAt: workResources.plannedFinishAt,
        status: workResources.status,
        notes: workResources.notes,
        createdAt: workResources.createdAt,
        updatedAt: workResources.updatedAt,
      })
      .from(workResources)
      .leftJoin(productionPlans, eq(productionPlans.id, workResources.productionPlanId))
      .leftJoin(workOrders, eq(workOrders.id, workResources.workOrderId))
      .leftJoin(processes, eq(processes.id, workResources.processId))
      .leftJoin(machines, eq(machines.id, workResources.machineId))
      .where(where)
      .orderBy(desc(workResources.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows.map(mapResource), total: total[0]?.value ?? 0 };
  }

  private async createOrReplacePlanResource(args: { productionPlanId: string; processId: string | null; machineId: string | null; plannedStartAt: string; plannedFinishAt: string; ts: string }) {
    await this.db.delete(workResources).where(and(eq(workResources.productionPlanId, args.productionPlanId), sql`${workResources.workOrderId} IS NULL`));
    await this.db.insert(workResources).values({
      id: newId('wr'),
      productionPlanId: args.productionPlanId,
      workOrderId: null,
      processId: args.processId,
      machineId: args.machineId,
      plannedStartAt: args.plannedStartAt,
      plannedFinishAt: args.plannedFinishAt,
      status: 'planned',
      notes: '',
      createdAt: args.ts,
      updatedAt: args.ts,
    });
  }

  private async listResourcesForPlan(planId: string) {
    const rows = await this.db
      .select({
        id: workResources.id,
        productionPlanId: workResources.productionPlanId,
        productionPlanCode: productionPlans.code,
        workOrderId: workResources.workOrderId,
        workOrderCode: workOrders.code,
        processId: workResources.processId,
        processName: processes.name,
        machineId: workResources.machineId,
        machineName: machines.name,
        plannedStartAt: workResources.plannedStartAt,
        plannedFinishAt: workResources.plannedFinishAt,
        status: workResources.status,
        notes: workResources.notes,
        createdAt: workResources.createdAt,
        updatedAt: workResources.updatedAt,
      })
      .from(workResources)
      .leftJoin(productionPlans, eq(productionPlans.id, workResources.productionPlanId))
      .leftJoin(workOrders, eq(workOrders.id, workResources.workOrderId))
      .leftJoin(processes, eq(processes.id, workResources.processId))
      .leftJoin(machines, eq(machines.id, workResources.machineId))
      .where(eq(workResources.productionPlanId, planId));
    return rows.map(mapResource);
  }

  private async listResourcesForWorkOrder(workOrderId: string) {
    const rows = await this.db.select().from(workResources).where(eq(workResources.workOrderId, workOrderId));
    return rows.map((item) => ({
      id: item.id,
      production_plan_id: item.productionPlanId,
      work_order_id: item.workOrderId,
      process_id: item.processId,
      machine_id: item.machineId,
      planned_start_at: item.plannedStartAt,
      planned_finish_at: item.plannedFinishAt,
      status: item.status,
      notes: item.notes,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));
  }

  private async evaluateMaterial(productId: string, materialId: string | null, quantity: number) {
    const resolvedMaterialId = materialId ?? (await this.defaultMaterialId(productId));
    if (!resolvedMaterialId) return { materialReadyStatus: 'unknown', riskLevel: 'medium' };
    const rows = await this.db.select().from(inventoryBalances).where(eq(inventoryBalances.itemId, resolvedMaterialId));
    const available = rows.filter(r => r.inventoryStatus === 'available').reduce((sum, row) => sum + row.quantity, 0);
    if (available >= quantity) return { materialReadyStatus: 'ready', riskLevel: 'low' };
    if (available > 0) return { materialReadyStatus: 'partial', riskLevel: 'medium' };
    return { materialReadyStatus: 'shortage', riskLevel: 'high' };
  }

  private async defaultMaterialId(productId: string) {
    return (await this.db.select().from(product_materials).where(and(eq(product_materials.product_id, productId), eq(product_materials.status, 'active'))).get())?.material_id ?? null;
  }

  private async syncPlanStatusFromWorkOrders(planId: string) {
    await this.syncProductionPlanStatus(planId);
  }

  async syncProductionPlanStatus(planId: string) {
    const plan = await this.db.select().from(productionPlans).where(eq(productionPlans.id, planId)).get();
    if (!plan || plan.status === 'draft' || plan.status === 'cancelled' || plan.status === 'abnormal_closed') {
      return;
    }

    const workOrdersList = await this.db
      .select()
      .from(workOrders)
      .where(eq(workOrders.productionPlanId, planId));

    if (workOrdersList.length === 0) {
      if (plan.status !== 'pending') {
        await this.db.update(productionPlans).set({ status: 'pending', updatedAt: nowIso() }).where(eq(productionPlans.id, planId));
      }
      return;
    }

    const woIds = workOrdersList.map(wo => wo.id);
    const reportsCountResult = await this.db
      .select({ value: count() })
      .from(productionReports)
      .where(inArray(productionReports.workOrderId, woIds));
    const reportsCount = reportsCountResult[0]?.value ?? 0;

    const opReportsCountResult = await this.db
      .select({ value: count() })
      .from(operationReports)
      .where(inArray(operationReports.productionOrderId, woIds));
    const opReportsCount = opReportsCountResult[0]?.value ?? 0;

    const hasReports = reportsCount > 0 || opReportsCount > 0 || workOrdersList.some(wo => (wo.reportedQuantity ?? 0) > 0 || (wo.completedQuantity ?? 0) > 0);
    const totalCompletedQty = workOrdersList.reduce((sum, wo) => sum + (wo.completedQuantity || 0), 0);
    const planQty = plan.planQty || plan.plannedQuantity || 0;

    let targetStatus: 'pending' | 'running' | 'completed' = 'pending';

    if (totalCompletedQty >= planQty && planQty > 0) {
      targetStatus = 'completed';
    } else if (hasReports) {
      targetStatus = 'running';
    } else {
      targetStatus = 'pending';
    }

    if (plan.status !== targetStatus) {
      await this.db.update(productionPlans).set({ status: targetStatus, updatedAt: nowIso() }).where(eq(productionPlans.id, planId));
    }
  }

  private async nextCode(table: 'production_plans' | 'work_orders', prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const rows = table === 'production_plans'
      ? await this.db.select({ value: count() }).from(productionPlans).where(like(productionPlans.code, `${codePrefix}%`))
      : await this.db.select({ value: count() }).from(workOrders).where(like(workOrders.code, `${codePrefix}%`));
    return `${codePrefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }
}

function mapPlan(row: typeof productionPlans.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    plan_date: row.planDate,
    order_line_id: row.orderLineId,
    project_code: row.projectCode,
    product_code: row.productCode,
    material_code: row.materialCode,
    plan_period: row.planPeriod,
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
    material_ready_status: row.materialReadyStatus,
    risk_level: row.riskLevel,
    status: row.status,
    created_by: row.createdBy,
    released_at: row.releasedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapPlanListItem(row: any) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    plan_date: row.planDate,
    order_line_id: row.orderLineId,
    order_line_code: row.orderLineCode || row.sourceOrderCode,
    source_order_code: row.sourceOrderCode || row.orderLineCode || '',
    source_customer_name: row.sourceCustomerName || row.customerName || '',
    source_project_name: row.sourceProjectName || row.projectName || '',
    project_id: row.projectId,
    customer_id: row.customerId,
    product_id: row.productId,
    product_code: row.productCode || row.productCodeDb,
    product_name: row.productName,
    material_id: row.materialId,
    material_code: row.materialCode || row.materialCodeDb,
    material_name: row.materialName,
    plan_qty: row.planQty,
    planned_quantity: row.plannedQuantity,
    due_date: row.dueDate,
    priority: row.priority,
    planned_start_at: row.plannedStartAt,
    planned_finish_at: row.plannedFinishAt,
    material_ready_status: row.materialReadyStatus,
    risk_level: row.riskLevel,
    status: row.status,
    created_by: row.createdBy,
    released_at: row.releasedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    project_code: row.projectCode || row.sourceProjectName || row.projectName || '',
    plan_period: row.planPeriod || '',
  };
}

function mapWorkOrder(row: typeof workOrders.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    production_plan_id: row.productionPlanId,
    order_line_id: row.orderLineId,
    product_id: row.productId,
    material_id: row.materialId,
    customer_name: row.customerName,
    project_name: row.projectName,
    planned_quantity: row.plannedQuantity,
    completed_quantity: row.completedQuantity,
    defect_quantity: row.defectQuantity,
    scrap_quantity: row.scrapQuantity,
    status: row.status,
    planned_start_date: row.plannedStartDate,
    planned_finish_date: row.plannedFinishDate,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapWorkOrderListItem(row: any) {
  return {
    id: row.id,
    code: row.code,
    production_plan_id: row.productionPlanId,
    production_plan_code: row.productionPlanCode,
    order_line_id: row.orderLineId,
    order_line_code: row.orderLineCode,
    product_id: row.productId,
    product_code: row.productCode,
    product_name: row.productName,
    material_id: row.materialId,
    material_code: row.materialCode,
    material_name: row.materialName,
    planned_quantity: row.plannedQuantity,
    completed_quantity: row.completedQuantity,
    defect_quantity: row.defectQuantity,
    scrap_quantity: row.scrapQuantity,
    status: row.status,
    planned_start_date: row.plannedStartDate,
    planned_finish_date: row.plannedFinishDate,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapResource(row: any) {
  return {
    id: row.id,
    production_plan_id: row.productionPlanId,
    production_plan_code: row.productionPlanCode,
    work_order_id: row.workOrderId,
    work_order_code: row.workOrderCode,
    process_id: row.processId,
    process_name: row.processName,
    machine_id: row.machineId,
    machine_name: row.machineName,
    planned_start_at: row.plannedStartAt,
    planned_finish_at: row.plannedFinishAt,
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
