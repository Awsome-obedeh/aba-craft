import { messagingRoute } from "@/app/lib/messaging/http";
import { unreadTotal } from "@/app/lib/messaging/service";

export async function GET(request) {
  return messagingRoute(request, async (user) => ({
    unreadCount: await unreadTotal(user),
  }));
}
