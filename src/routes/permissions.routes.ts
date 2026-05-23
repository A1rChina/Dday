import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types';
import { requirePermission, requestActor, requestRole } from '../middleware/rbac';
import { ok, fail } from '../utils/http';
import { permissions, rolePermissions } from '../db/schema';
import { newId } from '../utils/id';

export const permissionRoutes = new Hono<AppEnv>();

permissionRoutes.get('/me', async (c) => {
  return ok(c, {
    actor: requestActor(c),
    role: requestRole(c),
  });
});

permissionRoutes.get('/', requirePermission('system:read'), async (c) => {
  const db = drizzle(c.env.DB);
  const results = await db.select().from(permissions).all();
  return ok(c, results);
});

const createPermissionSchema = z.object({
  code: z.string().min(1).max(50),
  module: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(200).default(''),
});

permissionRoutes.post('/', requirePermission('system:write'), zValidator('json', createPermissionSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const existing = await db.select().from(permissions).where(eq(permissions.code, data.code)).get();
  if (existing) {
    return fail(c, 'Permission code already exists', 400);
  }
  
  const id = newId('prm');
  await db.insert(permissions).values({
    id,
    code: data.code,
    module: data.module,
    action: data.action,
    description: data.description,
    createdAt: new Date().toISOString(),
  });
  
  const saved = await db.select().from(permissions).where(eq(permissions.id, id)).get();
  return ok(c, saved, 201);
});

const updatePermissionSchema = z.object({
  module: z.string().min(1).max(50).optional(),
  action: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
});

permissionRoutes.patch('/:id', requirePermission('system:write'), zValidator('json', updatePermissionSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const updateData: any = {};
  if (data.module !== undefined) updateData.module = data.module;
  if (data.action !== undefined) updateData.action = data.action;
  if (data.description !== undefined) updateData.description = data.description;
  
  await db.update(permissions).set(updateData).where(eq(permissions.id, id));
  
  const saved = await db.select().from(permissions).where(eq(permissions.id, id)).get();
  if (!saved) return fail(c, 'Permission not found', 404);
  return ok(c, saved);
});

permissionRoutes.delete('/:id', requirePermission('system:write'), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  const prm = await db.select().from(permissions).where(eq(permissions.id, id)).get();
  if (!prm) return fail(c, 'Permission not found', 404);
  
  await db.delete(rolePermissions).where(eq(rolePermissions.permissionCode, prm.code));
  await db.delete(permissions).where(eq(permissions.id, id));
  
  return ok(c, { id });
});

// Role Permissions Management
permissionRoutes.get('/role-permissions', requirePermission('system:read'), async (c) => {
  const db = drizzle(c.env.DB);
  const results = await db.select().from(rolePermissions).all();
  return ok(c, results);
});

const assignRolePermissionsSchema = z.object({
  roleCode: z.string().min(1),
  permissionCodes: z.array(z.string()),
});

permissionRoutes.post('/role-permissions/assign', requirePermission('system:write'), zValidator('json', assignRolePermissionsSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Clear existing permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.roleCode, data.roleCode));
  
  // Insert new permissions
  if (data.permissionCodes.length > 0) {
    const values = data.permissionCodes.map(code => ({
      roleCode: data.roleCode,
      permissionCode: code,
      createdAt: new Date().toISOString(),
    }));
    await db.insert(rolePermissions).values(values);
  }
  
  return ok(c, { success: true });
});
