export function Pagination({ page, pageSize = 10, total, onPageChange }) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  if (pageCount <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
      <span>
        Page {page} of {pageCount} · {total} total
      </span>
      <div className="flex gap-2">
        <button className="border border-slate-700 text-slate-100 hover:bg-slate-900" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <button className="border border-slate-700 text-slate-100 hover:bg-slate-900" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

