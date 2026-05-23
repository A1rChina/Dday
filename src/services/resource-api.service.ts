import { count, desc, eq, like, or } from 'drizzle-orm';
import type { z } from 'zod';
import { createDb, type AppDb } from '../db/client';
import {
  customers,
  machines,
  manufacturingFactories,
  materials,
  processes,
  productMaterials,
  products,
  profileSuppliers,
  projects,
  workOrders,
} from '../db/schema';
import type { listQuerySchema } from '../schemas/resource';
import { nowIso } from '../utils/date';
import { newId } from '../utils/id';

type ListQuery = z.infer<typeof listQuerySchema>;

export class ResourceApiService {
  private readonly db: AppDb;

  constructor(database: D1Database) {
    this.db = createDb(database);
  }

  async listCustomers(query: ListQuery) {
    const where = query.q
      ? or(like(customers.customerName, `%${query.q}%`), like(customers.customerCode, `%${query.q}%`))
      : undefined;
    return this.list(customers, where, customers.createdAt, query);
  }

  async createCustomer(input: any) {
    const ts = nowIso();
    const id = newId('cus');
    await this.db.insert(customers).values({
      customerId: id,
      customerCode: input.customer_code || input.customerCode || id,
      customerName: input.customer_name || input.customerName || input.name,
      customerShortName: input.customer_short_name || input.customerShortName || '',
      contactPerson: input.contact_person || input.contactPerson || '',
      contactPhone: input.contact_phone || input.contactPhone || '',
      deliveryAddress: input.delivery_address || input.deliveryAddress || '',
      status: input.status || 'active',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getCustomer(id);
  }

  async getCustomer(id: string) {
    return this.db.select().from(customers).where(eq(customers.customerId, id)).get();
  }

  async updateCustomer(id: string, input: any) {
    const data: Partial<typeof customers.$inferInsert> = { updatedAt: nowIso() };
    if (input.customer_code !== undefined) data.customerCode = input.customer_code;
    if (input.customerCode !== undefined) data.customerCode = input.customerCode;
    if (input.customer_name !== undefined) data.customerName = input.customer_name;
    if (input.customerName !== undefined) data.customerName = input.customerName;
    if (input.customer_short_name !== undefined) data.customerShortName = input.customer_short_name;
    if (input.customerShortName !== undefined) data.customerShortName = input.customerShortName;
    if (input.contact_person !== undefined) data.contactPerson = input.contact_person;
    if (input.contactPerson !== undefined) data.contactPerson = input.contactPerson;
    if (input.contact_phone !== undefined) data.contactPhone = input.contact_phone;
    if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
    if (input.delivery_address !== undefined) data.deliveryAddress = input.delivery_address;
    if (input.deliveryAddress !== undefined) data.deliveryAddress = input.deliveryAddress;
    if (input.status !== undefined) data.status = input.status;
    await this.db.update(customers).set(data).where(eq(customers.customerId, id));
    return this.getCustomer(id);
  }

  async deleteCustomer(id: string) {
    await this.db.update(customers).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(customers.customerId, id));
    return this.getCustomer(id);
  }

  async listProfileSuppliers(query: ListQuery) {
    const where = query.q
      ? or(like(profileSuppliers.supplierName, `%${query.q}%`), like(profileSuppliers.supplierCode, `%${query.q}%`))
      : undefined;
    return this.list(profileSuppliers, where, profileSuppliers.createdAt, query);
  }

  async createProfileSupplier(input: any) {
    const ts = nowIso();
    const id = newId('sup');
    await this.db.insert(profileSuppliers).values({
      supplierId: id,
      supplierCode: input.supplier_code || input.supplierCode || id,
      supplierName: input.supplier_name || input.supplierName || input.name,
      supplierShortName: input.supplier_short_name || input.supplierShortName || '',
      contactPerson: input.contact_person || input.contactPerson || '',
      contactPhone: input.contact_phone || input.contactPhone || '',
      address: input.address || '',
      defaultLeadTime: input.default_lead_time ?? input.defaultLeadTime ?? 0,
      status: input.status || 'active',
      remark: input.remark || '',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getProfileSupplier(id);
  }

  async getProfileSupplier(id: string) {
    return this.db.select().from(profileSuppliers).where(eq(profileSuppliers.supplierId, id)).get();
  }

  async updateProfileSupplier(id: string, input: any) {
    const data: Partial<typeof profileSuppliers.$inferInsert> = { updatedAt: nowIso() };
    if (input.supplier_code !== undefined) data.supplierCode = input.supplier_code;
    if (input.supplier_name !== undefined) data.supplierName = input.supplier_name;
    if (input.supplier_short_name !== undefined) data.supplierShortName = input.supplier_short_name;
    if (input.contact_person !== undefined) data.contactPerson = input.contact_person;
    if (input.contact_phone !== undefined) data.contactPhone = input.contact_phone;
    if (input.address !== undefined) data.address = input.address;
    if (input.default_lead_time !== undefined) data.defaultLeadTime = input.default_lead_time;
    if (input.status !== undefined) data.status = input.status;
    if (input.remark !== undefined) data.remark = input.remark;
    await this.db.update(profileSuppliers).set(data).where(eq(profileSuppliers.supplierId, id));
    return this.getProfileSupplier(id);
  }

  async deleteProfileSupplier(id: string) {
    await this.db.update(profileSuppliers).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(profileSuppliers.supplierId, id));
    return this.getProfileSupplier(id);
  }

  async listManufacturingFactories(query: ListQuery) {
    const where = query.q
      ? or(like(manufacturingFactories.factoryName, `%${query.q}%`), like(manufacturingFactories.factoryCode, `%${query.q}%`))
      : undefined;
    return this.list(manufacturingFactories, where, manufacturingFactories.createdAt, query);
  }

  async listProjects(query: ListQuery) {
    const where = query.q ? or(like(projects.name, `%${query.q}%`), like(projects.code, `%${query.q}%`)) : undefined;
    return this.list(projects, where, projects.createdAt, query);
  }

  async createProject(input: any) {
    const ts = nowIso();
    const id = newId('prj');
    await this.db.insert(projects).values({
      id,
      code: input.code,
      name: input.name,
      customerId: input.customer_id || input.customerId || '',
      status: input.status || 'active',
      notes: input.notes || '',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getProject(id);
  }

  async getProject(id: string) {
    return this.db.select().from(projects).where(eq(projects.id, id)).get();
  }

  async updateProject(id: string, input: any) {
    const data: Partial<typeof projects.$inferInsert> = { updatedAt: nowIso() };
    if (input.code !== undefined) data.code = input.code;
    if (input.name !== undefined) data.name = input.name;
    if (input.customer_id !== undefined) data.customerId = input.customer_id;
    if (input.customerId !== undefined) data.customerId = input.customerId;
    if (input.status !== undefined) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes;
    await this.db.update(projects).set(data).where(eq(projects.id, id));
    return this.getProject(id);
  }

  async deleteProject(id: string) {
    await this.db.update(projects).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(projects.id, id));
    return this.getProject(id);
  }

  async listProducts(query: ListQuery) {
    const where = query.q ? or(like(products.name, `%${query.q}%`), like(products.code, `%${query.q}%`)) : undefined;
    return this.list(products, where, products.createdAt, query);
  }

  async createProduct(input: any) {
    const ts = nowIso();
    const id = newId('prd');
    await this.db.insert(products).values({
      id,
      code: input.code,
      name: input.name,
      unit: input.unit || 'PCS',
      processRoute: input.process_route || input.processRoute || '[]',
      notes: input.notes || '',
      status: input.status || 'active',
      projectId: input.project_id || input.projectId || null,
      projectCode: input.project_code || input.projectCode || '',
      factoryId: input.factory_id || input.factoryId || '',
      drawingNo: input.drawing_no || input.drawingNo || '',
      createdAt: ts,
      updatedAt: ts,
    });
    if (input.material_id) {
      await this.db.insert(productMaterials).values({
        id: newId('bom'),
        productId: id,
        materialId: input.material_id,
        quantity: input.quantity ?? 1,
        usageUnit: input.usage_unit || 'pcs',
        lossRate: input.loss_rate ?? 0,
        isPrimary: 1,
        status: 'active',
        remark: '',
        createdAt: ts,
        updatedAt: ts,
      });
    }
    return this.getProduct(id);
  }

  async getProduct(id: string) {
    return this.db.select().from(products).where(eq(products.id, id)).get();
  }

  async updateProduct(id: string, input: any) {
    const data: Partial<typeof products.$inferInsert> = { updatedAt: nowIso() };
    if (input.code !== undefined) data.code = input.code;
    if (input.name !== undefined) data.name = input.name;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.process_route !== undefined) data.processRoute = input.process_route;
    if (input.processRoute !== undefined) data.processRoute = input.processRoute;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) data.status = input.status;
    if (input.project_id !== undefined) data.projectId = input.project_id;
    if (input.factory_id !== undefined) data.factoryId = input.factory_id;
    if (input.drawing_no !== undefined) data.drawingNo = input.drawing_no;
    await this.db.update(products).set(data).where(eq(products.id, id));
    return this.getProduct(id);
  }

  async deleteProduct(id: string) {
    await this.db.update(products).set({ status: 'inactive', updatedAt: nowIso() }).where(eq(products.id, id));
    return this.getProduct(id);
  }

  async listMaterials() {
    return this.db.select().from(materials).orderBy(desc(materials.createdAt));
  }

  async createMaterial(input: any) {
    const ts = nowIso();
    const id = newId('mat');
    await this.db.insert(materials).values({
      id,
      code: input.code,
      name: input.name,
      type: input.type || 'profile',
      unit: input.unit || 'pcs',
      spec: input.spec || '',
      supplierId: input.supplier_id || input.supplierId || null,
      materialCategory: input.material_category || input.materialCategory || '',
      defaultLeadTime: input.default_lead_time ?? input.defaultLeadTime ?? 0,
      notes: input.notes || '',
      status: input.status || 'active',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.db.select().from(materials).where(eq(materials.id, id)).get();
  }

  async updateMaterial(id: string, input: any) {
    await this.db.update(materials).set({ ...input, updatedAt: nowIso() } as any).where(eq(materials.id, id));
    return this.db.select().from(materials).where(eq(materials.id, id)).get();
  }

  async listProcesses() {
    return this.db.select().from(processes).orderBy(desc(processes.createdAt));
  }

  async createProcess(input: any) {
    const ts = nowIso();
    const id = newId('proc');
    await this.db.insert(processes).values({
      id,
      code: input.code,
      name: input.name,
      sortOrder: input.sort_order ?? input.sortOrder ?? 100,
      notes: input.notes || '',
      isActive: input.is_active ?? input.isActive ?? 1,
      createdAt: ts,
      updatedAt: ts,
    });
    return this.db.select().from(processes).where(eq(processes.id, id)).get();
  }

  async updateProcess(id: string, input: any) {
    await this.db.update(processes).set({ ...input, updatedAt: nowIso() } as any).where(eq(processes.id, id));
    return this.db.select().from(processes).where(eq(processes.id, id)).get();
  }

  async listMachines() {
    return this.db.select().from(machines).orderBy(desc(machines.createdAt));
  }

  async createMachine(input: any) {
    const ts = nowIso();
    const id = newId('mac');
    await this.db.insert(machines).values({
      id,
      code: input.code,
      name: input.name,
      processId: input.process_id || input.processId || null,
      status: input.status || 'available',
      notes: input.notes || '',
      isActive: input.is_active ?? input.isActive ?? 1,
      createdAt: ts,
      updatedAt: ts,
    });
    return this.db.select().from(machines).where(eq(machines.id, id)).get();
  }

  async updateMachine(id: string, input: any) {
    await this.db.update(machines).set({ ...input, updatedAt: nowIso() } as any).where(eq(machines.id, id));
    return this.db.select().from(machines).where(eq(machines.id, id)).get();
  }

  async createWorkOrder(input: any) {
    const ts = nowIso();
    const id = newId('wo');
    await this.db.insert(workOrders).values({
      id,
      code: input.code || id,
      productionPlanId: input.production_plan_id || input.productionPlanId || null,
      productId: input.product_id || input.productId,
      materialId: input.material_id || input.materialId || null,
      factoryId: input.factory_id || input.factoryId || '',
      plannedQuantity: input.planned_quantity ?? input.plannedQuantity ?? 0,
      reportedQuantity: 0,
      goodQuantity: 0,
      completedQuantity: 0,
      defectQuantity: 0,
      scrapQuantity: 0,
      processRouteSnapshot: input.process_route_snapshot || '[]',
      status: input.status || 'created',
      plannedStartDate: input.planned_start_date || '',
      plannedFinishDate: input.planned_finish_date || '',
      notes: input.notes || '',
      createdAt: ts,
      updatedAt: ts,
    });
    return this.getWorkOrder(id);
  }

  async getWorkOrder(idOrCode: string) {
    return this.db.select().from(workOrders).where(or(eq(workOrders.id, idOrCode), eq(workOrders.code, idOrCode))).get();
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
