"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/app/store/authStore";
import { messagingApi } from "@/app/lib/messaging/client";

export default function MessagesLink() {
  const user = useAuthStore((state) => state.user);
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!user || !["customer", "vendor"].includes(user.role)) return;
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const { data } = await messagingApi.get("/unread", {
          signal: controller.signal,
        });
        setCount(data.unreadCount);
      } catch {
        // Keep navigation available when badge refresh is temporarily unavailable.
      } finally {
        busy = false;
      }
    }

    refresh();
    const timer = setInterval(refresh, 20_000);
    window.addEventListener("abacraft:messages", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("abacraft:messages", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user]);

  if (!user || !["customer", "vendor"].includes(user.role)) return null;

  return (
    <Link
      href="/dashboard/messages"
      aria-label={`Messages${count ? `, ${count} unread` : ""}`}
      className="relative rounded-lg p-2 text-forest focus-visible:outline-2 focus-visible:outline-clay"
    >
      <MessageCircle size={20} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-clay px-1 text-center text-[10px] font-bold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
