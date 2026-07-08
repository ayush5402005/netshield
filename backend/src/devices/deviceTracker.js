import { execFile } from 'node:child_process';
import dns from 'node:dns/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import { displayDomainFor, isUserFacingDomain } from '../domain/domainCatalog.js';

const execFileAsync = promisify(execFile);

export class DeviceTracker {
  constructor(prisma, eventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.arpTimer = null;
  }

  async recordQuery(clientIp, { blocked = false } = {}) {
    const now = new Date();
    const existing = await this.prisma.device.findUnique({ where: { ip: clientIp } });
    const device = await this.prisma.device.upsert({
      where: { ip: clientIp },
      update: {
        lastSeen: now,
        totalQueries: { increment: 1 },
        blockedAttempts: blocked ? { increment: 1 } : undefined,
      },
      create: {
        ip: clientIp,
        firstSeen: now,
        lastSeen: now,
        totalQueries: 1,
        blockedAttempts: blocked ? 1 : 0,
      },
    });

    await this.eventBus.publish('device_seen', { deviceId: device.id, ip: clientIp, blocked });
    if (!existing) {
      await this.eventBus.publish('new_device', { deviceId: device.id, ip: clientIp });
    }
    return device;
  }

  startArpRefresh() {
    this.refreshArpData().catch((error) => console.warn('[Devices] ARP refresh failed:', error.message));
    this.arpTimer = setInterval(() => {
      this.refreshArpData().catch((error) => console.warn('[Devices] ARP refresh failed:', error.message));
    }, 30_000);
  }

  stopArpRefresh() {
    if (this.arpTimer) clearInterval(this.arpTimer);
  }

  async refreshArpData() {
    const entries = os.platform() === 'win32' ? await readWindowsArp() : await readLinuxArp();
    for (const entry of entries) {
      if (!isOfficeDeviceCandidate(entry.ip, entry.mac)) {
        continue;
      }
      const hostname = await reverseLookup(entry.ip);
      await this.prisma.device.upsert({
        where: { ip: entry.ip },
        update: { mac: entry.mac, hostname: hostname ?? undefined, lastSeen: new Date() },
        create: { ip: entry.ip, mac: entry.mac, hostname },
      });
    }
  }

  async listDevices() {
    const devices = await this.prisma.device.findMany({ orderBy: { lastSeen: 'desc' } });
    const visibleDevices = devices.filter(isVisibleDevice);
    return Promise.all(visibleDevices.map(async (device) => ({
      ...device,
      displayName: displayNameForDevice(device),
      source: device.totalQueries > 0 ? 'DNS traffic' : 'Network discovery',
      topDomains: await this.topDomainsForDevice(device.ip),
    })));
  }

  async getDevice(id) {
    const device = await this.prisma.device.findUnique({ where: { id: Number(id) } });
    if (!device) return null;
    return {
      ...device,
      displayName: displayNameForDevice(device),
      source: device.totalQueries > 0 ? 'DNS traffic' : 'Network discovery',
      topDomains: await this.topDomainsForDevice(device.ip, 25),
    };
  }

  async topDomainsForDevice(ip, take = 5) {
    const rows = await this.prisma.dnsLog.findMany({
      where: { clientIp: ip },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const counts = new Map();
    for (const row of rows) {
      if (!isUserFacingDomain(row.domain)) continue;
      const displayDomain = displayDomainFor(row.domain);
      counts.set(displayDomain, (counts.get(displayDomain) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, take);
  }
}

async function readWindowsArp() {
  const { stdout } = await execFileAsync('arp', ['-a']);
  const entries = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9-]{17})\s+/);
    if (match) entries.push({ ip: match[1], mac: match[2].replaceAll('-', ':').toLowerCase() });
  }
  return entries;
}

async function readLinuxArp() {
  const { stdout } = await execFileAsync('cat', ['/proc/net/arp']);
  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 4)
    .map((parts) => ({ ip: parts[0], mac: parts[3].toLowerCase() }));
}

async function reverseLookup(ip) {
  try {
    const [hostname] = await dns.reverse(ip);
    return hostname ?? null;
  } catch {
    return null;
  }
}

function displayNameForDevice(device) {
  if (device.ip === '127.0.0.1') return 'This computer (local test)';
  return device.hostname || device.mac || 'Unknown device';
}

function isVisibleDevice(device) {
  if (isSpecialNetworkIp(device.ip)) return false;
  if (device.totalQueries > 0) return true;
  return isOfficeDeviceCandidate(device.ip, device.mac);
}

function isOfficeDeviceCandidate(ip, mac) {
  return isPrivateUnicastIp(ip) && isRealMac(mac);
}

function isRealMac(mac) {
  if (!mac) return false;
  const normalized = mac.toLowerCase();
  return normalized !== 'ff:ff:ff:ff:ff:ff' && normalized !== '00:00:00:00:00:00';
}

function isPrivateUnicastIp(ip) {
  const octets = parseIpv4(ip);
  if (!octets || isSpecialNetworkIp(ip)) return false;
  const [a, b, , d] = octets;
  if (d === 0 || d === 255) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isSpecialNetworkIp(ip) {
  const octets = parseIpv4(ip);
  if (!octets) return true;
  const [a, b, c, d] = octets;
  if (ip === '255.255.255.255' || ip === '0.0.0.0') return true;
  if (a >= 224 && a <= 239) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127 && ip !== '127.0.0.1') return true;
  return a === 255 || (a === 0 && b === 0 && c === 0 && d === 0);
}

function parseIpv4(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number.parseInt(part, 10));
  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null;
}
