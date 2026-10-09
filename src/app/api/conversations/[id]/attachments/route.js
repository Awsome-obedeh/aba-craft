import { messagingRoute } from "@/app/lib/messaging/http";
import { uploadAttachment } from "@/app/lib/messaging/attachments";

export async function POST(request, context) {
  const { id } = await context.params;
  return messagingRoute(request, async (user) => ({
    attachment: await uploadAttachment(user, id, request),
  }));
}
