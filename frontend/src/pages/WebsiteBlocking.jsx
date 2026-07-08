import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';

export function WebsiteBlocking({ liveEvents }) {
  const [rules, setRules] = useState([]);
  const [domain, setDomain] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);

  const blocked = useMemo(() => rules.filter((rule) => rule.action === 'block'), [rules]);
  const pageSize = 10;
  const visibleBlocked = useMemo(() => blocked.slice((page - 1) * pageSize, page * pageSize), [blocked, page]);

  async function load() {
    setRules(await api.get('/rules'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, [liveEvents.length]);

  async function blockDomain() {
    setMessage('');
    try {
      const result = await api.post('/rules/block-domain', { domain });
      setDomain('');
      const related = result.expandedDomains?.length > 1 ? ` Related service domains are protected too.` : '';
      setMessage(`Website blocked.${related} If it is already open, close the tab or wait for DNS cache to clear.`);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function unblockDomain(target) {
    setMessage('');
    try {
      await api.post('/rules/unblock-domain', { domain: target });
      setMessage('Website unblocked. No server restart needed.');
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Website Blocking</h1>
        <p className="mt-2 text-slate-400">Block websites for devices using NetShield DNS.</p>
      </header>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-bold">Block a website</h2>
        <div className="flex flex-wrap gap-3">
          <input className="min-w-[280px] flex-1" placeholder="Example: youtube.com" value={domain} onChange={(event) => setDomain(event.target.value)} />
          <button className="bg-cyan text-slate-950" disabled={!domain.trim()} onClick={blockDomain}>Block Website</button>
        </div>
        {message && <p className="text-sm text-slate-300">{message}</p>}
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-xl font-bold">Blocked Websites</h2>
        <DataTable
          headers={['Website', 'Action', 'Added']}
          rows={visibleBlocked.map((rule) => [
            rule.domain,
            <button className="border border-slate-700 text-slate-100 hover:bg-slate-900" onClick={() => unblockDomain(rule.domain)}>Unblock</button>,
            new Date(rule.createdAt).toLocaleString(),
          ])}
          empty="No websites are blocked."
        />
        <Pagination page={page} pageSize={pageSize} total={blocked.length} onPageChange={setPage} />
      </section>
    </section>
  );
}

