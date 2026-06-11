import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    await connectDB();

    const body = await req.json();
    const ownerId = body?.ownerId;
    const adminNotes = body?.adminNotes?.trim() || "";

    if (!ownerId) {
      return NextResponse.json({ success: false, message: "ownerId is required" }, { status: 400 });
    }

    const verification = await VendorVerification.findOne({ ownerId });
    if (!verification) {
      return NextResponse.json({ success: false, message: "Verification not found" }, { status: 404 });
    }

    if (verification.status === "rejected") {
      return NextResponse.json({ success: false, message: "Already rejected" }, { status: 409 });
    }

    verification.set({
      status: "rejected",
      adminNotes,
      reviewedAt: new Date(),
      adminId: auth.user?.userId || auth.user?.user_id || auth.user?.sub || auth.user?.id,
    });

    await verification.save();

    return NextResponse.json({ success: true, message: "Vendor rejected" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error rejecting vendor verification",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

