import dotenv from 'dotenv';

dotenv.config();

function numberEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  httpPort: numberEnv('HTTP_PORT', 8080),
  dnsPort: numberEnv('DNS_PORT', 53),
  dnsHost: process.env.DNS_HOST ?? '0.0.0.0',
  upstreamDnsPrimary: process.env.UPSTREAM_DNS_PRIMARY ?? '1.1.1.1',
  upstreamDnsSecondary: process.env.UPSTREAM_DNS_SECONDARY ?? '8.8.8.8',
  jwtSecret: process.env.JWT_SECRET ?? 'change-this-secret-before-demo',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@netshield.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
  dnsRateLimitPerMinute: numberEnv('DNS_RATE_LIMIT_PER_MINUTE', 600),
  blockResponseIp: process.env.BLOCK_RESPONSE_IP ?? '0.0.0.0',
  blockedAttemptsThreshold: numberEnv('THREAT_BLOCKED_ATTEMPTS_THRESHOLD', 5),
  dnsQpmThreshold: numberEnv('THREAT_DNS_QPM_THRESHOLD', 300),
  entropyThreshold: Number.parseFloat(process.env.THREAT_ENTROPY_THRESHOLD ?? '4.2'),
  threatFeedUrl: process.env.THREAT_FEED_URL ?? '',
  threatFeedRefreshMinutes: numberEnv('THREAT_FEED_REFRESH_MINUTES', 60),
  portScanSimulation: boolEnv('PORT_SCAN_SIMULATION', false),
  portScanStart: numberEnv('PORT_SCAN_START', 9100),
  portScanEnd: numberEnv('PORT_SCAN_END', 9110),
};
