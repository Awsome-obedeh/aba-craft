// POST /api/admin/vendors/verification/verify-bvn
//
//   body: { ownerId }
//   ->  { success, message, result }
//
// Server-side BVN lookup via Youverify. The API key never leaves the server.
//
// Three things this route gets right that a naive implementation does not:
//
//  1. AUTH HEADER. Youverify authenticates with a bare `token` header. It does
//     NOT accept `Authorization: Bearer` or `X-API-Key`; sending those instead
//     returns 401 `"token" is not allowed to be empty`.
//
//  2. PAYLOAD SHAPE. The v2 endpoint takes `{ id, isSubjectConsent }`. The
//     legacy `{ bvn, bank_verification_number }` body is silently wrong and
//     returns 400.
//
//  3. HTTP 200 IS NOT SUCCESS. A BVN that does not exist comes back as
//     `200 OK` with `data.status === "not_found"`. Treating the status code
//     alone as success reports a failed verification as a successful one, so
//     the envelope is validated instead.
//
// Sandbox note: `api.sandbox.youverify.co` accepts ONLY the test IDs
// (`11111111111` -> found, `00000000000` -> not found). A real person's BVN
// returns `403 Forbidden: Only Test IDs are allowed`. Real BVNs need the
// production base URL `https://api.youverify.co`.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorVerification from "@/models/VendorVerification";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Youverify identity lookups are normally a few hundred ms. Cap it so a hung
// upstream cannot pin an admin request open indefinitely.
const REQUEST_TIMEOUT_MS = 15_000;

const SANDBOX_URL = "https://api.sandbox.youverify.co";
const PRODUCTION_URL = "https://api.youverify.co";

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

    // VendorVerification.ownerId is stored as an ObjectId. Cast robustly
    // (string -> ObjectId) to prevent false "not found" cases.
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
      process.env.YOUVERIFY_BVN_VERIFY_PATH || "/v2/api/identity/ng/bvn";

    const url = `${youverifyBaseUrl.replace(/\/$/, "")}${verifyPath.startsWith("/") ? "" : "/"}${verifyPath}`;

    // v2 contract: { id, isSubjectConsent }.
    const youverifyPayload = {
      id: bvn,
      isSubjectConsent: true,
    };

    // Abort rather than hang if Youverify stops responding.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Youverify's ONLY supported auth header.
          token: youverifyApiKey,
        },
        body: JSON.stringify(youverifyPayload),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err?.name === "AbortError";
      return NextResponse.json(
        {
          success: false,
          message: aborted
            ? "Youverify did not respond in time. Try again."
            : `Could not reach Youverify: ${err?.message || "network error"}`,
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      // Surface Youverify's own reason. A generic "verification failed" leaves
      // the admin with no way to tell a bad key from a bad BVN from a network
      // problem — which is exactly the situation this route was reported for.
      const usingSandbox =
        youverifyBaseUrl.replace(/\/$/, "") === SANDBOX_URL;
      const onlyTestIds =
        /only test ids/i.test(data?.message || "") || res.status === 403;

      let message = data?.message || `Youverify rejected the request (HTTP ${res.status})`;
      if (onlyTestIds && usingSandbox) {
        message =
          `BVN ${bvn} is a real BVN, and the Youverify sandbox only accepts test IDs. ` +
          `Use ${PRODUCTION_URL} for real BVNs, or test with 11111111111 (found) / 00000000000 (not found).`;
      } else if (res.status === 401) {
        message = "Youverify rejected the API key. Check YOUVERIFY_API_KEY.";
      }

      return NextResponse.json(
        { success: false, message, youverify: data },
        { status: res.status }
      );
    }

    // HTTP 200 is not sufficient. A BVN that is not on file comes back as
    // 200 with status "not_found", so the envelope is what decides.
    const found = data?.success === true && data?.data?.status === "found";

    if (!found) {
      const status = data?.data?.status || data?.message || "unknown";
      return NextResponse.json(
        {
          success: false,
          message: `BVN ${bvn} not verified by Youverify (status: ${status})`,
          youverify: data,
        },
        // 422: the request was well-formed and authorised, but the BVN itself
        // did not verify. Distinct from 4xx client errors and 5xx upstream.
        { status: 422 }
      );
    }

    const d = data.data;
    const name = [d.firstName, d.middleName, d.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return NextResponse.json({
      success: true,
      message: name
        ? `BVN verified: ${name}`
        : "BVN verification completed",
      result: {
        id: d.id,
        firstName: d.firstName,
        middleName: d.middleName,
        lastName: d.lastName,
        dateOfBirth: d.dateOfBirth,
        gender: d.gender,
        phone: d.mobile,
        address: d.address,
        verificationStatus: d.status,
      },
    });
  } catch (error) {
    console.error("VERIFY BVN ERROR:", error);
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
