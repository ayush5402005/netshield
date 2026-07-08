import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { StatCard } from '../components/StatCard.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';

export function Dashboard({ liveEvents }) {
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 10;

  useEffect(() => {
    const load = async () => {
      setSummary(await api.get('/analytics/summary'));
      setHealth(await api.get('/system/health'));
    };
    load();
  }, [liveEvents.length]);

  const activity = useMemo(() => liveEvents
    .filter((event) => {
      if (['domain_visited', 'domain_blocked'].includes(event.type)) return event.payload?.userFacing !== false;
      return ['alert_created', 'threat_detected', 'rule_changed'].includes(event.type);
    })
    .map((event) => [
      new Date(event.createdAt).toLocaleTimeString(),
      plainEvent(event.type),
      event.payload?.displayDomain ?? event.payload?.domain ?? event.payload?.message ?? event.payload?.ip ?? '-',
    ]), [liveEvents]);
  const recent = activity.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);

  return (
    <section className="grid gap-6">
      <header>
        <p className="font-bold uppercase tracking-[0.25em] text-cyan">NetShield</p>
        <h1 className="page-title">Office Protection Dashboard</h1>
        <p className="mt-2 text-slate-400">Live view of user-facing website access, blocked attempts, and alerts.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Online Devices" value={summary?.onlineDevices ?? 0} />
        <StatCard label="Requests Today" value={summary?.requestsToday ?? 0} />
        <StatCard label="Blocked Today" value={summary?.blockedToday ?? 0} />
        <StatCard label="Active Alerts" value={summary?.activeAlerts ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card p-5">
          <h2 className="mb-4 text-xl font-bold">Live Activity</h2>
          <DataTable headers={['Time', 'What happened', 'Website / detail']} rows={recent} empty="No user-facing live activity yet." />
          <Pagination page={activityPage} pageSize={activityPageSize} total={activity.length} onPageChange={setActivityPage} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-xl font-bold">Protection Status</h2>
          <div className="rounded-lg bg-slate-950 p-4">
            <div className="text-3xl font-black text-emerald-300">{health?.dns?.running ? 'Protected' : 'Needs attention'}</div>
            <p className="mt-2 text-slate-400">DNS server: {health?.dns?.running ? `running on port ${health.dns.port}` : 'not confirmed'}</p>
            <p className="text-slate-400">Database: {health?.database ?? 'checking'}</p>
          </div>
        </section>
      </div>
    </section>
  );
}

function plainEvent(type) {
  return {
    domain_visited: 'Website visited',
    domain_blocked: 'Website blocked',
    alert_created: 'Alert created',
    rule_changed: 'Rule changed',
    threat_detected: 'Threat detected',
  }[type] ?? type;
}
