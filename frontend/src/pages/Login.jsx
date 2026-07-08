import { useState } from 'react';
import { api } from '../api/client.js';

export function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@netshield.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('netshield_token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <form onSubmit={submit} className="card grid w-full max-w-md gap-4 p-8">
        <div>
          <div className="text-3xl font-black">NetShield</div>
          <p className="mt-2 text-slate-400">Sign in to manage office network protection.</p>
        </div>
        <label className="grid gap-2 text-sm text-slate-300">Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="grid gap-2 text-sm text-slate-300">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div>}
        <button className="bg-cyan text-slate-950">Sign in</button>
      </form>
    </main>
  );
}

