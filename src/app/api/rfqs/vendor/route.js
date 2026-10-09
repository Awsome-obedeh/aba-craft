import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Rfq from "@/models/Rfq";

export async function GET(request) {
  const auth = await verifyAuth(request, ["vendor"]);
  if (!auth.isValid) return Response.json({ success: false, message: auth.message }, { status: auth.status });
  try {
    await connectDB();
    const requests = await Rfq.find({ vendor: auth.user.id }).sort({ createdAt: -1 }).lean();
    return Response.json({ success: true, requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vendor RFQ listing failed:", error);
    return Response.json({ success: false, message: "Unable to load your RFQ requests. Please try again." }, { status: 500 });
  }
}
