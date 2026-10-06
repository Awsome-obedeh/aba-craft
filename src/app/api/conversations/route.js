import { messagingRoute, readMessagingBody } from "@/app/lib/messaging/http";
import {
  listConversations,
  startConversation,
} from "@/app/lib/messaging/service";

export async function GET(request) {
  return messagingRoute(request, (user) =>
    listConversations(user, new URL(request.url).searchParams),
  );
}

export async function POST(request) {
  return messagingRoute(request, async (user) => ({
    conversation: await startConversation(
      user,
      await readMessagingBody(request),
    ),
  }));
}
