"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/app/store/authStore";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import {
  MessagingEmpty,
  MessagingError,
  MessagingSkeleton,
} from "./MessagingUI";
import BuyerShell from "@/components/buyer/BuyerShell";

export default function MessagesPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");

  useEffect(() => {
    if (!user) {
      const destination = `/dashboard/messages${conversationId ? `?conversation=${encodeURIComponent(conversationId)}` : ""}`;
      router.replace(
        `/auth/sign-in?redirect=${encodeURIComponent(destination)}`,
      );
    }
  }, [user, router, conversationId]);

  if (!user) return <MessagingSkeleton />;
  const allowed = ["customer", "vendor"].includes(user.role);

  if (user.role === "customer")
    return (
      <BuyerShell section="inbox">
        <div className="buyer-inbox">
          {conversationId && !/^[a-f\d]{24}$/i.test(conversationId) ? (
            <MessagingError message="This conversation link is invalid." />
          ) : conversationId ? (
            <MessageThread
              key={`${user.id}:${conversationId}`}
              conversationId={conversationId}
              userId={user.id}
              buyer
            />
          ) : (
            <>
              <h1 className="buyer-panel-title">Inbox</h1>
              <div className="h-[calc(100%-64px)]">
                <ConversationList role={user.role} />
              </div>
            </>
          )}
        </div>
      </BuyerShell>
    );

  return (
    <DashboardLayout role={user.role} email={user.email}>
      <div className="messaging-surface mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-clay">
              A little conversation. A better connection.
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-forest sm:text-4xl">
              Messages
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {user.role === "vendor"
                ? "Turn buyer questions into thoughtful, personal service."
                : "Talk to the hands behind your next favourite find."}
            </p>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-brandBorder bg-white px-4 py-2 text-xs text-muted sm:inline-flex">
            <MessageCircle size={14} className="text-clay" /> Your AbaCraft
            inbox
          </span>
        </header>

        {!allowed ? (
          <MessagingEmpty title="Buyer and vendor conversations">
            <p>This inbox is available to customer and vendor accounts.</p>
            <Link href="/dashboard" className="mt-4 block text-clay underline">
              Return to dashboard
            </Link>
          </MessagingEmpty>
        ) : (
          <div className="grid h-[min(780px,calc(100dvh-225px))] min-h-[540px] overflow-hidden rounded-2xl border border-[#e5dfd3] bg-white shadow-[0_8px_40px_-20px_rgba(30,51,41,0.2)] md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
            <div
              className={`min-h-0 border-r border-brandBorder ${conversationId ? "hidden md:block" : "block"}`}
            >
              <ConversationList selectedId={conversationId} role={user.role} />
            </div>
            <div
              className={`min-h-0 min-w-0 ${conversationId ? "block" : "hidden md:block"}`}
            >
              {conversationId && !/^[a-f\d]{24}$/i.test(conversationId) ? (
                <div>
                  <MessagingError message="This conversation link is invalid." />
                  <Link
                    href="/dashboard/messages"
                    className="m-4 inline-block text-sm text-clay underline"
                  >
                    Back to inbox
                  </Link>
                </div>
              ) : conversationId ? (
                <MessageThread
                  key={`${user.id}:${conversationId}`}
                  conversationId={conversationId}
                  userId={user.id}
                />
              ) : (
                <MessagingEmpty title="A space for the details">
                  <p>
                    Select a conversation to ask questions, share ideas and keep
                    everything in one place.
                  </p>
                  <p className="mt-5 text-xs">
                    Messages update automatically while you’re here.
                  </p>
                </MessagingEmpty>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
