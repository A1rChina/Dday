import type { Context } from 'hono';

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ ok: true, data }, status);
}

export function fail(c: Context, message: string, status: 400 | 401 | 403 | 404 | 409 | 500 = 400) {
  return c.json({ ok: false, error: message }, status);
}
