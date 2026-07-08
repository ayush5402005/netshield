import { EventEmitter } from 'node:events';

const socketEventMap = {
  domain_visited: 'traffic_event',
  domain_blocked: 'traffic_event',
  device_seen: 'device_update',
  new_device: 'device_update',
  alert_created: 'alert_new',
  rule_changed: 'rule_updated',
  threat_detected: 'alert_new',
  system_health_changed: 'health_update',
};

export class EventBus {
  constructor(prisma) {
    this.prisma = prisma;
    this.emitter = new EventEmitter();
    this.io = null;
  }

  attachSocketServer(io) {
    this.io = io;
  }

  on(type, handler) {
    this.emitter.on(type, handler);
  }

  async publish(type, payload = {}) {
    const event = await this.prisma.event.create({ data: { type, payload } });
    const envelope = {
      id: event.id,
      type,
      payload,
      createdAt: event.createdAt,
    };
    this.emitter.emit(type, envelope);
    this.emitter.emit('*', envelope);

    const socketEvent = socketEventMap[type] ?? 'traffic_event';
    this.io?.of('/live').emit(socketEvent, envelope);
    return envelope;
  }
}

