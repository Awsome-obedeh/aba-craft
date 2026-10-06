"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Package,
} from "lucide-react";
import { shortDate } from "@/app/lib/messaging/client";
import {
  Initials,
  MessagingEmpty,
  MessagingError,
  MessagingSkeleton,
} from "./MessagingUI";
import MessageComposer from "./MessageComposer";
import useConversation from "./useConversation";
import { AttachmentDownload } from "./Attachments";

export default function MessageThread({
  conversationId,
  userId,
  buyer = false,
}) {
  const thread = useConversation(conversationId);
  const viewport = useRef(null);
  const keepBottom = useRef(true);
  const previousHeight = useRef(null);
  const [newMessages, setNewMessages] = useState(false);
  const lastId = thread.messages.at(-1)?.id;
  const { markVisibleRead } = thread;

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (previousHeight.current !== null) {
      element.scrollTop += element.scrollHeight - previousHeight.current;
      previousHeight.current = null;
    } else if (keepBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [thread.messages]);

  useEffect(() => {
    if (lastId && !keepBottom.current) {
      const timer = setTimeout(() => setNewMessages(true), 0);
      return () => clearTimeout(timer);
    }
  }, [lastId]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.messageId;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        });
        if (document.hasFocus()) markVisibleRead([...visible]);
      },
      { root: element, threshold: 0.25 },
    );

    element
      .querySelectorAll("[data-message-id]")
      .forEach((node) => observer.observe(node));
    const acknowledge = () => markVisibleRead([...visible]);
    window.addEventListener("focus", acknowledge);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", acknowledge);
    };
  }, [thread.messages, markVisibleRead]);

  if (thread.loading) return <MessagingSkeleton />;
  if (!thread.conversation)
    return (
      <div className="p-2">
        <Link
          href="/dashboard/messages"
          className="m-4 inline-flex items-center gap-2 text-sm text-forest"
        >
          <ArrowLeft size={16} /> Back to inbox
        </Link>
        <MessagingError
          message={thread.error || "Conversation unavailable."}
          onRetry={thread.retry}
        />
      </div>
    );
  const { participant, product, canReply } = thread.conversation;

  function scrollToLatest() {
    keepBottom.current = true;
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
    setNewMessages(false);
  }

  return (
    <section
      aria-label={`Conversation with ${participant.name}`}
      className="relative flex h-full min-h-0 flex-col"
    >
      <header className="message-thread-header flex shrink-0 items-center gap-3 border-b border-brandBorder px-4 py-4 sm:px-6">
        <Link
          href="/dashboard/messages"
          aria-label="Back to conversations"
          className={`rounded-lg p-2 text-forest ${buyer ? "" : "md:hidden"}`}
        >
          <ArrowLeft size={20} />
        </Link>
        {!buyer && <Initials name={participant.name} />}
        <div className="min-w-0">
          <h2 className="font-semibold text-forest">{participant.name}</h2>
          {buyer && thread.conversation.verificationStatus === "verified" && (
            <span className="buyer-badge">Verified</span>
          )}
          <p className="mt-1 text-xs text-muted">
            {participant.role === "vendor"
              ? thread.conversation.sellerRole === "wholesaler_producer"
                ? "Wholesaler"
                : "Vendor"
              : "Buyer"}
          </p>
        </div>
      </header>

      <div className="message-subject flex shrink-0 items-center gap-3 border-b border-brandBorder bg-cream/80 px-4 py-3 sm:px-6">
        <span className="rounded-xl bg-white p-2.5 text-clay">
          <Package size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {thread.conversation.orderId
              ? `Order #${thread.conversation.orderId.slice(-8)}`
              : "Product enquiry"}
          </p>
          <p className="mt-1 text-sm font-medium text-forest">{product.name}</p>
          {buyer && thread.conversation.orderId && (
            <div className="buyer-thread-links">
              <Link
                href={`/dashboard/buyer/tracking?order=${thread.conversation.orderId}&product=${product.id}`}
              >
                Track shipment
              </Link>
              <Link
                href={`/dashboard/buyer/quote?order=${thread.conversation.orderId}&product=${product.id}`}
              >
                Request quote
              </Link>
              <Link
                href={`/dashboard/buyer/issue?order=${thread.conversation.orderId}&product=${product.id}`}
              >
                Report issue
              </Link>
            </div>
          )}
        </div>
        {product.href ? (
          <Link
            href={product.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-clay-dark"
          >
            View product <ArrowUpRight size={15} />
          </Link>
        ) : (
          <span className="text-xs text-muted">Listing unavailable</span>
        )}
      </div>

      {thread.error && (
        <MessagingError message={thread.error} onRetry={thread.retry} />
      )}
      <div
        ref={viewport}
        tabIndex={0}
        aria-label="Message history"
        className="message-history min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fdfbf8] p-4 sm:p-6"
        onScroll={() => {
          const element = viewport.current;
          keepBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            60;
          if (keepBottom.current) setNewMessages(false);
        }}
      >
        {thread.cursor && (
          <button
            type="button"
            disabled={thread.loadingOlder}
            onClick={async () => {
              previousHeight.current = viewport.current.scrollHeight;
              await thread.loadOlder();
            }}
            className="mx-auto mb-6 block rounded-full border border-brandBorder bg-white px-4 py-2 text-xs font-medium text-forest disabled:opacity-50"
          >
            {thread.loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}

        {!thread.messages.length ? (
          <MessagingEmpty title="Make a connection">
            <p>
              Ask a question, share an idea, or talk through the details. Your
              conversation stays here so you can pick it up later.
            </p>
          </MessagingEmpty>
        ) : (
          <ol className="space-y-4">
            {thread.messages.map((message, index) => {
              const own = message.senderId === userId;
              const previous = thread.messages[index - 1];
              const showDate =
                !previous ||
                shortDate(previous.createdAt) !== shortDate(message.createdAt);

              return (
                <li key={message.id}>
                  {showDate && (
                    <p className="my-6 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {new Date(message.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <div
                    className={`flex ${own ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      data-message-id={
                        !own && !message.readAt ? message.id : undefined
                      }
                      className="max-w-[88%] sm:max-w-[78%]"
                    >
                      <p
                        className={`message-bubble whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere] ${own ? "own rounded-br-sm bg-forest text-white" : "received rounded-bl-sm border border-brandBorder bg-white text-forest shadow-sm"}`}
                      >
                        {message.text}
                      </p>
                      {message.attachments?.map((file) => (
                        <AttachmentDownload file={file} key={file.id} />
                      ))}
                      <div
                        className={`message-time mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-muted ${own ? "justify-end" : ""}`}
                      >
                        <time dateTime={message.createdAt}>
                          {new Date(message.createdAt).toLocaleTimeString(
                            "en-NG",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </time>
                        {own && (
                          <span className="inline-flex items-center gap-1">
                            {message.readAt ? (
                              <CheckCheck size={13} className="text-clay" />
                            ) : (
                              <Check size={13} />
                            )}
                            {message.readAt ? "Read" : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {newMessages && (
        <button
          type="button"
          onClick={scrollToLatest}
          className="absolute bottom-56 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          <ArrowDown size={14} /> Latest messages
        </button>
      )}
      {canReply ? (
        <MessageComposer
          conversationId={conversationId}
          userId={userId}
          firstMessage={!thread.messages.length}
          onSent={(message) => {
            keepBottom.current = true;
            thread.acceptMessages([message]);
            setNewMessages(false);
          }}
        />
      ) : (
        <p className="border-t border-brandBorder bg-cream p-5 text-sm leading-6 text-muted">
          This account or business is unavailable. You can still read your
          conversation.
        </p>
      )}
    </section>
  );
}
