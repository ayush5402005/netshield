import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';

export function LiveTraffic({ liveEvents }) {
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState({ items: [], page: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    api.get(`/logs?page=${page}&pageSize=10`).then(setHistory).catch(console.error);
  }, [page]);

  const liveItems = useMemo(() => {
    const seen = new Set();
    return liveEvents
      .filter((event) => ['domain_visited', 'domain_blocked'].includes(event.type))
      .filter((event) => event.payload?.userFacing !== false)
      .map((event) => ({
        createdAt: event.createdAt,
        clientIp: event.payload.clientIp,
        displayDomain: event.payload.displayDomain || event.payload.domain,
        action: event.payload.action,
        currentlyBlocked: event.payload.action === 'blocked',
      }))
      .filter((item) => {
        const key = `${item.clientIp}:${item.displayDomain}:${item.action}:${new Date(item.createdAt).toLocaleTimeString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [liveEvents]);

  const visibleItems = page === 1 ? [...liveItems, ...history.items].slice(0, 10) : history.items;
  const rows = visibleItems.map((item) => [
    new Date(item.createdAt).toLocaleTimeString(),
    item.clientIp,
    item.displayDomain || item.domain,
    <ResultLabel item={item} />,
  ]);

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Live Traffic</h1>
        <p className="mt-2 text-slate-400">List of user-facing website lookups</p>
      </header>
      <section className="card p-5">
        <h2 className="mb-4 text-xl font-bold">Live Website Feed</h2>
        <DataTable headers={['Time', 'Device IP', 'Website', 'Result']} rows={rows} empty="No user-facing website traffic has reached NetShield yet." />
        <Pagination page={page} pageSize={10} total={Math.max(history.total, rows.length)} onPageChange={setPage} />
      </section>
    </section>
  );
}

function ResultLabel({ item }) {
  if (item.action === 'blocked') {
    return <span className="font-bold text-rose-300">Blocked</span>;
  }
  if (item.currentlyBlocked) {
    return <span className="font-bold text-amber-300">Blocked now</span>;
  }
  return <span className="text-emerald-300">Allowed</span>;
}
