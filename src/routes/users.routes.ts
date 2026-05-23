import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types';
import { requirePermission } from '../middleware/rbac';
import { fail, ok } from '../utils/http';
import { sha256Hex } from '../utils/hash';
import { users } from '../db/schema';
import { newId } from '../utils/id';

export const userRoutes = new Hono<AppEnv>();

userRoutes.get('/', requirePermission('system:read'), async (c) => {
  const db = drizzle(c.env.DB);
  const q = c.req.query('q');
  
  let query = db.select().from(users);
  if (q) {
    query = query.where(or(like(users.username, `%${q}%`), like(users.display_name, `%${q}%`))) as any;
  }
  
  const results = await query.all();
  const safeResults = results.map(mapUserToCamel);
  
  return ok(c, safeResults);
});

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  role: z.string().min(1),
  password: z.string().min(1),
  isActive: z.number().int().min(0).max(1).default(1),
});

userRoutes.post('/', requirePermission('system:write'), zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const existing = await db.select().from(users).where(eq(users.username, data.username)).get();
  if (existing) {
    return fail(c, 'Username already exists', 400);
  }
  
  const hash = await sha256Hex(data.password);
  const id = newId('usr');
  
  await db.insert(users).values({
    id,
    username: data.username,
    display_name: data.displayName,
    role: data.role,
    status: data.isActive === 1 ? 'active' : 'inactive',
    password_hash: hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  const saved = await db.select().from(users).where(eq(users.id, id)).get();
  if (saved) {
    return ok(c, mapUserToCamel(saved), 201);
  }
  return fail(c, 'Failed to create user', 500);
});

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  role: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

userRoutes.patch('/:id', requirePermission('system:write'), zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const current = await db.select().from(users).where(eq(users.id, id)).get();
  if (!current) {
    return fail(c, 'User not found', 404);
  }
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (data.displayName !== undefined) updateData.display_name = data.displayName;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.status = data.isActive === 1 ? 'active' : 'inactive';
  if (data.password) {
    updateData.password_hash = await sha256Hex(data.password);
  }
  
  await db.update(users).set(updateData).where(eq(users.id, id));
  
  const saved = await db.select().from(users).where(eq(users.id, id)).get();
  return ok(c, mapUserToCamel(saved!));
});

userRoutes.delete('/:id', requirePermission('system:write'), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(users).where(eq(users.id, id));
  return ok(c, { id });
});

function mapUserToCamel(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    isActive: u.status === 'active' ? 1 : 0,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  };
}
