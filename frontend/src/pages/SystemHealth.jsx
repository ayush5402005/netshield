import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { StatCard } from '../components/StatCard.jsx';

export function SystemHealth() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const load = () => api.get('/system/health').then(setHealth).catch(console.error);
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">System Health</h1>
        <p className="mt-2 text-slate-400">Operational status for DNS, API, database, and upstream resolver.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="API" value={health?.api ?? 'checking'} />
        <StatCard label="Database" value={health?.database ?? 'checking'} />
        <StatCard label="DNS Queries" value={health?.dns?.queries ?? 0} />
        <StatCard label="Blocked" value={health?.dns?.blocked ?? 0} />
      </div>
      <section className="card p-5">
        <h2 className="mb-4 text-xl font-bold">DNS Server</h2>
        <div className="grid gap-3 text-slate-300">
          <p>Status: {health?.dns?.running ? 'Running' : 'Not confirmed'}</p>
          <p>Address: {health?.dns?.host}:{health?.dns?.port}</p>
          <p>Upstream DNS: {health?.dns?.upstream?.join(', ')}</p>
          <p>Last error: {health?.dns?.lastError || 'None'}</p>
        </div>
      </section>
    </section>
  );
}

