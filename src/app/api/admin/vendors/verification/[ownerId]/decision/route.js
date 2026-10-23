import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import User from "@/models/User";
import mongoose from "mongoose";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req, context) {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    await connectDB();

    const params = await context?.params;
    const ownerId = params?.ownerId ?? params?.['ownerId'];

    const castedOwnerId = mongoose.Types.ObjectId.isValid(ownerId)
      ? new mongoose.Types.ObjectId(ownerId)
      : null;
    const lookup = castedOwnerId ? { ownerId: castedOwnerId } : { ownerId };

    const body = await req.json();
    const action = body?.action;
    const adminNotes = body?.adminNotes?.trim() || "";

    if (!action || !["verified", "rejected"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    const verification = await VendorVerification.findOne(lookup);
    if (!verification) {
      return NextResponse.json({ success: false, message: "Verification not found" }, { status: 404 });
    }

    // Idempotency
    if (verification.status === action) {
      return NextResponse.json({ success: false, message: `Already ${action}` }, { status: 409 });
    }

    const adminId = auth.user?.id ? new mongoose.Types.ObjectId(auth.user.id) : auth.user?.user_id || auth.user?.sub;

    await VendorVerification.findOneAndUpdate(
      lookup,
      {
        $set: {
          status: action,
          adminNotes,
          reviewedAt: new Date(),
          adminId,
        },
      },
      { new: true }
    );

    if (action === "verified") {
      await User.updateOne({ _id: castedOwnerId || ownerId }, { $set: { onBoardingStatus: "completed" } });
    }

    return NextResponse.json({ success: true, message: `Vendor ${action}` }, { status: 200 });
  } catch (error) {
    console.error("[admin/verification/decision] error:", error);
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

