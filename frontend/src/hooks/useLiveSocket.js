import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { socketUrl } from '../api/client.js';

export function useLiveSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('netshield_token');
    if (!token) return undefined;

    const socket = io(socketUrl, { auth: { token } });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const push = (event) => setEvents((current) => [event, ...current].slice(0, 100));
    socket.on('traffic_event', push);
    socket.on('device_update', push);
    socket.on('alert_new', push);
    socket.on('rule_updated', push);
    socket.on('health_update', push);

    return () => socket.disconnect();
  }, [enabled]);

  return { connected, events };
}

