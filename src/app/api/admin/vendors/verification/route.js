import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    await connectDB();

    const pending = await VendorVerification.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate({
        path: "ownerId",
        select: "fullName email profilePicture",
      })
      .lean();

    return NextResponse.json({ success: true, pending }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching pending vendor verifications",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

// NOTE: approve/reject are implemented in separate endpoints.

