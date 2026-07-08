import dns from 'node:dns/promises';
import { Packet, createUDPServer } from 'dns2';
import { env } from '../config/env.js';
import { domainView, normalizeDomain } from '../domain/domainCatalog.js';
import { RateLimiter } from './rateLimiter.js';

export class DnsFilteringServer {
  constructor({ prisma, eventBus, ruleEngine, deviceTracker }) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.ruleEngine = ruleEngine;
    this.deviceTracker = deviceTracker;
    this.rateLimiter = new RateLimiter(env.dnsRateLimitPerMinute);
    this.server = null;
    this.startedAt = null;
    this.queries = 0;
    this.blocked = 0;
    this.lastError = null;
    dns.setServers([env.upstreamDnsPrimary, env.upstreamDnsSecondary]);
  }

  start() {
    this.server = createUDPServer(async (request, send, rinfo) => {
      const response = await this.safeHandleRequest(request, rinfo);
      send(response);
    });

    this.server.on('listening', () => {
      this.startedAt = new Date();
      console.log(`[DNS] Listening on udp://${env.dnsHost}:${env.dnsPort}`);
    });
    this.server.on('error', (error) => {
      this.lastError = error.message;
      console.error('[DNS] Server error:', error.message);
    });
    this.server.listen(env.dnsPort, env.dnsHost);
  }

  stop() {
    this.server?.close?.();
  }

  async safeHandleRequest(request, rinfo) {
    try {
      return await this.handleRequest(request, rinfo);
    } catch (error) {
      this.lastError = error.message;
      console.warn('[DNS] Fail-open:', error.message);
      try {
        return await this.resolveFailOpen(request);
      } catch (fallbackError) {
        this.lastError = fallbackError.message;
        console.warn('[DNS] Fail-open fallback failed:', fallbackError.message);
        return this.errorResponse(request, Packet.RCODE.SERVFAIL);
      }
    }
  }

  async handleRequest(request, rinfo) {
    const question = request.questions?.[0];
    const domain = normalizeDomain(question?.name);
    const clientIp = rinfo?.address ?? 'unknown';
    if (!question || !domain) return Packet.createResponseFromRequest(request);

    this.queries += 1;
    const rateAllowed = this.rateLimiter.isAllowed(clientIp);
    const blocked = this.ruleEngine.isBlocked(domain);
    const view = domainView(domain);
    if (blocked) this.blocked += 1;

    await this.deviceTracker.recordQuery(clientIp, { blocked });
    await this.prisma.dnsLog.create({
      data: { domain, clientIp, action: blocked ? 'blocked' : 'allowed' },
    });

    await this.eventBus.publish(blocked ? 'domain_blocked' : 'domain_visited', {
      domain,
      displayDomain: view.displayDomain,
      userFacing: view.userFacing,
      clientIp,
      action: blocked ? 'blocked' : 'allowed',
      rateLimited: !rateAllowed,
    });

    if (blocked || !rateAllowed) {
      return this.blockedResponse(request, domain, question.type);
    }
    return this.allowedResponse(request, domain, question.type);
  }

  blockedResponse(request, domain, type) {
    const response = Packet.createResponseFromRequest(request);
    if (type === Packet.TYPE.A) {
      response.answers.push({
        name: domain,
        type: Packet.TYPE.A,
        class: Packet.CLASS.IN,
        ttl: 30,
        address: env.blockResponseIp,
      });
    } else if (type === Packet.TYPE.AAAA) {
      response.answers.push({
        name: domain,
        type: Packet.TYPE.AAAA,
        class: Packet.CLASS.IN,
        ttl: 30,
        address: '::',
      });
    }
    return response;
  }

  async allowedResponse(request, domain, type) {
    const response = Packet.createResponseFromRequest(request);
    if (type === Packet.TYPE.A) {
      const addresses = await resolveRecords(() => dns.resolve4(domain));
      for (const address of addresses) {
        response.answers.push({ name: domain, type: Packet.TYPE.A, class: Packet.CLASS.IN, ttl: 60, address });
      }
    } else if (type === Packet.TYPE.AAAA) {
      const addresses = await resolveRecords(() => dns.resolve6(domain));
      for (const address of addresses) {
        response.answers.push({ name: domain, type: Packet.TYPE.AAAA, class: Packet.CLASS.IN, ttl: 60, address });
      }
    }
    return response;
  }

  async resolveFailOpen(request) {
    const question = request.questions?.[0];
    if (!question?.name) return Packet.createResponseFromRequest(request);
    return this.allowedResponse(request, normalizeDomain(question.name), question.type);
  }

  errorResponse(request, rcode) {
    const response = Packet.createResponseFromRequest(request);
    response.header.rcode = rcode;
    return response;
  }

  status() {
    const uptimeSeconds = this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;
    return {
      running: Boolean(this.startedAt),
      host: env.dnsHost,
      port: env.dnsPort,
      uptimeSeconds,
      queries: this.queries,
      blocked: this.blocked,
      lastError: this.lastError,
      upstream: [env.upstreamDnsPrimary, env.upstreamDnsSecondary],
    };
  }
}

async function resolveRecords(resolve) {
  try {
    return await resolve();
  } catch (error) {
    if (['ENODATA', 'ENOTFOUND', 'ENODOMAIN', 'NOTFOUND'].includes(error.code)) {
      return [];
    }
    throw error;
  }
}
