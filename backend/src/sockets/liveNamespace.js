import { authorizeSocket } from '../auth/authService.js';

export function configureLiveNamespace(io) {
  const live = io.of('/live');
  live.use(authorizeSocket);
  live.on('connection', (socket) => {
    console.log(`[Socket] Admin connected: ${socket.id}`);
    socket.emit('health_update', {
      type: 'system_health_changed',
      payload: { websocket: 'connected' },
      createdAt: new Date(),
    });
    socket.on('disconnect', () => console.log(`[Socket] Admin disconnected: ${socket.id}`));
  });
}

