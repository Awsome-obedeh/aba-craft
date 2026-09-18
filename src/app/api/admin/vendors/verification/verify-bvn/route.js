import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const auth = await verifyAuth(req, ["admin"]);
  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    await connectDB();

    const body = await req.json();
    const ownerId = body?.ownerId;

    if (!ownerId) {
      return NextResponse.json(
        { success: false, message: "ownerId is required" },
        { status: 400 }
      );
    }

    // VendorVerification.ownerId is stored as an ObjectId.
    // Cast robustly (string -> ObjectId) to prevent false "not found" cases.
    const castedOwnerId = (() => {
      try {
        return mongoose.Types.ObjectId.isValid(ownerId)
          ? new mongoose.Types.ObjectId(ownerId)
          : null;
      } catch {
        return null;
      }
    })();

    const lookup = castedOwnerId ? { ownerId: castedOwnerId } : { ownerId };

    const verification = await VendorVerification.findOne(lookup);

    if (!verification) {
      return NextResponse.json(
        { success: false, message: "Verification not found" },
        { status: 404 }
      );
    }

    const bvn = verification?.bvn;
    if (!bvn) {
      return NextResponse.json(
        { success: false, message: "BVN not found for vendor" },
        { status: 400 }
      );
    }

    const youverifyApiKey = process.env.YOUVERIFY_API_KEY;
    const youverifyBaseUrl = process.env.YOUVERIFY_BASE_URL;

    if (!youverifyApiKey || !youverifyBaseUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Youverify is not configured. Set YOUVERIFY_API_KEY and YOUVERIFY_BASE_URL in environment.",
        },
        { status: 500 }
      );
    }

    const verifyPath =
      process.env.YOUVERIFY_BVN_VERIFY_PATH ||
      "/know-your-customer-services-kyc/id-data-matching-eidv/nigeria/verify-bank-verification-number-bvn";

    const url = `${youverifyBaseUrl.replace(/\/$/, "")}${verifyPath.startsWith("/") ? "" : "/"}${verifyPath}`;

    const youverifyPayload = {
      bvn,
      bank_verification_number: bvn,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Youverify sometimes uses an API key header; depending on plan,
        // either one may be required.
        Authorization: `Bearer ${youverifyApiKey}`,
        "X-API-Key": youverifyApiKey,
      },
      body: JSON.stringify(youverifyPayload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Youverify BVN verification failed",
          error: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "BVN verification completed",
        result: data,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error verifying BVN",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}