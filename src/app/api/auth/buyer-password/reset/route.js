import { buyerPasswordService } from "@/app/lib/server/buyer-password";
import { readBody, errorResponse } from "@/app/lib/server/signup-validation";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const body = await readBody(request, 4096);
    return Response.json(await buyerPasswordService.resetPassword(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
