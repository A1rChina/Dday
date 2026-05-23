import { and, count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { InventoryLedgerService } from './inventory-ledger.service';
import { createDb, type AppDb } from '../db/client';
import {
  inventoryBalances,

  manufacturingFactories,
  operationLogs,
  processes,
  products,
  productionReports,
  workOrders,
  workOrderSteps,
  customers,
  parties,
  parts,
  projects,
  profileSuppliers,
  projectParts,
  product_materials
} from '../db/schema';
import type {
  listQuerySchema,
  pdaReportSchema,
  productCreateSchema as productCreateInputSchema,
  productUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  workOrderCreateSchema,
  workOrderUpdateSchema,
  customerCreateSchema as customerCreateInputSchema,
  customerUpdateSchema,
} from '../schemas/resource';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';
import { MesService } from './mes.service';
import { getWarehouseForProduct } from '../utils/warehouse';

type ListQuery = z.infer<typeof listQuerySchema>;
type ProductCreateInput = z.infer<typeof productCreateInputSchema>;
type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>;
type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>;
type PdaReportInput = z.infer<typeof pdaReportSchema>;
type CustomerCreateInput = z.infer<typeof customerCreateInputSchema>;
type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export class ResourceApiService {
  private db: AppDb;
  constructor(private d1: D1Database) {
    this.db = createDb(d1);
  }

  async listWorkOrders(query: ListQuery) {
    const where = query.q
      ? or(
          like(workOrders.code, `%${query.q}%`),
          like(products.code, `%${query.q}%`),
          like(products.name, `%${query.q}%`),
          like(workOrders.projectName, `%${query.q}%`),
          like(workOrders.customerName, `%${query.q}%`)
        )
      : undefined;
    const totalRow = await this.db
      .select({ value: count() })
      .from(workOrders)
      .leftJoin(products, eq(products.id, workOrders.productId))
      .where(where);
    const items = await this.db
      .select({
        id: workOrders.id,
        code: workOrders.code,
        productId: workOrders.productId,
        productCode: products.code,
        productName: products.name,
        plannedQuantity: workOrders.plannedQuantity,
        reportedQuantity: workOrders.reportedQuantity,
        goodQuantity: workOrders.goodQuantity,
        completedQuantity: workOrders.completedQuantity,
        defectQuantity: workOrders.defectQuantity,
        scrapQuantity: workOrders.scrapQuantity,
        status: workOrders.status,
        plannedStartDate: workOrders.plannedStartDate,
        plannedFinishDate: workOrders.plannedFinishDate,
        createdAt: workOrders.createdAt,
        updatedAt: workOrders.updatedAt,
      })
      .from(workOrders)
      .leftJoin(products, eq(products.id, workOrders.productId))
      .where(where)
      .orderBy(desc(workOrders.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: items.map(mapWorkOrderListItem), total: totalRow[0]?.value ?? 0 };
  }

  async listProducts(query: ListQuery) {
    const conditions = [];
    if (query.q) {
      conditions.push(
        or(
          like(products.code, `%${query.q}%`),
          like(products.name, `%${query.q}%`),
          like(products.project_code, `%${query.q}%`),
          like(projectParts.profileMaterialCode, `%${query.q}%`),
          like(profileSuppliers.supplierName, `%${query.q}%`)
        )
      );
    }
    if (query.customer_name) {
      conditions.push(or(like(customers.customerName, `%${query.customer_name}%`), like(parties.name, `%${query.customer_name}%`)));
    }
    if (query.project_name) {
      conditions.push(
        or(
          like(projects.name, `%${query.project_name}%`),
          like(products.project_code, `%${query.project_name}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = await this.db
      .select({ value: count() })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, products.project_id)))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(where);

    const items = await this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        notes: products.notes,
        status: products.status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        project_id: products.project_id,
        party_id: products.party_id,
        project_code: products.project_code,
        project_part_id: projectParts.id,
        part_id: projectParts.partId,
        customer_id: projectParts.customerId,
        supplier_id: projectParts.supplierId,
        supplier_name: profileSuppliers.supplierName,
        factory: projectParts.manufacturingFactory,
        fallback_factory: products.factory,
        profile_code: projectParts.profileMaterialCode,
        fallback_profile_code: products.profile_code,
        profile_material_name: projectParts.profileMaterialName,
        unit_usage: projectParts.unitUsage,
        safety_stock: projectParts.safetyStock,
        warning_stock: projectParts.warningStock,
        process_route: products.process_route,
        customer_name: customers.customerName,
        fallback_customer_name: parties.name,
        project_name: projects.name,
      })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, products.project_id)))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(where)
      .orderBy(desc(products.created_at))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);

    return {
      items: items.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        notes: p.notes,
        is_active: p.status === 'active' ? 1 : 0,
        created_at: p.created_at,
        updated_at: p.updated_at,
        project_id: p.project_id,
        party_id: p.party_id,
        project_code: p.project_code,
        project_part_id: p.project_part_id,
        part_id: p.part_id ?? p.id,
        customer_id: p.customer_id ?? p.party_id,
        supplier_id: p.supplier_id ?? '',
        supplier_name: p.supplier_name ?? '',
        factory: p.factory || p.fallback_factory,
        manufacturing_factory: p.factory || p.fallback_factory,
        profile_code: p.profile_code || p.fallback_profile_code,
        profile_material_code: p.profile_code || p.fallback_profile_code,
        profile_material_name: p.profile_material_name ?? '',
        unit_usage: p.unit_usage ?? 1,
        safety_stock: p.safety_stock ?? 0,
        warning_stock: p.warning_stock ?? 0,
        process_ids: parseProcessRoute(p.process_route),
        customer_name: p.customer_name ?? p.fallback_customer_name ?? '',
        project_name: p.project_name ?? '',
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async getProduct(id: string) {
    const p = await this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        notes: products.notes,
        status: products.status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        project_id: products.project_id,
        party_id: products.party_id,
        project_code: products.project_code,
        project_part_id: projectParts.id,
        part_id: projectParts.partId,
        customer_id: projectParts.customerId,
        supplier_id: projectParts.supplierId,
        supplier_name: profileSuppliers.supplierName,
        factory: projectParts.manufacturingFactory,
        fallback_factory: products.factory,
        profile_code: projectParts.profileMaterialCode,
        fallback_profile_code: products.profile_code,
        profile_material_name: projectParts.profileMaterialName,
        unit_usage: projectParts.unitUsage,
        safety_stock: projectParts.safetyStock,
        warning_stock: projectParts.warningStock,
        process_route: products.process_route,
        customer_name: customers.customerName,
        fallback_customer_name: parties.name,
        project_name: projects.name,
      })
      .from(products)
      .leftJoin(parties, eq(parties.id, products.party_id))
      .leftJoin(projects, eq(projects.id, products.project_id))
      .leftJoin(projectParts, and(eq(projectParts.partId, products.id), eq(projectParts.projectId, products.project_id)))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(eq(products.id, id))
      .get();

    if (!p) return null;

    const pm = await this.db
      .select({ material_id: product_materials.material_id })
      .from(product_materials)
      .where(and(eq(product_materials.product_id, p.id), eq(product_materials.status, 'active')))
      .get();

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit,
      notes: p.notes,
      is_active: p.status === 'active' ? 1 : 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
      project_id: p.project_id,
      party_id: p.party_id,
      project_code: p.project_code,
      project_part_id: p.project_part_id,
      part_id: p.part_id ?? p.id,
      customer_id: p.customer_id ?? p.party_id,
      supplier_id: p.supplier_id ?? '',
      supplier_name: p.supplier_name ?? '',
      factory: p.factory || p.fallback_factory,
      manufacturing_factory: p.factory || p.fallback_factory,
      profile_code: p.profile_code || p.fallback_profile_code,
      profile_material_code: p.profile_code || p.fallback_profile_code,
      profile_material_name: p.profile_material_name ?? '',
      unit_usage: p.unit_usage ?? 1,
      safety_stock: p.safety_stock ?? 0,
      warning_stock: p.warning_stock ?? 0,
      process_ids: parseProcessRoute(p.process_route),
      customer_name: p.customer_name ?? p.fallback_customer_name ?? '',
      project_name: p.project_name ?? '',
      material_id: pm?.material_id ?? null,
    };
  }

  async createProduct(input: ProductCreateInput) {
    const existing = await this.db.select().from(products).where(eq(products.code, input.code)).get();
    if (existing) {
      throw new Error('产品编码已存在，请使用其他编码');
    }

    const id = newId('prod');
    const ts = nowIso();
    const profile_code = input.profile_code?.trim() || `${input.code}-YL`;

    let party_id: string | null = null;
    if (input.customer_name) {
      const p = await this.db
        .select()
        .from(parties)
        .where(and(eq(parties.name, input.customer_name), eq(parties.type, 'customer')))
        .get();
      if (p) {
        party_id = p.id;
      } else {
        party_id = newId('cust');
        await this.db.insert(parties).values({
          id: party_id,
          code: 'CUST-' + newId('c').toUpperCase(),
          name: input.customer_name,
          type: 'customer',
          status: 'active',
          created_at: ts,
          updated_at: ts,
        });
      }
    }
    const customer_id = await this.ensureCustomerMaster({
      customerId: input.customer_id ?? party_id ?? undefined,
      customerName: input.customer_name,
      fallbackId: party_id ?? undefined,
      ts,
    });

    let project_id: string | null = null;
    let project_code = input.project_code || null;
    if (input.project_id) {
      const proj = await this.db.select().from(projects).where(eq(projects.id, input.project_id)).get();
      if (!proj) throw new Error('project not found');
      project_id = proj.id;
      project_code = proj.code;
    }
    const targetProjectName = input.project_name || project_code || '';
    if (!project_id && targetProjectName) {
      const proj = await this.db
        .select()
        .from(projects)
        .where(or(eq(projects.name, targetProjectName), eq(projects.code, targetProjectName)))
        .get();
      if (proj) {
        project_id = proj.id;
        project_code = proj.code;
      } else {
        project_id = newId('proj');
        const projCode = input.project_code || `PROJ-${newId('p').toUpperCase()}`;
        await this.db.insert(projects).values({
          id: project_id,
          code: projCode,
          name: targetProjectName,
            party_id: customer_id ?? party_id,
          status: 'active',
          created_at: ts,
          updated_at: ts,
        });
      }
    }

    await this.db.insert(products).values({
      id,
      code: input.code,
      name: input.name,
      unit: input.unit || 'PCS',
      process_route: JSON.stringify(input.process_ids || []),
      notes: input.notes || '',
      status: 'active',
      created_at: ts,
      updated_at: ts,
      project_id,
      party_id,
      project_code,
      factory: input.manufacturing_factory || input.factory || '宜宾',
      profile_code,
    });

    await this.db.insert(parts).values({
      partId: id,
      partName: input.name,
      partNumber: input.code,
      unit: input.unit || 'PCS',
      status: 'active',
      remark: input.notes || '',
      createdAt: ts,
      updatedAt: ts,
    });

    if (input.material_id) {
      await this.db.insert(product_materials).values({
        id: newId('pm'),
        product_id: id,
        material_id: input.material_id,
        quantity: 1,
        status: 'active',
        created_at: ts,
        updated_at: ts,
      });
    }

    if (project_id) {
      const supplier_id = await this.ensureSupplierMaster({
        supplierId: input.supplier_id,
        supplierName: input.supplier_name,
        ts,
      });
      await this.upsertProjectPart({
        projectId: project_id,
        partId: id,
        customerId: customer_id ?? party_id,
        supplierId: supplier_id,
        manufacturingFactory: input.manufacturing_factory || input.factory || '宜宾',
        profileMaterialCode: input.profile_material_code || input.profile_code || profile_code,
        profileMaterialName: input.profile_material_name || '',
        unitUsage: input.unit_usage ?? 1,
        safetyStock: input.safety_stock ?? 0,
        warningStock: input.warning_stock ?? 0,
        status: 'active',
        remark: input.notes || '',
        ts,
      });
    }

    await this.log('create', 'product', id, input.code);
    return await this.getProduct(id);
  }

  async updateProduct(id: string, input: ProductUpdateInput) {
    const current = await this.db.select().from(products).where(eq(products.id, id)).get();
    if (!current) return null;

    if (input.code && input.code !== current.code) {
      const existing = await this.db.select().from(products).where(eq(products.code, input.code)).get();
      if (existing) {
        throw new Error('产品编码已存在，请使用其他编码');
      }
    }

    const ts = nowIso();
    let profile_code = input.profile_code !== undefined ? (input.profile_code?.trim() || null) : current.profile_code;
    if (input.code && input.code !== current.code && input.profile_code === undefined) {
      const expectedOldDefault = `${current.code}-YL`;
      if (current.profile_code === expectedOldDefault) {
        profile_code = `${input.code}-YL`;
      }
    }

    let party_id = current.party_id;
    if (input.customer_name !== undefined) {
      if (input.customer_name === '') {
        party_id = null;
      } else {
        const p = await this.db
          .select()
          .from(parties)
          .where(and(eq(parties.name, input.customer_name), eq(parties.type, 'customer')))
          .get();
        if (p) {
          party_id = p.id;
        } else {
          party_id = newId('cust');
          await this.db.insert(parties).values({
            id: party_id,
            code: 'CUST-' + newId('c').toUpperCase(),
            name: input.customer_name,
            type: 'customer',
            status: 'active',
            created_at: ts,
            updated_at: ts,
          });
        }
      }
    }
    const customer_id = await this.ensureCustomerMaster({
      customerId: input.customer_id ?? party_id ?? undefined,
      customerName: input.customer_name,
      fallbackId: party_id ?? undefined,
      ts,
    });

    let project_id = current.project_id;
    let project_code = input.project_code !== undefined ? (input.project_code || null) : current.project_code;
    const newProjectName = input.project_name !== undefined ? input.project_name : null;
    const newProjectCode = input.project_code !== undefined ? input.project_code : null;

    if (input.project_id) {
      const proj = await this.db.select().from(projects).where(eq(projects.id, input.project_id)).get();
      if (!proj) throw new Error('project not found');
      project_id = proj.id;
      project_code = proj.code;
    } else if (newProjectName !== null || newProjectCode !== null) {
      const targetProjectName = newProjectName !== null ? newProjectName : (newProjectCode !== null ? newProjectCode : '');
      if (targetProjectName === '') {
        project_id = null;
      } else {
        const proj = await this.db
          .select()
          .from(projects)
          .where(or(eq(projects.name, targetProjectName), eq(projects.code, targetProjectName)))
          .get();
        if (proj) {
          project_id = proj.id;
          project_code = proj.code;
        } else {
          project_id = newId('proj');
          const projCode = newProjectCode || `PROJ-${newId('p').toUpperCase()}`;
          await this.db.insert(projects).values({
            id: project_id,
            code: projCode,
            name: targetProjectName,
            party_id: customer_id ?? party_id,
            status: 'active',
            created_at: ts,
            updated_at: ts,
          });
        }
      }
    }

    if (input.material_id !== undefined) {
      await this.db
        .update(product_materials)
        .set({ status: 'inactive', updated_at: ts })
        .where(eq(product_materials.product_id, id));
      if (input.material_id) {
        await this.db.insert(product_materials).values({
          id: newId('pm'),
          product_id: id,
          material_id: input.material_id,
          quantity: 1,
          status: 'active',
          created_at: ts,
          updated_at: ts,
        });
      }
    }

    await this.db
      .update(products)
      .set({
        code: input.code ?? current.code,
        name: input.name ?? current.name,
        unit: input.unit ?? current.unit,
        process_route: input.process_ids ? JSON.stringify(input.process_ids) : current.process_route,
        notes: input.notes ?? current.notes,
        status: input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        updated_at: ts,
        party_id: customer_id ?? party_id,
        project_id,
        project_code,
        factory: input.manufacturing_factory ?? input.factory ?? current.factory,
        profile_code,
      })
      .where(eq(products.id, id));

    await this.db
      .update(parts)
      .set({
        partName: input.name ?? current.name,
        partNumber: input.code ?? current.code,
        unit: input.unit ?? current.unit,
        status: input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        remark: input.notes ?? current.notes,
        updatedAt: ts,
      })
      .where(eq(parts.partId, id));

    if (project_id) {
      const supplier_id = await this.ensureSupplierMaster({
        supplierId: input.supplier_id,
        supplierName: input.supplier_name,
        ts,
      });
      await this.upsertProjectPart({
        projectId: project_id,
        partId: id,
        customerId: customer_id ?? party_id,
        supplierId: supplier_id,
        manufacturingFactory: input.manufacturing_factory ?? input.factory ?? current.factory,
        profileMaterialCode: input.profile_material_code ?? input.profile_code ?? profile_code ?? current.profile_code ?? '',
        profileMaterialName: input.profile_material_name ?? '',
        unitUsage: input.unit_usage ?? 1,
        safetyStock: input.safety_stock ?? 0,
        warningStock: input.warning_stock ?? 0,
        status: input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        remark: input.notes ?? current.notes,
        ts,
      });
    }

    await this.log('update', 'product', id, input.code ?? current.code);
    return await this.getProduct(id);
  }

  async deleteProduct(id: string) {
    const current = await this.getProduct(id);
    if (!current) return null;
    await this.db
      .update(products)
      .set({ status: 'inactive', updated_at: nowIso() })
      .where(eq(products.id, id));
    await this.db.update(parts).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(parts.partId, id));
    await this.db.update(projectParts).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(projectParts.partId, id));
    await this.log('delete', 'product', id, current.code);
    return current;
  }

  async getWorkOrder(idOrCode: string) {
    const item = await this.db
      .select()
      .from(workOrders)
      .where(or(eq(workOrders.id, idOrCode), eq(workOrders.code, idOrCode)))
      .get();
    if (!item) return null;
    const [product, steps] = await Promise.all([
      this.getProduct(item.productId),
      this.db
        .select()
        .from(workOrderSteps)
        .where(eq(workOrderSteps.workOrderId, item.id))
        .orderBy(workOrderSteps.stepOrder),
    ]);
    return {
      ...mapWorkOrder(item),
      product: product,
      steps: steps.map(mapWorkOrderStep),
    };
  }

  async createWorkOrder(input: WorkOrderCreateInput) {
    const productInfo = await this.getProduct(input.product_id);
    if (!productInfo) throw new Error('product not found');
    const code = input.code || (await this.nextWorkOrderCode(productInfo.project_name));
    const id = newId('wo');
    const ts = nowIso();
    const materialId = input.material_id ?? productInfo.material_id ?? null;
    await this.db.insert(workOrders).values({
      id,
      code,
      productId: productInfo.id,
      materialId,
      customerName: productInfo.customer_name,
      projectName: productInfo.project_name,
      plannedQuantity: input.planned_quantity,
      completedQuantity: 0,
      defectQuantity: 0,
      scrapQuantity: 0,
      status: 'created',
      plannedStartDate: input.planned_start_date ?? '',
      plannedFinishDate: input.planned_finish_date ?? '',
      currentStepId: null,
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    });

    const stepIds = productInfo.process_ids;
    const firstStepId = await this.createStepsForWorkOrder(id, stepIds, input.planned_quantity, ts);
    if (firstStepId) {
      await this.db.update(workOrders).set({ currentStepId: firstStepId }).where(eq(workOrders.id, id));
    }
    await this.log('create', 'work_order', id, code);
    return await this.getWorkOrder(id);
  }

  async updateWorkOrder(id: string, input: WorkOrderUpdateInput) {
    const current = await this.db.select().from(workOrders).where(eq(workOrders.id, id)).get();
    if (!current) return null;
    const status = input.status ?? current.status;
    await this.db
      .update(workOrders)
      .set({
        status,
        plannedQuantity: input.planned_quantity ?? current.plannedQuantity,
        plannedStartDate: input.planned_start_date ?? current.plannedStartDate,
        plannedFinishDate: input.planned_finish_date ?? current.plannedFinishDate,
        notes: input.notes ?? current.notes,
        completedAt: status === 'completed' ? current.completedAt ?? nowIso() : current.completedAt,
        closedAt: status === 'closed' ? current.closedAt ?? nowIso() : current.closedAt,
        updatedAt: nowIso(),
      })
      .where(eq(workOrders.id, id));
    await this.log('update', 'work_order', id, status);
    return await this.getWorkOrder(id);
  }

  async submitPdaReport(input: PdaReportInput) {
    if (!input.work_order_id && !input.work_order_code) throw new Error('work order is required');
    const workOrder = await this.getWorkOrder(input.work_order_id ?? input.work_order_code ?? '');
    if (!workOrder) throw new Error('work order not found');
    if (['completed', 'closed', 'cancelled'].includes(workOrder.status)) {
      throw new Error(`work order status does not allow reporting: ${workOrder.status}`);
    }

    const total = input.good_qty + input.defect_qty + input.scrap_qty;
    if (total <= 0) throw new Error('report quantity must be greater than 0');
    const step = workOrder.steps.find((item) => item.id === workOrder.current_step_id) ?? workOrder.steps.find((item) => item.status !== 'completed');
    if (!step) throw new Error('no open step found');
    const remaining = step.planned_quantity - step.completed_quantity - step.defect_quantity - step.scrap_quantity;
    if (total > remaining) throw new Error(`report quantity exceeds remaining step quantity: ${remaining}`);

    const ts = nowIso();
    const reportId = newId('rpt');

    // ── 1. 不良品质检拦截：自动创建质量异常单并冻结库�?──────────────────────
    let qualityIssueId: string | null = null;
    let freezeId: string | null = null;
    if (input.defect_qty > 0) {
      const result = await this.handleDefectInterception({
        workOrderId: workOrder.id,
        workOrderCode: workOrder.code,
        productId: workOrder.product_id,
        stepName: step.name,
        defectQty: input.defect_qty,
        reportId,
        ts,
      });
      qualityIssueId = result.qualityIssueId;
      freezeId = result.freezeId;
    }

    // ── 2. 插入报工记录，关联质量单与冻结单 ───────────────────────────────
    await this.db.insert(productionReports).values({
      id: reportId,
      workOrderId: workOrder.id,
      stepId: step.id,
      processId: step.process_id,
      machineId: null,
      operatorName: '',
      goodQty: input.good_qty,
      defectQty: input.defect_qty,
      scrapQty: input.scrap_qty,
      startedAt: ts,
      endedAt: ts,
      notes: [
        input.defect_qty > 0 ? `不良�?{input.defect_qty} 件已拦截，质量单: ${qualityIssueId}` : '',
        input.scrap_qty > 0 ? `scrap ${input.scrap_qty}` : '',
      ].filter(Boolean).join('; ') || '',
      createdAt: ts,
    });

    // ── 3. 更新工序步骤计数�?───────────────────────────────────────────
    const nextGood = step.completed_quantity + input.good_qty;
    const nextDefect = step.defect_quantity + input.defect_qty;
    const nextScrap = step.scrap_quantity + input.scrap_qty;
    const nextStepStatus = nextGood >= step.planned_quantity ? 'completed' : 'running';
    await this.db
      .update(workOrderSteps)
      .set({
        completedQuantity: nextGood,
        defectQuantity: nextDefect,
        scrapQuantity: nextScrap,
        status: nextStepStatus,
        startedAt: step.started_at ?? ts,
        completedAt: nextStepStatus === 'completed' ? ts : null,
        updatedAt: ts,
      })
      .where(eq(workOrderSteps.id, step.id));

    // ── 4. 更新工单汇总状�?─────────────────────────────────────────────
    const refreshed = await this.getWorkOrder(workOrder.id);
    if (!refreshed) throw new Error('work order refresh failed');
    const lastStep = refreshed.steps[refreshed.steps.length - 1];
    const firstOpenStep = refreshed.steps.find((item) => item.status !== 'completed');
    const nextOrderStatus = lastStep && lastStep.completed_quantity >= lastStep.planned_quantity ? 'completed' : 'running';
    await this.db
      .update(workOrders)
      .set({
        completedQuantity: lastStep?.completed_quantity ?? 0,
        defectQuantity: refreshed.steps.reduce((sum, item) => sum + item.defect_quantity, 0),
        scrapQuantity: refreshed.steps.reduce((sum, item) => sum + item.scrap_quantity, 0),
        status: nextOrderStatus,
        currentStepId: firstOpenStep?.id ?? lastStep?.id ?? null,
        completedAt: nextOrderStatus === 'completed' ? ts : null,
        updatedAt: ts,
      })
      .where(eq(workOrders.id, workOrder.id));

    // ── 5. 最后一道工序完工时，合格品入可用库�?─────────────────────────────
    if (nextOrderStatus === 'completed' && lastStep?.id === step.id && input.good_qty > 0) {
      await this.finishProductInventory(workOrder.product_id, workOrder.code, input.good_qty, reportId);
    }

    await this.log('report', 'work_order', workOrder.id, JSON.stringify({ ...input, quality_issue_id: qualityIssueId, freeze_id: freezeId }));
    return { report_id: reportId, quality_issue_id: qualityIssueId, freeze_id: freezeId, work_order: await this.getWorkOrder(workOrder.id) };
  }

  private async handleDefectInterception(args: {
    workOrderId: string;
    workOrderCode: string;
    productId: string;
    stepName: string;
    defectQty: number;
    reportId: string;
    ts: string;
  }): Promise<{ qualityIssueId: string; freezeId: string }> {
    const mes = new MesService(this.d1);
    const issueCode = await this.nextQualityCode();
    const issueId = newId('qi');
    const product = await this.db.select().from(products).where(eq(products.id, args.productId)).get();
    const productName = product?.name ?? '';
    const warehouseCode = getWarehouseForProduct(productName);

    const freezeResult = await mes.createFreeze({
      source_type: 'production_report',
      project_name: '',
      product_id: args.productId,
      material_id: undefined,
      warehouse_code: warehouseCode,
      batch_no: args.workOrderCode,
      abnormal_qty: args.defectQty,
      freeze_qty: args.defectQty,
      selectable_qty: 0,
      rework_qty: 0,
      return_qty: 0,
      scrap_qty: 0,
      responsibility: '',
      solution: '',
      eta: '',
      impact_order: '',
      impact_delivery: '',
      owner: '',
      notes: `工单 ${args.workOrderCode} / 工序 ${args.stepName} 报工不良�?${args.defectQty} 件，自动拦截`,
      is_addition: true,
    });
    const freezeId = freezeResult.freeze.id;

    await this.d1
      .prepare(
        `INSERT INTO quality_issues
         (id, code, source_type, source_id, work_order_id, product_id,
          severity, status, title, description, quantity, freeze_id,
          production_report_id, owner, created_at, updated_at)
         VALUES (?, ?, 'production_report', ?, ?, ?,
                 'medium', 'frozen', ?, ?, ?, ?,
                 ?, '', ?, ?)`
      )
      .bind(
        issueId,
        issueCode,
        args.reportId,
        args.workOrderId,
        args.productId,
        `[auto] work order ${args.workOrderCode} - ${args.stepName} defect report`,
        `report step ${args.stepName} has ${args.defectQty} defect items`,
        args.defectQty,
        freezeId,
        args.reportId,
        args.ts,
        args.ts,
      )
      .run();

    await this.d1
      .prepare(
        `INSERT INTO issue_actions (id, issue_id, action, message, actor, created_at)
         VALUES (?, ?, 'process', ?, 'system', ?)`
      )
      .bind(
        newId('act'),
        issueId,
        `auto freeze: work order ${args.workOrderCode} step ${args.stepName} defect ${args.defectQty}, freeze: ${freezeId}`,
        args.ts,
      )
      .run();

    return { qualityIssueId: issueId, freezeId };
  }

  private async nextQualityCode(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `QI-${date}-`;
    const row = await this.d1
      .prepare(`SELECT COUNT(*) AS count FROM quality_issues WHERE code LIKE ?`)
      .bind(`${prefix}%`)
      .first<{ count: number }>();
    return `${prefix}${String((row?.count ?? 0) + 1).padStart(3, '0')}`;
  }

  private async createStepsForWorkOrder(workOrderId: string, processIds: string[], plannedQuantity: number, ts: string) {
    const ids = processIds.length > 0 ? processIds : [null];
    let firstStepId: string | null = null;
    for (let index = 0; index < ids.length; index += 1) {
      const processId = ids[index];
      const process = processId ? await this.db.select().from(processes).where(eq(processes.id, processId)).get() : null;
      const stepId = newId('step');
      if (!firstStepId) firstStepId = stepId;
      await this.db.insert(workOrderSteps).values({
        id: stepId,
        workOrderId,
        processId,
        stepOrder: (index + 1) * 10,
        name: process?.name ?? 'Production',
        plannedQuantity,
        completedQuantity: 0,
        defectQuantity: 0,
        scrapQuantity: 0,
        status: 'pending',
        machineId: null,
        startedAt: null,
        completedAt: null,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    return firstStepId;
  }

  private async finishProductInventory(productId: string, batchNo: string, quantity: number, reportId: string) {
    const product = await this.db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) throw new Error('product not found');
    const warehouseCode = getWarehouseForProduct(product.name);
    
    const ledger = new InventoryLedgerService(this.d1);
    await ledger.createReceiptTransaction({
      itemId: productId,
      warehouseId: warehouseCode,
      locationId: '',
      quantity,
      sourceId: reportId,
      sourceNo: reportId,
      sourceType: 'finish',
      operatorName: '',
      remark: `PDA finish ${batchNo}`,
    });
  }

  private async ensureProductBalance(productId: string, batchNo: string, warehouseCode: string, unit: string) {
    return null; // Legacy unused method
  }

  private async nextWorkOrderCode(projectName: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = projectName ? `WO-${projectName}-${date}-` : `WO-${date}-`;
    const rows = await this.db
      .select({ value: count() })
      .from(workOrders)
      .where(like(workOrders.code, `${prefix}%`));
    return `${prefix}${String((rows[0]?.value ?? 0) + 1).padStart(3, '0')}`;
  }

  async listCustomers(query: ListQuery) {
    const where = query.q
      ? and(
          eq(customers.status, 'active'),
          or(like(customers.customerId, `%${query.q}%`), like(customers.customerName, `%${query.q}%`), like(customers.customerShortName, `%${query.q}%`))
        )
      : eq(customers.status, 'active');
    const totalRow = await this.db.select({ value: count() }).from(customers).where(where);
    const items = await this.db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return {
      items: items.map((c) => ({
        id: c.customerId,
        customer_id: c.customerId,
        code: c.customerId,
        name: c.customerName,
        customer_name: c.customerName,
        short_name: c.customerShortName,
        customer_short_name: c.customerShortName,
        contact: [c.contactPerson, c.contactPhone].filter(Boolean).join(' '),
        contact_person: c.contactPerson,
        contact_phone: c.contactPhone,
        delivery_address: c.deliveryAddress,
        notes: c.deliveryAddress,
        is_active: c.status === 'active' ? 1 : 0,
        status: c.status,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async getCustomer(id: string) {
    const c = await this.db.select().from(customers).where(eq(customers.customerId, id)).get();
    return c
      ? {
          id: c.customerId,
          customer_id: c.customerId,
          code: c.customerId,
          name: c.customerName,
          customer_name: c.customerName,
          short_name: c.customerShortName,
          customer_short_name: c.customerShortName,
          contact: [c.contactPerson, c.contactPhone].filter(Boolean).join(' '),
          contact_person: c.contactPerson,
          contact_phone: c.contactPhone,
          delivery_address: c.deliveryAddress,
          notes: c.deliveryAddress,
          is_active: c.status === 'active' ? 1 : 0,
          status: c.status,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        }
      : null;
  }

  async createCustomer(input: CustomerCreateInput) {
    const id = input.code || newId('cust');
    const ts = nowIso();
    await this.db.insert(customers).values({
      customerId: id,
      customerName: input.name,
      customerShortName: input.short_name || input.name,
      contactPerson: input.contact_person || input.contact,
      contactPhone: input.contact_phone,
      deliveryAddress: input.delivery_address || input.notes,
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    });
    await this.db.insert(parties).values({
      id,
      code: input.code,
      name: input.name,
      type: 'customer',
      contact: input.contact,
      notes: input.notes,
      status: 'active',
      created_at: ts,
      updated_at: ts,
    });
    await this.log('create', 'customer', id, input.code);
    return await this.getCustomer(id);
  }

  async updateCustomer(id: string, input: CustomerUpdateInput) {
    const current = await this.db.select().from(customers).where(eq(customers.customerId, id)).get();
    if (!current) return null;
    await this.db
      .update(customers)
      .set({
        customerName: input.name ?? current.customerName,
        customerShortName: input.short_name ?? current.customerShortName,
        contactPerson: input.contact_person ?? input.contact ?? current.contactPerson,
        contactPhone: input.contact_phone ?? current.contactPhone,
        deliveryAddress: input.delivery_address ?? input.notes ?? current.deliveryAddress,
        status: input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        updatedAt: nowIso(),
      })
      .where(eq(customers.customerId, id));
    await this.db
      .update(parties)
      .set({
        code: input.code ?? current.customerId,
        name: input.name ?? current.customerName,
        contact: input.contact ?? input.contact_person ?? current.contactPerson,
        notes: input.notes ?? input.delivery_address ?? current.deliveryAddress,
        status: input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : current.status,
        updated_at: nowIso(),
      })
      .where(eq(parties.id, id));
    await this.log('update', 'customer', id, current.customerId);
    return await this.getCustomer(id);
  }

  async deleteCustomer(id: string) {
    const current = await this.getCustomer(id);
    if (!current) return null;
    await this.db.update(customers).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(customers.customerId, id));
    await this.db.update(parties).set({ status: 'inactive', updated_at: nowIso() }).where(eq(parties.id, id));
    await this.log('delete', 'customer', id, current.code);
    return current;
  }

  private async ensureCustomerMaster(args: {
    customerId?: string;
    customerName?: string;
    fallbackId?: string;
    ts: string;
  }) {
    if (!args.customerId && !args.customerName) return null;
    if (args.customerId) {
      const existing = await this.db.select().from(customers).where(eq(customers.customerId, args.customerId)).get();
      if (existing) return existing.customerId;
    }
    if (args.customerName) {
      const existing = await this.db.select().from(customers).where(eq(customers.customerName, args.customerName)).get();
      if (existing) return existing.customerId;
    }
    const customerId = args.customerId || args.fallbackId || newId('cust');
    const customerName = args.customerName || customerId;
    await this.db.insert(customers).values({
      customerId,
      customerName,
      customerShortName: customerName,
      contactPerson: '',
      contactPhone: '',
      deliveryAddress: '',
      status: 'active',
      createdAt: args.ts,
      updatedAt: args.ts,
    });
    return customerId;
  }

  private async ensureSupplierMaster(args: { supplierId?: string; supplierName?: string; ts: string }) {
    if (!args.supplierId && !args.supplierName) return null;
    if (args.supplierId) {
      const existing = await this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierId, args.supplierId)).get();
      if (existing) return existing.supplierId;
    }
    if (args.supplierName) {
      const existing = await this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierName, args.supplierName)).get();
      if (existing) return existing.supplierId;
    }
    const supplierId = args.supplierId || newId('sup');
    const supplierName = args.supplierName || supplierId;
    await this.db.insert(profileSuppliers).values({
      supplierId,
      supplierName,
      supplierShortName: supplierName,
      contactPerson: '',
      contactPhone: '',
      address: '',
      defaultLeadTime: 0,
      status: 'active',
      remark: '',
      createdAt: args.ts,
      updatedAt: args.ts,
    });
    return supplierId;
  }

  private async upsertProjectPart(args: {
    projectId: string;
    partId: string;
    customerId: string | null;
    supplierId: string | null;
    manufacturingFactory: string;
    profileMaterialCode: string;
    profileMaterialName: string;
    unitUsage: number;
    safetyStock: number;
    warningStock: number;
    status: string;
    remark: string;
    ts: string;
  }) {
    const existing = await this.db
      .select()
      .from(projectParts)
      .where(and(eq(projectParts.projectId, args.projectId), eq(projectParts.partId, args.partId)))
      .get();
    const data = {
      customerId: args.customerId,
      supplierId: args.supplierId,
      manufacturingFactory: args.manufacturingFactory,
      profileMaterialCode: args.profileMaterialCode,
      profileMaterialName: args.profileMaterialName,
      unitUsage: args.unitUsage,
      safetyStock: args.safetyStock,
      warningStock: args.warningStock,
      status: args.status,
      remark: args.remark,
      updatedAt: args.ts,
    };
    if (existing) {
      await this.db.update(projectParts).set(data).where(eq(projectParts.id, existing.id));
      return existing.id;
    }
    const id = newId('ppart');
    await this.db.insert(projectParts).values({
      id,
      projectId: args.projectId,
      partId: args.partId,
      ...data,
      createdAt: args.ts,
    });
    return id;
  }

  private async log(action: string, entityType: string, entityId: string, detail = '') {
    await this.db.insert(operationLogs).values({
      id: newId('op'),
      actor: '',
      action,
      entityType,
      entityId,
      detail,
      createdAt: nowIso(),
    });
  }

  async listProjects(query: ListQuery) {
    const where = query.q
      ? and(
          eq(projects.status, 'active'),
          or(like(projects.code, `%${query.q}%`), like(projects.name, `%${query.q}%`))
        )
      : eq(projects.status, 'active');
    const totalRow = await this.db.select({ value: count() }).from(projects).where(where);
    const items = await this.db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        party_id: projects.party_id,
        customer_name: customers.customerName,
        notes: projects.notes,
        status: projects.status,
        created_at: projects.created_at,
        updated_at: projects.updated_at,
      })
      .from(projects)
      .leftJoin(customers, eq(customers.customerId, projects.party_id))
      .where(where)
      .orderBy(desc(projects.created_at))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return {
      items: items.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        party_id: p.party_id,
        customer_id: p.party_id,
        customer_name: p.customer_name ?? '',
        notes: p.notes,
        remark: p.notes,
        status: p.status,
        is_active: p.status === 'active' ? 1 : 0,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async getProject(id: string) {
    const p = await this.db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        party_id: projects.party_id,
        customer_name: customers.customerName,
        notes: projects.notes,
        status: projects.status,
        created_at: projects.created_at,
        updated_at: projects.updated_at,
      })
      .from(projects)
      .leftJoin(customers, eq(customers.customerId, projects.party_id))
      .where(eq(projects.id, id))
      .get();
    return p
      ? {
          id: p.id,
          code: p.code,
          name: p.name,
          party_id: p.party_id,
          customer_id: p.party_id,
          customer_name: p.customer_name ?? '',
          notes: p.notes,
          remark: p.notes,
          status: p.status,
          is_active: p.status === 'active' ? 1 : 0,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }
      : null;
  }

  async createProject(input: ProjectCreateInput) {
    const existing = await this.db.select().from(projects).where(eq(projects.code, input.code)).get();
    if (existing) throw new Error('project code already exists');
    const id = newId('proj');
    const ts = nowIso();
    const customerId = input.customer_id ?? input.party_id ?? null;
    await this.db.insert(projects).values({
      id,
      code: input.code,
      name: input.name,
      party_id: customerId,
      status: input.status,
      notes: input.remark || input.notes,
      created_at: ts,
      updated_at: ts,
    });
    await this.log('create', 'project', id, input.code);
    return await this.getProject(id);
  }

  async updateProject(id: string, input: ProjectUpdateInput) {
    const current = await this.db.select().from(projects).where(eq(projects.id, id)).get();
    if (!current) return null;
    if (input.code && input.code !== current.code) {
      const existing = await this.db.select().from(projects).where(eq(projects.code, input.code)).get();
      if (existing) throw new Error('project code already exists');
    }
    const status = input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : input.status ?? current.status;
    await this.db
      .update(projects)
      .set({
        code: input.code ?? current.code,
        name: input.name ?? current.name,
        party_id: input.customer_id ?? input.party_id ?? current.party_id,
        status,
        notes: input.remark ?? input.notes ?? current.notes,
        updated_at: nowIso(),
      })
      .where(eq(projects.id, id));
    await this.log('update', 'project', id, input.code ?? current.code);
    return await this.getProject(id);
  }

  async deleteProject(id: string) {
    const current = await this.getProject(id);
    if (!current) return null;
    await this.db.update(projects).set({ status: 'inactive', updated_at: nowIso() }).where(eq(projects.id, id));
    await this.log('delete', 'project', id, current.code);
    return await this.getProject(id);
  }

  async listProfileSuppliers(query: ListQuery) {
    const where = query.q
      ? or(like(profileSuppliers.supplierId, `%${query.q}%`), like(profileSuppliers.supplierName, `%${query.q}%`), like(profileSuppliers.supplierShortName, `%${query.q}%`))
      : undefined;
    const totalRow = await this.db.select({ value: count() }).from(profileSuppliers).where(where);
    const rows = await this.db
      .select()
      .from(profileSuppliers)
      .where(where)
      .orderBy(desc(profileSuppliers.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return {
      items: rows.map((row) => ({
        id: row.supplierId,
        supplier_id: row.supplierId,
        supplier_name: row.supplierName,
        supplier_short_name: row.supplierShortName,
        contact_person: row.contactPerson,
        contact_phone: row.contactPhone,
        address: row.address,
        default_lead_time: row.defaultLeadTime,
        status: row.status,
        remark: row.remark,
        is_active: row.status === 'active' ? 1 : 0,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async getProfileSupplier(id: string) {
    const row = await this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierId, id)).get();
    return row
      ? {
          id: row.supplierId,
          supplier_id: row.supplierId,
          supplier_name: row.supplierName,
          supplier_short_name: row.supplierShortName,
          contact_person: row.contactPerson,
          contact_phone: row.contactPhone,
          address: row.address,
          default_lead_time: row.defaultLeadTime,
          status: row.status,
          remark: row.remark,
          is_active: row.status === 'active' ? 1 : 0,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }
      : null;
  }

  async createProfileSupplier(input: SupplierCreateInput) {
    const supplierId = input.supplier_id || newId('sup');
    const existing = await this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierId, supplierId)).get();
    if (existing) throw new Error('supplier already exists');
    const ts = nowIso();
    await this.db.insert(profileSuppliers).values({
      supplierId,
      supplierName: input.supplier_name,
      supplierShortName: input.supplier_short_name || input.supplier_name,
      contactPerson: input.contact_person,
      contactPhone: input.contact_phone,
      address: input.address,
      defaultLeadTime: input.default_lead_time,
      status: input.status,
      remark: input.remark,
      createdAt: ts,
      updatedAt: ts,
    });
    await this.log('create', 'profile_supplier', supplierId, input.supplier_name);
    return await this.getProfileSupplier(supplierId);
  }

  async updateProfileSupplier(id: string, input: SupplierUpdateInput) {
    const current = await this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierId, id)).get();
    if (!current) return null;
    const status = input.is_active !== undefined ? (input.is_active === 1 ? 'active' : 'inactive') : input.status ?? current.status;
    await this.db
      .update(profileSuppliers)
      .set({
        supplierName: input.supplier_name ?? current.supplierName,
        supplierShortName: input.supplier_short_name ?? current.supplierShortName,
        contactPerson: input.contact_person ?? current.contactPerson,
        contactPhone: input.contact_phone ?? current.contactPhone,
        address: input.address ?? current.address,
        defaultLeadTime: input.default_lead_time ?? current.defaultLeadTime,
        status,
        remark: input.remark ?? current.remark,
        updatedAt: nowIso(),
      })
      .where(eq(profileSuppliers.supplierId, id));
    await this.log('update', 'profile_supplier', id, input.supplier_name ?? current.supplierName);
    return await this.getProfileSupplier(id);
  }

  async deleteProfileSupplier(id: string) {
    const current = await this.getProfileSupplier(id);
    if (!current) return null;
    await this.db.update(profileSuppliers).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(profileSuppliers.supplierId, id));
    await this.log('delete', 'profile_supplier', id, current.supplier_name);
    return await this.getProfileSupplier(id);
  }

  async listParts(query: ListQuery) {
    const where = query.q
      ? or(like(parts.partNumber, `%${query.q}%`), like(parts.partName, `%${query.q}%`))
      : undefined;
    const totalRow = await this.db.select({ value: count() }).from(parts).where(where);
    const rows = await this.db
      .select()
      .from(parts)
      .where(where)
      .orderBy(desc(parts.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return {
      items: rows.map((row) => ({
        id: row.partId,
        part_id: row.partId,
        part_name: row.partName,
        part_number: row.partNumber,
        unit: row.unit,
        status: row.status,
        remark: row.remark,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async listProjectParts(query: ListQuery) {
    const where = query.q
      ? or(
          like(projects.code, `%${query.q}%`),
          like(projects.name, `%${query.q}%`),
          like(parts.partNumber, `%${query.q}%`),
          like(parts.partName, `%${query.q}%`),
          like(customers.customerName, `%${query.q}%`),
          like(profileSuppliers.supplierName, `%${query.q}%`),
          like(projectParts.profileMaterialCode, `%${query.q}%`),
        )
      : undefined;
    const totalRow = await this.db
      .select({ value: count() })
      .from(projectParts)
      .leftJoin(projects, eq(projects.id, projectParts.projectId))
      .leftJoin(parts, eq(parts.partId, projectParts.partId))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(where);
    const rows = await this.db
      .select({
        id: projectParts.id,
        project_id: projectParts.projectId,
        project_code: projects.code,
        project_name: projects.name,
        part_id: projectParts.partId,
        part_number: parts.partNumber,
        part_name: parts.partName,
        customer_id: projectParts.customerId,
        customer_name: customers.customerName,
        supplier_id: projectParts.supplierId,
        supplier_name: profileSuppliers.supplierName,
        manufacturing_factory: projectParts.manufacturingFactory,
        profile_material_code: projectParts.profileMaterialCode,
        profile_material_name: projectParts.profileMaterialName,
        unit_usage: projectParts.unitUsage,
        safety_stock: projectParts.safetyStock,
        warning_stock: projectParts.warningStock,
        status: projectParts.status,
        remark: projectParts.remark,
        created_at: projectParts.createdAt,
        updated_at: projectParts.updatedAt,
      })
      .from(projectParts)
      .leftJoin(projects, eq(projects.id, projectParts.projectId))
      .leftJoin(parts, eq(parts.partId, projectParts.partId))
      .leftJoin(customers, eq(customers.customerId, projectParts.customerId))
      .leftJoin(profileSuppliers, eq(profileSuppliers.supplierId, projectParts.supplierId))
      .where(where)
      .orderBy(desc(projectParts.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return { items: rows, total: totalRow[0]?.value ?? 0 };
  }

  async listManufacturingFactories(query: ListQuery) {
    const where = query.q
      ? or(
          like(manufacturingFactories.factoryName, `%${query.q}%`),
          like(manufacturingFactories.factoryCode, `%${query.q}%`),
        )
      : undefined;
    const totalRow = await this.db.select({ value: count() }).from(manufacturingFactories).where(where);
    const rows = await this.db
      .select()
      .from(manufacturingFactories)
      .where(where)
      .orderBy(desc(manufacturingFactories.createdAt))
      .limit(query.pageSize)
      .offset((query.current - 1) * query.pageSize);
    return {
      items: rows.map((row) => ({
        id: row.factoryId,
        factory_id: row.factoryId,
        factory_name: row.factoryName,
        factory_code: row.factoryCode,
        status: row.status,
        remark: row.remark,
        is_active: row.status === 'active' ? 1 : 0,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })),
      total: totalRow[0]?.value ?? 0,
    };
  }
}

function parseProcessRoute(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

function mapWorkOrder(item: typeof workOrders.$inferSelect) {
  return {
    id: item.id,
    code: item.code,
    product_id: item.productId,
    material_id: item.materialId,
    customer_name: item.customerName,
    project_name: item.projectName,
    planned_quantity: item.plannedQuantity,
    reported_quantity: item.reportedQuantity ?? item.completedQuantity + item.defectQuantity + item.scrapQuantity,
    good_quantity: item.goodQuantity ?? item.completedQuantity,
    completed_quantity: item.completedQuantity,
    defect_quantity: item.defectQuantity,
    scrap_quantity: item.scrapQuantity,
    status: item.status,
    planned_start_date: item.plannedStartDate,
    planned_finish_date: item.plannedFinishDate,
    current_step_id: item.currentStepId,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    completed_at: item.completedAt,
    closed_at: item.closedAt,
  };
}

function mapWorkOrderListItem(item: {
  id: string;
  code: string;
  productId: string;
  productCode: string | null;
  productName: string | null;
  plannedQuantity: number;
  reportedQuantity?: number;
  goodQuantity?: number;
  completedQuantity: number;
  defectQuantity: number;
  scrapQuantity: number;
  status: string;
  plannedStartDate: string;
  plannedFinishDate: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: item.id,
    code: item.code,
    product_id: item.productId,
    product_code: item.productCode,
    product_name: item.productName,
    planned_quantity: item.plannedQuantity,
    reported_quantity: item.reportedQuantity ?? item.completedQuantity + item.defectQuantity + item.scrapQuantity,
    good_quantity: item.goodQuantity ?? item.completedQuantity,
    completed_quantity: item.completedQuantity,
    defect_quantity: item.defectQuantity,
    scrap_quantity: item.scrapQuantity,
    status: item.status,
    planned_start_date: item.plannedStartDate,
    planned_finish_date: item.plannedFinishDate,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapWorkOrderStep(item: typeof workOrderSteps.$inferSelect) {
  return {
    id: item.id,
    work_order_id: item.workOrderId,
    process_id: item.processId,
    step_order: item.stepOrder,
    name: item.name,
    planned_quantity: item.plannedQuantity,
    completed_quantity: item.completedQuantity,
    defect_quantity: item.defectQuantity,
    scrap_quantity: item.scrapQuantity,
    status: item.status,
    machine_id: item.machineId,
    started_at: item.startedAt,
    completed_at: item.completedAt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

