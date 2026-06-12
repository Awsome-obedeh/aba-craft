import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    await connectDB();

    const { ownerId } = params;

    // Robust lookup:
    // - Prefer ObjectId casting when possible
    // - Fallback to raw string match
    const lookup = {};

    const castedOwnerId = mongoose.Types.ObjectId.isValid(ownerId)
      ? new mongoose.Types.ObjectId(ownerId)
      : null;

    if (castedOwnerId) {
      lookup.ownerId = castedOwnerId;
    } else {
      lookup.ownerId = ownerId;
    }

    const verification = await VendorVerification.findOne(lookup).lean();

    if (!verification) {
      return NextResponse.json(
        { success: false, message: "Verification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, verification }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching vendor verification",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}


