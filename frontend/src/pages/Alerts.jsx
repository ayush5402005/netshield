import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { SeverityBadge } from '../components/SeverityBadge.jsx';

export function Alerts({ liveEvents }) {
  const [page, setPage] = useState(1);
  const [alerts, setAlerts] = useState({ items: [], page: 1, pageSize: 10, total: 0 });

  async function load() {
    setAlerts(await api.get(`/alerts?page=${page}&pageSize=10`));
  }

  useEffect(() => {
    load().catch(console.error);
  }, [page, liveEvents.length]);

  async function resolveAlert(id) {
    await api.post(`/alerts/${id}/resolve`);
    await load();
  }

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Alerts & Threats</h1>
        <p className="mt-2 text-slate-400">Suspicious activity detected from DNS and device behavior.</p>
      </header>
      <section className="card p-5">
        <DataTable
          headers={['Time', 'Severity', 'Device', 'What happened', 'Status', 'Action']}
          rows={alerts.items.map((alert) => [
            new Date(alert.createdAt).toLocaleString(),
            <SeverityBadge severity={alert.severity} />,
            alert.deviceIp || '-',
            alert.message,
            alert.resolved ? 'Resolved' : 'Open',
            alert.resolved ? '-' : <button className="border border-slate-700 text-slate-100 hover:bg-slate-900" onClick={() => resolveAlert(alert.id)}>Resolve</button>,
          ])}
        />
        <Pagination page={page} pageSize={10} total={alerts.total} onPageChange={setPage} />
      </section>
    </section>
  );
}

