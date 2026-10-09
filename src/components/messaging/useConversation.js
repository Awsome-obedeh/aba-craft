"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  messagingApi,
  messageError,
  mergeMessages,
  notifyInbox,
} from "@/app/lib/messaging/client";

export default function useConversation(conversationId) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const known = useRef([]);
  const reading = useRef(new Set());

  const acceptMessages = useCallback((incoming) => {
    known.current = mergeMessages(known.current, incoming);
    setMessages(known.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        let { data } = await messagingApi.get(`/${conversationId}/messages`, {
          signal: controller.signal,
        });
        const latest = data;
        let incoming = data.messages;
        const existingIds = new Set(known.current.map((message) => message.id));

        // Fill any gap after reconnecting, even when more than one page arrived while away.
        while (
          existingIds.size &&
          data.nextCursor &&
          !data.messages.some((message) => existingIds.has(message.id))
        ) {
          ({ data } = await messagingApi.get(
            `/${conversationId}/messages?before=${encodeURIComponent(data.nextCursor)}`,
            { signal: controller.signal },
          ));
          incoming = mergeMessages(data.messages, incoming);
        }

        if (controller.signal.aborted) return;
        if (!existingIds.size) setCursor(latest.nextCursor);
        setConversation(latest.conversation);
        acceptMessages(incoming);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted) setError(messageError(error));
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    refresh();
    const timer = setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [conversationId, attempt, acceptMessages]);

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { data } = await messagingApi.get(
        `/${conversationId}/messages?before=${encodeURIComponent(cursor)}`,
      );
      acceptMessages(data.messages);
      setCursor(data.nextCursor);
      setError("");
    } catch (error) {
      setError(messageError(error));
    } finally {
      setLoadingOlder(false);
    }
  }

  const markVisibleRead = useCallback(
    async (ids) => {
      const messageIds = ids
        .filter((id) => !reading.current.has(id))
        .slice(0, 40);
      if (!messageIds.length || document.hidden) return;
      messageIds.forEach((id) => reading.current.add(id));

      try {
        await messagingApi.post(`/${conversationId}/read`, { messageIds });
        const readAt = new Date().toISOString();
        acceptMessages(
          known.current
            .filter((message) => messageIds.includes(message.id))
            .map((message) => ({ ...message, readAt })),
        );
        notifyInbox(conversationId);
      } catch {
        // The next visible poll retries the acknowledgement; sending remains available.
      } finally {
        messageIds.forEach((id) => reading.current.delete(id));
      }
    },
    [conversationId, acceptMessages],
  );

  return {
    conversation,
    messages,
    loading,
    loadingOlder,
    error,
    cursor,
    loadOlder,
    markVisibleRead,
    acceptMessages,
    retry: () => setAttempt((value) => value + 1),
  };
}
