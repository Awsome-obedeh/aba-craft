import { marketplaceDetail } from "@/app/lib/server/marketplace-detail";
import { errorResponse } from "@/app/lib/server/signup-validation";
export const runtime = "nodejs";
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    return Response.json(await marketplaceDetail.detail(slug), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
