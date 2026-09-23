import mongoose from "mongoose";
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import { documentDownloadUrl } from "@/app/lib/server/signup-documents";
import { errorResponse, SignupError } from "@/app/lib/server/signup-validation";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const auth = await verifyAuth(request, ["vendor", "admin"]);
    if (!auth.isValid) throw new SignupError(auth.message, auth.status);
    const { businessId } = await context.params;
    const type = new URL(request.url).searchParams.get("type") || "cac";
    if (!["cac", "nin"].includes(type)) throw new SignupError("Document type must be cac or nin.");
    if (!mongoose.isValidObjectId(businessId)) throw new SignupError("Document not found.", 404);
    await connectDB();
    const filter = { _id: businessId };
    if (auth.user.role !== "admin") filter.ownerId = auth.user.id;
    const business = await Business.findOne(filter).select("+cacDocument +ninDocument");
    const document = type === "nin" ? business?.ninDocument : business?.cacDocument;
    if (!document) throw new SignupError("Document not found.", 404);
    return Response.json({ success: true, url: documentDownloadUrl(document.publicId), expiresIn: 60 }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
