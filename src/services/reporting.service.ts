import type { z } from 'zod';
import type {
  generateProcessCardsSchema,
  handleAbnormalSchema,
  operationReportSchema,
  reportingListQuerySchema,
  voidProcessCardSchema,
} from '../schemas/reporting';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { ProductionExecutionService } from './production-execution.service';

type ListQuery = z.infer<typeof reportingListQuerySchema>;
type GenerateCardsInput = z.infer<typeof generateProcessCardsSchema>;
type ReportInput = z.infer<typeof operationReportSchema>;
type HandleAbnormalInput = z.infer<typeof handleAbnormalSchema>;
type VoidCardInput = z.infer<typeof voidProcessCardSchema>;

type ProcessCardRow = {
  id: string;
  card_code: string;
  production_order_id: string;
  production_order_code?: string;
  product_id: string | null;
  product_name: string;
  product_code: string;
  drawing_no: string;
  unit: string;
  card_qty: number;
  current_operation_id: string | null;
  current_operation: string;
  status: string;
  printed_at: string | null;
  created_by: string;
  remarks: string;
  process_hint: string;
  special_remarks: string;
  created_at: string;
  updated_at: string;
  voided_at: string | null;
};

type RouteOperationRow = {
  id: string;
  card_id: string;
  operation_id: string | null;
  operation_code: string;
  operation_name: string;
  sequence: number;
  planned_qty: number;
  good_qty: number;
  defect_qty: number;
  scrap_qty: number;
  rework_qty: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WorkOrderProductRow = {
  id: string;
  code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  unit: string;
  process_route: string;
};

export class ReportingService {
  constructor(private readonly db: D1Database) {}

  async listCards(query: ListQuery) {
    const where: string[] = [];
    const args: unknown[] = [];
    if (query.q) {
      where.push('(pc.card_code LIKE ? OR wo.code LIKE ? OR pc.product_code LIKE ? OR pc.product_name LIKE ?)');
      args.push(like(query.q), like(query.q), like(query.q), like(query.q));
    }
    if (query.production_order_id) {
      where.push('(pc.production_order_id = ? OR wo.code LIKE ?)');
      args.push(query.production_order_id, like(query.production_order_id));
    }
    if (query.product) {
      where.push('(pc.product_code LIKE ? OR pc.product_name LIKE ?)');
      args.push(like(query.product), like(query.product));
    }
    if (query.operation) {
      where.push('pc.current_operation LIKE ?');
      args.push(like(query.operation));
    }
    if (query.status) {
      where.push('pc.status = ?');
      args.push(query.status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM process_cards pc LEFT JOIN work_orders wo ON wo.id = pc.production_order_id ${whereSql}`)
      .bind(...args)
      .first<{ count: number }>();
    const res = await this.db
      .prepare(
        `SELECT pc.*, wo.code AS production_order_code
         FROM process_cards pc
         LEFT JOIN work_orders wo ON wo.id = pc.production_order_id
         ${whereSql}
         ORDER BY pc.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...args, query.pageSize, (query.current - 1) * query.pageSize)
      .all<ProcessCardRow>();
    return { items: res.results ?? [], total: total?.count ?? 0 };
  }

  async generateCards(input: GenerateCardsInput) {
    const order = await this.findWorkOrderProduct(input.production_order_id);
    if (!order) throw new Error('production order not found');
    const route = await this.resolveRoute(order);
    if (!route.length) throw new Error('product route is empty, please configure route operations first');

    const created: ProcessCardRow[] = [];
    const ts = nowIso();
    for (const qty of input.quantities) {
      const cardId = newId('pc');
      const cardCode = await this.nextCardCode(order.product_code);
      const first = route[0];
      await this.db
        .prepare(
          `INSERT INTO process_cards
           (id, card_code, production_order_id, product_id, product_name, product_code, drawing_no, unit,
            card_qty, current_operation_id, current_operation, status, printed_at, created_by, remarks,
            process_hint, special_remarks, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'created', NULL, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          cardId,
          cardCode,
          order.id,
          order.product_id,
          order.product_name,
          order.product_code,
          input.drawing_no,
          order.unit,
          qty,
          first.operation_name,
          input.created_by,
          input.remarks,
          input.process_hint,
          input.special_remarks,
          ts,
          ts
        )
        .run();

      for (const operation of route) {
        const opId = newId('rop');
        await this.db
          .prepare(
            `INSERT INTO route_operations
             (id, card_id, operation_id, operation_code, operation_name, sequence, planned_qty,
              good_qty, defect_qty, scrap_qty, rework_qty, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'pending', ?, ?)`
          )
          .bind(opId, cardId, operation.operation_id, operation.operation_code, operation.operation_name, operation.sequence, qty, ts, ts)
          .run();
        if (operation.sequence === first.sequence) {
          await this.db.prepare('UPDATE process_cards SET current_operation_id = ? WHERE id = ?').bind(opId, cardId).run();
        }
      }
      await this.addWipTransaction({
        cardId,
        reportId: null,
        cardCode,
        operationId: null,
        operationName: first.operation_name,
        transactionType: 'move_next',
        qtyDelta: qty,
        qtyAfter: qty,
        fromOperation: '',
        toOperation: first.operation_name,
        createdBy: input.created_by,
        remark: '生成流转卡',
      });
      const card = await this.getCard(cardId);
      if (card) created.push(card.card);
    }
    return created;
  }

  async getCard(idOrCode: string) {
    const card = await this.findCard(idOrCode);
    if (!card) return null;
    const [operations, history, abnormalities] = await Promise.all([
      this.listRouteOperations(card.id),
      this.listReportsForCard(card.id),
      this.listAbnormalsForCard(card.id),
    ]);
    const current = operations.find((item) => item.id === card.current_operation_id) ?? operations.find((item) => item.status !== 'completed');
    const previous = current ? operations.filter((item) => item.sequence < current.sequence).at(-1) ?? null : null;
    const previousCompletedQty = previous ? previous.good_qty : card.card_qty;
    const currentReportedQty = current ? current.good_qty + current.defect_qty : 0;
    const currentAvailableQty = Math.max(0, previousCompletedQty - currentReportedQty);
    return {
      card,
      operations,
      current_operation: current ?? null,
      previous_completed_qty: previousCompletedQty,
      current_reported_qty: currentReportedQty,
      current_available_qty: currentAvailableQty,
      history,
      abnormalities,
      has_abnormal: abnormalities.some((item: any) => item.status !== 'closed'),
    };
  }

  async scanCard(code: string) {
    const normalized = normalizeCardCode(code);
    const detail = await this.getCard(normalized);
    if (!detail) throw new Error('flow card not found');
    return detail;
  }

  async submitReport(input: ReportInput, actor = '') {
    if (!input.card_id && !input.card_code) throw new Error('card_id or card_code is required');
    if (input.report_type === 'manual' && !input.manual_reason) throw new Error('manual reason is required');
    if (input.defect_qty > 0 && !input.defect_reason) throw new Error('defect reason is required when defect quantity is greater than 0');
    if (input.good_qty + input.defect_qty + input.scrap_qty + input.rework_qty <= 0) throw new Error('report quantity must be greater than 0');

    const detail = await this.getCard(input.card_id ?? input.card_code ?? '');
    if (!detail) throw new Error('flow card not found');
    const card = detail.card;
    if (card.status === 'void' || card.status === 'completed') throw new Error(`flow card status does not allow reporting: ${card.status}`);
    const operations = detail.operations;
    const operation = input.operation_id
      ? operations.find((item) => item.id === input.operation_id)
      : detail.current_operation;
    if (!operation) throw new Error('reportable operation not found');
    if (operation.status === 'completed') throw new Error('operation has already been completed');

    const firstOpen = operations.find((item) => item.status !== 'completed' && item.status !== 'skipped');
    if (firstOpen?.id !== operation.id) throw new Error('previous operation is not completed');

    const previous = operations.filter((item) => item.sequence < operation.sequence).at(-1) ?? null;
    const transferableQty = previous ? previous.good_qty : card.card_qty;
    if (previous && previous.status !== 'completed') throw new Error('previous operation is not completed');
    const nextGoodDefect = operation.good_qty + operation.defect_qty + input.good_qty + input.defect_qty;
    if (nextGoodDefect > transferableQty) {
      throw new Error(`good + defect quantity exceeds transferable quantity: remaining ${transferableQty - operation.good_qty - operation.defect_qty}`);
    }

    const ts = nowIso();
    const reportId = newId('opr');
    const reportNo = await this.nextCode('operation_reports', 'report_no', 'RG');
    await this.db
      .prepare(
        `INSERT INTO operation_reports
         (id, report_no, card_id, card_code, production_order_id, operation_id, operation_name, report_type,
          good_qty, defect_qty, scrap_qty, rework_qty, operator, inspector, equipment, defect_reason,
          manual_reason, remark, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        reportId,
        reportNo,
        card.id,
        card.card_code,
        card.production_order_id,
        operation.id,
        operation.operation_name,
        input.report_type,
        input.good_qty,
        input.defect_qty,
        input.scrap_qty,
        input.rework_qty,
        input.operator,
        input.inspector,
        input.equipment,
        input.defect_reason,
        input.manual_reason,
        input.remark,
        actor,
        ts
      )
      .run();

    const nextGood = operation.good_qty + input.good_qty;
    const nextDefect = operation.defect_qty + input.defect_qty;
    const nextScrap = operation.scrap_qty + input.scrap_qty;
    const nextRework = operation.rework_qty + input.rework_qty;
    const opCompleted = nextGood + nextDefect >= transferableQty;
    await this.db
      .prepare(
        `UPDATE route_operations
         SET good_qty = ?, defect_qty = ?, scrap_qty = ?, rework_qty = ?, status = ?,
             started_at = COALESCE(started_at, ?), completed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(nextGood, nextDefect, nextScrap, nextRework, opCompleted ? 'completed' : 'running', ts, opCompleted ? ts : null, ts, operation.id)
      .run();

    const abnormalRows = [
      { type: 'defect', qty: input.defect_qty },
      { type: 'scrap', qty: input.scrap_qty },
      { type: 'rework', qty: input.rework_qty },
    ].filter((item) => item.qty > 0);
    for (const abnormal of abnormalRows) {
      await this.createAbnormalRecord({
        card,
        reportId,
        operation,
        abnormalType: abnormal.type,
        quantity: abnormal.qty,
        reason: input.defect_reason || input.remark,
      });
    }

    await this.addReportTransactions({
      card,
      reportId,
      operation,
      input,
      createdBy: actor || input.operator,
    });
    await this.recalculateCardStatus(card.id);
    const wo = await this.db
      .prepare('SELECT production_plan_id FROM work_orders WHERE id = ?')
      .bind(card.production_order_id)
      .first<{ production_plan_id: string | null }>();
    if (wo && wo.production_plan_id) {
      try {
        const executionService = new ProductionExecutionService(this.db);
        await executionService.syncProductionPlanStatus(wo.production_plan_id);
      } catch (err) {
        console.error('Failed to sync production plan status in reporting:', err);
      }
    }
    const updated = await this.getCard(card.id);
    if (!updated) throw new Error('report submit failed');
    return updated;
  }

  async listReports(query: ListQuery) {
    const where: string[] = [];
    const args: unknown[] = [];
    if (query.q) {
      where.push('(r.report_no LIKE ? OR r.card_code LIKE ? OR wo.code LIKE ? OR pc.product_code LIKE ? OR pc.product_name LIKE ?)');
      args.push(like(query.q), like(query.q), like(query.q), like(query.q), like(query.q));
    }
    if (query.production_order_id) {
      where.push('(r.production_order_id = ? OR wo.code LIKE ?)');
      args.push(query.production_order_id, like(query.production_order_id));
    }
    if (query.product) {
      where.push('(pc.product_code LIKE ? OR pc.product_name LIKE ?)');
      args.push(like(query.product), like(query.product));
    }
    if (query.operation) {
      where.push('r.operation_name LIKE ?');
      args.push(like(query.operation));
    }
    if (query.operator) {
      where.push('r.operator LIKE ?');
      args.push(like(query.operator));
    }
    if (query.abnormal) {
      where.push('(r.defect_qty > 0 OR r.scrap_qty > 0 OR r.rework_qty > 0)');
    }
    if (query.date_from) {
      where.push('r.created_at >= ?');
      args.push(query.date_from);
    }
    if (query.date_to) {
      where.push('r.created_at <= ?');
      args.push(`${query.date_to}T23:59:59.999Z`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM operation_reports r LEFT JOIN process_cards pc ON pc.id = r.card_id LEFT JOIN work_orders wo ON wo.id = r.production_order_id ${whereSql}`)
      .bind(...args)
      .first<{ count: number }>();
    const res = await this.db
      .prepare(
        `SELECT r.*, wo.code AS production_order_code, pc.product_code, pc.product_name
         FROM operation_reports r
         LEFT JOIN process_cards pc ON pc.id = r.card_id
         LEFT JOIN work_orders wo ON wo.id = r.production_order_id
         ${whereSql}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...args, query.pageSize, (query.current - 1) * query.pageSize)
      .all();
    return { items: res.results ?? [], total: total?.count ?? 0 };
  }

  async listAbnormals(query: ListQuery) {
    const where: string[] = [];
    const args: unknown[] = [];
    if (query.q) {
      where.push('(a.abnormal_no LIKE ? OR a.card_code LIKE ? OR a.operation_name LIKE ? OR pc.product_code LIKE ? OR pc.product_name LIKE ?)');
      args.push(like(query.q), like(query.q), like(query.q), like(query.q), like(query.q));
    }
    if (query.status) {
      where.push('a.status = ?');
      args.push(query.status);
    }
    if (query.operation) {
      where.push('a.operation_name LIKE ?');
      args.push(like(query.operation));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM quality_abnormal_records a LEFT JOIN process_cards pc ON pc.id = a.card_id ${whereSql}`)
      .bind(...args)
      .first<{ count: number }>();
    const res = await this.db
      .prepare(
        `SELECT a.*, pc.product_code, pc.product_name
         FROM quality_abnormal_records a
         LEFT JOIN process_cards pc ON pc.id = a.card_id
         ${whereSql}
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...args, query.pageSize, (query.current - 1) * query.pageSize)
      .all();
    return { items: res.results ?? [], total: total?.count ?? 0 };
  }

  async listWipTransactions(query: ListQuery) {
    const where = query.q ? 'WHERE t.card_code LIKE ? OR t.operation_name LIKE ?' : '';
    const args = query.q ? [like(query.q), like(query.q)] : [];
    const total = await this.db.prepare(`SELECT COUNT(*) AS count FROM wip_transactions t ${where}`).bind(...args).first<{ count: number }>();
    const res = await this.db
      .prepare(
        `SELECT t.*
         FROM wip_transactions t
         ${where}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...args, query.pageSize, (query.current - 1) * query.pageSize)
      .all();
    return { items: res.results ?? [], total: total?.count ?? 0 };
  }

  async handleAbnormal(id: string, input: HandleAbnormalInput) {
    const abnormal = await this.db.prepare('SELECT * FROM quality_abnormal_records WHERE id = ?').bind(id).first<any>();
    if (!abnormal) throw new Error('abnormal record not found');
    const ts = nowIso();
    await this.db
      .prepare(
        `UPDATE quality_abnormal_records
         SET status = 'closed', handling_method = ?, handled_by = ?, handled_at = ?, remark = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.handling_method, input.handled_by, ts, input.remark, ts, id)
      .run();
    await this.recalculateCardStatus(abnormal.card_id);
    return await this.db.prepare('SELECT * FROM quality_abnormal_records WHERE id = ?').bind(id).first();
  }

  async voidCard(id: string, input: VoidCardInput) {
    const detail = await this.getCard(id);
    if (!detail) throw new Error('flow card not found');
    if (detail.card.status === 'completed') throw new Error('completed card cannot be voided');
    const ts = nowIso();
    await this.db
      .prepare(`UPDATE process_cards SET status = 'void', voided_at = ?, updated_at = ?, remarks = ? WHERE id = ?`)
      .bind(ts, ts, input.reason || detail.card.remarks, detail.card.id)
      .run();
    await this.addWipTransaction({
      cardId: detail.card.id,
      reportId: null,
      cardCode: detail.card.card_code,
      operationId: detail.current_operation?.id ?? null,
      operationName: detail.card.current_operation,
      transactionType: 'void',
      qtyDelta: 0,
      qtyAfter: detail.card.card_qty,
      fromOperation: detail.card.current_operation,
      toOperation: '',
      createdBy: input.actor,
      remark: input.reason,
    });
    return await this.getCard(detail.card.id);
  }

  async markPrinted(id: string) {
    const detail = await this.getCard(id);
    if (!detail) throw new Error('flow card not found');
    await this.db.prepare('UPDATE process_cards SET printed_at = ?, updated_at = ? WHERE id = ?').bind(nowIso(), nowIso(), detail.card.id).run();
    return await this.getCard(detail.card.id);
  }

  private async findWorkOrderProduct(id: string): Promise<WorkOrderProductRow | null> {
    return await this.db
      .prepare(
        `SELECT wo.id, wo.code, wo.product_id, p.code AS product_code, p.name AS product_name, p.unit, p.process_route
         FROM work_orders wo
         JOIN products p ON p.id = wo.product_id
         WHERE wo.id = ? OR wo.code = ?`
      )
      .bind(id, id)
      .first<WorkOrderProductRow>();
  }

  private async resolveRoute(order: WorkOrderProductRow) {
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(order.process_route || '[]');
      ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      ids = [];
    }
    if (!ids.length) {
      const resources = await this.db
        .prepare(
          `SELECT p.id, p.code, p.name
           FROM work_resources wr
           LEFT JOIN processes p ON p.id = wr.process_id
           WHERE wr.work_order_id = ?
           ORDER BY wr.planned_start_at ASC`
        )
        .bind(order.id)
        .all<any>();
      return (resources.results ?? []).map((item, index) => ({
        operation_id: item.id ?? null,
        operation_code: item.code ?? '',
        operation_name: item.name ?? `工序${index + 1}`,
        sequence: (index + 1) * 10,
      }));
    }
    const route = [];
    for (let index = 0; index < ids.length; index += 1) {
      const process = await this.db.prepare('SELECT id, code, name FROM processes WHERE id = ?').bind(ids[index]).first<any>();
      if (!process) continue;
      route.push({
        operation_id: process.id,
        operation_code: process.code,
        operation_name: process.name,
        sequence: (index + 1) * 10,
      });
    }
    return route;
  }

  private async findCard(idOrCode: string): Promise<ProcessCardRow | null> {
    return await this.db
      .prepare(
        `SELECT pc.*, wo.code AS production_order_code
         FROM process_cards pc
         LEFT JOIN work_orders wo ON wo.id = pc.production_order_id
         WHERE pc.id = ? OR pc.card_code = ?`
      )
      .bind(idOrCode, idOrCode)
      .first<ProcessCardRow>();
  }

  private async listRouteOperations(cardId: string): Promise<RouteOperationRow[]> {
    const res = await this.db.prepare('SELECT * FROM route_operations WHERE card_id = ? ORDER BY sequence ASC').bind(cardId).all<RouteOperationRow>();
    return res.results ?? [];
  }

  private async listReportsForCard(cardId: string) {
    const res = await this.db.prepare('SELECT * FROM operation_reports WHERE card_id = ? ORDER BY created_at DESC').bind(cardId).all();
    return res.results ?? [];
  }

  private async listAbnormalsForCard(cardId: string) {
    const res = await this.db.prepare('SELECT * FROM quality_abnormal_records WHERE card_id = ? ORDER BY created_at DESC').bind(cardId).all<any>();
    return res.results ?? [];
  }

  private async createAbnormalRecord(args: {
    card: ProcessCardRow;
    reportId: string;
    operation: RouteOperationRow;
    abnormalType: string;
    quantity: number;
    reason: string;
  }) {
    const ts = nowIso();
    await this.db
      .prepare(
        `INSERT INTO quality_abnormal_records
         (id, abnormal_no, card_id, report_id, card_code, operation_id, operation_name, abnormal_type,
          quantity, reason, status, handling_method, handled_by, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', '', '', '', ?, ?)`
      )
      .bind(
        newId('qab'),
        await this.nextCode('quality_abnormal_records', 'abnormal_no', 'QA'),
        args.card.id,
        args.reportId,
        args.card.card_code,
        args.operation.id,
        args.operation.operation_name,
        args.abnormalType,
        args.quantity,
        args.reason,
        ts,
        ts
      )
      .run();
  }

  private async addReportTransactions(args: {
    card: ProcessCardRow;
    reportId: string;
    operation: RouteOperationRow;
    input: ReportInput;
    createdBy: string;
  }) {
    const entries = [
      { type: 'report_good', qty: args.input.good_qty, after: args.operation.good_qty + args.input.good_qty },
      { type: 'report_defect', qty: args.input.defect_qty, after: args.operation.defect_qty + args.input.defect_qty },
      { type: 'report_scrap', qty: args.input.scrap_qty, after: args.operation.scrap_qty + args.input.scrap_qty },
      { type: 'report_rework', qty: args.input.rework_qty, after: args.operation.rework_qty + args.input.rework_qty },
    ].filter((item) => item.qty > 0);
    for (const entry of entries) {
      await this.addWipTransaction({
        cardId: args.card.id,
        reportId: args.reportId,
        cardCode: args.card.card_code,
        operationId: args.operation.id,
        operationName: args.operation.operation_name,
        transactionType: entry.type,
        qtyDelta: entry.qty,
        qtyAfter: entry.after,
        fromOperation: args.operation.operation_name,
        toOperation: args.operation.operation_name,
        createdBy: args.createdBy,
        remark: args.input.remark,
      });
    }
  }

  private async addWipTransaction(args: {
    cardId: string;
    reportId: string | null;
    cardCode: string;
    operationId: string | null;
    operationName: string;
    transactionType: string;
    qtyDelta: number;
    qtyAfter: number;
    fromOperation: string;
    toOperation: string;
    createdBy: string;
    remark: string;
  }) {
    await this.db
      .prepare(
        `INSERT INTO wip_transactions
         (id, card_id, report_id, card_code, operation_id, operation_name, transaction_type,
          qty_delta, qty_after, from_operation, to_operation, created_by, remark, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        newId('wip'),
        args.cardId,
        args.reportId,
        args.cardCode,
        args.operationId,
        args.operationName,
        args.transactionType,
        args.qtyDelta,
        args.qtyAfter,
        args.fromOperation,
        args.toOperation,
        args.createdBy,
        args.remark,
        nowIso()
      )
      .run();
  }

  private async recalculateCardStatus(cardId: string) {
    const card = await this.findCard(cardId);
    if (!card || card.status === 'void') return;
    const operations = await this.listRouteOperations(card.id);
    const firstOpen = operations.find((item) => item.status !== 'completed' && item.status !== 'skipped') ?? null;
    const openAbnormal = await this.db
      .prepare("SELECT COUNT(*) AS count FROM quality_abnormal_records WHERE card_id = ? AND status <> 'closed'")
      .bind(card.id)
      .first<{ count: number }>();
    const nextStatus = firstOpen ? ((openAbnormal?.count ?? 0) > 0 ? 'abnormal' : 'running') : 'completed';
    await this.db
      .prepare('UPDATE process_cards SET current_operation_id = ?, current_operation = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(firstOpen?.id ?? operations.at(-1)?.id ?? null, firstOpen?.operation_name ?? operations.at(-1)?.operation_name ?? '', nextStatus, nowIso(), card.id)
      .run();
    if (!firstOpen) {
      await this.addWipTransaction({
        cardId: card.id,
        reportId: null,
        cardCode: card.card_code,
        operationId: operations.at(-1)?.id ?? null,
        operationName: operations.at(-1)?.operation_name ?? '',
        transactionType: 'complete',
        qtyDelta: 0,
        qtyAfter: card.card_qty,
        fromOperation: operations.at(-1)?.operation_name ?? '',
        toOperation: '',
        createdBy: '',
        remark: '末道工序完成',
      });
    } else if (card.current_operation_id !== firstOpen.id) {
      await this.addWipTransaction({
        cardId: card.id,
        reportId: null,
        cardCode: card.card_code,
        operationId: firstOpen.id,
        operationName: firstOpen.operation_name,
        transactionType: 'move_next',
        qtyDelta: firstOpen.planned_qty,
        qtyAfter: firstOpen.planned_qty,
        fromOperation: card.current_operation,
        toOperation: firstOpen.operation_name,
        createdBy: '',
        remark: '工序流转',
      });
    }
  }

  private async nextCardCode(productCode: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = productCode.replace(/[^A-Za-z0-9]/g, '').slice(-6) || 'CARD';
    const prefix = `R${date}-${suffix}-`;
    const row = await this.db.prepare('SELECT COUNT(*) AS count FROM process_cards WHERE card_code LIKE ?').bind(`${prefix}%`).first<{ count: number }>();
    return `${prefix}${String((row?.count ?? 0) + 1).padStart(4, '0')}`;
  }

  private async nextCode(table: 'operation_reports' | 'quality_abnormal_records', column: string, prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const codePrefix = `${prefix}-${date}-`;
    const row = await this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${column} LIKE ?`).bind(`${codePrefix}%`).first<{ count: number }>();
    return `${codePrefix}${String((row?.count ?? 0) + 1).padStart(4, '0')}`;
  }
}

function like(value: string) {
  return `%${value}%`;
}

function normalizeCardCode(value: string) {
  const text = value.trim();
  if (text.startsWith('CARD:')) return text.slice(5).trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.card_code === 'string') return parsed.card_code.trim();
      if (typeof parsed?.code === 'string') return parsed.code.trim();
    } catch {
      return text;
    }
  }
  return text;
}
