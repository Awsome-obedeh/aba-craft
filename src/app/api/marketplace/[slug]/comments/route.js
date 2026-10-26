import { marketplaceDetail } from "@/app/lib/server/marketplace-detail";
import { verifyAuth } from "@/app/lib/verifyAuth";
import { readBody, errorResponse } from "@/app/lib/server/signup-validation";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    return Response.json(await marketplaceDetail.comments(slug, new URL(request.url).searchParams.get("page") || "1"), { headers });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request, { params }) {
  try {
    const auth = await verifyAuth(request, ["customer"]);
    if (!auth.isValid) return Response.json({ success: false, message: auth.message }, { status: auth.status, headers });
    const { slug } = await params;
    return Response.json(await marketplaceDetail.addComment(slug, auth.user, await readBody(request, 16384)), { status: 201, headers });
  } catch (error) { return errorResponse(error); }
}
