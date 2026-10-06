import { MessageCircle, RefreshCw } from "lucide-react";

export function Initials({ name, small = false }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AC";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#eee8db] font-semibold text-forest ${small ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"}`}
    >
      {initials}
    </span>
  );
}

export function MessagingEmpty({ title, children }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 rounded-3xl border border-[#e8dfcd] bg-cream p-5 text-clay">
        <MessageCircle size={30} strokeWidth={1.5} />
      </span>
      <h2 className="font-serif text-2xl text-forest">{title}</h2>
      <div className="mt-3 max-w-sm text-sm leading-6 text-muted">
        {children}
      </div>
    </div>
  );
}

export function MessagingError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="m-4 rounded-xl border border-clay/20 bg-clay-light p-4 text-sm text-clay-dark"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg font-semibold underline underline-offset-4"
        >
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function MessagingSkeleton() {
  return (
    <div role="status" className="space-y-5 p-6 motion-safe:animate-pulse">
      <span className="sr-only">Loading messages…</span>
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-cream" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-3 w-2/3 rounded bg-cream" />
            <div className="h-3 w-full rounded bg-cream" />
          </div>
        </div>
      ))}
    </div>
  );
}
