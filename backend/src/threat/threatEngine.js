import net from 'node:net';
import { env } from '../config/env.js';

export class ThreatEngine {
  constructor(prisma, eventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.blockedAttempts = new Map();
    this.queryWindows = new Map();
    this.maliciousDomains = new Set();
    this.portHits = new Map();
    this.scanServers = [];
  }

  start() {
    this.eventBus.on('domain_blocked', (event) => this.handleBlockedAttempt(event));
    this.eventBus.on('domain_visited', (event) => this.handleDnsAnomaly(event));
    this.eventBus.on('new_device', (event) => this.createAlert({
      type: 'new_unknown_device',
      severity: 'medium',
      deviceIp: event.payload.ip,
      message: `New device detected at ${event.payload.ip}`,
    }));
    this.refreshThreatFeed().catch((error) => console.warn('[Threat] Feed refresh failed:', error.message));
    setInterval(() => this.refreshThreatFeed().catch(() => {}), env.threatFeedRefreshMinutes * 60_000);
    if (env.portScanSimulation) this.startPortScanSimulation();
  }

  async handleBlockedAttempt(event) {
    const { clientIp, domain } = event.payload;
    const key = `${clientIp}:blocked`;
    const hits = recentHits(this.blockedAttempts.get(key), 5 * 60_000);
    hits.push(Date.now());
    this.blockedAttempts.set(key, hits);
    await this.handleDnsAnomaly(event);
    if (hits.length >= env.blockedAttemptsThreshold) {
      await this.createAlert({
        type: 'repeated_blocked_attempts',
        severity: 'medium',
        deviceIp: clientIp,
        message: `${clientIp} tried blocked websites ${hits.length} times in 5 minutes. Latest: ${domain}`,
      });
    }
  }

  async handleDnsAnomaly(event) {
    const { clientIp, domain } = event.payload;
    const key = `${clientIp}:queries`;
    const hits = recentHits(this.queryWindows.get(key), 60_000);
    hits.push(Date.now());
    this.queryWindows.set(key, hits);

    if (hits.length > env.dnsQpmThreshold) {
      await this.createAlert({
        type: 'dns_rate_anomaly',
        severity: 'high',
        deviceIp: clientIp,
        message: `${clientIp} made ${hits.length} DNS requests in one minute.`,
      });
    }

    const subdomain = String(domain).split('.')[0] ?? '';
    if (subdomain.length >= 16 && shannonEntropy(subdomain) >= env.entropyThreshold) {
      await this.createAlert({
        type: 'possible_dns_tunneling',
        severity: 'high',
        deviceIp: clientIp,
        message: `Random-looking DNS name detected: ${domain}`,
      });
    }

    if (this.maliciousDomains.has(domain)) {
      await this.createAlert({
        type: 'malicious_domain',
        severity: 'critical',
        deviceIp: clientIp,
        message: `${clientIp} queried known malicious domain ${domain}`,
      });
    }
  }

  async createAlert({ type, severity, deviceIp, message }) {
    const recentDuplicate = await this.prisma.alert.findFirst({
      where: { type, deviceIp, message, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
    });
    if (recentDuplicate) return recentDuplicate;

    const alert = await this.prisma.alert.create({ data: { type, severity, deviceIp, message } });
    await this.eventBus.publish('alert_created', alert);
    await this.eventBus.publish('threat_detected', alert);
    return alert;
  }

  async refreshThreatFeed() {
    if (!env.threatFeedUrl) return;
    const response = await fetch(env.threatFeedUrl);
    const text = await response.text();
    const domains = new Set();
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      const domain = parts.at(-1)?.toLowerCase();
      if (domain && domain.includes('.')) domains.add(domain);
    }
    this.maliciousDomains = domains;
    console.log(`[Threat] Loaded ${domains.size} malicious domains`);
  }

  startPortScanSimulation() {
    for (let port = env.portScanStart; port <= env.portScanEnd; port += 1) {
      const server = net.createServer((socket) => {
        const ip = socket.remoteAddress?.replace('::ffff:', '') ?? 'unknown';
        const hits = recentHits(this.portHits.get(ip), 10_000);
        hits.push(Date.now());
        this.portHits.set(ip, hits);
        if (hits.length >= 5) {
          this.createAlert({
            type: 'port_scan_simulation',
            severity: 'high',
            deviceIp: ip,
            message: `${ip} connected to ${hits.length} NetShield test ports in 10 seconds.`,
          }).catch(() => {});
        }
        socket.destroy();
      });
      server.listen(port, () => console.log(`[Threat] Port scan sensor listening on ${port}`));
      this.scanServers.push(server);
    }
  }
}

function recentHits(existing = [], windowMs) {
  const cutoff = Date.now() - windowMs;
  return existing.filter((timestamp) => timestamp >= cutoff);
}

function shannonEntropy(value) {
  const counts = new Map();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

