import { messagingRoute, readMessagingBody } from "@/app/lib/messaging/http";
import { getMessages, sendMessage } from "@/app/lib/messaging/service";

export async function GET(request, { params }) {
  return messagingRoute(request, async (user) => {
    const { id } = await params;
    return getMessages(
      user,
      id,
      new URL(request.url).searchParams.get("before"),
    );
  });
}

export async function POST(request, { params }) {
  return messagingRoute(request, async (user) => {
    const { id } = await params;
    return {
      message: await sendMessage(user, id, await readMessagingBody(request)),
    };
  });
}
