export function DataTable({ headers, rows, empty = 'No data yet.' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.16em] text-sky-300">
          <tr>{headers.map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.length ? rows.map((row, index) => (
            <tr key={index} className="text-slate-200">{row.map((cell, cellIndex) => <td className="px-4 py-3" key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td className="px-4 py-4 text-slate-400" colSpan={headers.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

