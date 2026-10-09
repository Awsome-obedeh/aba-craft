import { verifyAuth } from "../verifyAuth";
import { MessagingError } from "./validation.js";

export function messagingResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function messagingRoute(request, action) {
  try {
    const auth = await verifyAuth(request, ["customer", "vendor"]);
    if (!auth.isValid)
      return messagingResponse(
        { success: false, message: auth.message },
        auth.status,
      );

    const result = await action(auth.user);
    return result instanceof Response
      ? result
      : messagingResponse({ success: true, ...result });
  } catch (error) {
    const status =
      error instanceof MessagingError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 503;
    const message =
      error instanceof MessagingError
        ? error.message
        : status === 400
          ? "Send a valid JSON request."
          : "Messaging is unavailable. Please try again.";
    return messagingResponse({ success: false, message }, status);
  }
}

export async function readMessagingBody(request) {
  // Bound the actual stream, not only Content-Length (which clients can omit).
  const reader = request.body?.getReader();
  if (!reader) throw new MessagingError("A request body is required.");
  const chunks = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        throw new MessagingError("Your request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new MessagingError("Send a JSON object.");
  return body;
}
