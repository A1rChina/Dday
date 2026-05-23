import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types';
import { requirePermission } from '../middleware/rbac';
import { fail, ok } from '../utils/http';
import { roles, rolePermissions } from '../db/schema';
import { newId } from '../utils/id';

export const roleRoutes = new Hono<AppEnv>();

roleRoutes.get('/', requirePermission('system:read'), async (c) => {
  const db = drizzle(c.env.DB);
  const results = await db.select().from(roles).all();
  return ok(c, results);
});

const createRoleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(200).default(''),
});

roleRoutes.post('/', requirePermission('system:write'), zValidator('json', createRoleSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const existing = await db.select().from(roles).where(eq(roles.code, data.code)).get();
  if (existing) {
    return fail(c, 'Role code already exists', 400);
  }
  
  const id = newId('rol');
  await db.insert(roles).values({
    id,
    code: data.code,
    name: data.name,
    description: data.description,
    createdAt: new Date().toISOString(),
  });
  
  const saved = await db.select().from(roles).where(eq(roles.id, id)).get();
  return ok(c, saved, 201);
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(200).optional(),
});

roleRoutes.patch('/:id', requirePermission('system:write'), zValidator('json', updateRoleSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  
  await db.update(roles).set(updateData).where(eq(roles.id, id));
  
  const saved = await db.select().from(roles).where(eq(roles.id, id)).get();
  if (!saved) return fail(c, 'Role not found', 404);
  return ok(c, saved);
});

roleRoutes.delete('/:id', requirePermission('system:write'), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  const role = await db.select().from(roles).where(eq(roles.id, id)).get();
  if (!role) return fail(c, 'Role not found', 404);
  if (role.code === 'admin') return fail(c, 'Cannot delete admin role', 400);

  // Note: Due to SQLite foreign keys (if ON DELETE CASCADE is enabled), role_permissions might be deleted automatically.
  // But D1 requires pragma foreign_keys=on which is not always on by default, so we delete manually just in case.
  await db.delete(rolePermissions).where(eq(rolePermissions.roleCode, role.code));
  await db.delete(roles).where(eq(roles.id, id));
  
  return ok(c, { id });
});
