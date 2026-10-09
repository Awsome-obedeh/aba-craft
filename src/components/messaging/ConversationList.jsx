"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  messagingApi,
  messageError,
  shortDate,
} from "@/app/lib/messaging/client";
import {
  Initials,
  MessagingEmpty,
  MessagingError,
  MessagingSkeleton,
} from "./MessagingUI";

export default function ConversationList({ selectedId, role }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  return (
    <section
      aria-label="Conversations"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="border-b border-brandBorder p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-forest">Your conversations</h2>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Inbox
          </span>
        </div>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
          className="flex items-center gap-2 rounded-xl border border-brandBorder bg-cream px-3"
        >
          <input
            aria-label="Search conversations"
            value={search}
            maxLength={100}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or products"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
          />
          <button
            type="submit"
            aria-label="Search inbox"
            className="rounded-lg p-2 text-muted"
          >
            <Search size={17} />
          </button>
        </form>
      </div>
      <ConversationResults
        key={query}
        query={query}
        selectedId={selectedId}
        role={role}
      />
    </section>
  );
}

function ConversationResults({ query, selectedId, role }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const initialized = useRef(false);

  const load = useCallback(
    async (before = null, signal) => {
      if (busy.current) return;
      busy.current = true;
      if (before) setLoadingMore(true);
      try {
        const params = new URLSearchParams({ search: query });
        if (before) params.set("before", before);
        const { data } = await messagingApi.get(`?${params}`, { signal });
        if (signal?.aborted) return;
        setItems((previous) => {
          const combined = new Map(previous.map((item) => [item.id, item]));
          data.conversations.forEach((item) => combined.set(item.id, item));
          return [...combined.values()].sort(
            (a, b) =>
              b.lastMessageAt.localeCompare(a.lastMessageAt) ||
              b.id.localeCompare(a.id),
          );
        });
        if (before || !initialized.current) setCursor(data.nextCursor);
        initialized.current = true;
        setError("");
      } catch (error) {
        if (!signal?.aborted) setError(messageError(error));
      } finally {
        busy.current = false;
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (!document.hidden) load(null, controller.signal);
    };
    refresh();
    const timer = setInterval(refresh, 8000);
    window.addEventListener("abacraft:messages", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      busy.current = false;
      clearInterval(timer);
      window.removeEventListener("abacraft:messages", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  if (loading) return <MessagingSkeleton />;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {error && <MessagingError message={error} onRetry={() => load()} />}
      {!items.length && !error && (
        <MessagingEmpty
          title={
            query ? "No conversations found" : "Good things start with hello"
          }
        >
          {query ? (
            "Try a different name or product."
          ) : role === "customer" ? (
            <>
              Open a product and select Contact vendor to ask your first
              question.
              <Link
                href="/dashboard/products"
                className="mt-5 block font-semibold text-clay underline underline-offset-4"
              >
                Explore the marketplace
              </Link>
            </>
          ) : (
            "When a buyer contacts you about a product, their conversation will appear here."
          )}
        </MessagingEmpty>
      )}
      <ul className="p-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/dashboard/messages?conversation=${item.id}`}
              scroll={false}
              aria-current={selectedId === item.id ? "page" : undefined}
              className={`my-1 flex gap-3 rounded-xl border p-3.5 transition-colors ${selectedId === item.id ? "border-[#ddd4bd] bg-[#f7f1e5]" : "border-transparent hover:bg-cream"}`}
            >
              <Initials name={item.participant.name} small />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-forest">
                    {item.participant.name}
                  </p>
                  <time
                    dateTime={item.lastMessageAt}
                    className="shrink-0 text-[10px] text-muted"
                  >
                    {shortDate(item.lastMessageAt)}
                  </time>
                </div>
                <p className="mt-1 truncate text-[11px] font-medium text-clay-dark">
                  {item.product.name}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="truncate text-xs leading-5 text-muted">
                    {item.preview}
                  </p>
                  {item.unreadCount > 0 && (
                    <span
                      aria-label={`${item.unreadCount} unread messages`}
                      className="ml-auto shrink-0 rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold text-white"
                    >
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => load(cursor)}
          className="mx-auto mb-5 block min-h-10 rounded-lg px-4 text-sm font-semibold text-forest underline disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more conversations"}
        </button>
      )}
    </div>
  );
}
