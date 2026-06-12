import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req, context) {
  // Next.js App Router dynamic route params can be async (Promise-like)
  // in some cases; unwrap before reading.
  const params = await context?.params;

  const ownerId = params?.ownerId ?? params?.['ownerId'];


  const auth = await verifyAuth(req, ["admin"]);



  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    await connectDB();



    // Robust lookup:
    // - Prefer ObjectId casting when possible
    // - Fallback to raw string match
    const castedOwnerId = mongoose.Types.ObjectId.isValid(ownerId)
      ? new mongoose.Types.ObjectId(ownerId)
      : null;

    const lookup = castedOwnerId ? { ownerId: castedOwnerId } : { ownerId };


    const verification = await VendorVerification.findOne(lookup).lean();

    // Backward compatibility: older documents won't have these fields.
    // Mongoose default for isConsent only applies on new docs, so normalise here.
    if (verification) {
      if (typeof verification.isConsent !== 'boolean') verification.isConsent = true;
      if (verification.businessName == null) verification.businessName = '';
    }


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


