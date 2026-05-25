import User from "@/models/User";


import { NextResponse } from "next/server";

import connectDB from "@/app/lib/connect";

import bcrypt from "bcryptjs";

import { sendMail } from "@/app/lib/send-mail";

import { generateInvitationCode } from "@/app/lib/generateInviteCode";
import Invitation from "@/models/Invitation";


export const POST = async (req) => {
  try {
    await connectDB();

    const body = await req.json();

    const email = body.email?.trim().toLowerCase();

    const password = body.password?.trim();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // Strong password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must contain uppercase, lowercase, number and special character",
        },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Account already exists",
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const invitationCode = generateInvitationCode();

    // Expiration
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // Remove old pending invitations
    await Invitation.deleteMany({
      email,
      isUsed: true,
    });

    await Invitation.create({
      email,
      invitationCode,
      purpose: "email_verification",
      isUsed: false,
      expiresAt,
    });

    // Send mail
    await sendMail(email, invitationCode);

    await User.create({
        email,
        password:hashedPassword
    })

    return NextResponse.json(
      {
        success: true,
        message:
          "Verification code sent successfully",
        email
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:error.message
      },
      { status: 500 }
    );
  }
};