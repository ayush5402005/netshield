import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';

export function Reports({ liveEvents }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/analytics/summary').then(setSummary).catch(console.error);
  }, [liveEvents.length]);

  function exportCsv() {
    const rows = [['Website', 'Requests'], ...(summary?.topDomains ?? []).map((item) => [item.domain, item.count])];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'netshield-top-websites.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Reports</h1>
        <p className="mt-2 text-slate-400">Daily office summary for user-facing websites.</p>
      </header>
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Top Websites</h2>
          <button className="bg-cyan text-slate-950" onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={summary?.topDomains ?? []}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="domain" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#67e8f9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </section>
  );
}
