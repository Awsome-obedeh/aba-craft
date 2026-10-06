import { messagingRoute, readMessagingBody } from "@/app/lib/messaging/http";
import {
  buyerData,
  saveBuyerData,
  submitBuyerAction,
} from "@/app/lib/messaging/buyer-service";

export async function GET(request, context) {
  const { section } = await context.params;
  return messagingRoute(request, (user) =>
    buyerData(user, section, new URL(request.url).searchParams),
  );
}

export async function PATCH(request, context) {
  const { section } = await context.params;
  return messagingRoute(request, async (user) =>
    saveBuyerData(user, section, await readMessagingBody(request)),
  );
}

export async function POST(request, context) {
  const { section } = await context.params;
  return messagingRoute(request, async (user) =>
    submitBuyerAction(user, section, await readMessagingBody(request)),
  );
}
