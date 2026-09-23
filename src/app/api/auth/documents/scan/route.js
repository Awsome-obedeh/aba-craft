import connect from "@/app/lib/connect";

import Challenge from "@/models/SignupChallenge";

import {
  scanDocument,
} from "@/app/lib/server/document-scan";

import {
  SignupError,
  readBody,
  errorResponse,
  normalizeEmail,
  hashSecret,
  MAX_DOCUMENT_SIZE,
} from "@/app/lib/server/signup-validation";


export const runtime = "nodejs";

export const maxDuration = 120;


const MAX_DOCUMENT_SCANS = 12;


export async function POST(request) {
  try {
    /*
     * --------------------------------
     * 1. Validate origin
     * --------------------------------
     */

    const origin =
      request.headers.get("origin");

    if (
      origin &&
      origin !== new URL(request.url).origin
    ) {
      throw new SignupError(
        "Request origin is not allowed.",
        403
      );
    }


    /*
     * --------------------------------
     * 2. Read form
     * --------------------------------
     */

    const form = await readBody(
      request,
      MAX_DOCUMENT_SIZE + 16384,
      "form"
    );


    const purpose = form.get("purpose");

    const email = normalizeEmail(
      form.get("email")
    );

    const token =
      form.get("verificationToken");

    const document =
      form.get("document");


    /*
     * --------------------------------
     * 3. Validate purpose
     * --------------------------------
     */

    if (
      !["cac", "nin"].includes(purpose)
    ) {
      throw new SignupError(
        "Choose a CAC or NIN document.",
        400
      );
    }


    /*
     * --------------------------------
     * 4. Validate verification token
     * --------------------------------
     */

    if (
      typeof token !== "string" ||
      !/^[a-f\d]{64}$/.test(token)
    ) {
      throw new SignupError(
        "Please verify your email before scanning documents.",
        403
      );
    }


    /*
     * --------------------------------
     * 5. Connect DB
     * --------------------------------
     */

    await connect();


    /*
     * --------------------------------
     * 6. Find valid verification
     *
     * IMPORTANT:
     * Don't increment the counter yet.
     * --------------------------------
     */

    const challenge =
      await Challenge.findOne({
        email,

        proofHash:
          hashSecret(token),

        proofExpiresAt: {
          $gt: new Date(),
        },

        usedAt: null,

        $or: [
          {
            documentScanCount: {
              $lt: MAX_DOCUMENT_SCANS,
            },
          },

          {
            documentScanCount: {
              $exists: false,
            },
          },
        ],
      });


    /*
     * --------------------------------
     * 7. Challenge invalid/expired
     * --------------------------------
     */

    if (!challenge) {
      throw new SignupError(
        "Email verification expired or the document scan limit was reached. Verify your email again or enter the details manually.",
        403
      );
    }


    /*
     * --------------------------------
     * 8. Scan document
     *
     * If OpenRouter fails here,
     * documentScanCount is NOT increased.
     * --------------------------------
     */

    const details =
      await scanDocument(
        document,
        purpose
      );


    /*
     * --------------------------------
     * 9. Scan succeeded
     *
     * NOW increment scan count.
     * --------------------------------
     */

    await Challenge.updateOne(
      {
        _id: challenge._id,
      },

      {
        $inc: {
          documentScanCount: 1,
        },
      }
    );


    /*
     * --------------------------------
     * 10. Return extracted details
     * --------------------------------
     */

    return Response.json(
      {
        success: true,
        details,
      },

      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {

    console.error(
      "Document scan endpoint error:",
      error
    );

    return errorResponse(error);
  }
}