export function StatCard({ label, value, hint }) {
  return (
    <section className="card p-5">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">{label}</div>
      <div className="mt-4 text-3xl font-black text-white">{value}</div>
      {hint && <div className="mt-2 text-sm text-slate-400">{hint}</div>}
    </section>
  );
}

