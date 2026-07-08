const colors = {
  info: 'bg-slate-700 text-slate-100',
  low: 'bg-sky-500/20 text-sky-200',
  medium: 'bg-amber-500/20 text-amber-200',
  high: 'bg-orange-500/20 text-orange-200',
  critical: 'bg-rose-500/20 text-rose-200',
};

export function SeverityBadge({ severity }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${colors[severity] ?? colors.info}`}>{severity}</span>;
}

