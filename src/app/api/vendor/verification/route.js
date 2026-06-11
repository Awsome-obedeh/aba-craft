import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseDigits(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, "");
}

export async function GET(req) {
  const auth = await verifyAuth(req, ["vendor"]);

  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    await connectDB();

    const ownerId = auth.user.userId || auth.user.user_id || auth.user.sub || auth.user.id;

    const verification = await VendorVerification.findOne({ ownerId })
      .select(
        "bvn abssin businessAddress cacCertificateNumber cacDocumentUrl status reviewedAt"
      )
      .lean();

    return NextResponse.json(
      { success: true, verification },
      { status: 200 }
    );
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

export async function POST(req) {
  const auth = await verifyAuth(req, ["vendor"]);

  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  // NOTE: This route expects JSON payload including:
  // - bvn, abssin, businessAddress, cacCertificateNumber, cacDocumentUrl
  // Uploading the CAC file itself is handled elsewhere in this codebase.

  try {
    await connectDB();

    const ownerId = auth.user.userId || auth.user.user_id || auth.user.sub || auth.user.id;
    const body = await req.json().catch(() => ({}));

    const bvn = parseDigits(body.bvn);
    const abssin = parseDigits(body.abssin);
    const businessAddress = body.businessAddress?.trim();
    const cacCertificateNumber = body.cacCertificateNumber?.trim();
    const cacDocumentUrl = body.cacDocumentUrl?.trim();

    if (!/^\d{11}$/.test(bvn)) {
      return NextResponse.json(
        { success: false, message: "BVN must be exactly 11 digits." },
        { status: 400 }
      );
    }

    if (!/^\d{11}$/.test(abssin)) {
      return NextResponse.json(
        { success: false, message: "ABSSIN must be exactly 11 digits." },
        { status: 400 }
      );
    }

    if (!businessAddress || businessAddress.length < 5) {
      return NextResponse.json(
        { success: false, message: "Business address is required." },
        { status: 400 }
      );
    }

    if (!cacCertificateNumber || cacCertificateNumber.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: "CAC certificate number is required.",
        },
        { status: 400 }
      );
    }

    if (!cacDocumentUrl) {
      return NextResponse.json(
        { success: false, message: "CAC document upload is required." },
        { status: 400 }
      );
    }

    const existing = await VendorVerification.findOne({ ownerId });

    // If already verified, block re-submission.
    if (existing?.status === "verified") {
      return NextResponse.json(
        { success: false, message: "Your verification is already approved." },
        { status: 409 }
      );
    }

    const payload = {
      ownerId,
      bvn,
      abssin,
      businessAddress,
      cacCertificateNumber,
      cacDocumentUrl,
      status: "pending",
      adminNotes: "",
      reviewedAt: null,
      adminId: undefined,
    };

    if (existing) {
      await VendorVerification.updateOne({ ownerId }, payload);
    } else {
      await VendorVerification.create(payload);
    }

    return NextResponse.json(
      { success: true, message: "Verification submitted for admin approval." },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error submitting vendor verification",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

