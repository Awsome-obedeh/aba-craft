import { NextResponse } from "next/server";

import Invitation from "@/models/Invitation";

import connectDB from "@/app/lib/connect";






export async function POST(request) {
  try {
    await connectDB();
    const { email, invitationCode } = await request.json();

    console.log("EMAIL AND VERIFCATION:", email, invitationCode)

    if (!email || !invitationCode) {
      return NextResponse.json({
        success: false,
        message: "email and invitationCode are required"
      },

        { status: 400 }
      );
    }


    const currentTime = new Date();

    // This stops attackers from testing codes on an account that has already been flagged
    const attemptsTried = await Invitation.findOne({
      email,
      isUsed: false,

    });

    if (attemptsTried && attemptsTried.metadata.attemptsCount >= 5) {
      return NextResponse.json(

        {
          success: false,
          message: "Too many failed attempts. This code is locked. Please request a new one."
        },

        { status: 429 }
      );
    }

    const validOtpRecord = await Invitation.findOneAndUpdate(
      {
        email,
        invitationCode,
        isUsed: false,
        expiresAt: { $gt: currentTime },
      },
      {
        $set: {
          isUsed: true,
          usedAt: currentTime
        } // Successfully matched! Burn it immediately
      },
      { returnDocument: "after" } // Return the updated document configuration
    );


    if (validOtpRecord) {
      return NextResponse.json({
        success: true,
        message: "Verification successful."
      },
        { status:200 }
      );
    }

    // The code was wrong (or expired). 
    // find the active OTP record for this user and increment their attempts counter.
    const failedAttemptRecord = await Invitation.findOneAndUpdate(
      {
        email,
        isUsed: false,
        expiresAt: { $gt: currentTime }
      },
      {
        // Atomic increment operator guarantees safety across concurrent execution requests
        $inc: { "metadata.attemptsCount": 1 }
      },
      { returnDocument: "after" }
    );


    if (failedAttemptRecord && failedAttemptRecord.metadata.attemptsCount >= 5) {
      // Burn the invitationToken completely is tria limit is reached
      failedAttemptRecord.isUsed = true;
      await failedAttemptRecord.save();

      return NextResponse.json(
        { message: "Too many failed attempts. Generate new code." },
        { status: 429 }
      );
    }


    return NextResponse.json(
      { message: "The verification code is invalid or has expired." },
      { status: 400 }
    );

  } catch (error) {

    console.error("OTP verification error:", error);

    return NextResponse.json({

      success: false,
      message: "Internal server error."

    },
      { status: 500 });
  }
}