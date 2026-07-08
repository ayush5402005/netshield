import express from 'express';
import { z } from 'zod';
import { login } from '../auth/authService.js';
import { displayDomainFor, isUserFacingDomain } from '../domain/domainCatalog.js';

const domainSchema = z.object({ domain: z.string().min(1) });

export function createApiRouter({ prisma, ruleEngine, deviceTracker, analyticsEngine, dnsServer }) {
  const router = express.Router();

  router.post('/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const token = await login(prisma, email, password);
    res.json({ success: true, data: { token } });
  }));

  router.get('/devices', asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await deviceTracker.listDevices() });
  }));

  router.get('/devices/:id', asyncHandler(async (req, res) => {
    const device = await deviceTracker.getDevice(req.params.id);
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    return res.json({ success: true, data: device });
  }));

  router.get('/rules', asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await ruleEngine.listRules() });
  }));

  router.post('/rules/block-domain', asyncHandler(async (req, res) => {
    const { domain } = domainSchema.parse(req.body);
    const blocked = await ruleEngine.blockDomain(domain);
    res.status(201).json({ success: true, data: { ...blocked, action: 'block' } });
  }));

  router.post('/rules/unblock-domain', asyncHandler(async (req, res) => {
    const { domain } = domainSchema.parse(req.body);
    const unblocked = await ruleEngine.unblockDomain(domain);
    res.json({ success: true, data: { ...unblocked, action: 'unblock' } });
  }));

  router.get('/alerts', asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 10), 1), 50);
    const [items, total] = await Promise.all([
      prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.alert.count(),
    ]);
    res.json({ success: true, data: { items, page, pageSize, total } });
  }));

  router.post('/alerts/:id/resolve', asyncHandler(async (req, res) => {
    const alert = await prisma.alert.update({ where: { id: Number(req.params.id) }, data: { resolved: true } });
    res.json({ success: true, data: alert });
  }));

  router.get('/analytics/summary', asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await analyticsEngine.summary() });
  }));

  router.get('/logs', asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 10), 1), 50);
    const userOnly = req.query.raw !== 'true';
    const where = {
      domain: req.query.domain ? { contains: String(req.query.domain) } : undefined,
      clientIp: req.query.device ? String(req.query.device) : undefined,
    };
    const rawLogs = await prisma.dnsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const logs = coalesceLogs(rawLogs
      .map((log) => ({
        ...log,
        displayDomain: displayDomainFor(log.domain),
        currentlyBlocked: ruleEngine.isBlocked(log.domain),
        userFacing: isUserFacingDomain(log.domain),
      }))
      .filter((log) => !userOnly || log.userFacing));
    const total = logs.length;
    const items = logs.slice((page - 1) * pageSize, page * pageSize);
    res.json({ success: true, data: { items, page, pageSize, total } });
  }));

  router.get('/system/health', asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        api: 'online',
        database: 'online',
        dns: dnsServer.status(),
      },
    });
  }));

  return router;
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function coalesceLogs(logs) {
  const result = [];
  for (const log of logs) {
    const previous = result.at(-1);
    const closeToPrevious = previous && Math.abs(new Date(previous.createdAt) - new Date(log.createdAt)) <= 10_000;
    if (previous && closeToPrevious && previous.clientIp === log.clientIp && previous.displayDomain === log.displayDomain && previous.action === log.action) {
      continue;
    }
    result.push(log);
  }
  return result;
}
