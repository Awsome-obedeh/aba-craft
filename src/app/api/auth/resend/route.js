import { NextResponse } from "next/server";

import Invitation from "@/models/Invitation";

import connectDB from "@/app/lib/connect";
import { generateInvitationCode } from "@/app/lib/generateInviteCode";
import { sendMail } from "@/app/lib/send-mail";






export async function POST(request) {
    try {
        await connectDB();
        const { email } = await request.json();
        console.log("EMAIL: ", email)



        if (!email) {
            return NextResponse.json({
                success: false,
                message: "email is required"
            },

                { status: 400 }
            );
        }


        const currentTime = new Date();
        const invitationCode = generateInvitationCode();

        // check if user exists
        const resendInvitation = await Invitation.findOneAndUpdate({
            email,
            isUsed: false,
            purpose: "email_verification"
            

        },

            {
                $set: {
                    invitationCode,
                    expiresAt: new Date(currentTime.getTime() + 15 * 60 * 1000), // 15 minutes from now
                    "metadata.ipAddress": request.ip || "Unknown",
                    "metadata.userAgent": request.headers.get("user-agent") || "Unknown",
                    "metadata.attemptsCount": 0 // reset attempts count on resend

                }
            },
            { returnDocument: "after", upsert: true }
        );

        if (!resendInvitation) {
            return NextResponse.json({
                success: false,
                message: "Invitation not found"
            },
                { status: 404 }
            );
        }
        await sendMail(email, invitationCode);


        return NextResponse.json({
            success: true,
            message: "Verification code sent to email"
        },
            { status: 200 }
        );




    }
    catch (error) {

        console.error("OTP verification error:", error);

        return NextResponse.json({

            success: false,
            message: "Internal server error."

        },
            { status: 500 });
    }
};