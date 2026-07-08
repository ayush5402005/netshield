export class RateLimiter {
  constructor(limitPerMinute) {
    this.limitPerMinute = limitPerMinute;
    this.clients = new Map();
  }

  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const hits = (this.clients.get(ip) ?? []).filter((timestamp) => timestamp >= windowStart);
    hits.push(now);
    this.clients.set(ip, hits);
    return hits.length <= this.limitPerMinute;
  }
}

