import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';

export function Devices({ liveEvents }) {
  const [page, setPage] = useState(1);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    api.get('/devices').then(setDevices).catch(console.error);
  }, [liveEvents.length]);

  const pageSize = 10;
  const visibleDevices = useMemo(() => devices.slice((page - 1) * pageSize, page * pageSize), [devices, page]);

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Devices</h1>
        <p className="mt-2 text-slate-400">Computers and phones NetShield has seen through DNS traffic or clean network discovery.</p>
      </header>
      <section className="card p-5">
        <DataTable
          headers={['Device', 'IP address', 'Seen by', 'Last seen', 'DNS requests', 'Blocked attempts', 'Top websites']}
          rows={visibleDevices.map((device) => [
            device.displayName || device.hostname || device.mac || 'Unknown device',
            device.ip,
            device.source || 'DNS traffic',
            new Date(device.lastSeen).toLocaleString(),
            device.totalQueries,
            device.blockedAttempts,
            device.topDomains?.slice(0, 3).map((item) => item.domain).join(', ') || '-',
          ])}
          empty="No devices yet. Point a client DNS setting to NetShield and browse a site."
        />
        <Pagination page={page} pageSize={pageSize} total={devices.length} onPageChange={setPage} />
      </section>
    </section>
  );
}
