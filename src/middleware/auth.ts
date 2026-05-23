import type { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import type { AppEnv } from '../types';
import { fail } from '../utils/http';

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const expected = c.env.APP_TOKEN;
  if (!expected) {
    return fail(c, 'APP_TOKEN is not configured.', 500);
  }

  const authHeader = c.req.header('authorization') ?? '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerToken = c.req.header('x-app-token') ?? '';
  const queryToken = c.req.query('token') ?? '';
  const received = bearerToken || headerToken || queryToken;

  if (!received) {
    return fail(c, 'Unauthorized', 401);
  }

  if (received === expected) {
    // Legacy APP_TOKEN or system integration
    c.set('actor', c.req.header('x-app-user') || 'system');
    c.set('role', c.req.header('x-app-role') || 'admin');
    await next();
    return;
  }

  try {
    const payload = await verify(received, expected, 'HS256');
    c.set('actor', (payload.username as string) || 'system');
    c.set('role', (payload.role as string) || 'admin');
    await next();
  } catch (err) {
    return fail(c, 'Invalid or expired token', 401);
  }
};
