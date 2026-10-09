import { messagingRoute, readMessagingBody } from "@/app/lib/messaging/http";
import { markRead } from "@/app/lib/messaging/service";

export async function POST(request, { params }) {
  return messagingRoute(request, async (user) => {
    const { id } = await params;
    await markRead(user, id, await readMessagingBody(request));
    return {};
  });
}
