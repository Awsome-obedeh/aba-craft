import connectDB from "@/app/lib/connect";
import { generateAccessToken, generateRefreshToken } from "@/app/lib/jwt";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    try {
        await connectDB();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and password are required"
                },
                { status: 400 }
            )
        }

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid credentials"
                },
                { status: 401 }
            )
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid credentials"
                },
                { status: 401 }
            )
        }

        // jwt token
        const payload = {
            id: user._id,
            email: user.email,
            role: user.role
        }

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        const cookieStore = await cookies();

        cookieStore.set(
            "refreshToken",
            refreshToken,
            {

                httpOnly: true,

                secure: process.env.NODE_ENV === "production",

                sameSite: "strict",

                path: "/",

                maxAge: 60 * 60 * 24 * 7

            }
        );

        return NextResponse.json({
            success: true,
            accessToken,
            user: payload
        });



    }

    catch (error) {
        console.error("SIGN IN ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error"
            },
            { status: 500 }
        )
    }
}