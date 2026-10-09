import { api } from "@/app/lib/axios";

// Messaging lives at /api even when legacy product screens use /api/test.
export const messagingApi = {
  get: (path, config) =>
    api.get(`/conversations${path}`, {
      ...config,
      baseURL: "/api",
      timeout: 15_000,
    }),
  post: (path, body) =>
    api.post(`/conversations${path}`, body, {
      baseURL: "/api",
      timeout: 15_000,
    }),
};

export function messageError(error) {
  return (
    error.response?.data?.message ||
    "We couldn’t connect. Check your connection and try again."
  );
}

export function notifyInbox(conversationId) {
  window.dispatchEvent(
    new CustomEvent("abacraft:messages", { detail: { conversationId } }),
  );
}

export function mergeMessages(previous, incoming) {
  const records = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => records.set(message.id, message));
  return [...records.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

export function shortDate(value) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
