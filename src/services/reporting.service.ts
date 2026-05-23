import { desc, eq, like, or, count } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import { operationReports, processCards, qualityIssues, wipTransactions, workOrders, workOrderSteps } from '../db/schema';
import type { reportingListQuerySchema } from '../schemas/reporting';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { ProductionExecutionService } from './production-execution.service';

type ListQuery = z.infer<typeof reportingListQuerySchema>;

export class ReportingService {
  private readonly db: AppDb;
  private readonly production: ProductionExecutionService;

  constructor(database: D1Database) {
    this.db = createDb(database);
    this.production = new ProductionExecutionService(database);
  }

  async listCards(query: ListQuery) {
    const where = query.q ? like(processCards.cardCode, `%${query.q}%`) : undefined;
    return this.list(processCards, where, processCards.createdAt, query);
  }

  async generateCards(input: any) {
    const workOrderId = input.work_order_id;
    const workOrder = await this.db.select().from(workOrders).where(eq(workOrders.id, workOrderId)).get();
    if (!workOrder) throw new Error('work order not found');
    const ts = nowIso();
    const id = newId('pc');
    await this.db.insert(processCards).values({
      id,
      cardCode: input.card_code || id,
      workOrderId,
      productId: workOrder.productId,
      productName: input.product_name || '',
      productCode: input.product_code || '',
      drawingNo: input.drawing_no || '',
      unit: input.unit || 'pcs',
      cardQty: input.card_qty || workOrder.plannedQuantity,
      currentOperationId: null,
      currentOperation: '',
      status: 'created',
      printedAt: null,
      createdBy: input.created_by || '',
      remarks: input.remarks || '',
      processHint: input.process_hint || '',
      specialRemarks: input.special_remarks || '',
      createdAt: ts,
      updatedAt: ts,
      voidedAt: null,
    });
    return this.getCard(id);
  }

  async getCard(idOrCode: string) {
    return this.db.select().from(processCards).where(or(eq(processCards.id, idOrCode), eq(processCards.cardCode, idOrCode))).get();
  }

  async markPrinted(id: string) {
    await this.db.update(processCards).set({ printedAt: nowIso(), updatedAt: nowIso() }).where(eq(processCards.id, id));
    return this.getCard(id);
  }

  async voidCard(id: string, input: any) {
    await this.db.update(processCards).set({ status: 'voided', voidedAt: nowIso(), remarks: input.reason || '', updatedAt: nowIso() }).where(eq(processCards.id, id));
    return this.getCard(id);
  }

  async scanCard(code: string) {
    return this.getCard(code);
  }

  async listReports(query: ListQuery) {
    const where = query.q ? like(operationReports.reportNo, `%${query.q}%`) : undefined;
    return this.list(operationReports, where, operationReports.createdAt, query);
  }

  async submitReport(input: any, actor = '') {
    const report = await this.production.createReport({
      ...input,
      work_order_id: input.work_order_id,
      machine_id: input.machine_id,
      created_by: actor,
    });
    return report;
  }

  async listAbnormals(query: ListQuery) {
    const where = query.q ? or(like(qualityIssues.code, `%${query.q}%`), like(qualityIssues.title, `%${query.q}%`)) : undefined;
    return this.list(qualityIssues, where, qualityIssues.createdAt, query);
  }

  async handleAbnormal(id: string, input: any) {
    await this.db.update(qualityIssues).set({ handlingMethod: input.handling_method || input.action || '', updatedAt: nowIso() }).where(eq(qualityIssues.id, id));
    return this.db.select().from(qualityIssues).where(eq(qualityIssues.id, id)).get();
  }

  async listWipTransactions(query: ListQuery) {
    return this.list(wipTransactions, undefined, wipTransactions.createdAt, query);
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
}
