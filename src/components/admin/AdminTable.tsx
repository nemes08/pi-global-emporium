import type { ReactNode } from "react";
import { useState } from "react";

/** Shared search + filter toolbar for admin tables. */
export function AdminToolbar({
  search,
  onSearch,
  placeholder = "Search…",
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="admin-search">
        Search
      </label>
      <input
        id="admin-search"
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-silver placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
      {children}
    </div>
  );
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `admin-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-[10px] uppercase tracking-widest text-silver/60">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-silver focus:outline-none focus:ring-2 focus:ring-gold/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-onyx">
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

export function usePaging<T>(rows: T[], size = 12) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(page, pages - 1);
  const slice = rows.slice(safePage * size, safePage * size + size);
  return { slice, page: safePage, pages, setPage, total: rows.length };
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-xs text-silver/60" aria-live="polite">
        Page {page + 1} of {pages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages - 1}
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

export function AdminEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-3xl border border-white/10 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent text-2xl">
        ◎
      </div>
      <h2 className="mt-4 font-display text-xl text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function AdminSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass h-16 animate-pulse rounded-2xl border border-white/10" />
      ))}
    </div>
  );
}
