import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Rfq from "@/models/Rfq";

export async function GET(request, { params }) {
  const auth = await verifyAuth(request, ["vendor"]);
  if (!auth.isValid) return Response.json({ success: false, message: auth.message }, { status: auth.status });
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ success: false, message: "RFQ not found." }, { status: 404 });
  try {
    await connectDB();
    const rfq = await Rfq.findOne({ _id: id, vendor: auth.user.id }).lean();
    if (!rfq) return Response.json({ success: false, message: "RFQ not found." }, { status: 404 });
    return Response.json({ success: true, request: rfq }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vendor RFQ details failed:", error);
    return Response.json({ success: false, message: "Unable to load RFQ details. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const auth = await verifyAuth(request, ["vendor"]);
  if (!auth.isValid) return Response.json({ success: false, message: auth.message }, { status: auth.status });
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ success: false, message: "RFQ not found." }, { status: 404 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  if (body?.action !== "decline") return Response.json({ success: false, message: "Unsupported RFQ action." }, { status: 400 });
  try {
    await connectDB();
    const rfq = await Rfq.findOneAndUpdate(
      { _id: id, vendor: auth.user.id, status: { $in: ["new", "awaiting_response", "responded"] } },
      { $set: { status: "rejected" } },
      { new: true, runValidators: true }
    ).lean();
    if (!rfq) {
      const existing = await Rfq.findOne({ _id: id, vendor: auth.user.id }).lean();
      if (!existing) return Response.json({ success: false, message: "RFQ not found." }, { status: 404 });
      return Response.json({ success: false, message: "This RFQ can no longer be declined. Refresh to see its latest status." }, { status: 409 });
    }
    return Response.json({ success: true, request: rfq }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vendor RFQ decline failed:", error);
    return Response.json({ success: false, message: "Unable to decline this RFQ. Please try again." }, { status: 500 });
  }
}
