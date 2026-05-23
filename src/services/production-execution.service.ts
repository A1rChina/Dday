import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import {
  demandLines,
  operationReports,
  productionDemandLinks,
  productionPlans,
  workOrders,
  workOrderSteps,
  workResources,
} from '../db/schema';
import type { productionExecutionListQuerySchema } from '../schemas/production-execution';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

type ListQuery = z.infer<typeof productionExecutionListQuerySchema>;

export class ProductionExecutionService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  async listPlans(query: ListQuery) {
    const where = query.q ? or(like(productionPlans.code, `%${query.q}%`), like(productionPlans.title, `%${query.q}%`)) : undefined;
    return this.list(productionPlans, where, productionPlans.createdAt, query);
  }

  async createPlan(input: any, actor = '') {
    const ts = nowIso();
    const id = newId('plan');
    await this.db.insert(productionPlans).values({
      id,
      code: input.code || (await this.nextPlanCode()),
      title: input.title || input.product_code || id,
      planDate: input.plan_date || ts.slice(0, 10),
      projectId: input.project_id || null,
      projectCode: input.project_code || '',
      customerId: input.customer_id || null,
      productId: input.product_id,
      productCode: input.product_code || '',
      materialId: input.material_id || null,
      materialCode: input.material_code || '',
      factoryId: input.factory_id || '',
      planType: input.plan_type || 'normal',
      planQty: input.planned_quantity ?? input.plan_qty ?? 0,
      plannedQuantity: input.planned_quantity ?? input.plan_qty ?? 0,
      dueDate: input.due_date || '',
      priority: input.priority || 'medium',
      plannedStartAt: input.planned_start_at || '',
      plannedFinishAt: input.planned_finish_at || '',
      materialReadyStatus: input.material_ready_status || 'unknown',
      riskLevel: input.risk_level || 'medium',
      status: input.status || 'draft',
      createdBy: actor,
      releasedAt: null,
      lockedAt: null,
      cancelledAt: null,
      createdAt: ts,
      updatedAt: ts,
    });
    for (const demandLineId of input.demand_line_ids || []) {
      await this.db.insert(productionDemandLinks).values({
        id: newId('pdl'),
        productionPlanId: id,
        demandLineId,
        quantity: input.planned_quantity ?? input.plan_qty ?? 0,
        createdAt: ts,
      });
      await this.db.update(demandLines).set({ status: 'planned', updatedAt: ts }).where(eq(demandLines.id, demandLineId));
    }
    return this.getPlan(id);
  }

  async getPlan(idOrCode: string) {
    const plan = await this.db
      .select()
      .from(productionPlans)
      .where(or(eq(productionPlans.id, idOrCode), eq(productionPlans.code, idOrCode)))
      .get();
    if (!plan) return null;
    const links = await this.db.select().from(productionDemandLinks).where(eq(productionDemandLinks.productionPlanId, plan.id));
    return { ...plan, demand_links: links };
  }

  async updatePlan(id: string, input: any) {
    await this.db.update(productionPlans).set({ ...input, updatedAt: nowIso() } as any).where(eq(productionPlans.id, id));
    return this.getPlan(id);
  }

  async releasePlan(id: string, actor = '') {
    const plan = await this.db.select().from(productionPlans).where(eq(productionPlans.id, id)).get();
    if (!plan) throw new Error('production plan not found');
    const ts = nowIso();
    await this.db.update(productionPlans).set({ status: 'released', releasedAt: ts, updatedAt: ts }).where(eq(productionPlans.id, id));
    const workOrderId = newId('wo');
    await this.db.insert(workOrders).values({
      id: workOrderId,
      code: `WO-${plan.code}`,
      productionPlanId: plan.id,
      productId: plan.productId,
      materialId: plan.materialId,
      factoryId: plan.factoryId,
      customerName: '',
      projectName: '',
      plannedQuantity: plan.plannedQuantity,
      reportedQuantity: 0,
      goodQuantity: 0,
      completedQuantity: 0,
      defectQuantity: 0,
      scrapQuantity: 0,
      processRouteSnapshot: '[]',
      status: 'created',
      plannedStartDate: plan.plannedStartAt,
      plannedFinishDate: plan.plannedFinishAt,
      currentStepId: null,
      notes: '',
      releasedAt: ts,
      startedAt: null,
      completedAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: ts,
      updatedAt: ts,
    });
    return { plan: await this.getPlan(id), work_order: await this.getWorkOrder(workOrderId), actor };
  }

  async listWorkOrders(query: ListQuery) {
    const where = query.q ? like(workOrders.code, `%${query.q}%`) : undefined;
    return this.list(workOrders, where, workOrders.createdAt, query);
  }

  async getWorkOrder(idOrCode: string) {
    const order = await this.db
      .select()
      .from(workOrders)
      .where(or(eq(workOrders.id, idOrCode), eq(workOrders.code, idOrCode)))
      .get();
    if (!order) return null;
    const steps = await this.db.select().from(workOrderSteps).where(eq(workOrderSteps.workOrderId, order.id));
    return { ...order, steps };
  }

  async updateWorkOrder(id: string, input: any) {
    await this.db.update(workOrders).set({ ...input, updatedAt: nowIso() } as any).where(eq(workOrders.id, id));
    return this.getWorkOrder(id);
  }

  async listWorkResources(query: ListQuery) {
    return this.list(workResources, undefined, workResources.createdAt, query);
  }

  async listReports(workOrderId?: string) {
    const where = workOrderId ? eq(operationReports.workOrderId, workOrderId) : undefined;
    return this.db.select().from(operationReports).where(where).orderBy(desc(operationReports.createdAt));
  }

  async createReport(input: any) {
    const ts = nowIso();
    const id = newId('opr');
    await this.db.insert(operationReports).values({
      id,
      reportNo: input.report_no || id,
      cardId: input.card_id || null,
      cardCode: input.card_code || '',
      workOrderId: input.work_order_id || input.workOrderId,
      operationId: input.operation_id || input.operationId,
      operationName: input.operation_name || '',
      reportType: input.report_type || 'manual',
      goodQty: input.good_qty ?? input.goodQty ?? input.report_qty ?? 0,
      defectQty: input.defect_qty ?? input.defectQty ?? 0,
      scrapQty: input.scrap_qty ?? input.scrapQty ?? 0,
      reworkQty: input.rework_qty ?? input.reworkQty ?? 0,
      operator: input.operator || input.operator_name || '',
      inspector: input.inspector || '',
      machineId: input.machine_id || input.machineId || null,
      defectReason: input.defect_reason || '',
      manualReason: input.manual_reason || '',
      remark: input.remark || input.notes || '',
      createdBy: input.created_by || '',
      createdAt: ts,
    });
    return this.db.select().from(operationReports).where(eq(operationReports.id, id)).get();
  }

  async syncProductionPlanStatus(productionPlanId: string) {
    return this.getPlan(productionPlanId);
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

  private async nextPlanCode() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `PLAN-${date}-`;
    const rows = await this.db.select({ value: count() }).from(productionPlans).where(like(productionPlans.code, `${prefix}%`));
    return `${prefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }
}
