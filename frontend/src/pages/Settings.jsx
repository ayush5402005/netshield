import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function Settings() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.get('/system/health').then(setHealth).catch(console.error);
  }, []);

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-slate-400">Current NetShield runtime configuration.</p>
      </header>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-bold">DNS Settings</h2>
        <label className="grid gap-2 text-sm text-slate-300">DNS listener<input readOnly value={`${health?.dns?.host ?? '0.0.0.0'}:${health?.dns?.port ?? 53}`} /></label>
        <label className="grid gap-2 text-sm text-slate-300">Upstream DNS<input readOnly value={health?.dns?.upstream?.join(', ') ?? '1.1.1.1, 8.8.8.8'} /></label>
        {/* <p className="text-sm text-slate-400">Editable settings are planned for v1.1. In v1, change these values in backend/.env and restart NetShield.</p> */}
      </section>
    </section>
  );
}

