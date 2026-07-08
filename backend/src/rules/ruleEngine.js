import { execFile } from 'node:child_process';
import os from 'node:os';
import { domainMatches, expandedDomainRules, normalizeDomain } from '../domain/domainCatalog.js';

export class RuleEngine {
  constructor(prisma, eventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.blockedDomains = new Set();
    this.allowedDomains = new Set();
  }

  async load() {
    const rules = await this.prisma.rule.findMany();
    this.blockedDomains = new Set(rules.filter((rule) => rule.action === 'block').flatMap((rule) => expandedDomainRules(rule.domain)));
    this.allowedDomains = new Set(rules.filter((rule) => rule.action === 'allow').flatMap((rule) => expandedDomainRules(rule.domain)));
    console.log(`[Rules] Loaded ${this.blockedDomains.size} blocked domains`);
  }

  isBlocked(domain) {
    const normalized = normalizeDomain(domain);
    for (const allowed of this.allowedDomains) {
      if (domainMatches(normalized, allowed)) return false;
    }
    for (const blocked of this.blockedDomains) {
      if (domainMatches(normalized, blocked)) return true;
    }
    return false;
  }

  async blockDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error('Domain is required');
    await this.prisma.rule.deleteMany({ where: { domain: normalized, groupName: null } });
    await this.prisma.rule.create({ data: { domain: normalized, action: 'block' } });
    await this.load();
    flushSystemDnsCache();
    const expandedDomains = expandedDomainRules(normalized);
    await this.eventBus.publish('rule_changed', { action: 'block', domain: normalized, expandedDomains });
    return { domain: normalized, expandedDomains };
  }

  async unblockDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error('Domain is required');
    await this.prisma.rule.deleteMany({ where: { domain: normalized, action: 'block' } });
    await this.load();
    flushSystemDnsCache();
    await this.eventBus.publish('rule_changed', { action: 'unblock', domain: normalized });
    return { domain: normalized };
  }

  async listRules() {
    return this.prisma.rule.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

function flushSystemDnsCache() {
  if (os.platform() !== 'win32') return;
  execFile('ipconfig', ['/flushdns'], { windowsHide: true }, () => {});
}

export { normalizeDomain };
