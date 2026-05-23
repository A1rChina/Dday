import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sign } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types';
import { sha256Hex } from '../utils/hash';
import { fail, ok } from '../utils/http';
import { users } from '../db/schema';

export const authRoutes = new Hono<AppEnv>();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  
  if (!user || user.status === 'inactive') {
    return fail(c, 'Invalid username or password', 401);
  }
  
  const hash = await sha256Hex(password);
  if (user.password_hash !== hash) {
    return fail(c, 'Invalid username or password', 401);
  }
  
  // Create JWT payload
  const payload = {
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  
  const token = await sign(payload, c.env.APP_TOKEN || 'fallback-secret');
  
  return ok(c, {
    token,
    user: {
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    }
  });
});
