import { AlertTriangle, BarChart3, Blocks, Gauge, HeartPulse, LayoutDashboard, MonitorSmartphone, Radio, Settings } from 'lucide-react';

const navItems = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['devices', 'Devices', MonitorSmartphone],
  ['blocking', 'Website Blocking', Blocks],
  ['live', 'Live Traffic', Radio],
  ['alerts', 'Alerts', AlertTriangle],
  ['reports', 'Reports', BarChart3],
  ['health', 'System Health', HeartPulse],
  ['settings', 'Settings', Settings],
];

export function Layout({ page, setPage, children, onLogout, socketConnected }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950/95 p-5 md:min-h-screen md:border-b-0 md:border-r">
        <div className="mb-8">
          <div className="text-xl font-black">NetShield</div>
          <div className="text-sm text-slate-400">Your Office Gateway</div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {socketConnected ? 'Live connected' : 'Live disconnected'}
          </div>
        </div>
        <nav className="grid gap-2">
          {navItems.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`flex items-center justify-start gap-3 ${page === key ? 'bg-cyan text-slate-950' : 'bg-transparent text-slate-300 hover:bg-slate-900'}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button className="mt-8 w-full border border-slate-700 text-slate-200 hover:bg-slate-900" onClick={onLogout}>Sign out</button>
      </aside>
      <main className="p-5 md:p-8">{children}</main>
    </div>
  );
}

