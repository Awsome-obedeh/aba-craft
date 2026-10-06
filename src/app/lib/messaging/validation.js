export const MAX_MESSAGE_LENGTH = 2000;
export const MESSAGE_PAGE_SIZE = 40;
export const CONVERSATION_PAGE_SIZE = 25;

export class MessagingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function objectId(value) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new MessagingError("Invalid conversation or product reference.");
  }

  return value.toLowerCase();
}

export function validateMessage(body) {
  if (typeof body?.text !== "string" || !body.text.trim()) {
    throw new MessagingError("Write a message before sending.");
  }

  if (body.text.length > MAX_MESSAGE_LENGTH) {
    throw new MessagingError(
      `Keep your message within ${MAX_MESSAGE_LENGTH} characters.`,
    );
  }

  if (
    typeof body.clientId !== "string" ||
    !/^[a-z\d-]{16,64}$/i.test(body.clientId)
  ) {
    throw new MessagingError(
      "A valid message reference is required. Please reload and try again.",
    );
  }

  return { text: body.text.trim(), clientId: body.clientId };
}

export function readMessageIds(body) {
  if (
    !Array.isArray(body?.messageIds) ||
    !body.messageIds.length ||
    body.messageIds.length > MESSAGE_PAGE_SIZE
  ) {
    throw new MessagingError(
      "Select between 1 and 40 received messages to mark as read.",
    );
  }

  return [...new Set(body.messageIds.map(objectId))];
}

export function parseCursor(value) {
  if (!value) return null;
  const [timestamp, id, extra] = value.split("_");
  const date = new Date(timestamp);

  if (
    extra !== undefined ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== timestamp
  ) {
    throw new MessagingError("Invalid page reference. Refresh and try again.");
  }

  return { date, id: objectId(id) };
}

export function makeCursor(record, field = "createdAt") {
  return `${new Date(record[field]).toISOString()}_${record._id}`;
}
