import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import User from "@/models/User";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    await connectDB();

    const { ownerId } = params;
    const body = await req.json();
    const action = body?.action;
    const adminNotes = body?.adminNotes?.trim() || "";

    if (!action || !["verified", "rejected"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    const verification = await VendorVerification.findOne({ ownerId });
    if (!verification) {
      return NextResponse.json({ success: false, message: "Verification not found" }, { status: 404 });
    }

    // Idempotency
    if (verification.status === action) {
      return NextResponse.json({ success: false, message: `Already ${action}` }, { status: 409 });
    }

    verification.set({
      status: action,
      adminNotes,
      reviewedAt: new Date(),
      adminId: auth.user?.userId || auth.user?.user_id || auth.user?.sub || auth.user?.id,
    });
    await verification.save();

    if (action === "verified") {
      await User.updateOne({ _id: ownerId }, { $set: { onBoardingStatus: "completed" } });
    }

    return NextResponse.json({ success: true, message: `Vendor ${action}` }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error updating vendor verification",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

