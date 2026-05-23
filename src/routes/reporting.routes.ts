import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import {
  generateProcessCardsSchema,
  handleAbnormalSchema,
  operationReportSchema,
  reportingListQuerySchema,
  scanProcessCardSchema,
  voidProcessCardSchema,
} from '../schemas/reporting';
import { ReportingService } from '../services/reporting.service';
import { fail, ok } from '../utils/http';

export const reportingRoutes = new Hono<AppEnv>();

reportingRoutes.get('/cards', zValidator('query', reportingListQuerySchema), async (c) => {
  const service = new ReportingService(c.env.DB);
  return ok(c, await service.listCards(c.req.valid('query')));
});

reportingRoutes.post('/cards/generate', zValidator('json', generateProcessCardsSchema), async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.generateCards(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to generate process cards');
  }
});

reportingRoutes.get('/cards/:id', async (c) => {
  const service = new ReportingService(c.env.DB);
  const detail = await service.getCard(c.req.param('id'));
  if (!detail) return fail(c, 'flow card not found', 404);
  return ok(c, detail);
});

reportingRoutes.post('/cards/:id/print', async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.markPrinted(c.req.param('id')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to mark printed');
  }
});

reportingRoutes.post('/cards/:id/void', zValidator('json', voidProcessCardSchema), async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.voidCard(c.req.param('id'), c.req.valid('json')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to void process card');
  }
});

reportingRoutes.post('/scan', zValidator('json', scanProcessCardSchema), async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.scanCard(c.req.valid('json').code));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to scan process card', 404);
  }
});

reportingRoutes.get('/reports', zValidator('query', reportingListQuerySchema), async (c) => {
  const service = new ReportingService(c.env.DB);
  return ok(c, await service.listReports(c.req.valid('query')));
});

reportingRoutes.post('/reports', zValidator('json', operationReportSchema), async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.submitReport(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to submit operation report');
  }
});

reportingRoutes.get('/abnormals', zValidator('query', reportingListQuerySchema), async (c) => {
  const service = new ReportingService(c.env.DB);
  return ok(c, await service.listAbnormals(c.req.valid('query')));
});

reportingRoutes.post('/abnormals/:id/handle', zValidator('json', handleAbnormalSchema), async (c) => {
  try {
    const service = new ReportingService(c.env.DB);
    return ok(c, await service.handleAbnormal(c.req.param('id'), c.req.valid('json')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to handle abnormal record');
  }
});

reportingRoutes.get('/wip-transactions', zValidator('query', reportingListQuerySchema), async (c) => {
  const service = new ReportingService(c.env.DB);
  return ok(c, await service.listWipTransactions(c.req.valid('query')));
});
