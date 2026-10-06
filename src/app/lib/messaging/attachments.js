import MessageAttachment from "../../../models/MessageAttachment.js";
import Message from "../../../models/Message.js";
import { MessagingError, objectId } from "./validation.js";
import { ownedConversation } from "./service.js";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function detectAttachmentType(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  )
    return "image/jpeg";
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

export async function uploadAttachment(user, conversationId, request) {
  await ownedConversation(user, conversationId);
  const recent = await MessageAttachment.find({
    ownerId: user.id,
    createdAt: { $gte: new Date(Date.now() - 86400000) },
  })
    .select("size")
    .lean();
  if (
    recent.length >= 50 ||
    recent.reduce((sum, file) => sum + file.size, 0) >= 100 * 1024 * 1024
  )
    throw new MessagingError(
      "Daily upload limit reached. Please try tomorrow.",
      429,
    );
  const reader = request.body?.getReader();
  if (!reader) throw new MessagingError("Select a file to upload.");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTACHMENT_BYTES) {
        await reader.cancel();
        throw new MessagingError("Files must be 10 MB or smaller.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = Buffer.concat(chunks);
  const type = detectAttachmentType(data);
  if (!type || request.headers.get("content-type") !== type)
    throw new MessagingError("Upload a valid JPEG, PNG or PDF file.", 415);
  let name;
  try {
    name = decodeURIComponent(
      request.headers.get("x-file-name") || "attachment",
    );
  } catch {
    throw new MessagingError("Invalid file name.");
  }
  name = name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 120);
  const file = await MessageAttachment.create({
    ownerId: user.id,
    conversationId,
    name,
    type,
    size,
    data,
  });
  return { id: String(file._id), name, type, size };
}

export async function messageAttachments(user, conversationId, ids = []) {
  if (!Array.isArray(ids) || ids.length > 5 || new Set(ids).size !== ids.length)
    throw new MessagingError("Attach up to five files.");
  const files = await MessageAttachment.find({
    _id: { $in: ids.map(objectId) },
    ownerId: user.id,
    conversationId,
  })
    .select("name type size expiresAt")
    .lean();
  if (
    files.length !== ids.length ||
    files.some((file) => file.expiresAt && file.expiresAt < new Date())
  )
    throw new MessagingError("An attachment is unavailable. Upload it again.");
  return ids.map((id) => {
    const file = files.find((file) => String(file._id) === id);
    return {
      id: String(file._id),
      name: file.name,
      type: file.type,
      size: file.size,
    };
  });
}

export async function downloadAttachment(user, attachmentId) {
  const file = await MessageAttachment.findById(objectId(attachmentId))
    .select("+data")
    .lean();
  if (!file) throw new MessagingError("Attachment not found.", 404);
  await ownedConversation(user, String(file.conversationId));
  if (
    String(file.ownerId) !== user.id &&
    !(await Message.exists({
      conversationId: file.conversationId,
      "attachments.id": file._id,
    }))
  )
    throw new MessagingError("Attachment not found.", 404);
  return new Response(Buffer.from(file.data.buffer || file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
