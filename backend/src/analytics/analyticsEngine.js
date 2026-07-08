import { displayDomainFor, isUserFacingDomain } from '../domain/domainCatalog.js';

export class AnalyticsEngine {
  constructor(prisma, eventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.timer = null;
  }

  start() {
    this.captureSnapshot().catch((error) => console.warn('[Analytics] Snapshot failed:', error.message));
    this.timer = setInterval(() => {
      this.captureSnapshot().catch((error) => console.warn('[Analytics] Snapshot failed:', error.message));
    }, 60_000);
  }

  async captureSnapshot() {
    const data = await this.summary();
    await this.prisma.analyticsSnapshot.create({ data: { data } });
    return data;
  }

  async summary() {
    const sinceToday = new Date();
    sinceToday.setHours(0, 0, 0, 0);

    const [onlineDevices, blockedToday, activeAlerts, requestsToday, recentLogs, topDevices] = await Promise.all([
      this.prisma.device.count({ where: { lastSeen: { gte: new Date(Date.now() - 5 * 60_000) } } }),
      this.prisma.dnsLog.count({ where: { action: 'blocked', createdAt: { gte: sinceToday } } }),
      this.prisma.alert.count({ where: { resolved: false } }),
      this.prisma.dnsLog.count({ where: { createdAt: { gte: sinceToday } } }),
      this.prisma.dnsLog.findMany({
        where: { createdAt: { gte: sinceToday } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.prisma.dnsLog.groupBy({
        by: ['clientIp'],
        _count: { clientIp: true },
        orderBy: { _count: { clientIp: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      onlineDevices,
      blockedToday,
      activeAlerts,
      requestsToday,
      topDomains: aggregateTopDomains(recentLogs, 10),
      topDevices: topDevices.map((row) => ({ ip: row.clientIp, count: row._count.clientIp })),
    };
  }
}

function aggregateTopDomains(logs, take) {
  const counts = new Map();
  for (const log of logs) {
    if (!isUserFacingDomain(log.domain)) continue;
    const displayDomain = displayDomainFor(log.domain);
    counts.set(displayDomain, (counts.get(displayDomain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, take);
}
