import { messagingRoute } from "@/app/lib/messaging/http";
import { downloadAttachment } from "@/app/lib/messaging/attachments";

export async function GET(request, context) {
  const { id } = await context.params;
  return messagingRoute(request, (user) => downloadAttachment(user, id));
}
