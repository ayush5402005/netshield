import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { ensureDefaultAdmin, requireAuth } from './auth/authService.js';
import { EventBus } from './events/eventBus.js';
import { RuleEngine } from './rules/ruleEngine.js';
import { DeviceTracker } from './devices/deviceTracker.js';
import { DnsFilteringServer } from './dns/dnsFilteringServer.js';
import { ThreatEngine } from './threat/threatEngine.js';
import { AnalyticsEngine } from './analytics/analyticsEngine.js';
import { createApiRouter } from './routes/apiRoutes.js';
import { configureLiveNamespace } from './sockets/liveNamespace.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

await ensureDefaultAdmin(prisma);

const eventBus = new EventBus(prisma);
eventBus.attachSocketServer(io);
configureLiveNamespace(io);

const ruleEngine = new RuleEngine(prisma, eventBus);
await ruleEngine.load();

const deviceTracker = new DeviceTracker(prisma, eventBus);
const dnsServer = new DnsFilteringServer({ prisma, eventBus, ruleEngine, deviceTracker });
const threatEngine = new ThreatEngine(prisma, eventBus);
const analyticsEngine = new AnalyticsEngine(prisma, eventBus);

app.get('/api/healthz', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login') return next();
  return requireAuth(req, res, next);
});
app.use('/api', createApiRouter({ prisma, ruleEngine, deviceTracker, analyticsEngine, dnsServer }));

app.use((error, _req, res, _next) => {
  const status = error.status || (error.name === 'ZodError' ? 400 : 500);
  const message = error.name === 'ZodError' ? error.errors.map((item) => item.message).join(', ') : error.message;
  res.status(status).json({ success: false, error: message });
});

server.listen(env.httpPort, () => {
  console.log(`[API] Listening on http://127.0.0.1:${env.httpPort}`);
  console.log(`[Auth] Default admin: ${env.adminEmail} / ${env.adminPassword}`);
});

dnsServer.start();
deviceTracker.startArpRefresh();
threatEngine.start();
analyticsEngine.start();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  console.log('\n[System] Shutting down NetShield...');
  dnsServer.stop();
  deviceTracker.stopArpRefresh();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
