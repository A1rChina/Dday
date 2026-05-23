import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types';
import { fail } from '../utils/http';

export function requestActor(c: Context<AppEnv>): string {
  return c.get('actor') || c.req.header('x-app-user') || 'system';
}

export function requestRole(c: Context<AppEnv>): string {
  return c.get('role') || c.req.header('x-app-role') || c.req.query('role') || c.env.APP_DEFAULT_ROLE || 'admin';
}

export const rbacContextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('actor', c.req.header('x-app-user') || 'system');
  c.set('role', c.req.header('x-app-role') || c.req.query('role') || c.env.APP_DEFAULT_ROLE || 'admin');
  await next();
};

export function requirePermission(permission: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const role = requestRole(c);
    if (role === 'admin') {
      await next();
      return;
    }

    const row = await c.env.DB
      .prepare(
        `SELECT 1 AS allowed
         FROM role_permissions
         WHERE role_code = ? AND (permission_code = ? OR permission_code = '*')
         LIMIT 1`
      )
      .bind(role, permission)
      .first<{ allowed: number }>();

    if (!row) {
      return fail(c, `Forbidden: role "${role}" lacks "${permission}"`, 403);
    }

    await next();
  };
}
