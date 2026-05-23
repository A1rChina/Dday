import { OrderFlowService } from './order-flow.service';
import { MaterialDeliveryService } from './material-delivery.service';
import { ProductionExecutionService } from './production-execution.service';

export class SupplyChainService {
  private readonly orderFlow: OrderFlowService;
  private readonly materialDelivery: MaterialDeliveryService;
  private readonly production: ProductionExecutionService;

  constructor(database: D1Database) {
    this.orderFlow = new OrderFlowService(database);
    this.materialDelivery = new MaterialDeliveryService(database);
    this.production = new ProductionExecutionService(database);
  }

  getOverview(demandId?: string) {
    return demandId ? this.orderFlow.getOrderTrace(demandId) : this.orderFlow.listOrders({ current: 1, pageSize: 50, q: '' });
  }

  importOrder(input: any) {
    return this.orderFlow.importOrder(input, input.imported_by || '');
  }

  updateOrderStatus(id: string, input: any) {
    return this.orderFlow.updateOrder(id, { status: input.status, notes: input.notes }, input.actor || '');
  }

  receiveMaterial(input: any) {
    return this.materialDelivery.createReceipt({
      material_delivery_plan_id: input.material_delivery_plan_id || input.source_id,
      warehouse_code: input.warehouse_code || input.warehouse_id,
      location_code: input.location_code || input.location_id || '',
      batch_no: input.batch_no || '',
      quantity: input.quantity,
      received_at: input.received_at,
      received_by: input.received_by,
      status: 'received',
      notes: input.notes || '',
    });
  }

  createProductionPlan(input: any) {
    return this.production.createPlan(input, input.created_by || '');
  }

  releaseProductionPlan(id: string, actor = '') {
    return this.production.releasePlan(id, actor);
  }

  createDeliveryPlan(input: any) {
    return this.orderFlow.createDeliveryPlan(input, input.created_by || '');
  }

  confirmShipment(id: string, input: any) {
    return this.orderFlow.confirmShipment(id, input.confirmed_by || '');
  }

  createQualityIssue(input: any) {
    return this.orderFlow.createQualityIssue(input, input.owner || '');
  }

  addIssueAction(id: string, input: any) {
    return this.orderFlow.updateQualityIssue(id, input, input.actor || '');
  }
}
